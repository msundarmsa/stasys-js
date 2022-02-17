import { useEffect, useState } from "react";
import AppBar from "@mui/material/AppBar";
import Box from "@mui/material/Box";
import Toolbar from "@mui/material/Toolbar";
import Typography from "@mui/material/Typography";
import Button from "@mui/material/Button";
import { Alert, IconButton, List, ListItem, Modal, Snackbar } from "@mui/material";
import SettingsIcon from "@mui/icons-material/Settings";
import SettingsPage from "./SettingsPage";
import ScoreStatCard from "./components/ScoreStatCard";
import { Target, ZoomedTarget } from "./components/Target";
import ShotTable from "./components/ShotTable";
import LineChart from "./components/LineChart";
import { defaultCalibratePoint, genRandomShots, Shot, TracePoint } from "../ShotUtils";
// eslint-disable-next-line import/no-unresolved
import CameraWorker from "worker-loader!./components/CameraWorker";

export default function MainPage() {
  // settings modal
  const [settingsPageOpen, setSettingsPageOpen] = useState(false);
  const handleSettingsPageOpen = () => setSettingsPageOpen(true);
  const handleSettingsPageClose = () => setSettingsPageOpen(false);

  // calibration snack bar
  const [calibrationSBOpen, setCalibrationSBOpen] = useState(false);
  const handleCalibrationSBOpen = () => setCalibrationSBOpen(true);
  const handleCalibrationSBClose = () => setCalibrationSBOpen(false);
  const [calibrationError, setCalibrationError] = useState("");

  // audio video snack bar
  const [avSBOpen, setAVSBOpen] = useState(false);
  const handleAVSBOpen = () => setAVSBOpen(true);
  const handleAVSBClose = () => setAVSBOpen(false);

  // target and zoomed target
  const [shots, setShots] = useState<Shot[]>([]);
  const [shotGroups, setShotGroups] = useState<Shot[][]>([]);
  const [allShots, setAllShots] = useState<Shot[]>([]);
  const [shot, setShot] = useState<Shot>();
  const [beforeTrace, setBeforeTrace] = useState<[number, number]>();
  const [afterTrace, setAfterTrace] = useState<[number, number]>();

  // buttons
  const [calibrateStarted, setCalibrateStarted] = useState(false);
  const [shootStarted, setShootStarted] = useState(false);

  // camera thread
  const [cameraWorker, setCameraWorker] = useState<CameraWorker | null>(null);
  
  // mic thread
  const [audioInterval, setAudioInterval] = useState<NodeJS.Timer>();
  const [audioContext, setAudioContext] = useState<AudioContext>();
  const triggerLock = 5000; // trigger is locked for 5ms once triggered

  // user options
  const [cameraId, setCameraId] = useState(-1);
  const [micId, setMicId] = useState("");
  const [cameraUpDownDetection, setCameraUpDownDetection] = useState(true);
  const [cameraThreshs, setCameraThreshs] = useState<number[]>([120, 150]);
  const [micThresh, setMicThresh] = useState(0.7);
  const [calibratePoint, setCalibratePoint] = useState<TracePoint>(defaultCalibratePoint());

  const style = {
    position: "absolute",
    top: "50%",
    left: "50%",
    transform: "translate(-50%, -50%)",
    width: "50%",
    bgcolor: "background.paper",
    border: "2px solid #000",
    boxShadow: 24,
    p: 4,
  };

  const handleTest = () => {
    const allTestShots = genRandomShots(8);
    const testShotGroups: Shot[][] = [];
    let currIdx = 0;
    while (currIdx + 10 < allTestShots.length) {
      const shotGroup: Shot[] = [];
      for (let i = currIdx; i < currIdx + 10; i++) {
        shotGroup.push(allTestShots[i]);
      }
      testShotGroups.push(shotGroup.reverse());
      currIdx += 10;
    }

    const testShots: Shot[] = [];
    for (let i = currIdx; i < allTestShots.length - 1; i++) {
      testShots.push(allTestShots[i]);
    }

    // add test shots to shot group as well to check zoomed
    testShotGroups.push(testShots);

    setShot(allTestShots[allTestShots.length - 1]);
    setShots(testShots.reverse());
    setShotGroups(testShotGroups.reverse());
    setAllShots(allTestShots.reverse());

    setCalibrationError("No detected circle for 1min");
    handleCalibrationSBOpen();
  };

  async function chooseDefaultCameraAndMic() {
    const mydevices = await navigator.mediaDevices.enumerateDevices();
    let cameraIdx = 0;
    const user_chose_video = cameraId != -1;
    const user_chose_audio = micId != "";
    let usbAudioExists = false;
    let usbVideoExists = false;
    let firstCameraId = -1;
    let firstMicId = "";
    for (let i = 0; i < mydevices.length; i++) {
      const is_video = mydevices[i].kind == "videoinput";
      const is_audio = mydevices[i].kind == "audioinput";
      const is_usb = mydevices[i].label.includes("USB");
      if (is_video) {
        if (is_usb && !user_chose_video) {
          setCameraId(cameraIdx);
          usbVideoExists = true;
        } else if (!user_chose_video && firstCameraId < 0) {
          firstCameraId = cameraIdx;
        }
        cameraIdx++;
      } else if (is_audio) {
        if (is_usb && !user_chose_audio) {
          setMicId(mydevices[i].deviceId);
          usbAudioExists = true;
        } else if (!user_chose_audio && firstMicId == "") {
          firstMicId = mydevices[i].deviceId;
        }
      }
    }

    if ((!user_chose_video && !usbVideoExists) || (!user_chose_audio && !usbAudioExists)) {
      setCameraId(firstCameraId);
      setMicId(firstMicId);
      handleAVSBOpen();
    }
  }

  useEffect(() => {
    chooseDefaultCameraAndMic();
  }, []);

  const startWebcam = () => {
    // start & send start signal to worker process
    const myCameraWorker = new CameraWorker();
    myCameraWorker.postMessage({ cmd: "SET_THRESHS", threshs: cameraThreshs });
    myCameraWorker.postMessage({ cmd: "START_CAMERA", cameraId: cameraId, mode: "CALIBRATE", testTriggers: [500] });
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    myCameraWorker.onmessage = (event) => {
      if (event.data.cmd == "STOPPED_CAMERA") {
        myCameraWorker.terminate();
      } else if (event.data.cmd == "CALIBRATION_FINISHED") {
        if (event.data.success) {
          console.log(event.data.calibratePoint);
          setCalibratePoint(event.data.calibratePoint);
          setCalibrationError("");
        } else {
          setCalibrationError(event.data.errorMsg);
        }
        stopWebcam();
        setCalibrateStarted(false);
        handleCalibrationSBOpen();
      }
    };
    setCameraWorker(myCameraWorker);
  }

  const stopWebcam = () => {
    // send stop signal to worker process
    if (cameraWorker != null) {
      cameraWorker.postMessage({ cmd: "STOP_CAMERA" });
    }
    setCameraWorker(null);
  }

  const startMic = async () => {
    const constraints = {
      video: false,
      audio: {
        deviceId: micId,
      },
    };

    const stream = await navigator.mediaDevices.getUserMedia(constraints);
    const context = new AudioContext();
    const source = context.createMediaStreamSource(stream);
    const analyser = context.createAnalyser();
    analyser.fftSize = 512;
    analyser.minDecibels = -127;
    analyser.maxDecibels = 0;
    analyser.smoothingTimeConstant = 0.4;
    source.connect(analyser);

    const fps = 120;
    const intervalMs = 1000 / fps;

    let lastTrigger = -1;
    console.group("mic group");
    const interval = setInterval(() => {
        // get data from audio stream
        const volumes = new Uint8Array(analyser.frequencyBinCount);
        analyser.getByteFrequencyData(volumes);
        let volumeSum = 0;
        for (let i = 0; i < volumes.length; i += 1) {
          volumeSum += volumes[i];
        }
        const currTime = Date.now();

        // Value range: 127 = analyser.maxDecibels - analyser.minDecibels;
        const volume = volumeSum / volumes.length / 127;
        const triggerLocked = lastTrigger >= 0 && (currTime - lastTrigger) <= triggerLock;
        if (volume > micThresh && !triggerLocked) {
          if (cameraWorker) {
            cameraWorker.postMessage( { cmd: 'TRIGGER', time: currTime });
          }
          lastTrigger = currTime;
          console.log("TRIGGERED");
        }
    }, intervalMs);
    setAudioInterval(interval);
    setAudioContext(context);
  }

  const stopMic = () => {
    if (audioInterval) {
      clearInterval(audioInterval);
      setAudioInterval(undefined);
    }

    if (audioContext) {
      audioContext.close();
      setAudioContext(undefined);
    }
  }

  const calibrateClick = () => {
    if (cameraId == -1 || micId == "") {
      handleAVSBOpen();
      return;
    }

    if (calibrateStarted) {
      stopWebcam();
      stopMic();
      setCalibrateStarted(false);
      setCalibrationError("Calibration stopped by user");
      handleCalibrationSBOpen();
    } else {
      // startWebcam();
      startMic();
      setCalibrateStarted(true);
    }
  }

  return (
    <div
      style={{
        display: "flex",
        flexFlow: "column",
        height: "100%",
        maxHeight: "100%",
        overflow: "hidden",
      }}
    >
      <AppBar position="static">
        <Toolbar>
          <img
            src="/assets/images/logo.svg"
            height="20"
            width="20"
            style={{ verticalAlign: "middle", marginRight: 10 }}
          />
          <Typography variant="h6" noWrap component="div" sx={{ flexGrow: 1 }}>
            STASYS
          </Typography>
          <Button color="secondary" onClick={handleTest}>
            TEST
          </Button>
          <IconButton
            size="large"
            edge="start"
            color="inherit"
            onClick={handleSettingsPageOpen}
          >
            <SettingsIcon />
          </IconButton>
          <Modal
            open={settingsPageOpen}
            onClose={handleSettingsPageClose}
            aria-labelledby="modal-modal-title"
            aria-describedby="modal-modal-description"
          >
            <Box sx={style}>
              <SettingsPage 
                setCameraId={setCameraId}
                setMicId={setMicId}
                setCameraThreshs={setCameraThreshs}
                setMicThresh={setMicThresh}
                setCameraUpDownDetection={setCameraUpDownDetection} />
            </Box>
          </Modal>
          <Button color={calibrateStarted ? "info" : "inherit"} onClick={calibrateClick}>{calibrateStarted ? "CALIBRATING" : "CALIBRATE" }</Button>
          <Button color="inherit">SHOOT</Button>
        </Toolbar>
      </AppBar>
      <div
        style={{
          flex: "1 1 auto",
          display: "flex",
          gap: "10px",
          margin: "10px",
          overflow: "hidden",
        }}
      >
        <div
          style={{
            flex: "40%",
            display: "flex",
            flexDirection: "column",
            gap: 10,
          }}
        >
          <div
            style={{
              flex: "80%",
              border: "1px solid #D7EC58",
              borderRadius: "25px",
            }}
          >
            <Target
              shots={shots}
              shot={shot}
              newBefore={beforeTrace}
              newAfter={afterTrace}
            />
          </div>
          <div style={{ flex: "20%", display: "flex" }}>
            <ScoreStatCard
              scoreStatType="STABLITITY"
              scoreStat={shot ? shot.stab : 0}
              dp={0}
              suffix="%"
            />
            <ScoreStatCard
              scoreStatType="DESC"
              scoreStat={shot ? shot.desc : 0}
              dp={1}
              suffix="s"
            />
            <ScoreStatCard
              scoreStatType="AIM"
              scoreStat={shot ? shot.aim : 0}
              dp={1}
              suffix="s"
            />
          </div>
        </div>
        <div
          style={{
            flex: "20%",
            border: "1px solid #D7EC58",
            borderRadius: "25px",
            overflow: "auto",
          }}
        >
          <List>
            {shotGroups.map((shotGroup, id) => (
              <ListItem>
                <ZoomedTarget shots={shotGroup} />
              </ListItem>
            ))}
          </List>
        </div>
        <div
          style={{
            flex: "40%",
            display: "flex",
            flexDirection: "column",
            gap: 10,
          }}
        >
          <div
            style={{
              flex: "60%",
              border: "1px solid #D7EC58",
              borderRadius: "25px",
              overflow: "hidden",
            }}
          >
            <ShotTable shots={allShots} />
          </div>
          <div
            style={{
              flex: "40%",
              border: "1px solid #D7EC58",
              borderRadius: "25px",
            }}
          >
            <LineChart
              data={[]}
              xMin={-0.5}
              xMax={0.5}
              yMin={-40}
              yMax={40}
              yAxisLabel="displacement (mm)"
              xAxisLoc="middle"
              name="shotplot"
            />
          </div>
        </div>
      </div>
      <Snackbar open={calibrationSBOpen} autoHideDuration={10000} onClose={handleCalibrationSBClose}>
        <Alert onClose={handleCalibrationSBClose} severity={calibrationError == "" ? "success" : "error"} sx={{ width: '100%' }}>
          {calibrationError == "" ? "Calibration finished!" : "Calibration failed: " + calibrationError}
        </Alert>
      </Snackbar>
      <Snackbar open={avSBOpen} autoHideDuration={5000} onClose={handleAVSBClose}>
        <Alert onClose={handleAVSBClose} severity="info" sx={{ width: '100%' }}>
          Could not find USB camera/mic. Chosen first available camera/mic. If you would like to change this please go to settings dialog and manually select the camera and microphone.
        </Alert>
      </Snackbar>
    </div>
  );
}

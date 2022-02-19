import { useEffect, useRef, useState } from "react";
import AppBar from "@mui/material/AppBar";
import Box from "@mui/material/Box";
import Toolbar from "@mui/material/Toolbar";
import Typography from "@mui/material/Typography";
import Button from "@mui/material/Button";
import { Alert, AlertColor, IconButton, List, ListItem, Modal, Snackbar } from "@mui/material";
import SettingsIcon from "@mui/icons-material/Settings";
import SettingsPage from "./SettingsPage";
import ScoreStatCard from "./components/ScoreStatCard";
import { Target, ZoomedTarget } from "./components/Target";
import ShotTable from "./components/ShotTable";
import LineChart from "./components/LineChart";
import { genRandomShots, Shot, updateShot } from "../ShotUtils";
// eslint-disable-next-line import/no-unresolved
import Worker from "worker-loader!./components/Worker";

// camera thread
let cameraWorker: Worker | null = null;

// mic thread
let audioInterval: NodeJS.Timer | undefined = undefined;
let audioContext: AudioContext | undefined = undefined;
const triggerLock = 5000; // trigger is locked for 5ms once triggered

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

  // toasts
  const [toastOpen, setToastOpen] = useState(false);
  const handleToastOpen = () => setToastOpen(true);
  const handleToastClose = () => setToastOpen(false);
  const [toastMsg, setToastMsg] = useState("");
  const [toastSeverity, setToastSeverity] = useState<AlertColor>("info");
  const showToast = (severity: AlertColor, msg: string) => {
    setToastMsg(msg);
    setToastSeverity(severity);
    handleToastOpen();
  };

  // target and zoomed target
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [shots, setShots] = useState<Shot[]>([]);
  const [shotGroups, setShotGroups] = useState<Shot[][]>([]);
  const [allShots, setAllShots] = useState<Shot[]>([]);
  const [shot, setShot] = useState<Shot>();
  const [shotPoint, setShotPoint] = useState<[number, number]>();
  const [beforeTrace, setBeforeTrace] = useState<[number, number]>();
  const [afterTrace, setAfterTrace] = useState<[number, number]>();

  // buttons
  const [calibrateStarted, setCalibrateStarted] = useState(false);
  const [shootStarted, setShootStarted] = useState(false);

  // user options
  const [cameraId, setCameraId] = useState(-1);
  const [micId, setMicId] = useState("");
  const [micThresh, setMicThresh] = useState(0.7);

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

  useEffect(() => {
    // start camera worker
    cameraWorker = new Worker();
    return () => cameraWorker?.terminate();
  }, []);

  const handleTest = () => {
    const allTestShots = genRandomShots(19);
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
    for (let i = currIdx; i < allTestShots.length; i++) {
      testShots.push(allTestShots[i]);
    }

    // add test shots to shot group as well to check zoomed
    testShotGroups.push(testShots);

    setShotPoint([allTestShots[allTestShots.length - 1].x, allTestShots[allTestShots.length - 1].y]);
    setShots(testShots.reverse());
    setShotGroups(testShotGroups.reverse());
    setAllShots(allTestShots.reverse());
    setShot(testShots[testShots.length - 1]);
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
      showToast("info", "Could not find USB camera/mic. Chosen first available camera/mic. If you would like to change this please go to settings dialog and manually select the camera and microphone.")
    }
  }

  useEffect(() => {
    chooseDefaultCameraAndMic();
  }, []);

  const startCalibrateWebcam = () => {
    if (!cameraWorker) {
      return;
    }
    // send start signal to worker process
    cameraWorker.postMessage({ cmd: "START_CAMERA", cameraId: cameraId, mode: "CALIBRATE" });
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    cameraWorker.onmessage = (event) => {
      if (event.data.cmd == "CALIBRATION_FINISHED") {
        if (event.data.success) {
          setCalibrationError("");
        } else {
          setCalibrationError(event.data.errorMsg);
        }
        stopWebcam();
        stopMic();
        setCalibrateStarted(false);
        handleCalibrationSBOpen();
      }
    };
  }

  const clearTrace = () => {
    if (canvasRef.current) {
      const context = canvasRef.current.getContext('2d');
      if (context) {
        context.clearRect(0, 0, canvasRef.current.width, canvasRef.current.height);
      }
    }
  };

  const startShootWebcam = () => {
    if (!cameraWorker) {
      return;
    }
    console.groupCollapsed();
    // send start signal to worker process
    cameraWorker.postMessage({ cmd: "START_CAMERA", cameraId: cameraId, mode: "SHOOT" });
    let currShotPoint = shotPoint;
    let currShots = shots;
    let currAllShots = allShots;
    let currShotGroups = shotGroups;

    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    cameraWorker.onmessage = (event) => {
      if (event.data.cmd == "CLEAR_TRACE") {
        clearTrace();
      } else if (event.data.cmd == "ADD_BEFORE") {
        setBeforeTrace([event.data.center.x, event.data.center.y]);
      } else if (event.data.cmd == "ADD_AFTER") {
        setAfterTrace([event.data.center.x, event.data.center.y]);
      } else if (event.data.cmd == "ADD_SHOT") {
        currShotPoint = [event.data.center.x, event.data.center.y];
        setShotPoint(currShotPoint);
        if (currShots.length == 10) {
          currShotGroups = [currShots, ...shotGroups];
          currShots = [];
          setShotGroups(currShotGroups);
          setShots(currShots);
        }
      } else if (event.data.cmd == "SHOT_FINISHED") {
        const shotId = shots.length > 0 ? shots[0].id + 1 : 1;
        console.log({ "data": event.data, currShotPoint });
        if (currShotPoint) {
          const shot: Shot = {
            id: shotId,
            score: -1,
            x: currShotPoint[0],
            y: currShotPoint[1],
            r: -1,
            angle: -1,
            direction: "",
            stab: -1,
            desc: -1,
            aim: -1,
          };

          currAllShots = [shot, ...currAllShots];
          currShots = [shot, ...currShots];

          updateShot(shot, event.data.beforeTrace);
          setAllShots(currAllShots);
          setShot(shot);
          setShots(currShots);
        }
      }
    };
  }

  const stopWebcam = () => {
    // send stop signal to worker process
    if (cameraWorker != null) {
      cameraWorker.postMessage({ cmd: "STOP_CAMERA" });
      cameraWorker.onmessage = null;
    }
    console.groupEnd();
  }

  const startMic = async () => {
    const constraints = {
      video: false,
      audio: {
        deviceId: micId,
      },
    };

    const stream = await navigator.mediaDevices.getUserMedia(constraints);
    audioContext = new AudioContext();
    const source = audioContext.createMediaStreamSource(stream);
    const analyser = audioContext.createAnalyser();
    analyser.fftSize = 512;
    analyser.minDecibels = -127;
    analyser.maxDecibels = 0;
    analyser.smoothingTimeConstant = 0.4;
    source.connect(analyser);

    const fps = 120;
    const intervalMs = 1000 / fps;

    let lastTrigger = -1;
    audioInterval = setInterval(() => {
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
            cameraWorker.postMessage( { cmd: "TRIGGER", time: currTime });
          }
          lastTrigger = currTime;
        }
    }, intervalMs);
  }

  const stopMic = () => {
    if (audioInterval) {
      clearInterval(audioInterval);
      audioInterval = undefined;
    }

    if (audioContext) {
      audioContext.close();
      audioContext = undefined;
    }
  }

  const calibrateClick = () => {
    if (shootStarted) {
      showToast("error", "Please stop shooting before calibrating");
      return;
    }

    if (calibrateStarted) {
      stopWebcam();
      stopMic();
      setCalibrateStarted(false);
      setCalibrationError("Calibration stopped by user");
      handleCalibrationSBOpen();
    } else {
      if (cameraId == -1 || micId == "") {
        showToast("error", "No camera/mic found!");
        return;
      }
      startCalibrateWebcam();
      // startMic();
      setCalibrateStarted(true);
    }
  }

  const shootClick = () => {
    if (calibrateStarted) {
      showToast("error", "Please wait for calibration to finish");
      return;
    }

    if (shootStarted) {
      stopWebcam();
      stopMic();
      setShootStarted(false);
      clearTrace();
    } else {
      if (cameraId == -1 || micId == "") {
        showToast("error", "No camera/mic found!");
        return;
      }
      startShootWebcam();
      // startMic();
      setShootStarted(true);
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
                setMicThresh={setMicThresh}
                cameraWorker={cameraWorker} />
            </Box>
          </Modal>
          <Button color={calibrateStarted ? "info" : "inherit"} onClick={calibrateClick}>{calibrateStarted ? "CALIBRATING" : "CALIBRATE" }</Button>
          <Button color={shootStarted ? "info" : "inherit"} onClick={shootClick}>{shootStarted ? "SHOOTING" : "SHOOT"}</Button>
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
              shotPoint={shotPoint}
              newBefore={beforeTrace}
              newAfter={afterTrace}
              canvasRef={canvasRef}
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
      <Snackbar open={toastOpen} autoHideDuration={5000} onClose={handleToastClose}>
        <Alert onClose={handleToastClose} severity={toastSeverity} sx={{ width: '100%' }}>
          {toastMsg}
        </Alert>
      </Snackbar>
    </div>
  );
}

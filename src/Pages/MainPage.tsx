import { useEffect, useRef, useState } from "react";
import AppBar from "@mui/material/AppBar";
import Box from "@mui/material/Box";
import Toolbar from "@mui/material/Toolbar";
import Typography from "@mui/material/Typography";
import Button from "@mui/material/Button";
import {
  Alert,
  AlertColor,
  IconButton,
  List,
  ListItem,
  Modal,
  Snackbar,
} from "@mui/material";
import SettingsIcon from "@mui/icons-material/Settings";
import SettingsPage from "./SettingsPage";
import ScoreStatCard from "./components/ScoreStatCard";
import { Target, ZoomedTarget } from "./components/Target";
import ShotTable from "./components/ShotTable";
import LineChart from "./components/LineChart";
import { genRandomShots, Shot, TracePoint, updateShot, TARGET_SIZE } from "../ShotUtils";
// eslint-disable-next-line import/no-unresolved
import Worker from "worker-loader!./components/Worker";
import electron from "../ipc";
// @ts-expect-error Expect error due to processing of mp3 file as import
import doneSound from '../assets/sounds/done.mp3';
import useSound from 'use-sound';

// camera thread
let cameraWorker: Worker | null = null;

// mic thread
let audioInterval: NodeJS.Timer | undefined = undefined;
let audioContext: AudioContext | undefined = undefined;
const triggerLock = 5000; // trigger is locked for 5ms once triggered
let testVidPath = "";
let testTriggers: number[] = [];
let testCalibratePoint: TracePoint = {x: 0, y: 0, r: 0, time: 0};

electron.ipcRenderer.sendMsg("GET_TEST_VID");
electron.ipcRenderer.once("main-render-channel", (...args) => {
  console.log("Received test args");
  console.log(args);
  testVidPath = args[0][0] as unknown as string;
  testTriggers = args[0][1] as unknown as number[];
  testCalibratePoint = args[0][2] as unknown as TracePoint;
});

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
  const [prevBefore, setPrevBefore] = useState<[number, number]>();
  const [prevAfter, setPrevAfter] = useState<[number, number]>();
  const [beforeTrace, setBeforeTrace] = useState<[number, number]>();
  const [afterTrace, setAfterTrace] = useState<[number, number]>();
  const [data, setData] = useState<{ x: number; y: number }[][]>([]);

  // buttons
  const [calibrateStarted, setCalibrateStarted] = useState(false);
  const [shootStarted, setShootStarted] = useState(false);

  // user options
  const [cameraId, setCameraId] = useState(-1);
  const [micId, setMicId] = useState("");
  const [micThresh, setMicThresh] = useState(0.2);

  const [calibrationFinishedSound] = useSound(doneSound);

  const incrFineAdjust = (x: number, y: number) => {
      // increment fine adjust
      electron.ipcRenderer.sendMsgOnChannel("camera-render-channel",
        { cmd: "INCR_FINE_ADJUST", fineAdjust: {x: x, y: y} });
  }

  const [fineAdjustment, setFineAdjustment] = useState<number[]>([-1, -1]);
  const [fineAdjustmentStarted, setFineAdjustmentStarted] = useState(false);
  const [fineAdjustmentStart, setFineAdjustmentStart] = useState<number[]>([-1, -1]);
  const [showAdjustment, setShowAdjustment] = useState(false);

  const handleFineAdjustmentStart = (e: React.MouseEvent<SVGCircleElement>) => {
    if (calibrateStarted) {
      showToast("error", "Please wait for calibration to finish or stop calibration. Before adjusting shot.");
      return;
    }
    if (shootStarted) {
      showToast("error", "Please wait for shooting to finish or stop shooting. Before adjusting shot.");
      return;
    }

    setShowAdjustment(true);
    setFineAdjustment([e.currentTarget.cx.baseVal.value, e.currentTarget.cy.baseVal.value]);
    setFineAdjustmentStart([e.currentTarget.cx.baseVal.value, e.currentTarget.cy.baseVal.value]);
    setFineAdjustmentStarted(true);
  };

  const handleFineAdjustmentMove = (e: React.MouseEvent<SVGSVGElement>) => {
    if (fineAdjustmentStarted) {
      setFineAdjustment([e.nativeEvent.offsetX, e.nativeEvent.offsetY]);
    }
  };

  const handleFineAdjustmentEnd = (e: React.MouseEvent<SVGSVGElement>) => {
    if (fineAdjustmentStarted) {
      setFineAdjustment([e.nativeEvent.offsetX, e.nativeEvent.offsetY]);
      setFineAdjustmentStarted(false);

      const distX = e.nativeEvent.offsetX - fineAdjustmentStart[0];
      const distY = fineAdjustmentStart[1] - e.nativeEvent.offsetY;

      if (canvasRef.current) {
        incrFineAdjust(
          distX / canvasRef.current?.width * TARGET_SIZE,
          distY / canvasRef.current?.height * TARGET_SIZE
        );
      }
    }
  };

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
    return () => {
      cameraWorker?.terminate();
      electron.ipcRenderer.sendMsgOnChannel("camera-render-channel", { cmd: "KILL" });
    }
  }, []);

  const handleTest = () => {
    if (calibrateStarted) {
      showToast("error", "Please wait for calibration to finish");
      return;
    }

    if (shootStarted) {
      showToast("error", "Please wait for previous test to finish");
      return;
    }

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

    const testShotPoint: [number, number] = [
      allTestShots[allTestShots.length - 1].x,
      allTestShots[allTestShots.length - 1].y,
    ];
    setShotPoint(testShotPoint);
    setShots(testShots.reverse());
    setShotGroups(testShotGroups.reverse());
    setAllShots(allTestShots.reverse());
    setShot(testShots[testShots.length - 1]);

    startShootWebcam({testShotPoint, testShots, testShotGroups, allTestShots});
    setShootStarted(true);
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

    if (
      (!user_chose_video && !usbVideoExists) ||
      (!user_chose_audio && !usbAudioExists)
    ) {
      setCameraId(firstCameraId);
      setMicId(firstMicId);
      showToast(
        "info",
        "Could not find USB camera/mic. Chosen first available camera/mic. If you would like to change this please go to settings dialog and manually select the camera and microphone."
      );
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
    electron.ipcRenderer.sendMsgOnChannel("camera-render-channel", {
      cmd: "START_CAMERA",
      cameraId: cameraId,
      mode: "CALIBRATE",
    });

    electron.ipcRenderer.on("camera-render-channel", (...rawMessage) => {
      const message = rawMessage[0] as unknown as { cmd: string, success: boolean,
        errorMsg: string };
      if (message.cmd == "VIDEO_STOPPED") {
        message.cmd = "CALIBRATION_FINISHED";
        message.success = false;
        message.errorMsg = "Camera disconnected!";
      }

      if (message.cmd == "CALIBRATION_FINISHED") {
        calibrationFinishedSound();
        if (message.success) {
          setCalibrationError("");
        } else {
          setCalibrationError(message.errorMsg);
        }
        stopWebcam();
        stopMic();
        setCalibrateStarted(false);
        handleCalibrationSBOpen();
        electron.ipcRenderer.removeAllListeners("camera-render-channel");
      }
    });
  };

  const clearTrace = () => {
    if (canvasRef.current) {
      const context = canvasRef.current.getContext("2d");
      if (context) {
        context.clearRect(
          0,
          0,
          canvasRef.current.width,
          canvasRef.current.height
        );
      }
    }

    setPrevBefore(undefined);
    setPrevAfter(undefined);
  };

  const startShootWebcam = (testState?: {testShotPoint: [number, number], testShots: Shot[], testShotGroups: Shot[][], allTestShots: Shot[] }) => {
    // send start signal to worker process
    electron.ipcRenderer.sendMsgOnChannel("camera-render-channel", {
      cmd: "START_CAMERA",
      cameraId: cameraId,
      mode: "SHOOT",
      test: testState !== undefined,
      testVidPath: testVidPath,
      testTriggers: testTriggers,
      testCalibratePoint: testCalibratePoint
    });
    let currShotPoint = shotPoint;
    let currShots = shots;
    let currAllShots = allShots;
    let currShotGroups = shotGroups;
    if (testState) {
      currShotPoint = testState.testShotPoint;
      currShots = testState.testShots;
      currAllShots = testState.allTestShots;
      currShotGroups = testState.testShotGroups;
    }

    electron.ipcRenderer.on("camera-render-channel", (...rawMessage) => {
      const message = rawMessage[0] as unknown as { cmd: string, center: TracePoint, beforeTrace: TracePoint[], afterTrace: TracePoint[], shotTime: number, fps: number };

      if (message.cmd == "CLEAR_TRACE") {
        clearTrace();
      } else if (message.cmd == "ADD_BEFORE") {
        setBeforeTrace([message.center.x, message.center.y]);
      } else if (message.cmd == "ADD_AFTER") {
        setAfterTrace([message.center.x, message.center.y]);
      } else if (message.cmd == "ADD_SHOT") {
        currShotPoint = [message.center.x, message.center.y];
        setShotPoint(currShotPoint);
        if (currShots.length == 10) {
          currShotGroups = [currShots, ...currShotGroups];
          currShots = [];
          setShotGroups(currShotGroups);
          setShots(currShots);
        }
      } else if (message.cmd == "SHOT_FINISHED") {
        const shotId = currAllShots.length > 0 ? currAllShots[0].id + 1 : 1;
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

          updateShot(shot, message.beforeTrace);
          setAllShots(currAllShots);
          setShot(shot);
          setShots(currShots);

          // cut the traces from +-0.5s (500ms) around shot
          const xData: { x: number; y: number }[] = [];
          const yData: { x: number; y: number }[] = [];
          let idx = message.beforeTrace.length - 1;
          while (idx >= 0) {
            const currTP = message.beforeTrace[idx];
            if (message.shotTime - currTP.time > 500) {
              break;
            }

            const currTime = (currTP.time - message.shotTime) / 1000;
            const currX = message.beforeTrace[idx].x;
            const currY = message.beforeTrace[idx].y;
            xData.push({ x: currTime, y: currX });
            yData.push({ x: currTime, y: currY });

            idx -= 1;
          }
          xData.reverse();
          yData.reverse();
          idx = 0;
          while (idx <= message.afterTrace.length - 1) {
            const currTP = message.afterTrace[idx];
            if (currTP.time - message.shotTime > 500) {
              break;
            }

            const currTime = (currTP.time - message.shotTime) / 1000;
            const currX = message.afterTrace[idx].x;
            const currY = message.afterTrace[idx].y;
            xData.push({ x: currTime, y: currX });
            yData.push({ x: currTime, y: currY });

            idx += 1;
          }

          setData([xData, yData]);
        }
      } else if (message.cmd == "VIDEO_STOPPED") {
        stopMic();
        setShootStarted(false);
        clearTrace();
        electron.ipcRenderer.removeAllListeners("camera-render-channel");

        showToast('info', `FPS: ${message.fps}`);
      }
    });
  };

  const stopWebcam = () => {
    // send stop signal to worker process
    electron.ipcRenderer.sendMsgOnChannel("camera-render-channel", { cmd: "STOP_CAMERA" });
  };

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
      const triggerLocked =
        lastTrigger >= 0 && currTime - lastTrigger <= triggerLock;
      if (volume > micThresh && !triggerLocked) {
        electron.ipcRenderer.sendMsgOnChannel("camera-render-channel", { cmd: "TRIGGER", time: currTime });
        lastTrigger = currTime;
      }
    }, intervalMs);
  };

  const stopMic = () => {
    if (audioInterval) {
      clearInterval(audioInterval);
      audioInterval = undefined;
    }

    if (audioContext) {
      audioContext.close();
      audioContext = undefined;
    }
  };

  const calibrateClick = () => {
    if (shootStarted) {
      showToast("error", "Please stop shooting before calibrating");
      return;
    }

    setShowAdjustment(false);

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
      startMic();
      setCalibrateStarted(true);
    }
  };

  const shootClick = () => {
    if (calibrateStarted) {
      showToast("error", "Please wait for calibration to finish");
      return;
    }

    setShowAdjustment(false);

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
      startMic();
      setShootStarted(true);
    }
  };

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
            src="../assets/images/logo.svg"
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
                micThresh={micThresh}
                cameraWorker={cameraWorker}
              />
            </Box>
          </Modal>
          <Button
            color={"info"}
            onClick={calibrateClick}
            variant={calibrateStarted ? "contained" : "outlined"}
            style={{ marginRight: "10px" }}
          >
            {calibrateStarted ? "CALIBRATING" : "CALIBRATE"}
          </Button>
          <Button
            color={"success"}
            onClick={shootClick}
            variant={shootStarted ? "contained" : "outlined"}
          >
            {shootStarted ? "SHOOTING" : "SHOOT"}
          </Button>
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
            flex: "0 0 45%",
            display: "flex",
            flexDirection: "column",
            gap: 10,
          }}
        >
          <div
            style={{
              flex: "90%",
              border: shootStarted ? "1px solid #D7EC58" : calibrateStarted ? "1px solid #51D6FF" : "1px solid #FF4242",
              borderRadius: "25px",
              overflow: "hidden",
            }}
          >
            <Target
              shots={shots}
              shotPoint={shotPoint}
              prevBefore={prevBefore}
              prevAfter={prevAfter}
              setPrevBefore={setPrevBefore}
              setPrevAfter={setPrevAfter}
              newBefore={beforeTrace}
              newAfter={afterTrace}
              canvasRef={canvasRef}
              handleFineAdjustmentStart={handleFineAdjustmentStart}
              handleFineAdjustmentMove={handleFineAdjustmentMove}
              handleFineAdjustmentEnd={handleFineAdjustmentEnd}
              fineAdjustment={fineAdjustment}
              fineAdjustmentStart={fineAdjustmentStart}
              showAdjustment={showAdjustment}
            />
          </div>
          <div style={{ flex: "10%", display: "flex" }}>
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
            flex: "0 0 15%",
            border: "1px solid #D7EC58",
            borderRadius: "25px",
            overflow: "hidden",
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
            flex: "0 1 40%",
            display: "flex",
            flexDirection: "column",
            gap: 10,
            overflow: "hidden",
          }}
        >
          <div
            style={{
              flex: "65%",
              border: "1px solid #D7EC58",
              borderRadius: "25px",
              overflow: "hidden",
            }}
          >
            <ShotTable shots={allShots} />
          </div>
          <div
            style={{
              flex: "35%",
              border: "1px solid #D7EC58",
              borderRadius: "25px",
            }}
          >
            <LineChart
              lines={data}
              xMin={-0.5}
              xMax={0.5}
              yMin={-40}
              yMax={40}
              yAxisLabel="displacement (mm)"
              xAxisLoc="middle"
              name="shotplot"
              zeroLine
            />
          </div>
        </div>
      </div>
      <Snackbar
        open={calibrationSBOpen}
        autoHideDuration={10000}
        onClose={handleCalibrationSBClose}
      >
        <Alert
          onClose={handleCalibrationSBClose}
          severity={calibrationError == "" ? "success" : "error"}
          sx={{ width: "100%" }}
        >
          {calibrationError == ""
            ? "Calibration finished!"
            : "Calibration failed: " + calibrationError}
        </Alert>
      </Snackbar>
      <Snackbar
        open={toastOpen}
        autoHideDuration={5000}
        onClose={handleToastClose}
      >
        <Alert
          onClose={handleToastClose}
          severity={toastSeverity}
          sx={{ width: "100%" }}
        >
          {toastMsg}
        </Alert>
      </Snackbar>
    </div>
  );
}

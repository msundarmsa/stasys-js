import {
  Box,
  Button,
  Checkbox,
  FormControlLabel,
  Menu,
  MenuItem,
  Slider,
  Stack,
  Typography,
} from "@mui/material";
import { useState, useRef, useEffect } from "react";
// eslint-disable-next-line import/no-unresolved
import Worker from "worker-loader!./Worker";

const Webcam = ({ setCameraId, setCameraThreshs, setCameraUpDownDetection, cameraWorker }: IProps) => {
  const [devices, setDevices] = useState<MediaDeviceInfo[]>([]);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  // menu
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const open = Boolean(anchorEl);
  const openWebcams = (event: React.MouseEvent<HTMLElement>) => {
    setAnchorEl(event.currentTarget);
  };
  const [webcamStarted, setWebcamStarted] = useState(false);
  const [deviceLabel, setDeviceLabel] = useState("");
  const [threshs, setThreshs] = useState([120, 150]);
  const [showCircle, setShowCircle] = useState(false);
  const [showThreshs, setShowThreshs] = useState(false);
  const [upDownDetection, setUpDownDetection] = useState(true);

  const closeWebcams = () => {
    setAnchorEl(null);
  };

  async function getWebcams() {
    const mydevices = await navigator.mediaDevices.enumerateDevices();
    setDevices(mydevices.filter((device) => device.kind === "videoinput"));
  }

  useEffect(() => {
    getWebcams();
  }, []);

  const stopWebcam = () => {
    // send stop signal to worker process
    if (cameraWorker != null) {
      cameraWorker.postMessage({ cmd: "STOP_CAMERA" });
    }
    setWebcamStarted(false);
    setDeviceLabel("");
  };

  async function selectWebcam(device: MediaDeviceInfo) {
    if (webcamStarted) {
      // stop previous webcam if running before starting new one
      stopWebcam();
    }
    setWebcamStarted(true);
    setDeviceLabel(device.label);
    setCameraId(devices.indexOf(device));
    closeWebcams();

    // mock create stream to get permission
    await navigator.mediaDevices.getUserMedia({
      audio: false,
      video: {
        deviceId: device.deviceId,
      },
    });

    // start & send start signal to worker process
    const deviceIndex = devices.indexOf(device);
    if (!cameraWorker) {
      return;
    }
    cameraWorker.postMessage({ cmd: "SET_THRESHS", threshs: threshs });
    cameraWorker.postMessage({
      cmd: "SET_SHOW_THRESH",
      showThreshs: showThreshs,
    });
    cameraWorker.postMessage({
      cmd: "SET_SHOW_CIRCLE",
      showCircle: showCircle,
    });
    cameraWorker.postMessage({
      cmd: "SET_UPDOWN",
      showCircle: upDownDetection,
    });
    cameraWorker.postMessage({ cmd: "START_CAMERA", cameraId: deviceIndex, mode: "DISPLAY" });
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    cameraWorker.onmessage = (event) => {
      if (event.data.cmd == "GRABBED_FRAME") {
        if (canvasRef.current) {
          // set canvas dimensions
          canvasRef.current.height = event.data.height;
          canvasRef.current.width = event.data.width;

          // set image data
          const ctx = canvasRef.current.getContext("2d");
          if (ctx) {
            ctx.putImageData(event.data.frame, 0, 0);
          }
        }
      }
    };
  }

  const threshsChanged = (newThreshs: number[]) => {
    if (cameraWorker) {
      cameraWorker.postMessage({ cmd: "SET_THRESHS", threshs: newThreshs });
      cameraWorker.onmessage = null;
    }
    setThreshs(newThreshs);
    setCameraThreshs(newThreshs);
  };

  const showThreshsChanged = (show: boolean) => {
    if (cameraWorker) {
      cameraWorker.postMessage({ cmd: "SET_SHOW_THRESHS", showThreshs: show });
    }
    setShowThreshs(show);
  };

  const showCircleChanged = (show: boolean) => {
    if (cameraWorker) {
      cameraWorker.postMessage({ cmd: "SET_SHOW_CIRCLE", showCircle: show });
    }
    setShowCircle(show);
  };

  const upDownDetectionChanged = (upDown: boolean) => {
    if (cameraWorker) {
      cameraWorker.postMessage({ cmd: "SET_UPDOWN", upDown: upDown });
    }
    setUpDownDetection(upDown);
    setCameraUpDownDetection(upDown);
  };

  return (
    <div>
      <Menu
        id="webcams-menu"
        aria-labelledby="webcams-menu"
        anchorEl={anchorEl}
        open={open}
        onClose={closeWebcams}
        anchorOrigin={{
          vertical: "top",
          horizontal: "left",
        }}
        transformOrigin={{
          vertical: "top",
          horizontal: "left",
        }}
      >
        {devices.map((device) => (
          <MenuItem key={device.label} onClick={() => selectWebcam(device)}>
            {device.label}
          </MenuItem>
        ))}
      </Menu>
      <Box
        sx={{
          display: "flex",
          flexDirection: "row",
          p: 1,
          m: 1,
          justifyContent: "center",
        }}
      >
        <Button
          id="webcams-menu-btn"
          aria-controls={open ? "webcams-menu" : undefined}
          aria-haspopup="true"
          aria-expanded={open ? "true" : undefined}
          onClick={openWebcams}
          variant="contained"
          sx={{ mr: 2 }}
        >
          <span role="img" aria-label="webcam">
            🎥
          </span>
          {deviceLabel === "" ? "Choose a webcam" : deviceLabel}
        </Button>
        {webcamStarted ? (
          <Button onClick={stopWebcam} variant="contained" color="error">
            Close
          </Button>
        ) : null}
      </Box>
      <Box
        sx={{
          display: "flex",
          flexDirection: "row",
          p: 1,
          m: 1,
          justifyContent: "center",
        }}
      >
        <canvas
          ref={canvasRef}
          style={{
            width: "100%",
            aspectRatio: "1280/720",
          }}
        />
      </Box>
      <Stack spacing={2} direction="row" sx={{ mb: 1 }} alignItems="center">
        <Typography textAlign="center" variant="body1">
          Thresholds
        </Typography>
        <Slider
          value={threshs}
          min={0}
          max={255}
          // @ts-expect-error: expect error here due to possibility that newLevel be an array
          onChange={(_1, newThreshs, _2) => threshsChanged(newThreshs)}
        />
      </Stack>
      <Box
        sx={{
          display: "flex",
          flexDirection: "row",
          p: 1,
          m: 1,
          justifyContent: "center",
        }}
      >
        <FormControlLabel
          control={
            <Checkbox
              aria-label="showThresholds"
              checked={showThreshs}
              onChange={(_1, checked) => showThreshsChanged(checked)}
            />
          }
          label="Show thresholds"
        />
        <FormControlLabel
          control={
            <Checkbox
              aria-label="showCircle"
              checked={showCircle}
              onChange={(_1, checked) => showCircleChanged(checked)}
            />
          }
          label="Show detected circle"
        />
        <FormControlLabel
          control={
            <Checkbox
              aria-label="upDownDetection"
              checked={upDownDetection}
              onChange={(_1, checked) => upDownDetectionChanged(checked)}
            />
          }
          label="Up/Down Detection"
        />
      </Box>
    </div>
  );
};

interface IProps {
  setCameraId: (id: number) => void;
  setCameraThreshs: (threshs: number[]) => void;
  setCameraUpDownDetection: (upDownDetection: boolean) => void;
  cameraWorker: Worker | null;
}

export default Webcam;

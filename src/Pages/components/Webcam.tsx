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
import electron from "../../ipc";

const Webcam = ({ setCameraId, cameraWorker, webcams }: IProps) => {
  // menu
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const open = Boolean(anchorEl);
  const openWebcams = (event: React.MouseEvent<HTMLElement>) => {
    setAnchorEl(event.currentTarget);
  };

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [webcamStarted, setWebcamStarted] = useState(false);
  const [deviceLabel, setDeviceLabel] = useState("");
  const [threshs, setThreshs] = useState<number[]>([]);
  const THRESH_DIST = 30; // fixed distance between lower and higher threshold

  const closeWebcams = () => {
    setAnchorEl(null);
  };

  useEffect(() => {
    // get current settings from camera worker
    if (!cameraWorker) {
      // TODO: display error message
      return;
    }
    cameraWorker.postMessage({ cmd: "GET_PARAMS" });
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    cameraWorker.onmessage = (event) => {
      if (event.data.cmd != "PARAMS") {
        return;
      }

      setThreshs(event.data.threshs);
    };

    return () => stopWebcam();
  }, []);

  const stopWebcam = () => {
    // send stop signal to worker process
    if (cameraWorker) {
      cameraWorker.postMessage({ cmd: "STOP_CAMERA" });
      cameraWorker.onmessage = null;
    }
    setWebcamStarted(false);
    setDeviceLabel("");
  };

  async function selectWebcam(device: MediaDeviceInfo) {
    if (webcamStarted) {
      // stop previous webcam if running before starting new one
      stopWebcam();
    }

    if (!cameraWorker) {
      // TODO: display error message
      return;
    }

    // update state
    setCameraId(webcams.indexOf(device));
    setDeviceLabel(device.label);
    setWebcamStarted(true);

    closeWebcams();

    // send start signal to worker process
    const deviceIndex = webcams.indexOf(device);
    cameraWorker.postMessage({
      cmd: "START_CAMERA",
      cameraId: deviceIndex,
      mode: "DISPLAY",
    });
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    cameraWorker.onmessage = (event) => {
      if (event.data.cmd != "GRABBED_FRAME" || !canvasRef.current) {
        return;
      }

      // set canvas dimensions
      canvasRef.current.height = event.data.height;
      canvasRef.current.width = event.data.width;

      // set image data on canvas
      const ctx = canvasRef.current.getContext("2d");
      ctx?.putImageData(event.data.frame, 0, 0);
    };
  }

  const threshsChanged = (newThreshs: number[]) => {
    if (!cameraWorker) {
      // TODO: display error message
      return;
    }

    if (newThreshs[1] - newThreshs[0] != THRESH_DIST) {
      // ensure distance between thresholds is fixed
      if (newThreshs[0] == threshs[0]) {
        // upper bound changed
        threshsChanged([newThreshs[1] - THRESH_DIST, newThreshs[1]]);
        return;
      } else {
        // bound changed
        threshsChanged([newThreshs[0], newThreshs[0] + THRESH_DIST]);
        return;
      }
    }

    const data = { cmd: "SET_THRESHS", threshs: newThreshs };
    cameraWorker.postMessage(data);
    electron.ipcRenderer.sendMsgOnChannel("camera-render-channel", data);
    electron.ipcRenderer.sendMsgOnChannel("main-render-channel", ["SET_CAMERA_THRESHS", newThreshs]);
    setThreshs(newThreshs);
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
        {webcams.map((device) => (
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
    </div>
  );
};

interface IProps {
  setCameraId: (id: number) => void;
  cameraWorker: Worker | null;
  webcams: MediaDeviceInfo[];
}

export default Webcam;

import {
  Box,
  Button,
  Menu,
  MenuItem,
  Slider,
  Stack,
  Typography,
} from "@mui/material";
import { useState, useEffect } from "react";
import LineChart from "./LineChart";

const Mic = ({ setMicId, setMicThresh }: IProps) => {
  const [devices, setDevices] = useState<MediaDeviceInfo[] | []>([]);
  // menu
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const open = Boolean(anchorEl);
  const openMics = (event: React.MouseEvent<HTMLElement>) => {
    setAnchorEl(event.currentTarget);
  };
  const [micStarted, setMicStarted] = useState(false);
  const [deviceLabel, setDeviceLabel] = useState("");
  const [data, setData] = useState<{ x: number; y: number }[]>([]);
  const [audioInterval, setAudioInterval] = useState<NodeJS.Timer>();
  const [audioContext, setAudioContext] = useState<AudioContext>();
  const [refLevel, setRefLevel] = useState(0.7);

  const closeMics = () => {
    setAnchorEl(null);
  };

  async function getMics() {
    const mydevices = await navigator.mediaDevices.enumerateDevices();
    setDevices(
      mydevices.filter(
        (device) =>
          device.kind === "audioinput" && !device.label.startsWith("Default")
      )
    );
  }

  useEffect(() => {
    getMics();

    return () => stopMic();
  }, []);

  const stopMic = () => {
    if (audioInterval) {
      clearInterval(audioInterval);
      setAudioInterval(undefined);
    }

    if (audioContext) {
      audioContext.close();
      setAudioContext(undefined);
    }

    setMicStarted(false);
    setDeviceLabel("");
    setData([]);
  };

  async function selectMic(device: MediaDeviceInfo) {
    if (audioInterval) {
      stopMic();
    }

    setMicStarted(true);
    setDeviceLabel(device.label);
    setMicId(device.deviceId);
    closeMics();

    const constraints = {
      video: false,
      audio: {
        deviceId: device.deviceId,
      },
    };

    const stream = await navigator.mediaDevices.getUserMedia(constraints);
    const context = new AudioContext();
    const source = context.createMediaStreamSource(stream);
    const analyser = context.createAnalyser();
    analyser.fftSize = 512;
    analyser.smoothingTimeConstant = 0.4;
    source.connect(analyser);

    const fps = 30;
    const intervalMs = 1000 / fps;

    const interval = setInterval(() => {
      setData((oldData) => {
        // update previous data
        const newData = [...oldData];
        if (newData.length > 5 * fps) {
          newData.shift();
        }

        // set new x
        let newX = 0;
        if (newData.length > 0) {
          newX = newData[newData.length - 1].x + intervalMs / 1000;
        }

        // get data from audio stream
        const volumes = new Uint8Array(analyser.frequencyBinCount);
        analyser.getByteFrequencyData(volumes);
        let volumeSum = 0;
        for (let i = 0; i < volumes.length; i += 1) {
          volumeSum += volumes[i] / 255; // min: 0. max: 255
        }

        const newY = volumeSum / volumes.length;

        newData.push({ x: newX, y: newY });
        return newData;
      });
    }, intervalMs);
    setAudioInterval(interval);
    setAudioContext(context);
  }

  return (
    <div>
      <Menu
        id="mics-menu"
        aria-labelledby="mics-menu"
        anchorEl={anchorEl}
        open={open}
        onClose={closeMics}
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
          <MenuItem key={device.label} onClick={() => selectMic(device)}>
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
          aria-controls={open ? "mics-menu" : undefined}
          aria-haspopup="true"
          aria-expanded={open ? "true" : undefined}
          onClick={openMics}
          variant="contained"
          sx={{ mr: 2 }}
        >
          <span role="img" aria-label="mic">
            🎙
          </span>
          {deviceLabel === "" ? "Choose a mic" : deviceLabel}
        </Button>
        {micStarted ? (
          <Button onClick={stopMic} variant="contained" color="error">
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
        <LineChart
          lines={data.length == 0 ? [] : [data]}
          refLevel={refLevel}
          name="micplot"
          aspectRatio="1280/720"
        />
      </Box>
      <Stack spacing={2} direction="row" sx={{ mb: 1 }} alignItems="center">
        <Typography textAlign="center" variant="body1">
          Threshold
        </Typography>
        <Slider
          value={refLevel}
          step={0.001}
          min={0}
          max={1}
          onChange={(_1, newLevel, _2) => {
            // @ts-expect-error: expect error here due to possibility that newLevel be an array
            setRefLevel(newLevel);
            // @ts-expect-error: expect error here due to possibility that newLevel be an array
            setMicThresh(newLevel);
          }}
        />
      </Stack>
    </div>
  );
};

interface IProps {
  setMicId: (id: string) => void;
  setMicThresh: (thresh: number) => void;
}

export default Mic;

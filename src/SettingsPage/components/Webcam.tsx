/* eslint-disable jsx-a11y/media-has-caption */
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
} from '@mui/material';
import { useState, useRef, useEffect } from 'react';

const Webcam = () => {
  const [devices, setDevices] = useState<MediaDeviceInfo[] | []>([]);
  const videoRef = useRef<HTMLVideoElement>(null);
  // menu
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const open = Boolean(anchorEl);
  const openWebcams = (event: React.MouseEvent<HTMLElement>) => {
    setAnchorEl(event.currentTarget);
  };
  const [webcamStarted, setWebcamStarted] = useState(false);
  const [deviceLabel, setDeviceLabel] = useState('');
  const [threshs, setThreshs] = useState([120, 150]);
  const [showCircle, setShowCircle] = useState(false);
  const [showThreshs, setShowThreshs] = useState(false);

  const closeWebcams = () => {
    setAnchorEl(null);
  };

  async function getWebcams() {
    const mydevices = await navigator.mediaDevices.enumerateDevices();
    setDevices(mydevices.filter((device) => device.kind === 'videoinput'));
  }

  useEffect(() => {
    getWebcams();
  }, []);

  const stopWebcam = () => {
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
    setWebcamStarted(false);
    setDeviceLabel('');
  };

  async function selectWebcam(device: MediaDeviceInfo) {
    if (webcamStarted) {
      // stop previous webcam if running before starting new one
      stopWebcam();
    }
    setWebcamStarted(true);
    setDeviceLabel(device.label);
    closeWebcams();

    const constraints = {
      audio: false,
      video: {
        deviceId: device.deviceId,
      },
    };

    const stream = await navigator.mediaDevices.getUserMedia(constraints);
    if (videoRef.current) {
      videoRef.current.srcObject = stream;
      videoRef.current.play();
    }
  }

  return (
    <div>
      <Menu
        id="webcams-menu"
        aria-labelledby="webcams-menu"
        anchorEl={anchorEl}
        open={open}
        onClose={closeWebcams}
        anchorOrigin={{
          vertical: 'top',
          horizontal: 'left',
        }}
        transformOrigin={{
          vertical: 'top',
          horizontal: 'left',
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
          display: 'flex',
          flexDirection: 'row',
          p: 1,
          m: 1,
          justifyContent: 'center',
        }}
      >
        <Button
          id="webcams-menu-btn"
          aria-controls={open ? 'webcams-menu' : undefined}
          aria-haspopup="true"
          aria-expanded={open ? 'true' : undefined}
          onClick={openWebcams}
          variant="contained"
          sx={{ mr: 2 }}
        >
          <span role="img" aria-label="webcam">
            🎥
          </span>
          {deviceLabel === '' ? 'Choose a webcam' : deviceLabel}
        </Button>
        {webcamStarted ? (
          <Button onClick={stopWebcam} variant="contained" color="error">
            Close
          </Button>
        ) : null}
      </Box>
      <Box
        sx={{
          display: 'flex',
          flexDirection: 'row',
          p: 1,
          m: 1,
          justifyContent: 'center',
        }}
      >
        <video
          ref={videoRef}
          style={{
            width: '100%',
            aspectRatio: '1280/720',
          }}
        />
      </Box>
      <Stack spacing={2} direction="row" sx={{ mb: 1 }} alignItems="center">
        <Typography textAlign="center" variant="body1">
          Thresholds
        </Typography>
        <Slider
          aria-label="Threshold"
          value={threshs}
          min={0}
          max={255}
          // @ts-expect-error: expect error here due to possibility that newLevel be an array
          onChange={(_1, newThreshs, _2) => setThreshs(newThreshs)}
        />
      </Stack>
      <Box
        sx={{
          display: 'flex',
          flexDirection: 'row',
          p: 1,
          m: 1,
          justifyContent: 'center',
        }}
      >
        <FormControlLabel
          control={
            <Checkbox
              aria-label="showThresholds"
              checked={showThreshs}
              onChange={(_1, checked) => setShowThreshs(checked)}
            />
          }
          label="Show thresholds"
        />
        <FormControlLabel
          control={
            <Checkbox
              aria-label="showCircle"
              checked={showCircle}
              onChange={(_1, checked) => setShowCircle(checked)}
            />
          }
          label="Show detected circle"
        />
      </Box>
    </div>
  );
};

export default Webcam;

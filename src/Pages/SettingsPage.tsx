import { Box, Button, Typography } from "@mui/material";
import Webcam from "./components/Webcam";
import Mic from "./components/Mic";
// eslint-disable-next-line import/no-unresolved
import Worker from "worker-loader!./components/Worker";

const SettingsPage = ({
  setCameraId,
  setMicId,
  setMicThresh,
  micThresh,
  cameraWorker,
  webcams,
  mics,
  handleClose
}: IProps) => {
  return (
    <div>
      <Typography textAlign="center" variant="h3">
        Settings
      </Typography>
      <Box
        sx={{
          display: "flex",
          flexDirection: "row",
          p: 1,
          m: 1,
        }}
      >
        <Box sx={{ width: "50%", p: 1 }}>
          <Mic setMicId={setMicId} setMicThresh={setMicThresh} micThresh={micThresh} mics={mics} />
        </Box>
        <Box sx={{ width: "50%", p: 1 }}>
          <Webcam setCameraId={setCameraId} cameraWorker={cameraWorker} webcams={webcams} />
        </Box>
      </Box>
      <Box textAlign='center'>
        <Button variant='contained' color='secondary' onClick={handleClose}>
          Save & Close
        </Button>
      </Box>
    </div>
  );
};

interface IProps {
  setCameraId: (id: number) => void;
  setMicId: (id: string) => void;
  setMicThresh: (thresh: number) => void;
  micThresh: number;
  cameraWorker: Worker | null;
  webcams: MediaDeviceInfo[];
  mics: MediaDeviceInfo[];
  handleClose: () => void;
}

export default SettingsPage;

import { Box, Typography } from "@mui/material";
import Webcam from "./components/Webcam";
import Mic from "./components/Mic";
import electron from "../ipc";

electron.ipcRenderer.getOpenCVVersion((version) => {
  console.log(`(SettingsPage) OpenCV Version: ${version}`);
});

const SettingsPage = ( {setCameraId, setMicId, setCameraThreshs, setMicThresh, setCameraUpDownDetection }: IProps) => {
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
          <Mic setMicId={setMicId} setMicThresh={setMicThresh} />
        </Box>
        <Box sx={{ width: "50%", p: 1 }}>
          <Webcam setCameraId={setCameraId} setCameraThreshs={setCameraThreshs} setCameraUpDownDetection={setCameraUpDownDetection} />
        </Box>
      </Box>
    </div>
  );
};

interface IProps {
  setCameraId: (id: number) => void;
  setMicId: (id: string) => void;
  setCameraThreshs: (threshs: number[]) => void;
  setMicThresh: (thresh: number) => void;
  setCameraUpDownDetection: (upDownDetection: boolean) => void;
}

export default SettingsPage;

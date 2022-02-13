import { Box, Typography } from '@mui/material';
import Webcam from './components/Webcam';
import Mic from './components/Mic';
import electron from '../ipc';

electron.ipcRenderer.getOpenCVVersion((version) => {
    console.log(`(SettingsPage) OpenCV Version: ${version}`);
});

const SettingsPage = () => {
  return (
    <div>
      <Typography textAlign="center" variant="h3">
        Settings
      </Typography>
      <Box
        sx={{
          display: 'flex',
          flexDirection: 'row',
          p: 1,
          m: 1,
        }}
      >
        <Box sx={{ width: '50%', p: 1 }}>
          <Mic />
        </Box>
        <Box sx={{ width: '50%', p: 1 }}>
          <Webcam />
        </Box>
      </Box>
    </div>
  );
};

export default SettingsPage;

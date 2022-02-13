import { useState } from 'react';
import { Box, Typography } from '@mui/material';
import Webcam from './components/Webcam';
import Mic from './components/Mic';

/* declare let electron: {
  ipcRenderer: {
    sendMsg: (msg: string) => void;
    on: (channel_name: string, fn: (msg: string) => void) => void;
    once: (channel_name: string, fn: (msg: string) => void) => void;
  };
}; */

const SettingsPage = () => {
  const [opencvVersion, setOpencvVersion] = useState('');

  /* electron.ipcRenderer.on('main-render-channel', (msg) => {
    console.log(`Received: ${msg}`);
    if (msg.startsWith('opencv-version: ')) {
      const opencv_version = msg.split(' ')[1];
      setOpencvVersion(` (v${opencv_version})`);
    }
  });
  electron.ipcRenderer.sendMsg('hello main!'); */

  return (
    <div>
      <Typography textAlign="center" variant="h3">
        Settings{opencvVersion}
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

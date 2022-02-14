import * as React from 'react';
import AppBar from '@mui/material/AppBar';
import Box from '@mui/material/Box';
import Toolbar from '@mui/material/Toolbar';
import Typography from '@mui/material/Typography';
import Button from '@mui/material/Button';
import { IconButton, Modal } from '@mui/material';
import SettingsIcon from '@mui/icons-material/Settings';
import SettingsPage from '../SettingsPage/SettingsPage';

export default function MainPage() {
    const [open, setOpen] = React.useState(false);
    const handleOpen = () => setOpen(true);
    const handleClose = () => setOpen(false);

    const style = {
        position: 'absolute' as 'absolute',
        top: '50%',
        left: '50%',
        transform: 'translate(-50%, -50%)',
        width: '50%',
        bgcolor: 'background.paper',
        border: '2px solid #000',
        boxShadow: 24,
        p: 4,
    };

    return (
        <Box sx={{ flexGrow: 1 }}>
        <AppBar position="static">
            <Toolbar>
            <Typography variant="h6" noWrap component="div" sx={{ flexGrow: 1 }}>
                STASYS
            </Typography>
            <IconButton 
                size="large"
                edge="start"
                color="inherit"
                sx={{ mr: 2 }}
                onClick={handleOpen}>
                <SettingsIcon />
            </IconButton>
            <Modal
                open={open}
                onClose={handleClose}
                aria-labelledby="modal-modal-title"
                aria-describedby="modal-modal-description"
            >
                <Box sx={style}>
                    <SettingsPage />
                </Box>
            </Modal>
            <Button color="inherit">CALIBRATE</Button>
            <Button color="inherit">SHOOT</Button>
            </Toolbar>
        </AppBar>
        </Box>
    );
}
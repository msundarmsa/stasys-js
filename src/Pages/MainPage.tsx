import { useState } from 'react';
import AppBar from '@mui/material/AppBar';
import Box from '@mui/material/Box';
import Toolbar from '@mui/material/Toolbar';
import Typography from '@mui/material/Typography';
import Button from '@mui/material/Button';
import { IconButton, List, ListItem, Modal } from '@mui/material';
import SettingsIcon from '@mui/icons-material/Settings';
import SettingsPage from './SettingsPage';
import ScoreStatCard from './components/ScoreStatCard';
import { Target, ZoomedTarget } from './components/Target';
import ShotTable from './components/ShotTable';
import LineChart from './components/LineChart';

const onetoten = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10];

export default function MainPage() {
    // settings modal
    const [open, setOpen] = useState(false);
    const handleOpen = () => setOpen(true);
    const handleClose = () => setOpen(false);
    
    // score stats
    const [stab, setStab] = useState(0);
    const [desc, setDesc] = useState(0);
    const [aim, setAim] = useState(0);

    const style = {
        position: 'absolute',
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
        <div style={{ display: 'flex', flexFlow: 'column', height: '100%', maxHeight: '100%', overflow: 'hidden' }}>
            <AppBar position="static">
                <Toolbar>
                    <img src='/assets/images/logo.svg' height='20' width='20' style={{ verticalAlign: 'middle', marginRight: 10 }} />
                    <Typography variant="h6" noWrap component="div" sx={{ flexGrow: 1 }}>
                        STASYS
                    </Typography>
                    <IconButton 
                        size="large"
                        edge="start"
                        color="inherit"
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
            <div style={{ flex: '1 1 auto', display: 'flex', gap: '10px', margin: '10px', overflow: 'hidden' }}>
                <div style={{ flex: '40%', display: 'flex', flexDirection: 'column', gap: 10}}>
                    <div style={{ flex: '80%', border: '1px solid #D7EC58', borderRadius: '25px'}}>
                        <Target />
                    </div>
                    <div style={{ flex: '20%', display: 'flex'}}>
                        <ScoreStatCard scoreStatType='STABLITITY' scoreStat={stab} dp={0} suffix='%' />
                        <ScoreStatCard scoreStatType='DESC' scoreStat={desc} dp={1} suffix='s' />
                        <ScoreStatCard scoreStatType='AIM' scoreStat={aim} dp={1} suffix='s' />
                    </div>
                </div>
                <div style={{ flex: '20%', border: '1px solid #D7EC58', borderRadius: '25px', overflow: 'auto' }}> 
                    <List>
                        {onetoten.map((val, id) => (
                            <ListItem>
                                <ZoomedTarget />
                            </ListItem>
                        ))}
                    </List>
                </div>
                <div style={{ flex: '40%', display: 'flex', flexDirection: 'column', gap: 10 }}>
                    <div style={{ flex: '60%', border: '1px solid #D7EC58', borderRadius: '25px', overflow: 'hidden' }}>
                        <ShotTable />
                    </div>
                    <div style={{ flex: '40%', border: '1px solid #D7EC58', borderRadius: '25px'}}>
                        <LineChart data={[]} xMin={-0.5} xMax={0.5} yMin={-40} yMax={40} yAxisLabel='displacement (mm)' xAxisLoc='middle' />
                    </div>
                </div>
            </div>
        </div>
    );
}
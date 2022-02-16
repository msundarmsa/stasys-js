import { useState } from "react";
import AppBar from "@mui/material/AppBar";
import Box from "@mui/material/Box";
import Toolbar from "@mui/material/Toolbar";
import Typography from "@mui/material/Typography";
import Button from "@mui/material/Button";
import { IconButton, List, ListItem, Modal } from "@mui/material";
import SettingsIcon from "@mui/icons-material/Settings";
import SettingsPage from "./SettingsPage";
import ScoreStatCard from "./components/ScoreStatCard";
import { Target, ZoomedTarget } from "./components/Target";
import ShotTable from "./components/ShotTable";
import LineChart from "./components/LineChart";
import { genRandomShots, Shot } from "../ShotUtils";

export default function MainPage() {
  // settings modal
  const [open, setOpen] = useState(false);
  const handleOpen = () => setOpen(true);
  const handleClose = () => setOpen(false);

  const [shots, setShots] = useState<Shot[]>([]);
  const [shotGroups, setShotGroups] = useState<Shot[][]>([]);
  const [allShots, setAllShots] = useState<Shot[]>([]);
  const [shot, setShot] = useState<Shot>();
  const [beforeTrace, setBeforeTrace] = useState<[number, number]>();
  const [afterTrace, setAfterTrace] = useState<[number, number]>();

  const style = {
    position: "absolute",
    top: "50%",
    left: "50%",
    transform: "translate(-50%, -50%)",
    width: "50%",
    bgcolor: "background.paper",
    border: "2px solid #000",
    boxShadow: 24,
    p: 4,
  };

  const handleTest = () => {
    const allTestShots = genRandomShots(8);
    const testShotGroups: Shot[][] = [];
    let currIdx = 0;
    while (currIdx + 10 < allTestShots.length) {
      const shotGroup: Shot[] = [];
      for (let i = currIdx; i < currIdx + 10; i++) {
        shotGroup.push(allTestShots[i]);
      }
      testShotGroups.push(shotGroup.reverse());
      currIdx += 10;
    }

    const testShots: Shot[] = [];
    for (let i = currIdx; i < allTestShots.length - 1; i++) {
      testShots.push(allTestShots[i]);
    }

    // add test shots to shot group as well to check zoomed
    testShotGroups.push(testShots);

    setShot(allTestShots[allTestShots.length - 1]);
    setShots(testShots.reverse());
    setShotGroups(testShotGroups.reverse());
    setAllShots(allTestShots.reverse());
  };

  return (
    <div
      style={{
        display: "flex",
        flexFlow: "column",
        height: "100%",
        maxHeight: "100%",
        overflow: "hidden",
      }}
    >
      <AppBar position="static">
        <Toolbar>
          <img
            src="/assets/images/logo.svg"
            height="20"
            width="20"
            style={{ verticalAlign: "middle", marginRight: 10 }}
          />
          <Typography variant="h6" noWrap component="div" sx={{ flexGrow: 1 }}>
            STASYS
          </Typography>
          <Button color="secondary" onClick={handleTest}>
            TEST
          </Button>
          <IconButton
            size="large"
            edge="start"
            color="inherit"
            onClick={handleOpen}
          >
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
      <div
        style={{
          flex: "1 1 auto",
          display: "flex",
          gap: "10px",
          margin: "10px",
          overflow: "hidden",
        }}
      >
        <div
          style={{
            flex: "40%",
            display: "flex",
            flexDirection: "column",
            gap: 10,
          }}
        >
          <div
            style={{
              flex: "80%",
              border: "1px solid #D7EC58",
              borderRadius: "25px",
            }}
          >
            <Target
              shots={shots}
              shot={shot}
              newBefore={beforeTrace}
              newAfter={afterTrace}
            />
          </div>
          <div style={{ flex: "20%", display: "flex" }}>
            <ScoreStatCard
              scoreStatType="STABLITITY"
              scoreStat={shot ? shot.stab : 0}
              dp={0}
              suffix="%"
            />
            <ScoreStatCard
              scoreStatType="DESC"
              scoreStat={shot ? shot.desc : 0}
              dp={1}
              suffix="s"
            />
            <ScoreStatCard
              scoreStatType="AIM"
              scoreStat={shot ? shot.aim : 0}
              dp={1}
              suffix="s"
            />
          </div>
        </div>
        <div
          style={{
            flex: "20%",
            border: "1px solid #D7EC58",
            borderRadius: "25px",
            overflow: "auto",
          }}
        >
          <List>
            {shotGroups.map((shotGroup, id) => (
              <ListItem>
                <ZoomedTarget shots={shotGroup} />
              </ListItem>
            ))}
          </List>
        </div>
        <div
          style={{
            flex: "40%",
            display: "flex",
            flexDirection: "column",
            gap: 10,
          }}
        >
          <div
            style={{
              flex: "60%",
              border: "1px solid #D7EC58",
              borderRadius: "25px",
              overflow: "hidden",
            }}
          >
            <ShotTable shots={allShots} />
          </div>
          <div
            style={{
              flex: "40%",
              border: "1px solid #D7EC58",
              borderRadius: "25px",
            }}
          >
            <LineChart
              data={[]}
              xMin={-0.5}
              xMax={0.5}
              yMin={-40}
              yMax={40}
              yAxisLabel="displacement (mm)"
              xAxisLoc="middle"
              name="shotplot"
            />
          </div>
        </div>
      </div>
    </div>
  );
}

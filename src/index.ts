import { app, BrowserWindow, systemPreferences, ipcMain } from "electron";
import path from "path";

// This allows TypeScript to pick up the magic constant that's auto-generated by Forge's Webpack
// plugin that tells the Electron app where to look for the Webpack-bundled app code (depending on
// whether you're running in development or production).
declare const MAIN_WINDOW_WEBPACK_ENTRY: string;
declare const MAIN_WINDOW_PRELOAD_WEBPACK_ENTRY: string;

// listen on channel for messages from render process
ipcMain.once("main-render-channel", async (event) => {
  const testVidPath = path.join(app.getAppPath(), ".webpack", "renderer", "assets", "test_vids", "720p_120fps_2_shots.mp4");
  const testTriggers = [1800, 5400];
  const testCalibratePoint = {
    r: 65.52388567802231,
    time: 0,
    x: 530.0256890190974,
    y: 433.28644789997327,
  };
  const args = [testVidPath, testTriggers, testCalibratePoint];
  console.log("Sending test args");
  console.log(args);
  event.sender.send('main-render-channel', args);
});

// request access to camera and mic (for macOS only)
async function requestMediaAccess(mediaType: "microphone" | "camera"): Promise<boolean> {
  try {
    if (process.platform !== "darwin") {
      return true;
    }

    const status = await systemPreferences.getMediaAccessStatus(mediaType);
    console.log(`Current ${mediaType} access status: ${status}`);

    if (status === "not-determined") {
      const success = await systemPreferences.askForMediaAccess(mediaType);
      console.log(`Result of ${mediaType} access: ${success.valueOf() ? "granted" : "denied"}`);
      return success.valueOf();
    }

    return status === "granted";
  } catch (error) {
    console.log(`Could not get ${mediaType} permission: ${error}`);
  }
  return false;
}

// Handle creating/removing shortcuts on Windows when installing/uninstalling.
if (require("electron-squirrel-startup")) {
  // eslint-disable-line global-require
  app.quit();
}

const createWindow = (): void => {
  // Create the browser window.
  const mainWindow = new BrowserWindow({
    height: 720,
    width: 1280,
    webPreferences: {
      preload: MAIN_WINDOW_PRELOAD_WEBPACK_ENTRY,
      nodeIntegrationInWorker: true,
    },
    show: false,
  });

  // make full screen
  mainWindow.maximize();

  // and load the index.html of the app.
  mainWindow.loadURL(MAIN_WINDOW_WEBPACK_ENTRY);

  // show window
  mainWindow.show();

  // show dev tools
  mainWindow.webContents.openDevTools()
};

// This method will be called when Electron has finished
// initialization and is ready to create browser windows.
// Some APIs can only be used after this event occurs.
app.on("ready", () => {
  requestMediaAccess("microphone");
  requestMediaAccess("camera");
  createWindow();
});

// Quit when all windows are closed, except on macOS. There, it's common
// for applications and their menu bar to stay active until the user quits
// explicitly with Cmd + Q.
app.on("window-all-closed", () => {
  if (process.platform !== "darwin") {
    app.quit();
  }
});

app.on("activate", () => {
  // On OS X it's common to re-create a window in the app when the
  // dock icon is clicked and there are no other windows open.
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow();
  }
});

// In this file you can include the rest of your app's specific main process
// code. You can also put them in separate files and import them here.

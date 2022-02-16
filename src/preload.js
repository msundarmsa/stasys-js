const { contextBridge, ipcRenderer } = require("electron");

contextBridge.exposeInMainWorld("electron", {
  ipcRenderer: {
    sendMsg(arg) {
      ipcRenderer.send("main-render-channel", "MSG", arg);
    },
    startCamera(index) {
      ipcRenderer.send("main-render-channel", "START_CAMERA", index);
    },
    stopCamera() {
      ipcRenderer.send("main-render-channel", "STOP_CAMERA");
    },
    getOpenCVVersion(func) {
      ipcRenderer.send("main-render-channel", "GET_OPENCV_VERSION");
      const handleReply = (event, ...args) => {
        if (args[0] == "OPENCV_VERSION") {
          func(args[1]);
          ipcRenderer.removeListener("main-render-channel", handleReply);
        }
      };

      ipcRenderer.on("main-render-channel", handleReply);
    },
    on(channel, func) {
      // on => listen on channel continuously
      // only listen on valid channels
      const validChannels = ["main-render-channel"];
      if (validChannels.includes(channel)) {
        // Deliberately strip event as it includes `sender`
        ipcRenderer.on(channel, (event, ...args) => func(...args));
      }
    },
    once(channel, func) {
      // once => listen on channel for a single event
      // only listen on valid channels
      const validChannels = ["main-render-channel"];
      if (validChannels.includes(channel)) {
        // Deliberately strip event as it includes `sender`
        ipcRenderer.once(channel, (event, ...args) => func(...args));
      }
    },
  },
});

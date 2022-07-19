const { contextBridge, ipcRenderer } = require("electron");

contextBridge.exposeInMainWorld("electron", {
  ipcRenderer: {
    sendMsgOnChannel(channel, arg) {
      ipcRenderer.send(channel, arg);
    },
    on(channel, func) {
      // on => listen on channel continuously
      // only listen on valid channels
      const validChannels = ["main-render-channel", "camera-render-channel"];
      if (validChannels.includes(channel)) {
        // Deliberately strip event as it includes `sender`
        ipcRenderer.on(channel, (event, ...args) => func(...args));
      }
    },
    once(channel, func) {
      // once => listen on channel for a single event
      // only listen on valid channels
      const validChannels = ["main-render-channel", "camera-render-channel"];
      if (validChannels.includes(channel)) {
        // Deliberately strip event as it includes `sender`
        ipcRenderer.once(channel, (event, ...args) => func(...args));
      }
    },
    removeAllListeners(channel) {
      ipcRenderer.removeAllListeners(channel);
    }
  },
});

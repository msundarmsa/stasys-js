const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electron', {
  ipcRenderer: {
    sendMsg(arg) {
      ipcRenderer.send('main-render-channel', arg);
    },
    on(channel, func) {
      // on => listen on channel continuously
      // only listen on valid channels
      const validChannels = ['main-render-channel'];
      if (validChannels.includes(channel)) {
        // Deliberately strip event as it includes `sender`
        ipcRenderer.on(channel, (event, ...args) => func(...args));
      }
    },
    once(channel, func) {
      // once => listen on channel for a single event
      // only listen on valid channels
      const validChannels = ['main-render-channel'];
      if (validChannels.includes(channel)) {
        // Deliberately strip event as it includes `sender`
        ipcRenderer.once(channel, (event, ...args) => func(...args));
      }
    },
  },
});

declare let electron: {
  ipcRenderer: {
    sendMsgOnChannel: (channel: string, msg: any) => void;
    on: (channel_name: string, fn: (args: any[]) => void) => void;
    once: (channel_name: string, fn: (args: any[]) => void) => void;
    removeAllListeners: (channel_name: string) => void;
  };
};

export default electron;

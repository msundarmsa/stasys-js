declare let electron: {
  ipcRenderer: {
    sendMsg: (msg: string) => void;
    on: (channel_name: string, fn: (args: any[]) => void) => void;
    once: (channel_name: string, fn: (args: any[]) => void) => void;
  };
};

export default electron;

declare let electron: {
  ipcRenderer: {
    sendMsg: (msg: string) => void;
    startCamera: (index: number) => void;
    stopCamera: () => void;
    getOpenCVVersion: (fn: (version: string) => void) => void;
    on: (channel_name: string, fn: (args: any[]) => void) => void;
    once: (channel_name: string, fn: (args: any[]) => void) => void;
  };
};

export default electron;

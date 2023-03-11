const { contextBridge, ipcRenderer } = require("electron");

contextBridge.exposeInMainWorld("electron", {
  browserWindow: {
    minimize() {
      ipcRenderer.send("win:minimize");
    },
    maximize() {
      ipcRenderer.send("win:maximize");
    },
    unmaximize() {
      ipcRenderer.send("win:unmaximize");
    },
    close() {
      ipcRenderer.send("win:close");
    },
    onStateChanged(callback) {
      ipcRenderer.on("window-state-change", callback);
    }
  },
  node     : () => process.versions.node,
  chrome   : () => process.versions.chrome,
  electron : () => process.versions.electron
});
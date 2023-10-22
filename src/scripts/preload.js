const { contextBridge, ipcRenderer, systemPreferences, nativeTheme } = require("electron");

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
    focus() {
      ipcRenderer.send("win:focus");
    },
    show() {
      ipcRenderer.send("win:show");
    },
    moveTop() {
      ipcRenderer.send("win:moveTop");
    },
    flashFrame(state) {
      ipcRenderer.send("win:flashFrame", state);
    },
    onStateChanged(callback) {
      ipcRenderer.on("window-state-change", callback);
    }
  },
  node     : () => process.versions.node,
  chrome   : () => process.versions.chrome,
  electron : () => process.versions.electron
});
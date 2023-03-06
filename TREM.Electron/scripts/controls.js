document.getElementById("win-minimize").onclick = () => {
  window.electron.browserWindow.minimize();
};

document.getElementById("win-maximize").onclick = () => {
  window.electron.browserWindow.maximize();
};

document.getElementById("win-unmaximize").onclick = () => {
  window.electron.browserWindow.unmaximize();
};

document.getElementById("win-close").onclick = () => {
  window.electron.browserWindow.close();
};

window.electron.browserWindow.onStateChanged((ev, showUnmaxmize) => {
  console.log(ev, showUnmaxmize);

  if (showUnmaxmize) {
    document.getElementById("win-maximize").style.display = "none";
    document.getElementById("win-unmaximize").style.display = "";
  } else {
    document.getElementById("win-maximize").style.display = "";
    document.getElementById("win-unmaximize").style.display = "none";
  }
});
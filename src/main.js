const { BrowserWindow, Menu, Notification, app, Tray, ipcMain, nativeImage, shell, powerMonitor, powerSaveBlocker } = require("electron");
const electronPushReceiver = require("electron-fcm-push-receiver");
const { writeFileSync, existsSync, mkdir, mkdirSync } = require("node:fs");
const path = require("node:path");

let _hide = false;
let _devMode = false;

if (process.argv.includes("--start")) _hide = true;

if (process.argv.includes("--dev")) _devMode = true;

/**
 * @type {BrowserWindow}
 */
let MainWindow;

/**
 * @type {Tray}
 */
let TrayIcon;

app.setLoginItemSettings({
  openAtLogin : true,
  name        : "TREM",
  args        : ["--start"],
});

function createWindow() {
  MainWindow = new BrowserWindow({
    title              : "Taiwan Real-time Earthquake Monitoring",
    width              : 1200,
    minWidth           : 800,
    height             : 720,
    minHeight          : 720,
    resizable          : true,
    show               : false,
    icon               : "TREM.ico",
    backgroundMaterial : "mica",
    autoHideMenuBar    : true,
    webPreferences     : {
      nodeIntegration      : true,
      contextIsolation     : false,
      backgroundThrottling : false
    },
  });

  ipcMain.on("win:minimize", () => MainWindow.minimize());
  ipcMain.on("win:maximize", () => MainWindow.maximize());
  ipcMain.on("win:unmaximize", () => MainWindow.unmaximize());
  ipcMain.on("win:close", () => MainWindow.close());
  ipcMain.on("win:focus", () => MainWindow.show());
  ipcMain.on("win:show", () => MainWindow.showInactive());
  ipcMain.on("win:moveTop", () => {
    MainWindow.setAlwaysOnTop(true);
    MainWindow.setAlwaysOnTop(false);
  });
  ipcMain.on("win:flashFrame", (ev, state) => MainWindow.flashFrame(state));
  ipcMain.on("win:screenshot", () => {
    MainWindow.webContents.capturePage().then((image) => {
      const dir = path.join(app.getPath("pictures"), "TREM");
      const imagePath = path.join(dir, `screenshot_${Date.now()}.png`);

      if (!existsSync(dir))
        mkdirSync(dir);

      writeFileSync(imagePath, image.toPNG());
      shell.showItemInFolder(imagePath);
    });
  });
  MainWindow.on("maximize", () => MainWindow.webContents.send("window-state-change", true));
  MainWindow.on("unmaximize", () => MainWindow.webContents.send("window-state-change", false));

  process.env.window = MainWindow.id;
  MainWindow.loadFile("./views/index.html");
  // MainWindow.setMenu(null);

  electronPushReceiver.setup(MainWindow.webContents);

  MainWindow.webContents.on("did-finish-load", () => {
    if (!_hide) setTimeout(() => MainWindow.show(), 500);
  });

  if (process.platform === "win32")
    app.setAppUserModelId("TREM | 臺灣即時地震監測");

  MainWindow.on("resize", () => {
    MainWindow.webContents.invalidate();
  });

  MainWindow.on("close", (event) => {

    /*
    if (!app.isQuiting) {
      event.preventDefault();
      MainWindow.hide();

      if (SettingWindow)
        SettingWindow.close();
      event.returnValue = false;
    } else {
      app.quit();
    }
    */
  });
}

const shouldQuit = app.requestSingleInstanceLock();

if (!shouldQuit) {
  app.quit();
} else {
  app.on("second-instance", (event, argv, cwd) => {
    if (MainWindow != null) MainWindow.show();
  });
  let psb;
  app.whenReady().then(() => {
    // trayIcon();
    createWindow();
    powerMonitor.on("lock-screen", () => {
      if (psb != null) powerSaveBlocker.stop(psb);
      psb = powerSaveBlocker.start("prevent-display-sleep");
    });
    powerMonitor.on("suspend", () => {
      if (psb != null) powerSaveBlocker.stop(psb);
      powerSaveBlocker.start("prevent-app-suspension");
    });
    powerMonitor.on("resume", () => {
      if (psb != null) powerSaveBlocker.stop(psb);
      psb = null;
    });
  });
}

app.on("ready", () => {
  // todo
});

app.on("before-quit", () => {
  app.isQuiting = true;

  if (TrayIcon)
    TrayIcon.destroy();
});

function trayIcon() {
  if (TrayIcon) {
    TrayIcon.destroy();
    TrayIcon = null;
  }

  const iconPath = path.join(__dirname, "TREM.ico");
  TrayIcon = new Tray(nativeImage.createFromPath(iconPath));
  TrayIcon.setIgnoreDoubleClickEvents(true);
  TrayIcon.on("click", (e) => {
    if (MainWindow != null)
      if (MainWindow.isVisible())
        MainWindow.hide();
      else
        MainWindow.show();
  });
  const contextMenu = Menu.buildFromTemplate([
    {
      label : `TREM v${app.getVersion()}`,
      type  : "normal",
      click : () => {
        shell.openExternal("https://github.com/ExpTechTW/TREM");
      },
    },
    {
      type: "separator",
    },
    {
      label : app.Localization.getString("Tray_Show"),
      type  : "normal",
      click : () => {
        MainWindow.show();
      },
    },
    {
      label : app.Localization.getString("Tray_Hide"),
      type  : "normal",
      click : () => {
        MainWindow.hide();
      },
    },
    {
      label : app.Localization.getString("Tray_Exit"),
      type  : "normal",
      click : () => {
        app.isQuiting = true;
        app.exit(0);
      },
    },
  ]);
  TrayIcon.setToolTip(app.Localization.getString("Application_Title"));
  TrayIcon.setContextMenu(contextMenu);
}

// #region override prototype
if (!Date.prototype.format)
  Date.prototype.format

	/**
	 * Format DateTime into string with provided formatting string.
	 * @param {string} format The formatting string to use.
	 * @returns {string} The formatted string.
	 */
	= function(format) {

      /**
		 * @type {Date}
		 */
      const me = this;
      return format.replace(/a|A|Z|S(SS)?|ss?|mm?|HH?|hh?|D{1,2}|M{1,2}|YY(YY)?|'([^']|'')*'/g, (str) => {
        let c1 = str.charAt(0);
        const ret = str.charAt(0) == "'"
          ? (c1 = 0) || str.slice(1, -1).replace(/''/g, "'")
          : str == "a"
            ? (me.getHours() < 12 ? "am" : "pm")
            : str == "A"
              ? (me.getHours() < 12 ? "AM" : "PM")
              : str == "Z"
                ? (("+" + -me.getTimezoneOffset() / 60).replace(/^\D?(\D)/, "$1").replace(/^(.)(.)$/, "$10$2") + "00")
                : c1 == "S"
                  ? me.getMilliseconds()
                  : c1 == "s"
                    ? me.getSeconds()
                    : c1 == "H"
                      ? me.getHours()
                      : c1 == "h"
                        ? (me.getHours() % 12) || 12
                        : c1 == "D"
                          ? me.getDate()
                          : c1 == "m"
                            ? me.getMinutes()
                            : c1 == "M"
                              ? me.getMonth() + 1
                              : ("" + me.getFullYear()).slice(-str.length);
        return c1 && str.length < 4 && ("" + ret).length < str.length
          ? ("00" + ret).slice(-str.length)
          : ret;
      });
    };

if (!String.prototype.format)
  String.prototype.format = function() {
    const args = arguments;
    return this.replace(/{(\d+)}/g, (match, number) => typeof args[number] != "undefined"
      ? args[number]
      : match,
    );
  };
// #endregion
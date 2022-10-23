const { BrowserWindow, Menu, Notification, app: TREM, Tray, ipcMain, nativeImage, shell } = require("electron");
const Configuration = require("./Configuration/Configuration");
const { autoUpdater } = require("electron-updater");
const fetch = require("node-fetch").default;
const fs = require("fs");
const logger = require("electron-log");
const path = require("path");
const pushReceiver = require("electron-fcm-push-receiver");

TREM.Configuration = new Configuration(TREM);
TREM.Utils = require("./Utils/Utils.js");
TREM.Localization = new (require("./Localization/Localization"))(TREM.Configuration.data["general.locale"], TREM.getLocale());
TREM.Window = new Map();

autoUpdater.autoDownload = false;
autoUpdater.autoInstallOnAppQuit = true;
autoUpdater.logger = logger;

/**
 * @type {Tray}
 */
let tray = null;
let _hide = TREM.Configuration.data["windows.minimize"];
let _devMode = false;

if (process.argv.includes("--start")) _hide = true;
if (process.argv.includes("--dev")) _devMode = true;

const latestLog = path.join(TREM.getPath("logs"), "latest.log");
if (fs.existsSync(latestLog)) {
	const filetime = fs.statSync(latestLog).mtime;
	const filename = (new Date(filetime.getTime() - (filetime.getTimezoneOffset() * 60000))).toISOString().slice(0, -1).replace(/:+|\.+/g, "-");
	fs.renameSync(path.join(TREM.getPath("logs"), "latest.log"), path.join(TREM.getPath("logs"), `${filename}.log`));
}

if (!fs.existsSync(path.join(TREM.getPath("userData"), "server.json")))
	fs.writeFileSync(path.join(TREM.getPath("userData"), "server.json"), JSON.stringify([]));

if (!TREM.Configuration.data["compatibility.hwaccel"]) {
	TREM.disableHardwareAcceleration();
	logger.info("Hardware Acceleration is disabled.");
}

/**
 * @type {BrowserWindow}
 */
let MainWindow = TREM.Window.get("main");
/**
 * @type {BrowserWindow}
 */
let SettingWindow = TREM.Window.get("setting");

TREM.setLoginItemSettings({
	openAtLogin : TREM.Configuration.data["windows.startup"],
	name        : "TREM",
	args        : TREM.Configuration.data["windows.minimize"] ? ["--start"] : [],
});

TREM.commandLine.appendSwitch("disable-frame-rate-limit");

function createWindow() {
	fetch("https://exptech.com.tw/get?Function=EEW").catch(() => {
		setInterval(() => {
			fetch("https://exptech.com.tw/get?Function=EEW").then(() => {
				restart();
			});
		}, 5000);
	});
	MainWindow = TREM.Window.set("main", new BrowserWindow({
		title          : TREM.Localization.getString("Application_Title"),
		width          : 1280,
		minWidth       : 1280,
		height         : 720,
		minHeight      : 720,
		resizable      : true,
		show           : false,
		icon           : "TREM.ico",
		webPreferences : {
			preload              : path.join(__dirname, "preload.js"),
			nodeIntegration      : true,
			contextIsolation     : false,
			enableRemoteModule   : true,
			backgroundThrottling : false,
			nativeWindowOpen     : true,
		},
	})).get("main");
	require("@electron/remote/main").initialize();
	require("@electron/remote/main").enable(MainWindow.webContents);
	process.env.window = MainWindow.id;
	MainWindow.loadFile("./Views/MainView.html");
	MainWindow.setAspectRatio(16 / 9);
	MainWindow.setMenu(null);
	MainWindow.webContents.on("did-finish-load", () => {
		MainWindow.webContents.send("setting", TREM.Configuration._data);
		if (!_hide) setTimeout(() => MainWindow.show(), 500);
	});
	pushReceiver.setup(MainWindow.webContents);
	if (process.platform === "win32")
		TREM.setAppUserModelId("TREM | 臺灣即時地震監測");
	MainWindow.on("resize", () => {
		MainWindow.webContents.invalidate();
	});
	MainWindow.on("close", (event) => {
		if (TREM.Configuration.data["windows.tray"]) {
			event.preventDefault();
			MainWindow.hide();
			if (SettingWindow)
				SettingWindow.close();
		} else
			TREM.quit();
	});
}

function createSettingWindow() {
	if (SettingWindow instanceof BrowserWindow) return SettingWindow.focus();
	SettingWindow = TREM.Window.set("setting", new BrowserWindow({
		title          : TREM.Localization.getString("Setting_Title"),
		height         : 600,
		width          : 1000,
		minHeight      : 600,
		minWidth       : 800,
		frame          : false,
		transparent    : true,
		show           : false,
		icon           : "TREM.ico",
		webPreferences : {
			nodeIntegration  : true,
			contextIsolation : false,
		},
	})).get("setting");
	require("@electron/remote/main").enable(SettingWindow.webContents);
	SettingWindow.loadFile("./Views/SettingView.html");
	SettingWindow.setMenu(null);
	SettingWindow.webContents.on("did-finish-load", () => {
		SettingWindow.webContents.send("setting", TREM.Configuration._data);
		setTimeout(() => SettingWindow.show(), 500);
	});
	SettingWindow.on("close", () => {
		SettingWindow = null;
	});
}

const shouldQuit = TREM.requestSingleInstanceLock();
if (!shouldQuit)
	TREM.quit();
else {
	TREM.on("second-instance", (event, argv, cwd) => {
		if (MainWindow != null) MainWindow.show();
	});
	TREM.whenReady().then(() => {
		trayIcon();
		createWindow();
	});
}

TREM.on("ready", () => {
	autoUpdater.checkForUpdates();
});

autoUpdater.on("update-available", (info) => {
	if (TREM.Configuration.data["update.mode"] != "never")
		switch (TREM.Configuration.data["update.mode"]) {
			case "install": {
				autoUpdater.downloadUpdate();
				break;
			}

			case "download": {
				autoUpdater.downloadUpdate();
				break;
			}

			case "notify": {
				new Notification({
					title : TREM.Localization.getString("Notification_Update_Title"),
					body  : TREM.Localization.getString("Notification_Update_Body").format(TREM.getVersion(), info.version),
					icon  : "TREM.ico",
				}).on("click", () => {
					logger.info(info);
					shell.openExternal(`https://github.com/ExpTechTW/TREM/releases/tag/5.1.4${info.version}`);
				}).show();
				break;
			}

			default:
				break;
		}
});

autoUpdater.on("update-not-available", (info) => {
	logger.info("No new updates found");
});

autoUpdater.on("error", (err) => {
	logger.error(err);
});

autoUpdater.on("download-progress", (progressObj) => {
	if (MainWindow)
		MainWindow.setProgressBar(progressObj.percent);
});

autoUpdater.on("update-downloaded", (info) => {
	if (MainWindow)
		MainWindow.setProgressBar(0);
	if (TREM.Configuration.data["update.mode"] == "install")
		autoUpdater.quitAndInstall();
});

TREM.on("before-quit", () => {
	if (tray)
		tray.destroy();
});

ipcMain.on("toggleFullscreen", () => {
	if (MainWindow)
		MainWindow.setFullScreen(!MainWindow.isFullScreen());
});

ipcMain.on("openDevtool", () => {
	if (_devMode) {
		const currentWindow = BrowserWindow.getFocusedWindow();
		if (currentWindow)
			currentWindow.webContents.openDevTools({ mode: "detach" });
	}
});

ipcMain.on("openChildWindow", async (event, arg) => {
	await createSettingWindow();
});

ipcMain.on("reset", (event, arg) => {
	TREM.exit(0);
});

ipcMain.on("restart", () => {
	restart();
});

TREM.Configuration.on("update", (data) => {
	emitAllWindow("setting", data);
	emitAllWindow("config:color", data["theme.customColor"]);
});

TREM.Configuration.on("detect-locale", (data) => {
	const detectedLocale = TREM.Localization.matchLocale(TREM.getLocale());
	ipcMain.emit("config:value", "general.locale", detectedLocale);
});

TREM.Configuration.on("error", (error) => {
	emitAllWindow("settingError", error);
});

ipcMain.on("config:value", (event, key, value) => {
	switch (key) {
		case "theme.color": {
			emitAllWindow("config:theme", value);
			break;
		}

		case "theme.dark": {
			emitAllWindow("config:dark", value);
			break;
		}

		case "theme.customColor": {
			emitAllWindow("config:color", value);
			break;
		}

		case "general.locale": {
			TREM.Localization.setLocale(value);
			if (MainWindow) MainWindow.setTitle(TREM.Localization.getString("Application_Title"));
			if (SettingWindow) SettingWindow.setTitle(TREM.Localization.getString("Setting_Title"));
			trayIcon();
			emitAllWindow("config:locale", value);
			break;
		}

		case "location.town": {
			emitAllWindow("config:location", value);
			break;
		}

		case "windows.startup": {
			TREM.setLoginItemSettings({
				openAtLogin : value,
				name        : "TREM",
				args        : TREM.Configuration.data["windows.minimize"] ? ["--start"] : [],
			});
			break;
		}

		case "windows.minimize": {
			TREM.setLoginItemSettings({
				openAtLogin : TREM.Configuration.data["windows.startup"],
				name        : "TREM",
				args        : value ? ["--start"] : [],
			});
			break;
		}

		case "map.animation": {
			emitAllWindow("config:mapanimation", value);
			break;
		}

		default:
			break;
	}
	if (key.startsWith("theme.int"))
		emitAllWindow("config:color", key, value);

	TREM.Configuration.data[key] = value;
	emitAllWindow("setting", TREM.Configuration._data);
});

ipcMain.on("config:open", () => {
	shell.openPath(TREM.Configuration.path);
});

function restart() {
	TREM.relaunch();
	TREM.exit(0);
}

ipcMain.on("screenshotEEW", async (event, json) => {
	return;
	const folder = path.join(TREM.getPath("userData"), "EEW");
	if (!fs.existsSync(folder))
		fs.mkdirSync(folder);
	const list = fs.readdirSync(folder);
	for (let index = 0; index < list.length; index++) {
		const date = fs.statSync(`${folder}/${list[index]}`);
		if (Date.now() - date.ctimeMs > 3600000) fs.unlinkSync(`${folder}/${list[index]}`);
	}
	const filename = `${json.Function}_${json.ID}_${json.Version}_${json.Time}_${json.Shot}.png`;
	fs.writeFileSync(path.join(folder, filename), (await MainWindow.webContents.capturePage()).toPNG());
});

ipcMain.on("screenshot", async () => {
	const folder = path.join(TREM.getPath("userData"), "Screenshots");
	if (!fs.existsSync(folder))
		fs.mkdirSync(folder);
	const filename = "screenshot" + Date.now() + ".png";
	fs.writeFileSync(path.join(folder, filename), (await MainWindow.webContents.capturePage()).toPNG());
	shell.showItemInFolder(path.join(folder, filename));
});

function emitAllWindow(channel, ...args) {
	for (const [key, win] of TREM.Window[Symbol.iterator]())
		if (win instanceof BrowserWindow)
			win.webContents.send(channel, ...args);
}

function trayIcon() {
	if (tray) {
		tray.destroy();
		tray = null;
	}
	const iconPath = path.join(__dirname, "TREM.ico");
	tray = new Tray(nativeImage.createFromPath(iconPath));
	tray.setIgnoreDoubleClickEvents(true);
	tray.on("click", (e) => {
		if (MainWindow != null)
			if (MainWindow.isVisible())
				MainWindow.hide();
			else
				MainWindow.show();
	});
	const contextMenu = Menu.buildFromTemplate([
		{
			label : `TREM v${TREM.getVersion()}`,
			type  : "normal",
			click : () => {
				shell.openExternal("https://github.com/ExpTechTW/TREM");
			},
		},
		{
			type: "separator",
		},
		{
			label : TREM.Localization.getString("Tray_Show"),
			type  : "normal",
			click : () => {
				MainWindow.show();
			},
		},
		{
			label : TREM.Localization.getString("Tray_Hide"),
			type  : "normal",
			click : () => {
				MainWindow.hide();
			},
		},
		{
			label : TREM.Localization.getString("Tray_Restart"),
			type  : "normal",
			click : () => {
				restart();
			},
		},
		{
			label : TREM.Localization.getString("Tray_Exit"),
			type  : "normal",
			click : () => {
				TREM.exit(0);
			},
		},
	]);
	tray.setToolTip(TREM.Localization.getString("Application_Title"));
	tray.setContextMenu(contextMenu);
}


// #region override prototype
if (!Date.prototype.format)
	Date.prototype.format =
	/**
	 * Format DateTime into string with provided formatting string.
	 * @param {string} format The formatting string to use.
	 * @returns {string} The formatted string.
	 */
	function(format) {
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
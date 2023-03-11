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
TREM.isQuiting = !TREM.Configuration.data["windows.tray"];
TREM.IPFScore = null;
TREM.IPFScorecreate = null;
TREM.multiaddr = null;

autoUpdater.autoDownload = false;
autoUpdater.autoInstallOnAppQuit = true;
autoUpdater.logger = logger;

// Object.defineProperty(TREM, 'isPackaged', {
// 	get() {
// 	  return true;
// 	}
//   });

/**
 * @type {Tray}
 */
let tray = null;
let _hide = TREM.Configuration.data["windows.minimize"];
let _devMode = false;

if (process.argv.includes("--start")) _hide = true;
if (process.argv.includes("--dev")) {
	_devMode = true;
	TREM.Configuration.data["dev.mode"] = _devMode;
}else{
	_devMode = false;
	TREM.Configuration.data["dev.mode"] = _devMode;
}

emitAllWindow("setting", TREM.Configuration._data);
const latestLog = path.join(TREM.getPath("logs"), "latest.log");
if (fs.existsSync(latestLog)) {
	const filetime = fs.statSync(latestLog).mtime;
	const filename = (new Date(filetime.getTime() - (filetime.getTimezoneOffset() * 60000))).toISOString().slice(0, -1).replace(/:+|\.+/g, "-");
	fs.renameSync(path.join(TREM.getPath("logs"), "latest.log"), path.join(TREM.getPath("logs"), `${filename}.log`));
}

if (!fs.existsSync(path.join(TREM.getPath("userData"), "server.json")))
	fs.writeFileSync(path.join(TREM.getPath("userData"), "server.json"), JSON.stringify([]));

fs.readFile(path.join(TREM.getPath("userData"), "server.json"), function (err, data) {
	if (err) throw err;
	console.log(data.toString());
	if (data.toString() == "")
		fs.writeFileSync(path.join(TREM.getPath("userData"), "server.json"), JSON.stringify([]));
});

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
/**
 * @type {BrowserWindow}
 */
let RTSWindow = TREM.Window.get("rts");

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
		if (!TREM.isQuiting) {
			event.preventDefault();
			MainWindow.hide();
			if (SettingWindow)
				SettingWindow.close();
			if (RTSWindow)
				RTSWindow.close();
			event.returnValue = false;
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
		// ipcMain.emit("setting_btn_remove_hide");
		SettingWindow = null;
	});
}

function createRTSWindow() {
	if (RTSWindow instanceof BrowserWindow) return RTSWindow.focus();
	RTSWindow = TREM.Window.set("rts", new BrowserWindow({
		title          : TREM.Localization.getString("Setting_Title"),
		height         : 560,
		width          : 400,
		minHeight      : 560,
		minWidth       : 400,
		frame          : false,
		transparent    : true,
		show           : false,
		icon           : "TREM.ico",
		webPreferences : {
			nodeIntegration  : true,
			contextIsolation : false,
		},
	})).get("rts");
	require("@electron/remote/main").enable(RTSWindow.webContents);
	RTSWindow.loadFile("./Views/RTSView.html");
	RTSWindow.setMenu(null);
	RTSWindow.webContents.on("did-finish-load", () => {
		RTSWindow.webContents.send("setting", TREM.Configuration._data);
		setTimeout(() => RTSWindow.show(), 500);
	});
	RTSWindow.on("close", () => {
		// ipcMain.emit("setting_btn_remove_hide");
		RTSWindow = null;
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
	if (TREM.Configuration.data["update.time"] != undefined) {
		if (TREM.Configuration.data["update.time"] != 0){
			autoUpdater.checkForUpdates();
			const time = TREM.Configuration.data["update.time"] * 3600_000;
			setInterval(() => {
				autoUpdater.checkForUpdates();
			}, time);
		}
	} else {
		autoUpdater.checkForUpdates();
		const time = 3600_000;
		setInterval(() => {
			autoUpdater.checkForUpdates();
		}, time);
	}

	// IPFSget();
});

async function IPFSget() {
	try {
		TREM.IPFScore = await import('ipfs-core');
		TREM.IPFScorecreate = await TREM.IPFScore.create();
		TREM.multiaddr = await import('multiaddr');
	} catch (err) {
		console.error(err);
	}
}

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
				const getVersion = TREM.getVersion();
				new Notification({
					title : TREM.Localization.getString("Notification_Update_Title"),
					body  : TREM.Localization.getString("Notification_Update_Body").format(getVersion, info.version),
					icon  : "TREM.ico",
				}).on("click", () => {
					logger.info(info);
					shell.openExternal(`https://github.com/yayacat/TREM/releases/tag/v${info.version}`);
				}).show();
				ipcMain.emit("update-available-Notification", info.version, getVersion);
				break;
			}

			default:
				break;
		}
});

autoUpdater.on("update-not-available", (info) => {
	// logger.info(info.version);
	// logger.info("No new updates found");
	const getVersion = TREM.getVersion();
	new Notification({
		title : TREM.Localization.getString("Notification_No_Update_Title"),
		body  : TREM.Localization.getString("Notification_No_Update_Body").format(getVersion, info.version),
		icon  : "TREM.ico",
	}).show();
	ipcMain.emit("update-not-available-Notification", info.version, getVersion);
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
	TREM.isQuiting = true;
	if (tray)
		tray.destroy();
});

TREM.on("render-process-gone", (e,w,d) => {
	if (d.reason == "crashed")
		w.reload();
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

ipcMain.on("openDevtoolF10", () => {
	const currentWindow = BrowserWindow.getFocusedWindow();
	if (currentWindow)
		currentWindow.webContents.openDevTools({ mode: "detach" });
});

ipcMain.on("reloadpage", () => {
	const currentWindow = BrowserWindow.getFocusedWindow();
	if (currentWindow) currentWindow.webContents.reload();
});

ipcMain.on("openChildWindow", async (event, arg) => {
	await createSettingWindow();
});

ipcMain.on("openRTSWindow", async (event, arg) => {
	await createRTSWindow();
});

ipcMain.on("saveSetting", (event, arg) => {
	fs.unlinkSync(path.join(TREM.getPath("userData"), "settings.json"));
	fs.unlinkSync(path.join(TREM.getPath("userData"), "config.json"));
});

ipcMain.on("reset", (event, arg) => {
	TREM.isQuiting = true;
	TREM.quit();
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
		case "map.cn":
		case "map.jp":
		case "map.sk":
		case "map.nk":
		case "map.ph":
		case "map.NZ":
		case "map.in":
		case "map.TU":
		case "map.ta":
		case "map.pa":
		case "map.va": {
			emitAllWindow("config:maplayer", key.slice(4), value);
			MainWindow.reload();
			break;
		}

		case "map.engine": {
			MainWindow.reload();
			break;
		}

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
			if (RTSWindow) RTSWindow.setTitle(TREM.Localization.getString("Setting_Title"));
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

		case "windows.tray": {
			TREM.isQuiting = value;
			break;
		}

		case "map.animation": {
			emitAllWindow("config:mapanimation", value);
			break;
		}

		case "cache.report": {
			TREM.Configuration.data["cache.report"] = value;
			emitAllWindow("setting", TREM.Configuration._data);
			ipcMain.emit("ReportGET");
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
	// return;
	const folder = path.join(TREM.getPath("userData"), "EEW");
	if (!fs.existsSync(folder))
		fs.mkdirSync(folder);
	// const list = fs.readdirSync(folder);
	// for (let index = 0; index < list.length; index++) {
	// 	const date = fs.statSync(`${folder}/${list[index]}`);
	// 	if (Date.now() - date.ctimeMs > 3600000) fs.unlinkSync(`${folder}/${list[index]}`);
	// }
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
			try {
				win.webContents.send(channel, ...args);
			} catch (error) {
				console.error(error);
			}
}

function changelocale(value){
	TREM.Configuration.data['general.locale'] = value;
	TREM.Localization.setLocale(value);
	if (MainWindow){
		MainWindow.setTitle(TREM.Localization.getString("Application_Title"));
	}
	if (SettingWindow){
		SettingWindow.setTitle(TREM.Localization.getString("Setting_Title"));
	}
	if (RTSWindow){
		RTSWindow.setTitle(TREM.Localization.getString("Setting_Title"));
	}
	trayIcon();
	if (!SettingWindow) {
		createSettingWindow();
		emitAllWindow("config:locale", value);
		SettingWindow.close();
	}
	if (!RTSWindow) {
		createRTSWindow();
		emitAllWindow("config:locale", value);
		RTSWindow.close();
	} else
		emitAllWindow("config:locale", value);
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
			label : TREM.Localization.getString("Setting"),
			type  : "submenu",
			submenu: [
				{
					label : TREM.Localization.getString("Setting_Open"),
					type  : "normal",
					click : () => {
						BrowserWindow.fromId(process.env.window * 1).setAlwaysOnTop(false);
						ipcMain.emit("openChildWindow");
					}
				},
				{
					label: TREM.Localization.getString("general_locale"),
					submenu: [

						{
							label: '繁體中文 (zh-TW)',
							click : () => {
								changelocale('zh-TW');
							}
						},
						{
							label: 'English (en)',
							click : () => {
								changelocale('en');
							}
						},
						{
							label: '日本語 (ja)',
							click : () => {
								changelocale('ja');
							}
						},
						{
							label: '한국어 (kr)',
							click : () => {
								changelocale('kr');
							}
						},
						{
							label: 'Русский (ru)',
							click : () => {
								changelocale('ru');
							}
						},
						{
							label: '简体中文 (zh-CN)',
							click : () => {
								changelocale('zh-CN');
							}
						},
					]
				},
				{
					label : TREM.Localization.getString("check_For_Updates"),
					type  : "normal",
					click : () => {
						autoUpdater.checkForUpdates();
					}
				}
			]
		},
		{
			label : TREM.Localization.getString("Tray_Reload"),
			type  : "normal",
			click : () => {
				MainWindow.reload();
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
				TREM.isQuiting = true;
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
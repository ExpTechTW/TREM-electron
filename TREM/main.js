const { BrowserWindow, Menu, app: TREM, Tray, globalShortcut, ipcMain, nativeImage, shell } = require("electron");
const Configuration = require("./TREM.Configuration/Configuration");
const fetch = require("node-fetch");
const fs = require("fs");
const path = require("path");
const pushReceiver = require("electron-fcm-push-receiver");

let tray = null;
let _hide = false;
let _devMode = false;

if (process.argv.includes("--start")) _hide = true;
if (process.argv.includes("--dev")) _devMode = true;

const latestLog = path.join(TREM.getPath("logs"), "latest.log");
if (fs.existsSync(latestLog)) {
	const filetime = fs.statSync(latestLog).mtime;
	console.log(filetime);
	const filename = (new Date(filetime.getTime() - (filetime.getTimezoneOffset() * 60000))).toISOString().slice(0, -1).replace(/:+|\.+/g, "-");
	fs.renameSync(path.join(TREM.getPath("logs"), "latest.log"), path.join(TREM.getPath("logs"), `${filename}.log`));
}

if (fs.existsSync(__dirname.replace("trem\\resources\\app", "trem_data")) && fs.existsSync(`${__dirname.replace("trem\\resources\\app", "trem_data")}/Data/config.json`)) {
	const config = JSON.parse(fs.readFileSync(`${__dirname.replace("trem\\resources\\app", "trem_data")}/Data/config.json`).toString());
	if (config["compatibility.hwaccel"] != undefined && !config["compatibility.hwaccel"]) TREM.disableHardwareAcceleration();
}

TREM.Configuration = new Configuration(TREM);
TREM.Window = new Map();

let MainWindow = TREM.Window.get("main");
/**
 * @type {BrowserWindow}
 */
let SettingWindow = TREM.Window.get("setting");

TREM.setLoginItemSettings({
	openAtLogin : true,
	args        : ["--start"],
});

function createWindow() {
	fetch("https://exptech.com.tw/get?Function=EEW").catch(() => {
		setInterval(() => {
			fetch("https://exptech.com.tw/get?Function=EEW").then(() => {
				restart();
			});
		}, 5000);
	});
	MainWindow = TREM.Window.set("main", new BrowserWindow({
		title          : "TREM",
		width          : 1280,
		height         : 720,
		resizable      : false,
		show           : false,
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
	MainWindow.loadFile("./index.html");
	MainWindow.setMenu(null);
	MainWindow.webContents.on("did-finish-load", () => {
		MainWindow.webContents.send("setting", TREM.Configuration._data);
		if (!_hide) setTimeout(() => MainWindow.show(), 500);
	});
	pushReceiver.setup(MainWindow.webContents);
	if (process.platform === "win32")
		TREM.setAppUserModelId("TREM | 臺灣即時地震監測");
	MainWindow.on("close", (event) => {
		if (TREM.quitting)
			MainWindow = null;
		else {
			event.preventDefault();
			MainWindow.hide();
			if (SettingWindow)
				SettingWindow.close();
		}
	});
}

function createSettingWindow() {
	if (SettingWindow instanceof BrowserWindow) return SettingWindow.focus();
	SettingWindow = TREM.Window.set("setting", new BrowserWindow({
		title          : "TREM",
		height         : 600,
		width          : 1000,
		minHeight      : 600,
		minWidth       : 800,
		frame          : false,
		transparent    : true,
		show           : false,
		webPreferences : {
			nodeIntegration  : true,
			contextIsolation : false,
		},
	})).get("setting");
	require("@electron/remote/main").enable(SettingWindow.webContents);
	SettingWindow.loadFile("./page/setting.html");
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
		const iconPath = path.join(__dirname, "TREM.ico");
		tray = new Tray(nativeImage.createFromPath(iconPath));
		const contextMenu = Menu.buildFromTemplate([
			{
				label : "開啟 | Show",
				type  : "normal",
				click : () => {
					MainWindow.show();
				},
			},
			{
				label : "隱藏 | Hide",
				type  : "normal",
				click : () => {
					MainWindow.hide();
				},
			},
			{
				label : "重新啟動 | Restart",
				type  : "normal",
				click : () => {
					TREM.relaunch();
					if (SettingWindow != null) SettingWindow.close();
					TREM.quit();
				},
			},
			{
				label : "強制關閉 | Exit",
				type  : "normal",
				click : () => {
					TREM.exit(0);
				},
			},
		]);
		tray.setToolTip("TREM | 臺灣即時地震監測");
		tray.setContextMenu(contextMenu);
		tray.setIgnoreDoubleClickEvents(true);
		tray.on("click", (e) => {
			if (MainWindow != null)
				if (MainWindow.isVisible())
					MainWindow.hide();
				else
					MainWindow.show();
		});
		createWindow();
	});
}

TREM.on("ready", () => {
	globalShortcut.register("Ctrl+Shift+I", () => {
		if (_devMode) {
			const currentWindow = BrowserWindow.getFocusedWindow();
			if (currentWindow)
				currentWindow.webContents.openDevTools({ mode: "detach" });
		}
	});
});

TREM.on("window-all-closed", () => {
	if (process.platform !== "darwin") TREM.quit();
});

TREM.on("before-quit", () => {
	TREM.quitting = true;if (tray)
		tray.destroy();
});

ipcMain.on("openChildWindow", async (event, arg) => {
	await createSettingWindow();
});

ipcMain.on("closeChildWindow", (event, arg) => {
	if (SettingWindow)
		SettingWindow.close();
});

ipcMain.on("reset", (event, arg) => {
	TREM.exit(0);
});

ipcMain.on("restart", () => {
	restart();
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

		case "general.locale": {
			emitAllWindow("config:locale", value);
			break;
		}

		default:
			break;
	}
	TREM.Configuration.data[key] = value;
});

TREM.Configuration.on("update", (data) => {
	console.log("settings update");
	emitAllWindow("setting", TREM.Configuration._data);
});

TREM.Configuration.on("error", (error) => {
	console.log("settings update");
	emitAllWindow("settingError", error);
});

ipcMain.on("config:open", () => {
	shell.openPath(TREM.Configuration.path);
});

function restart() {
	TREM.relaunch();
	if (SettingWindow != null) SettingWindow.close();
	TREM.quit();
}

ipcMain.on("screenshotEEW", async (event, json) => {
	const folder = path.join(TREM.getPath("userData"), "EEW");
	if (!fs.existsSync(folder))
		fs.mkdirSync(folder);
	const list = fs.readdirSync(folder);
	for (let index = 0; index < list.length; index++) {
		const date = fs.statSync(`${folder}/${list[index]}`);
		if (Date.now() - date.ctimeMs > 86400000) fs.unlinkSync(`${folder}/${list[index]}`);
	}
	const filename = `${json.Function}_${json.ID}_${json.Version}_${json.Time}_${json.Shot}.png`;
	fs.writeFileSync(path.join(folder, filename), (await MainWindow.webContents.capturePage()).toPNG());
});

ipcMain.on("screenshot", async () => {
	const folder = path.join(TREM.getPath("userData"), "Screenshots");
	if (!fs.existsSync(folder))
		fs.mkdirSync(folder);
	const filename = "screenshot" + Date.now() + ".png";
	console.log(filename);
	fs.writeFileSync(path.join(folder, filename), (await MainWindow.webContents.capturePage()).toPNG());
	shell.showItemInFolder(path.join(folder, filename));
});

function emitAllWindow(channel, ...args) {
	for (const [key, win] of TREM.Window[Symbol.iterator]())
		if (win instanceof BrowserWindow)
			win.webContents.send(channel, ...args);
}
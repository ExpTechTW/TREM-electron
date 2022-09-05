const { BrowserWindow, Menu, Tray, app, globalShortcut, ipcMain, nativeImage, shell } = require("electron");
const fs = require("fs");
const path = require("path");
const pushReceiver = require("electron-fcm-push-receiver");

let MainWindow = null;
let SettingWindow = null;
let tray = null;
let _hide = false;
let _devMode = false;

if (process.argv.includes("--start")) _hide = true;
if (process.argv.includes("--dev")) _devMode = true;

if (fs.existsSync(__dirname.replace("trem\\resources\\app", "trem_data")) && fs.existsSync(`${__dirname.replace("trem\\resources\\app", "trem_data")}/Data/config.json`)) {
	const config = JSON.parse(fs.readFileSync(`${__dirname.replace("trem\\resources\\app", "trem_data")}/Data/config.json`).toString());
	if (config["compatibility.hwaccel"] != undefined && !config["compatibility.hwaccel"]) app.disableHardwareAcceleration();
}

app.setLoginItemSettings({
	openAtLogin : true,
	args        : ["--start"],
});

function createWindow() {
	MainWindow = new BrowserWindow({
		title          : "TREM",
		width          : 1280,
		height         : 720,
		resizable      : false,
		show           : !_hide,
		webPreferences : {
			preload              : path.join(__dirname, "preload.js"),
			nodeIntegration      : true,
			contextIsolation     : false,
			enableRemoteModule   : true,
			backgroundThrottling : false,
			nativeWindowOpen     : true,
		},
	});
	require("@electron/remote/main").initialize();
	require("@electron/remote/main").enable(MainWindow.webContents);
	process.env.window = MainWindow.id;
	MainWindow.loadFile("./index.html");
	MainWindow.setMenu(null);
	pushReceiver.setup(MainWindow.webContents);

	if (process.platform === "win32")
		app.setAppUserModelId("TREM | 臺灣即時地震監測");

	MainWindow.on("close", (event) => {
		if (app.quitting)
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
	if (SettingWindow) return SettingWindow.focus();
	SettingWindow = new BrowserWindow({
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
	});
	require("@electron/remote/main").enable(SettingWindow.webContents);
	SettingWindow.loadFile("./page/setting.html");
	SettingWindow.setMenu(null);
	SettingWindow.on("ready-to-show", () => {
		setTimeout(() => SettingWindow.show(), 500);
	});
	SettingWindow.on("close", () => {
		SettingWindow = null;
	});
}

const shouldQuit = app.requestSingleInstanceLock();
if (!shouldQuit)
	app.quit();
else {
	app.on("second-instance", (event, argv, cwd) => {
		MainWindow.show();
	});
	app.whenReady().then(() => {
		const iconPath = path.join(__dirname, "TREM.ico");
		tray = new Tray(nativeImage.createFromPath(iconPath));
		const contextMenu = Menu.buildFromTemplate([
			{
				label : "開啟",
				type  : "normal",
				click : () => {
					MainWindow.show();
				},
			},
			{
				label : "隱藏",
				type  : "normal",
				click : () => {
					MainWindow.hide();
				},
			},
			{
				label : "重新啟動",
				type  : "normal",
				click : () => {
					app.relaunch();
					if (SettingWindow != null) SettingWindow.close();
					app.quit();
				},
			},
			{
				label : "強制關閉",
				type  : "normal",
				click : () => {
					const now = new Date();
					const nowTime = (new Date(now.getTime() - (now.getTimezoneOffset() * 60000))).toISOString().slice(0, -1).replace(/:+|\.+/g, "-");
					if (fs.existsSync(path.join(app.getPath("logs"), "latest.log")))
						fs.renameSync(path.join(app.getPath("logs"), "latest.log"), path.join(app.getPath("logs"), `${nowTime}.log`));
					app.exit(0);
				},
			},
		]);
		tray.setToolTip("TREM | 臺灣即時地震監測");
		tray.setContextMenu(contextMenu);
		tray.setIgnoreDoubleClickEvents(true);
		tray.on("click", (e) => {
			if (MainWindow.isVisible())
				MainWindow.hide();
			else
				MainWindow.show();
		});
		createWindow();
	});
}

app.on("ready", () => {
	globalShortcut.register("Ctrl+Shift+I", () => {
		if (_devMode) {
			const currentWindow = BrowserWindow.getFocusedWindow();
			if (currentWindow)
				currentWindow.webContents.openDevTools({ mode: "detach" });
		}

	});
});

app.on("window-all-closed", () => {
	if (process.platform !== "darwin") app.quit();
});

app.on("before-quit", () => {
	app.quitting = true;
	if (tray)
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
	app.exit(0);
});

ipcMain.on("restart", () => {
	app.relaunch();
	if (SettingWindow != null) SettingWindow.close();
	app.quit();
});

ipcMain.on("screenshotEEW", async (event, json) => {
	const folder = path.join(app.getPath("userData"), "EEW");
	if (!fs.existsSync(folder))
		fs.mkdirSync(folder);
	const list = fs.readdirSync(folder);
	for (let index = 0; index < list.length; index++) {
		const date = fs.statSync(`${folder}/${list[index]}`);
		if (new Date().getTime() - date.ctimeMs > 86400000) fs.unlinkSync(`${folder}/${list[index]}`);
	}
	const filename = `${json.Function}_${json.ID}_${json.Version}_${json.Time}_${json.Shot}.png`;
	fs.writeFileSync(path.join(folder, filename), (await MainWindow.webContents.capturePage()).toPNG());
});

ipcMain.on("screenshot", async () => {
	const folder = path.join(app.getPath("userData"), "Screenshots");
	if (!fs.existsSync(folder))
		fs.mkdirSync(folder);
	const filename = "screenshot" + Date.now() + ".png";
	console.log(filename);
	fs.writeFileSync(path.join(folder, filename), (await MainWindow.webContents.capturePage()).toPNG());
	shell.showItemInFolder(path.join(folder, filename));
});
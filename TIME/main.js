const { BrowserWindow, Menu, Tray, app, globalShortcut, ipcMain, nativeImage, shell } = require("electron");
const fs = require("fs");
const path = require("path");
const pushReceiver = require("electron-fcm-push-receiver");

let MainWindow = null;
let tray = null;
let _hide = false;
let _devMode = false;

if (process.argv.includes("--start")) _hide = true;
if (process.argv.includes("--dev")) _devMode = true;

app.setLoginItemSettings({
	openAtLogin : true,
	args        : ["--start"],
});

function createWindow() {
	MainWindow = new BrowserWindow({
		title          : "TIME",
		width          : 800,
		height         : 600,
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
		app.setAppUserModelId("TIME | 對時");

	MainWindow.on("close", (event) => {
		if (app.quitting)
			MainWindow = null;
		else {
			event.preventDefault();
			MainWindow.hide();
		}
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
		return;
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

ipcMain.on("reset", (event, arg) => {
	app.exit(0);
});
const { app, BrowserWindow, Tray, Menu, nativeImage, ipcMain } = require('electron')
const path = require('path')
const fs = require('fs')
const pushReceiver = require('electron-fcm-push-receiver')

process.env.Version = "3.7.1"

let mainWindow = null
let tray = null
let Win = null

if (fs.existsSync(__dirname.replace(`trem\\resources\\app`, "trem_data")) && fs.existsSync(`${__dirname.replace(`trem\\resources\\app`, "trem_data")}/Data/config.json`)) {
  let config = JSON.parse(fs.readFileSync(`${__dirname.replace(`trem\\resources\\app`, "trem_data")}/Data/config.json`).toString())
  if (config["GPU.disable"] != undefined && config["GPU.disable"]["Value"]) app.disableHardwareAcceleration()
}

app.setLoginItemSettings({
  openAtLogin: true,
  args: ['--start']
})

async function createWindow() {
  mainWindow = new BrowserWindow({
    title: 'TREM | 台灣實時地震監測',
    width: 1280,
    height: 720,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      nodeIntegration: true,
      contextIsolation: false,
      enableRemoteModule: true,
      backgroundThrottling: false,
      nativeWindowOpen: true,
      // devTools: false
    },
    autoHideMenuBar: true,
    resizable: false
  })
  require('@electron/remote/main').initialize()
  require('@electron/remote/main').enable(mainWindow.webContents)
  pushReceiver.setup(mainWindow.webContents)
  process.env.window = mainWindow.id
  mainWindow.setMinimumSize(800, 600)
  mainWindow.setMaximumSize(1280, 720)
  mainWindow.loadFile('index.html')
  if (process.platform === 'win32') {
    app.setAppUserModelId("TREM | 台灣實時地震監測")
  }
  if (process.argv.includes('--start')) mainWindow.hide()
  mainWindow.on('close', (event) => {
    if (app.quitting) {
      mainWindow = null
    } else {
      event.preventDefault()
      mainWindow.hide()
    }
  })
}

async function createWindow1() {
  if (Win != null) await Win.close()
  Win = new BrowserWindow({
    title: 'TREM | 設定',
    height: 600,
    width: 800,
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false,
      devTools: false
    },
    autoHideMenuBar: true,
  })
  Win.loadFile('./page/setting.html')
  Win.hide()
  Win.on('close', (event) => {
    if (app.quitting) {
      Win = null
    } else {
      event.preventDefault()
      Win.hide()
    }
  })
}

let shouldQuit = app.requestSingleInstanceLock()
if (!shouldQuit) {
  app.quit()
} else {
  app.on('second-instance', (event, argv, cwd) => {
    mainWindow.show()
  })
  app.whenReady().then(async () => {
    const iconPath = path.join(__dirname, 'TREM.ico')
    tray = new Tray(nativeImage.createFromPath(iconPath))
    const contextMenu = Menu.buildFromTemplate([
      {
        label: '開啟',
        type: 'normal',
        click: () => {
          mainWindow.show()
        }
      },
      {
        label: '隱藏',
        type: 'normal',
        click: () => {
          mainWindow.hide()
        }
      },
      {
        label: '強制關閉',
        type: 'normal',
        click: () => app.exit(0)
      }
    ])
    tray.setToolTip('TREM | 台灣實時地震監測')
    tray.setContextMenu(contextMenu)
    tray.setIgnoreDoubleClickEvents(true)
    tray.on('click', function (e) {
      if (mainWindow.isVisible()) {
        mainWindow.hide()
      } else {
        mainWindow.show()
      }
    })
    await createWindow()
  })
}

app.on('window-all-closed', function () {
  if (process.platform !== 'darwin') app.quit()
})

app.on('before-quit', () => app.quitting = true)

ipcMain.on("createChildWindow", async (event, arg) => {
  createWindow1()
})

ipcMain.on("openChildWindow", async (event, arg) => {
  Win.show()
})

ipcMain.on("closeChildWindow", (event, arg) => {
  Win.hide()
})

ipcMain.on("reset", (event, arg) => {
  app.exit(0)
})
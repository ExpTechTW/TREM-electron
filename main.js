const { app, BrowserWindow, Menu } = require('electron')
const path = require('path')

let mainWindow = null
process.env.Version = "1.5"

app.disableHardwareAcceleration()

app.setLoginItemSettings({
  openAtLogin: true,
  openAsHidden: true,
  args: ["--openAsHidden"],
})

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1024,
    height: 768,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      nodeIntegration: true,
      contextIsolation: false,
      enableRemoteModule: true,
      backgroundThrottling: false
    },
    autoHideMenuBar: true,
  })
  require('@electron/remote/main').initialize()
  require('@electron/remote/main').enable(mainWindow.webContents)
  process.env.window = mainWindow.id
  mainWindow.loadFile('index.html')
  if (process.platform === 'win32') {
    app.setAppUserModelId("TREM | 台灣實時地震監測")
  }
  mainWindow.on('close', (event) => {
    if (app.quitting) {
      mainWindow = null
    } else {
      event.preventDefault()
      mainWindow.hide()
    }
  })
}
let shouldQuit = app.requestSingleInstanceLock()
if (!shouldQuit) {
  app.quit()
} else {
  app.on('second-instance', (event, argv, cwd) => {
    mainWindow.restore()
    mainWindow.show()
  })
  app.whenReady().then(() => { createWindow() })
}

app.on('window-all-closed', function () {
  if (process.platform !== 'darwin') app.quit()
})

app.on('activate', () => { mainWindow.show() })

app.on('before-quit', () => app.quitting = true)
const { app, BrowserWindow, Tray, Menu, nativeImage } = require('electron')
const windowStateKeeper = require('electron-window-state')
const path = require('path')

process.env.Version = "1.6"

let mainWindow = null
let tray = null

app.disableHardwareAcceleration()

app.setLoginItemSettings({
  openAtLogin: true,
  openAsHidden: true,
  args: ["--openAsHidden"],
})

function createWindow() {
  let mainWindowStateKeeper = windowStateKeeper({
    defaultWidth: 1000,
    defaultHeight: 800
  })
  mainWindow = new BrowserWindow({
    title: 'main',
    x: mainWindowStateKeeper.x,
    y: mainWindowStateKeeper.y,
    width: mainWindowStateKeeper.width,
    height: mainWindowStateKeeper.height,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      nodeIntegration: true,
      contextIsolation: false,
      enableRemoteModule: true,
      backgroundThrottling: false
    },
    autoHideMenuBar: true,
  })
  mainWindowStateKeeper.manage(mainWindow)
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
  app.whenReady().then(() => {
    const iconPath = path.join(__dirname, 'TREM.ico')
    tray = new Tray(nativeImage.createFromPath(iconPath))
    const contextMenu = Menu.buildFromTemplate([
      {
        label: '開啟',
        type: 'normal',
        click: () => {
          mainWindow.restore()
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
        click: () => app.quit()
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
    createWindow()
  })
}

app.on('window-all-closed', function () {
  if (process.platform !== 'darwin') app.quit()
})

app.on('activate', () => { mainWindow.show() })

app.on('before-quit', () => app.quitting = true)
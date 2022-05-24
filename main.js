const { app, BrowserWindow } = require('electron')
const path = require('path')

app.disableHardwareAcceleration()

function createWindow() {
  const mainWindow = new BrowserWindow({
    width: 1000,
    height: 700,
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
  mainWindow.on('show', () => {
    setTimeout(() => {
      mainWindow.focus()
    }, 200)
  })
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

app.whenReady().then(() => { createWindow() })

app.on('window-all-closed', function () {
  if (process.platform !== 'darwin') app.quit()
})

app.on('activate', () => { win.show() })

app.on('before-quit', () => app.quitting = true)
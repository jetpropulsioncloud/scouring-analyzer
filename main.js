const { app, BrowserWindow, ipcMain } = require('electron');
const path = require('path');

let mainWindow;

function createWindow() {
  console.log("🟢 Creating Electron window...");

  mainWindow = new BrowserWindow({
    width: 400,
    height: 600,
    icon: path.join(__dirname, 'assets', 'longhouse-icon.png'),
    transparent: false,
    frame: false,
    resizable: true,
    alwaysOnTop: false,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      nodeIntegration: true,
      contextIsolation: false
    }
  });

  mainWindow.loadFile('index.html');
  console.log("✅ index.html loaded.");

  mainWindow.on('close', () => {
    mainWindow.webContents.send('logout-before-close');
  });

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

app.whenReady().then(createWindow);

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});

ipcMain.on('request-app-close', () => {
  if (mainWindow) {
    mainWindow.close();
  }
});

ipcMain.on('open-build-window', (event, buildData) => {
  const buildWin = new BrowserWindow({
    width: 400,
    height: 600,
    minWidth: 350,
    minHeight: 400,
    resizable: true,
    title: 'Northgard Build',
    alwaysOnTop: true,
    frame: false,
    transparent: true,
    backgroundColor: '#00000000',
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      nodeIntegration: true,
      contextIsolation: false
    }
  });

  buildWin.loadFile('viewBuild.html');

  buildWin.webContents.once('did-finish-load', () => {
    buildWin.webContents.send('load-build', buildData);
  });
});

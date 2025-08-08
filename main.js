const { app, BrowserWindow, ipcMain } = require('electron');
const path = require('path');
const { autoUpdater } = require('electron-updater');
const log = require('electron-log');
autoUpdater.logger = log;
autoUpdater.logger.transports.file.level = 'info';

log.info("🟢 App launched");
log.info(`🧠 App version: ${app.getVersion()}`);


let mainWindow;
let buildWin = null;

function createWindow() {
  log.info("🟢 Creating Electron window...");
  log.info(`🧠 Current version: ${app.getVersion()}`);
  mainWindow = new BrowserWindow({
    width: 400,
    height: 600,
    icon: process.platform === 'win32'
      ? path.join(__dirname, 'assets', 'longhouse-icon.ico')
      : path.join(__dirname, 'assets', 'longhouse-icon.png'),
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
  mainWindow.webContents.once('did-finish-load', () => {
    mainWindow.webContents.send('app-version', app.getVersion());
  });
  log.info("✅ index.html loaded.");
  log.info("🔍 Checking for updates...");

  mainWindow.on('close', () => {
    if (buildWin && !buildWin.isDestroyed()) {
      buildWin.close();
    }
  });

  mainWindow.on('closed', () => {
    mainWindow = null;
  });

  if (app.isPackaged) {
    autoUpdater.setFeedURL({
      provider: 'github',
      owner: 'jetpropulsioncloud',
      repo: 'northgard-analyzer'
    });

    autoUpdater.checkForUpdatesAndNotify();
  } else {
    console.log("🔧 Skipping auto-update check (dev mode)");
  }


  autoUpdater.on('update-available', () => {
    log.info('🔄 Update available');
    if (mainWindow && mainWindow.webContents) {
      mainWindow.webContents.send('update-available');
    }
  });
  autoUpdater.on('download-progress', (progressObj) => {
    if (mainWindow && mainWindow.webContents) {
      mainWindow.webContents.send('download-progress', progressObj);
    }
  });
  autoUpdater.on('update-downloaded', () => {
    log.info('✅ Update downloaded. Will install on quit.');
    autoUpdater.quitAndInstall();
  });
  autoUpdater.on('error', (err) => {
    log.error('❌ AutoUpdater error:', err == null ? 'unknown' : (err.stack || err).toString());
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

ipcMain.on("reset-window-focus", () => {
  const win = BrowserWindow.getFocusedWindow();
  if (win) {
    win.hide();
    setTimeout(() => win.show(), 150);
  }
});

ipcMain.on('open-build-window', (event, buildData) => {
  buildWin = new BrowserWindow({
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

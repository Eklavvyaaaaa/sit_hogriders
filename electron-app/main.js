const { app, BrowserWindow, globalShortcut, ipcMain } = require('electron');
const path = require('path');
const isDev = require('electron-is-dev');

let mainWindow;
let isLocked = false;

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    fullscreen: false, // Start in windowed mode
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, 'preload.js'),
      devTools: true // Enable for now, will be disabled during lock
    }
  });

  // Load React app
  const startUrl = process.env.VITE_DEV_SERVER_URL ||
    (isDev ? 'http://localhost:5173' : `file://${path.join(__dirname, 'client/dist/index.html')}`);

  mainWindow.loadURL(startUrl);

  // Monitoring window state
  mainWindow.on('blur', () => {
    if (isLocked) {
      mainWindow.webContents.send('focus-lost');
    }
  });

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

// Security Enforcement Logic
const registerShortcuts = () => {
  globalShortcut.register('CommandOrControl+C', () => {
    console.log('Copy blocked during exam');
  });
  globalShortcut.register('CommandOrControl+V', () => {
    console.log('Paste blocked during exam');
  });
  globalShortcut.register('CommandOrControl+X', () => {
    console.log('Cut blocked during exam');
  });
  globalShortcut.register('CommandOrControl+R', () => {
    console.log('Reload blocked during exam');
  });
  globalShortcut.register('F5', () => {
    console.log('F5 blocked during exam');
  });
  globalShortcut.register('CommandOrControl+Shift+I', () => {
    console.log('DevTools blocked during exam');
  });
};

const unregisterShortcuts = () => {
  globalShortcut.unregister('CommandOrControl+C');
  globalShortcut.unregister('CommandOrControl+V');
  globalShortcut.unregister('CommandOrControl+X');
  globalShortcut.unregister('CommandOrControl+R');
  globalShortcut.unregister('F5');
  globalShortcut.unregister('CommandOrControl+Shift+I');
};

// IPC Listeners for SmartLock
ipcMain.on('activate-lock', () => {
  if (!mainWindow) return;

  isLocked = true;

  // 1. Force Fullscreen and Kiosk mode
  mainWindow.setFullScreen(true);
  mainWindow.setKiosk(true);
  mainWindow.setAlwaysOnTop(true, 'screen-saver');
  mainWindow.setResizable(false);

  // 2. Disable DevTools
  mainWindow.webContents.closeDevTools();
  mainWindow.webContents.on('devtools-opened', () => {
    mainWindow.webContents.closeDevTools();
  });

  // 3. Disable Menu Bar
  mainWindow.setMenuBarVisibility(false);

  // 4. Block Shortcuts
  registerShortcuts();

  // 5. Prevent Navigation to External URLs
  mainWindow.webContents.on('will-navigate', (event, url) => {
    if (isLocked && !url.includes('localhost') && !url.includes('file://')) {
      event.preventDefault();
    }
  });

  // 6. Prevent New Window Creation
  mainWindow.webContents.setWindowOpenHandler(() => {
    return { action: 'deny' };
  });

  console.log('SmartLock Activated');
});

ipcMain.on('deactivate-lock', () => {
  if (!mainWindow) return;

  isLocked = false;

  // 1. Exit Fullscreen and Kiosk mode
  mainWindow.setKiosk(false);
  mainWindow.setFullScreen(false);
  mainWindow.setAlwaysOnTop(false);
  mainWindow.setResizable(true);

  // Restore normal size (optional, could be default)
  mainWindow.setSize(1200, 800);
  mainWindow.center();

  // 2. Restore restrictions
  unregisterShortcuts();
  mainWindow.setMenuBarVisibility(true);

  console.log('SmartLock Deactivated');
});

app.on('ready', () => {
  createWindow();
});

app.on('will-quit', () => {
  globalShortcut.unregisterAll();
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('activate', () => {
  if (mainWindow === null) {
    createWindow();
  }
});

const { app, BrowserWindow, globalShortcut, ipcMain } = require('electron');
const path = require('path');

const isDev = !app.isPackaged;

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
      devTools: isDev // Only enable devTools in development environment
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

  // Security constraints when locked
  mainWindow.webContents.on('devtools-opened', () => {
    if (isLocked) {
      mainWindow.webContents.closeDevTools();
    }
  });

  mainWindow.webContents.on('will-navigate', (event, url) => {
    if (isLocked) {
      try {
        const parsedUrl = new URL(url);
        if (parsedUrl.protocol !== 'file:' && parsedUrl.hostname !== 'localhost') {
          event.preventDefault();
        }
      } catch (e) {
        // If URL parsing fails, prevent navigation to be safe
        event.preventDefault();
      }
    }
  });

  mainWindow.webContents.setWindowOpenHandler(() => {
    return isLocked ? { action: 'deny' } : { action: 'allow' };
  });

  mainWindow.webContents.on('before-input-event', (event, input) => {
    if (isLocked) {
      const isCopy = input.control && input.key.toLowerCase() === 'c';
      const isPaste = input.control && input.key.toLowerCase() === 'v';
      const isCut = input.control && input.key.toLowerCase() === 'x';
      const isReload = input.control && input.key.toLowerCase() === 'r';
      const isF5 = input.key === 'F5';
      const isDevTools = input.control && input.shift && input.key.toLowerCase() === 'i';

      if (isCopy || isPaste || isCut || isReload || isF5 || isDevTools) {
        event.preventDefault();
        console.log(`${input.key} blocked during exam`);
      }
    }
  });

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

// IPC Listeners for SmartLock
ipcMain.on('activate-lock', () => {
  if (!mainWindow) return;

  isLocked = true;

  // 1. Force Fullscreen and Kiosk mode
  mainWindow.setFullScreen(true);
  mainWindow.setKiosk(true);
  mainWindow.setAlwaysOnTop(true, 'screen-saver');
  mainWindow.setResizable(false);

  // 2. Disable DevTools dynamically if open
  mainWindow.webContents.closeDevTools();

  // 3. Disable Menu Bar
  mainWindow.setMenuBarVisibility(false);

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
  mainWindow.setMenuBarVisibility(true);

  console.log('SmartLock Deactivated');
});

app.on('ready', () => {
  createWindow();
});

app.on('will-quit', () => {
  // globalShortcut.unregisterAll() removed as we use before-input-event now
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

const { app, BrowserWindow, globalShortcut, ipcMain, session } = require('electron');
const path = require('path');
const isDev = require('electron-is-dev');

let isShuttingDown = false;

const performGracefulShutdown = (source, error) => {
  if (isShuttingDown) return;
  isShuttingDown = true;

  console.error(`[Electron] FATAL ERROR (${source}):`, error?.stack || error);

  // Attempt to notify renderer gracefully
  if (mainWindow && !mainWindow.isDestroyed()) {
    try {
      mainWindow.webContents.send('fatal-error', 'The monitoring system encountered a critical error. Restarting...');
    } catch (e) {
      console.error('[Electron] Failed to notify renderer of crash:', e);
    }
  }

  // Relaunch in production to recover from crash, otherwise exit 
  if (!isDev) {
    console.log('[Electron] Restarting application...');
    app.relaunch();
  }

  app.exit(1);
};

// Global Exception Handlers to Prevent Zombie Processes
process.on('uncaughtException', (error) => {
  performGracefulShutdown('uncaughtException', error);
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('[Electron] Unhandled Rejection at:', promise);
  performGracefulShutdown('unhandledRejection', reason);
});

let mainWindow;
let isLocked = false;

// Fix Windows "Access is denied (0x5)" and GPU Cache errors
app.setPath('userData', path.join(app.getPath('appData'), 'sit_hogriders_cache'));
app.commandLine.appendSwitch('disable-gpu-shader-disk-cache');
app.commandLine.appendSwitch('disable-gpu-disk-cache'); // Prevent the failed: -2 error

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    fullscreen: false, // Start in windowed mode
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, 'preload.js'),
      devTools: isDev, // Only enable devTools in development environment
      backgroundThrottling: false,
      webgl: true,
      // Security warning: sandbox is disabled to allow MediaPipe's GPU hardware acceleration
      // to access native WebGL resources securely on Windows/Linux environments.
      // Defenses: nodeIntegration is false, contextIsolation is true, and navigation is locked.
      sandbox: false
    }
  });

  // Handle Permissions for Camera/Microphone — validate origin
  const allowedPermissions = ['media', 'camera', 'microphone'];

  const isTrustedOrigin = (url) => {
    if (!url) return false;
    try {
      if (url.startsWith('file://')) return true;
      const parsed = new URL(url);
      return parsed.hostname === 'localhost' && parsed.port === '5173';
    } catch {
      return false;
    }
  };

  session.defaultSession.setPermissionRequestHandler((webContents, permission, callback, details) => {
    if (allowedPermissions.includes(permission) && isTrustedOrigin(details.requestingUrl)) {
      callback(true);
    } else {
      callback(false);
    }
  });

  session.defaultSession.setPermissionCheckHandler((webContents, permission, requestingOrigin, details) => {
    if (allowedPermissions.includes(permission) && isTrustedOrigin(requestingOrigin)) {
      return true;
    }
    return false;
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

  // 1. Force Fullscreen
  mainWindow.setFullScreen(true);
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

  // 1. Exit Fullscreen
  mainWindow.setFullScreen(false);
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

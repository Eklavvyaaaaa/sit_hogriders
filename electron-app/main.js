const { app, BrowserWindow, globalShortcut } = require('electron');
const path = require('path');
const isDev = require('electron-is-dev');

let mainWindow;

function createWindow() {
    mainWindow = new BrowserWindow({
        width: 1200,
        height: 800,
        fullscreen: true, // Specific requirement
        kiosk: true, // Prevents exiting fullscreen
        alwaysOnTop: true, // Prevents alt-tabbing to other windows easily
        webPreferences: {
            nodeIntegration: false,
            contextIsolation: true,
            preload: path.join(__dirname, 'preload.js'),
            devTools: false // Specific requirement
        }
    });

    // Load React app
    const startUrl = process.env.VITE_DEV_SERVER_URL ||
        (isDev ? 'http://localhost:5173' : \`file://\${path.join(__dirname, 'client/dist/index.html')}\`);

  // Load URL
  mainWindow.loadURL(startUrl);

  // Security Measures
  
  // Disable DevTools
  mainWindow.webContents.on('devtools-opened', () => {
    mainWindow.webContents.closeDevTools();
  });

  // Detect Window Blur (Losing focus)
  mainWindow.on('blur', () => {
    mainWindow.webContents.send('window-blur');
  });

  mainWindow.on('focus', () => {
    mainWindow.webContents.send('window-focus');
  });

  // Prevent Navigation to External URLs
  mainWindow.webContents.on('will-navigate', (event, url) => {
    if (!url.includes('localhost') && !url.includes('file://')) {
      event.preventDefault();
    }
  });

  mainWindow.webContents.setWindowOpenHandler(() => {
    return { action: 'deny' }; // Prevent opening new windows/popups
  });

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

// Disable global shortcuts like Copy/Paste (Command+C, Command+V)
const registerShortcuts = () => {
  globalShortcut.register('CommandOrControl+C', () => {
    console.log('Copy disabled');
  });
  globalShortcut.register('CommandOrControl+V', () => {
    console.log('Paste disabled');
  });
  globalShortcut.register('CommandOrControl+X', () => {
    console.log('Cut disabled');
  });
  // Prevent quitting easily except via app logic
  globalShortcut.register('CommandOrControl+Q', () => {
    console.log('Quit disabled globally, use app logic.');
  });
  // Prevent reloading
  globalShortcut.register('CommandOrControl+R', () => {
    console.log('Reload disabled');
  });
  globalShortcut.register('CommandOrControl+Shift+I', () => {
    console.log('DevTools disabled');
  });
};

app.on('ready', () => {
  createWindow();
  registerShortcuts();
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

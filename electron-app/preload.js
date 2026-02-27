const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
    onWindowBlur: (callback) => ipcRenderer.on('window-blur', () => callback()),
    onWindowFocus: (callback) => ipcRenderer.on('window-focus', () => callback()),
    removeBlurListeners: () => ipcRenderer.removeAllListeners('window-blur'),
    removeFocusListeners: () => ipcRenderer.removeAllListeners('window-focus')
});

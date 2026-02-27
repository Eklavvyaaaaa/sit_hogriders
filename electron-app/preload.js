const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
    activateLock: () => ipcRenderer.send('activate-lock'),
    deactivateLock: () => ipcRenderer.send('deactivate-lock'),
    onFocusLost: (callback) => {
        const listener = () => callback();
        ipcRenderer.on('focus-lost', listener);
        return () => ipcRenderer.removeListener('focus-lost', listener);
    }
});

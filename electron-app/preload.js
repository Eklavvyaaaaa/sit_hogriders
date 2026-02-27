const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
    activateLock: () => ipcRenderer.send('activate-lock'),
    deactivateLock: () => ipcRenderer.send('deactivate-lock'),
    onFocusLost: (callback) => {
        const listener = () => callback();
        ipcRenderer.on('focus-lost', listener);
        return () => ipcRenderer.removeListener('focus-lost', listener);
    },
    // Used by useMonitoring.js for window blur detection
    onWindowBlur: (callback) => {
        const listener = () => callback();
        ipcRenderer.on('focus-lost', listener);
        return () => ipcRenderer.removeListener('focus-lost', listener);
    },
    // Global teardown — only use on full app shutdown, not per-subscription
    removeBlurListeners: () => {
        ipcRenderer.removeAllListeners('focus-lost');
    }
});

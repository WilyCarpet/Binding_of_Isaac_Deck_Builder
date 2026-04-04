const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
    buildDeck: (payload) => ipcRenderer.invoke('deck:build', payload)
});

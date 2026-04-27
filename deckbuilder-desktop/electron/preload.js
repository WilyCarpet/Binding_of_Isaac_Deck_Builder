const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
    buildDeck: (payload) => ipcRenderer.invoke('deck:build', payload),
    getCollectionCards: () => ipcRenderer.invoke('collection:getCards'),
    updateCollectionCard: (cardId, payload) => ipcRenderer.invoke('collection:updateCard', cardId, payload),
    checkDbExists: () => ipcRenderer.invoke('setup:checkDb')
});

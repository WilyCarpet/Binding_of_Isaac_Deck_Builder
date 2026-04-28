const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
    buildDeck: (payload) => ipcRenderer.invoke('deck:build', payload),
    countDeck: (payload) => ipcRenderer.invoke('deck:count', payload),
    getCollectionCards: () => ipcRenderer.invoke('collection:getCards'),
    updateCollectionCard: (cardId, payload) => ipcRenderer.invoke('collection:updateCard', cardId, payload),
    checkDbExists: () => ipcRenderer.invoke('setup:checkDb'),
    saveConfig: (config) => ipcRenderer.invoke('config:save', config),
    loadConfigs: () => ipcRenderer.invoke('config:load'),
    deleteConfig: (name) => ipcRenderer.invoke('config:delete', name),
});

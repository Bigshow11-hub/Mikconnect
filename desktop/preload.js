const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('mikconnect', {
  getServerUrl: () => ipcRenderer.invoke('get-server-url'),
  setServerUrl: (url) => ipcRenderer.invoke('set-server-url', url),
  getConfig: () => ipcRenderer.invoke('get-config'),
  platform: process.platform,
});

// Preload script to expose limited, secure APIs to renderer
// Uses contextBridge if available; falls back for older Electron versions.
const { contextBridge, ipcRenderer } = require('electron');

function buildAPI() {
  return {
    quit: () => ipcRenderer.send('app-quit')
  };
}

if (contextBridge && ipcRenderer) {
  try {
    contextBridge.exposeInMainWorld('wellbeing', buildAPI());
  } catch (e) {
    // Fallback assignment if expose fails
    window.wellbeing = buildAPI();
  }
} else {
  // Older Electron fallback
  window.wellbeing = buildAPI();
}

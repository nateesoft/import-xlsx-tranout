// Preload script — runs in renderer context before page loads.
// contextIsolation: true, so no Node.js APIs are exposed to the page.
// This file exists as a placeholder and for future IPC use if needed.

const { contextBridge } = require("electron");

// Expose the app version to the renderer (optional, safe)
contextBridge.exposeInMainWorld("electronApp", {
  platform: process.platform,
});

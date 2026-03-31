// Preload script — runs in renderer context before page loads.
// contextIsolation: true, so no Node.js APIs are exposed to the page.

const { contextBridge, ipcRenderer } = require("electron");

contextBridge.exposeInMainWorld("electronApp", {
  platform: process.platform,
  mysql: {
    loadConfig: () => ipcRenderer.invoke("mysql:load-config"),
    saveConfig: (config) => ipcRenderer.invoke("mysql:save-config", config),
    testConnection: (config) => ipcRenderer.invoke("mysql:test-connection", config),
    getColumns: (config, table) =>
      ipcRenderer.invoke("mysql:get-columns", { config, table }),
    getColumnDefs: (config, table) =>
      ipcRenderer.invoke("mysql:get-column-defs", { config, table }),
    authenticate: (config, username, password) =>
      ipcRenderer.invoke("mysql:authenticate", { config, username, password }),
    insertData: (payload) =>
      ipcRenderer.invoke("mysql:insert-data", payload),
  },
});

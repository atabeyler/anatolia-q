const { contextBridge } = require("electron");

contextBridge.exposeInMainWorld("anatoliaDesktop", {
  platform: process.platform,
  mode: "desktop-shell"
});

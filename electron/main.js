const { app, BrowserWindow, Menu, shell, nativeTheme } = require("electron");
const path = require("path");

const APP_URL = process.env.ANATOLIA_Q_DESKTOP_URL || "https://anatolia-q.onrender.com/";

function createWindow() {
  nativeTheme.themeSource = "dark";

  const win = new BrowserWindow({
    width: 1520,
    height: 940,
    minWidth: 1180,
    minHeight: 760,
    show: false,
    backgroundColor: "#020712",
    title: "T.C. ANATOLIA-Q",
    autoHideMenuBar: true,
    webPreferences: {
      preload: path.join(__dirname, "preload.js"),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true
    }
  });

  win.once("ready-to-show", () => {
    win.show();
    win.focus();
  });

  win.webContents.setWindowOpenHandler(({ url }) => {
    shell.openExternal(url);
    return { action: "deny" };
  });

  win.webContents.on("will-navigate", (event, url) => {
    const allowed = new URL(APP_URL).origin;
    if (!url.startsWith(allowed)) {
      event.preventDefault();
      shell.openExternal(url);
    }
  });

  win.loadURL(APP_URL);
}

function buildMenu() {
  const template = [
    {
      label: "Uygulama",
      submenu: [
        { role: "reload", label: "Yenile" },
        { role: "forceReload", label: "Zorla Yenile" },
        { type: "separator" },
        { role: "togglefullscreen", label: "Tam Ekran" },
        { type: "separator" },
        { role: "quit", label: "Kapat" }
      ]
    },
    {
      label: "Destek",
      submenu: [
        {
          label: "Canli Sistemi Tarayicida Ac",
          click: () => shell.openExternal(APP_URL)
        }
      ]
    }
  ];

  Menu.setApplicationMenu(Menu.buildFromTemplate(template));
}

app.whenReady().then(() => {
  buildMenu();
  createWindow();

  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") app.quit();
});

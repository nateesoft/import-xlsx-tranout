const { app, BrowserWindow, shell, ipcMain } = require("electron");
const path = require("path");
const { spawn } = require("child_process");
const http = require("http");
const fs = require("fs");

// In packaged app, isPackaged = true. In dev (electron .), isPackaged = false.
const isDev = !app.isPackaged;
const PORT = isDev ? 3000 : 3099;

// ── MySQL config path ─────────────────────────────────────────────────────
function getMysqlConfigPath() {
  return path.join(app.getPath("userData"), "mysql-config.json");
}

// ── MySQL IPC handlers ────────────────────────────────────────────────────
function setupMysqlIpc() {
  ipcMain.handle("mysql:load-config", () => {
    try {
      const p = getMysqlConfigPath();
      if (fs.existsSync(p)) return JSON.parse(fs.readFileSync(p, "utf8"));
    } catch {}
    return null;
  });

  ipcMain.handle("mysql:save-config", (_event, config) => {
    try {
      fs.writeFileSync(getMysqlConfigPath(), JSON.stringify(config, null, 2), "utf8");
      return { ok: true };
    } catch (e) {
      return { ok: false, error: e.message };
    }
  });

  ipcMain.handle("mysql:test-connection", async (_event, config) => {
    let conn;
    try {
      const mysql = require("mysql2/promise");
      conn = await mysql.createConnection({
        host: config.host || "localhost",
        port: Number(config.port) || 3306,
        user: config.user,
        password: config.password,
        database: config.database,
        connectTimeout: 5000,
      });
      await conn.ping();
      return { ok: true };
    } catch (e) {
      return { ok: false, error: e.message };
    } finally {
      if (conn) await conn.end().catch(() => {});
    }
  });

  ipcMain.handle("mysql:get-columns", async (_event, { config, table }) => {
    let conn;
    try {
      const mysql = require("mysql2/promise");
      conn = await mysql.createConnection({
        host: config.host || "localhost",
        port: Number(config.port) || 3306,
        user: config.user,
        password: config.password,
        database: config.database,
        connectTimeout: 5000,
      });
      // Escape backticks in table name to prevent injection
      const safeName = table.replace(/`/g, "``");
      const [rows] = await conn.execute(`SHOW COLUMNS FROM \`${safeName}\``);
      return { ok: true, columns: rows.map((r) => r.Field) };
    } catch (e) {
      return { ok: false, error: e.message };
    } finally {
      if (conn) await conn.end().catch(() => {});
    }
  });
}

setupMysqlIpc();

let mainWindow = null;
let nextServer = null;

// ── Poll until Next.js server responds ────────────────────────────────────
function waitForServer(port, retries = 60) {
  return new Promise((resolve, reject) => {
    const attempt = () => {
      const req = http.get(`http://localhost:${port}`, (res) => {
        res.resume();
        resolve();
      });
      req.on("error", () => {
        if (retries-- > 0) {
          setTimeout(attempt, 500);
        } else {
          reject(new Error(`Server on port ${port} did not start`));
        }
      });
      req.setTimeout(400, () => {
        req.destroy();
        if (retries-- > 0) setTimeout(attempt, 300);
        else reject(new Error("Timeout waiting for server"));
      });
    };
    attempt();
  });
}

// ── Spawn standalone Next.js server (production only) ────────────────────
function startNextServer() {
  return new Promise((resolve, reject) => {
    // standalone server.js is placed in resources/standalone/ by electron-builder
    const serverScript = path.join(
      process.resourcesPath,
      "standalone",
      "server.js"
    );

    nextServer = spawn(process.execPath, [serverScript], {
      env: {
        ...process.env,
        PORT: String(PORT),
        NODE_ENV: "production",
        // Env vars for auth — can be overridden by system env
        LOGIN_USERNAME: process.env.LOGIN_USERNAME || "admin",
        LOGIN_PASSWORD: process.env.LOGIN_PASSWORD || "1234",
        HOSTNAME: "127.0.0.1",
      },
      stdio: "pipe",
    });

    nextServer.stdout.on("data", (data) => {
      const msg = data.toString();
      console.log("[Next.js]", msg.trim());
      if (msg.includes("Ready") || msg.includes("started server")) {
        resolve();
      }
    });

    nextServer.stderr.on("data", (data) => {
      console.error("[Next.js stderr]", data.toString().trim());
    });

    nextServer.on("error", reject);

    // Fallback resolve after 5 s to unblock window creation
    setTimeout(resolve, 5000);
  });
}

// ── Create the main window ────────────────────────────────────────────────
function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1400,
    height: 900,
    minWidth: 960,
    minHeight: 640,
    show: false, // show after ready-to-show to avoid white flash
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, "preload.js"),
    },
    title: "Import Excel / Menu Items",
    // macOS traffic-light buttons
    titleBarStyle: process.platform === "darwin" ? "hiddenInset" : "default",
  });

  mainWindow.loadURL(`http://localhost:${PORT}`);

  // Show window once content is ready (no white flash)
  mainWindow.once("ready-to-show", () => {
    mainWindow.show();
    if (isDev) mainWindow.webContents.openDevTools();
  });

  // Open external links in the system browser, not in Electron
  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    shell.openExternal(url);
    return { action: "deny" };
  });

  mainWindow.on("closed", () => {
    mainWindow = null;
  });
}

// ── App lifecycle ─────────────────────────────────────────────────────────
app.whenReady().then(async () => {
  if (!isDev) {
    console.log("Starting Next.js standalone server...");
    await startNextServer();
    // Poll to confirm server is actually accepting connections
    await waitForServer(PORT).catch((err) =>
      console.warn("Server wait timeout:", err.message)
    );
  }

  createWindow();

  // macOS: re-create window when dock icon is clicked and no windows are open
  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

// Quit when all windows are closed (except on macOS)
app.on("window-all-closed", () => {
  if (process.platform !== "darwin") app.quit();
});

// Kill the Next.js server process when the app quits
app.on("before-quit", () => {
  if (nextServer) {
    nextServer.kill();
    nextServer = null;
  }
});

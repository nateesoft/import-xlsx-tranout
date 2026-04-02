const { app, BrowserWindow, shell, ipcMain } = require("electron");
const path = require("path");
const { spawn } = require("child_process");
const http = require("http");
const fs = require("fs");

// isPackaged = true when built by electron-builder.
// electron:prod runs unpackaged but with NODE_ENV=production.
const isDev = !app.isPackaged && process.env.NODE_ENV !== "production";
const PORT = isDev ? 3000 : 3099;

// ── MySQL config path ─────────────────────────────────────────────────────
function getMysqlConfigPath() {
  return path.join(app.getPath("userData"), "mysql-config.json");
}

// ── MySQL connection helper ────────────────────────────────────────────────
function makeConnOpts(config, timeout = 5000) {
  return {
    host: config.host || "localhost",
    port: Number(config.port) || 3306,
    user: config.user,
    password: config.password,
    database: config.database,
    charset: "utf8mb4",
    connectTimeout: timeout,
  };
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
      conn = await mysql.createConnection(makeConnOpts(config));
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
      conn = await mysql.createConnection(makeConnOpts(config));
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

  ipcMain.handle("mysql:get-column-defs", async (_event, { config, table }) => {
    let conn;
    try {
      const mysql = require("mysql2/promise");
      conn = await mysql.createConnection(makeConnOpts(config));
      const safeName = table.replace(/`/g, "``");
      const [rows] = await conn.execute(`SHOW COLUMNS FROM \`${safeName}\``);
      return {
        ok: true,
        columns: rows.map((r) => ({ name: r.Field, type: r.Type })),
      };
    } catch (e) {
      return { ok: false, error: e.message };
    } finally {
      if (conn) await conn.end().catch(() => {});
    }
  });

  ipcMain.handle("mysql:authenticate", async (_event, { config, username, password }) => {
    let conn;
    try {
      const mysql = require("mysql2/promise");
      conn = await mysql.createConnection(makeConnOpts(config));
      const [rows] = await conn.execute(
        "SELECT 1 FROM `posuser` WHERE `username` = ? AND `password` = ? LIMIT 1",
        [username, password]
      );
      if (Array.isArray(rows) && rows.length > 0) {
        return { ok: true };
      }
      return { ok: false, error: "ชื่อผู้ใช้หรือรหัสผ่านไม่ถูกต้อง" };
    } catch (e) {
      return { ok: false, error: e.message };
    } finally {
      if (conn) await conn.end().catch(() => {});
    }
  });

  ipcMain.handle(
    "mysql:insert-data",
    async (_event, { config, headerTable, headerData, detailTable, detailData }) => {
      let conn;
      try {
        const mysql = require("mysql2/promise");
        conn = await mysql.createConnection(makeConnOpts(config, 10000));

        await conn.beginTransaction();

        // 1. Insert header row
        if (headerTable) {
          const entries = Object.entries(headerData || {}).filter(
            ([, v]) => v !== "" && v !== null && v !== undefined
          );
          if (entries.length > 0) {
            const safeTbl = headerTable.replace(/`/g, "``");
            const cols = entries
              .map(([k]) => `\`${k.replace(/`/g, "``")}\``)
              .join(", ");
            const placeholders = entries.map(() => "?").join(", ");
            const vals = entries.map(([, v]) => v);
            await conn.execute(
              `INSERT INTO \`${safeTbl}\` (${cols}) VALUES (${placeholders})`,
              vals
            );
          }
        }

        // 2. Insert detail rows
        let inserted = 0;
        if (detailTable && Array.isArray(detailData) && detailData.length > 0) {
          const safeTbl = detailTable.replace(/`/g, "``");
          for (const row of detailData) {
            const entries = Object.entries(row).filter(
              ([, v]) => v !== null && v !== undefined
            );
            if (entries.length === 0) continue;
            const cols = entries
              .map(([k]) => `\`${k.replace(/`/g, "``")}\``)
              .join(", ");
            const placeholders = entries.map(() => "?").join(", ");
            const vals = entries.map(([, v]) => v);
            await conn.execute(
              `INSERT INTO \`${safeTbl}\` (${cols}) VALUES (${placeholders})`,
              vals
            );
            inserted++;
          }
        }

        await conn.commit();
        return { ok: true, inserted };
      } catch (e) {
        if (conn) await conn.rollback().catch(() => {});
        return { ok: false, error: e.message };
      } finally {
        if (conn) await conn.end().catch(() => {});
      }
    }
  );
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
    // packaged: resources/standalone/server.js (electron-builder)
    // unpackaged prod: .next/standalone/server.js (electron:prod)
    const serverScript = app.isPackaged
      ? path.join(process.resourcesPath, "standalone", "server.js")
      : path.join(__dirname, "..", ".next", "standalone", "server.js");

    nextServer = spawn(process.execPath, [serverScript], {
      env: {
        ...process.env,
        ELECTRON_RUN_AS_NODE: "1",
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
app.on("before-quit", (event) => {
  if (nextServer) {
    event.preventDefault();
    const proc = nextServer;
    nextServer = null;
    proc.on("exit", () => app.quit());
    proc.kill("SIGTERM");
    // Force kill after 3s if still alive
    setTimeout(() => {
      try { proc.kill("SIGKILL"); } catch {}
    }, 3000);
  }
});

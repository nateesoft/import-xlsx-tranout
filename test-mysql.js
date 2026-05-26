const mysql = require("mysql");

const BASE = {
  host: process.env.DB_HOST || "192.168.1.x",  // <-- แก้ IP ตรงนี้
  port: Number(process.env.DB_PORT) || 3306,
  user: process.env.DB_USER || "root",          // <-- แก้ user
  password: process.env.DB_PASS || "password",  // <-- แก้ password
  database: process.env.DB_NAME || "mydb",      // <-- แก้ database
  connectTimeout: 5000,
};

function tryConnect(label, extra) {
  return new Promise((resolve) => {
    const conn = mysql.createConnection({ ...BASE, ...extra });
    conn.connect((err) => {
      conn.end();
      if (err) {
        console.log(`[FAIL] ${label}: ${err.code} - ${err.message}`);
      } else {
        console.log(`[OK]   ${label}`);
      }
      resolve();
    });
  });
}

async function main() {
  console.log("=== MySQL 5.0.21 Connection Test ===\n");

  // 1. default (no extra options)
  await tryConnect("1. default only");

  // 2. insecureAuth only
  await tryConnect("2. insecureAuth: true", { insecureAuth: true });

  // 3. remove SECURE_CONNECTION
  await tryConnect("3. -SECURE_CONNECTION", {
    flags: ["-SECURE_CONNECTION"],
  });

  // 4. insecureAuth + -SECURE_CONNECTION (original code)
  await tryConnect("4. insecureAuth + -SECURE_CONNECTION", {
    insecureAuth: true,
    flags: ["-SECURE_CONNECTION"],
  });

  // 5. no charset
  await tryConnect("5. insecureAuth (no charset)", {
    insecureAuth: true,
    charset: undefined,
  });

  // 6. latin1 charset
  await tryConnect("6. insecureAuth + latin1 charset", {
    insecureAuth: true,
    charset: "latin1",
  });

  // 7. protocol 4.0 (non-41)
  await tryConnect("7. -PROTOCOL_41 (old protocol)", {
    flags: ["-PROTOCOL_41", "-SECURE_CONNECTION"],
    insecureAuth: true,
  });
}

main();

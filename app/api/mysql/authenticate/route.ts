import { NextRequest, NextResponse } from "next/server";
import mysql from "mysql";

function createConn(config: Record<string, unknown>, timeout = 5000) {
  return mysql.createConnection({
    host: (config.host as string) || "localhost",
    port: Number(config.port) || 3306,
    user: config.user as string,
    password: config.password as string,
    database: config.database as string,
    charset: "utf8mb4",
    connectTimeout: timeout,
    insecureAuth: true,
  });
}

export async function POST(req: NextRequest) {
  const { config, username, password } = await req.json();
  return new Promise<NextResponse>((resolve) => {
    const conn = createConn(config);
    conn.connect((err) => {
      if (err) {
        conn.end();
        return resolve(NextResponse.json({ ok: false, error: err.message }));
      }
      conn.query(
        "SELECT 1 FROM `posuser` WHERE `username` = ? AND `password` = ? LIMIT 1",
        [username, password],
        (qErr, rows) => {
          conn.end();
          if (qErr) {
            return resolve(NextResponse.json({ ok: false, error: qErr.message }));
          }
          if (Array.isArray(rows) && rows.length > 0) {
            return resolve(NextResponse.json({ ok: true }));
          }
          resolve(NextResponse.json({ ok: false, error: "ชื่อผู้ใช้หรือรหัสผ่านไม่ถูกต้อง" }));
        }
      );
    });
  });
}

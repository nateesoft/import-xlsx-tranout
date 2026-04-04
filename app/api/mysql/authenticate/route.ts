import { NextRequest, NextResponse } from "next/server";
import mysql from "mysql2/promise";

function makeConnOpts(config: Record<string, unknown>, timeout = 5000) {
  return {
    host: (config.host as string) || "localhost",
    port: Number(config.port) || 3306,
    user: config.user as string,
    password: config.password as string,
    database: config.database as string,
    charset: "utf8mb4",
    connectTimeout: timeout,
  };
}

export async function POST(req: NextRequest) {
  let conn: mysql.Connection | undefined;
  try {
    const { config, username, password } = await req.json();
    conn = await mysql.createConnection(makeConnOpts(config));
    const [rows] = await conn.execute(
      "SELECT 1 FROM `posuser` WHERE `username` = ? AND `password` = ? LIMIT 1",
      [username, password]
    );
    if (Array.isArray(rows) && rows.length > 0) {
      return NextResponse.json({ ok: true });
    }
    return NextResponse.json({ ok: false, error: "ชื่อผู้ใช้หรือรหัสผ่านไม่ถูกต้อง" });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : "Unknown error";
    return NextResponse.json({ ok: false, error: msg });
  } finally {
    if (conn) await conn.end().catch(() => {});
  }
}

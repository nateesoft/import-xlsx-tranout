import { NextRequest, NextResponse } from "next/server";
import mysql from "mysql";

function createConn(config: Record<string, unknown>, timeout = 5000) {
  return mysql.createConnection({
    host: (config.host as string) || "localhost",
    port: Number(config.port) || 3306,
    user: config.user as string,
    password: config.password as string,
    database: config.database as string,
    charset: "utf8",
    connectTimeout: timeout,
    insecureAuth: true,
    flags: ["-PLUGIN_AUTH", "-CONNECT_ATTRS"],
  });
}

export async function POST(req: NextRequest) {
  const config = await req.json();
  return new Promise<NextResponse>((resolve) => {
    const conn = createConn(config);
    conn.connect((err) => {
      conn.end();
      if (err) {
        resolve(NextResponse.json({ ok: false, error: err.message }));
      } else {
        resolve(NextResponse.json({ ok: true }));
      }
    });
  });
}

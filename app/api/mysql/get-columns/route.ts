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
    flags: ["-PROTOCOL_41"],
  });
}

export async function POST(req: NextRequest) {
  const { config, table } = await req.json();
  return new Promise<NextResponse>((resolve) => {
    const conn = createConn(config);
    conn.connect((err) => {
      if (err) {
        conn.end();
        return resolve(NextResponse.json({ ok: false, error: err.message }));
      }
      const safeName = (table as string).replace(/`/g, "``");
      conn.query(`SHOW COLUMNS FROM \`${safeName}\``, (qErr, rows: Record<string, unknown>[]) => {
        conn.end();
        if (qErr) {
          return resolve(NextResponse.json({ ok: false, error: qErr.message }));
        }
        resolve(NextResponse.json({ ok: true, columns: rows.map((r) => r.Field) }));
      });
    });
  });
}

import { NextRequest, NextResponse } from "next/server";
import mysql from "mysql";
import { promisify } from "util";

function createConn(config: Record<string, unknown>, timeout = 5000) {
  return mysql.createConnection({
    host: (config.host as string) || "localhost",
    port: Number(config.port) || 3306,
    user: config.user as string,
    password: config.password as string,
    database: config.database as string,
    charset: "utf8mb4",
    connectTimeout: timeout,
  });
}

export async function POST(req: NextRequest) {
  let conn: mysql.Connection | undefined;
  try {
    const { config, table } = await req.json();
    conn = createConn(config);
    await promisify(conn.connect.bind(conn))();
    const query = promisify(conn.query.bind(conn)) as (
      sql: string
    ) => Promise<Record<string, unknown>[]>;
    const safeName = (table as string).replace(/`/g, "``");
    const rows = await query(`SHOW COLUMNS FROM \`${safeName}\``);
    return NextResponse.json({
      ok: true,
      columns: rows.map((r) => r.Field),
    });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : "Unknown error";
    return NextResponse.json({ ok: false, error: msg });
  } finally {
    if (conn) conn.end();
  }
}

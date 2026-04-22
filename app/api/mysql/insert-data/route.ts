import { NextRequest, NextResponse } from "next/server";
import mysql, { type QueryResult, type FieldPacket } from "mysql2/promise";

type RowData = Record<string, string | number | boolean | null>;

type ExecFn = (sql: string, values: unknown[]) => Promise<[QueryResult, FieldPacket[]]>;

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
    const { config, headerTable, headerData, detailTable, detailData } =
      await req.json();

    conn = await mysql.createConnection(makeConnOpts(config, 10000));
    await conn.beginTransaction();

    // 1. Insert header row
    if (headerTable) {
      const entries = Object.entries(
        (headerData as Record<string, unknown>) || {}
      ).filter(([, v]) => v !== "" && v !== null && v !== undefined);
      if (entries.length === 0) {
        throw new Error("ข้อมูล header ว่างทั้งหมด ไม่สามารถบันทึกได้");
      }
      const safeTbl = (headerTable as string).replace(/`/g, "``");
      const cols = entries
        .map(([k]) => `\`${k.replace(/`/g, "``")}\``)
        .join(", ");
      const placeholders = entries.map(() => "?").join(", ");
      const vals = entries.map(([, v]) => v);
      await (conn.execute as ExecFn)(
        `INSERT INTO \`${safeTbl}\` (${cols}) VALUES (${placeholders})`,
        vals
      );
    }

    // 2. Insert detail rows
    let inserted = 0;
    if (
      detailTable &&
      Array.isArray(detailData) &&
      detailData.length > 0
    ) {
      const safeTbl = (detailTable as string).replace(/`/g, "``");
      for (const row of detailData as RowData[]) {
        const entries = Object.entries(row).filter(
          ([, v]) => v !== null && v !== undefined
        );
        if (entries.length === 0) continue;
        const cols = entries
          .map(([k]) => `\`${k.replace(/`/g, "``")}\``)
          .join(", ");
        const placeholders = entries.map(() => "?").join(", ");
        const vals = entries.map(([, v]) => v);
        await (conn.execute as ExecFn)(
          `INSERT INTO \`${safeTbl}\` (${cols}) VALUES (${placeholders})`,
          vals
        );
        inserted++;
      }
    }

    await conn.commit();
    return NextResponse.json({ ok: true, inserted });
  } catch (e: unknown) {
    if (conn) await conn.rollback().catch(() => {});
    const msg = e instanceof Error ? e.message : "Unknown error";
    return NextResponse.json({ ok: false, error: msg });
  } finally {
    if (conn) await conn.end().catch(() => {});
  }
}

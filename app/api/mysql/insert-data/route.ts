import { NextRequest, NextResponse } from "next/server";
import mysql from "mysql";
import { Unicode2ASCII } from "../utils/StringUtil";

type RowData = Record<string, string | number | boolean | null>;

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
    flags: ["-SECURE_CONNECTION", "-PLUGIN_AUTH", "-CONNECT_ATTRS"],
  });
}

export async function POST(req: NextRequest) {
  const { config, headerTable, headerData, detailTable, detailData } =
    await req.json();

  return new Promise<NextResponse>((resolve) => {
    const conn = createConn(config, 10000);
    conn.connect((connErr) => {
      if (connErr) {
        conn.end();
        return resolve(NextResponse.json({ ok: false, error: connErr.message }));
      }

      conn.beginTransaction((txErr) => {
        if (txErr) {
          conn.end();
          return resolve(NextResponse.json({ ok: false, error: txErr.message }));
        }

        const rollbackAndResolve = (msg: string) => {
          conn.rollback(() => conn.end());
          resolve(NextResponse.json({ ok: false, error: msg }));
        };

        const insertHeader = (next: () => void) => {
          if (!headerTable) return next();
          const entries = Object.entries(
            (headerData as Record<string, unknown>) || {}
          ).filter(([, v]) => v !== "" && v !== null && v !== undefined);
          if (entries.length === 0) {
            return rollbackAndResolve("ข้อมูล header ว่างทั้งหมด ไม่สามารถบันทึกได้");
          }
          const safeTbl = (headerTable as string).replace(/`/g, "``");
          const cols = entries.map(([k]) => `\`${k.replace(/`/g, "``")}\``).join(", ");
          const placeholders = Unicode2ASCII(entries.map(() => "?").join(", "));
          const vals = entries.map(([, v]) => v);
          conn.query(
            `INSERT INTO \`${safeTbl}\` (${cols}) VALUES (${placeholders})`,
            vals,
            (err) => {
              if (err) return rollbackAndResolve(err.message);
              next();
            }
          );
        };

        const insertDetails = (next: (inserted: number) => void) => {
          if (!detailTable || !Array.isArray(detailData) || detailData.length === 0) {
            return next(0);
          }
          const safeTbl = (detailTable as string).replace(/`/g, "``");
          let inserted = 0;
          const rows = (detailData as RowData[]).filter((row) =>
            Object.values(row).some((v) => v !== null && v !== undefined)
          );

          const insertNext = (i: number) => {
            if (i >= rows.length) return next(inserted);
            const entries = Object.entries(rows[i]).filter(([, v]) => v !== null && v !== undefined);
            if (entries.length === 0) return insertNext(i + 1);
            const cols = entries.map(([k]) => `\`${k.replace(/`/g, "``")}\``).join(", ");
            const placeholders = Unicode2ASCII(entries.map(() => "?").join(", "));
            const vals = entries.map(([, v]) => v);
            conn.query(
              `INSERT INTO \`${safeTbl}\` (${cols}) VALUES (${placeholders})`,
              vals,
              (err) => {
                if (err) return rollbackAndResolve(err.message);
                inserted++;
                insertNext(i + 1);
              }
            );
          };
          insertNext(0);
        };

        insertHeader(() => {
          insertDetails((inserted) => {
            conn.commit((commitErr) => {
              conn.end();
              if (commitErr) {
                return resolve(NextResponse.json({ ok: false, error: commitErr.message }));
              }
              resolve(NextResponse.json({ ok: true, inserted }));
            });
          });
        });
      });
    });
  });
}

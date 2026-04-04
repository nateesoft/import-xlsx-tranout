import { NextRequest, NextResponse } from "next/server";
import fs from "fs";
import path from "path";
import os from "os";

function getConfigPath() {
  return path.join(os.homedir(), ".import-xlsx-tranout", "mysql-config.json");
}

export async function POST(req: NextRequest) {
  try {
    const config = await req.json();
    const p = getConfigPath();
    fs.mkdirSync(path.dirname(p), { recursive: true });
    fs.writeFileSync(p, JSON.stringify(config, null, 2), "utf8");
    return NextResponse.json({ ok: true });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : "Unknown error";
    return NextResponse.json({ ok: false, error: msg }, { status: 500 });
  }
}

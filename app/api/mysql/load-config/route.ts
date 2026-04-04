import { NextResponse } from "next/server";
import fs from "fs";
import path from "path";
import os from "os";

function getConfigPath() {
  return path.join(os.homedir(), ".import-xlsx-tranout", "mysql-config.json");
}

export async function GET() {
  try {
    const p = getConfigPath();
    if (fs.existsSync(p)) {
      const data = JSON.parse(fs.readFileSync(p, "utf8"));
      return NextResponse.json(data);
    }
    return NextResponse.json(null);
  } catch {
    return NextResponse.json(null);
  }
}

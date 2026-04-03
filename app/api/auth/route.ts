import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  try {
    const { username, password } = await req.json();
    const validUser = process.env.LOGIN_USERNAME ?? "admin";
    const validPass = process.env.LOGIN_PASSWORD ?? "1234";
    if (username === validUser && password === validPass) {
      return NextResponse.json({ ok: true });
    }
    return NextResponse.json(
      { error: "ชื่อผู้ใช้หรือรหัสผ่านไม่ถูกต้อง" },
      { status: 401 }
    );
  } catch {
    return NextResponse.json({ error: "เกิดข้อผิดพลาด" }, { status: 500 });
  }
}

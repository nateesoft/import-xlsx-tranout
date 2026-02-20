import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  const { username, password } = await req.json();

  const validUser = process.env.LOGIN_USERNAME;
  const validPass = process.env.LOGIN_PASSWORD;

  if (!validUser || !validPass) {
    return NextResponse.json(
      { error: "Server configuration error" },
      { status: 500 }
    );
  }

  if (username === validUser && password === validPass) {
    return NextResponse.json({ ok: true });
  }

  return NextResponse.json(
    { error: "ชื่อผู้ใช้หรือรหัสผ่านไม่ถูกต้อง" },
    { status: 401 }
  );
}

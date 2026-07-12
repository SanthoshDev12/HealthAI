import { NextResponse } from "next/server";
import { getSession, enableTOTP, TOTPVerifySchema } from "@/lib/auth";
import { parseBody } from "@/utils/validation";
import { ValidationError } from "@/utils/errors";

export async function POST(req: Request) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let input: unknown;
  try {
    input = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  let data;
  try {
    data = parseBody(TOTPVerifySchema, input);
  } catch (err) {
    if (err instanceof ValidationError) {
      const ve = err as ValidationError;
      return NextResponse.json({ error: ve.message, details: ve.details }, { status: 400 });
    }
    throw err;
  }

  const ok = await enableTOTP(session.sub, data.token);
  if (!ok) {
    return NextResponse.json({ error: "Invalid 2FA token" }, { status: 400 });
  }

  return NextResponse.json({ twoFAEnabled: true });
}

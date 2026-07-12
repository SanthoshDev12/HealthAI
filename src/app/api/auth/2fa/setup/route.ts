import { NextResponse } from "next/server";
import { getSession, setupTOTP } from "@/lib/auth";

export async function POST() {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { secret, otpauthUrl } = await setupTOTP(session.sub);
  // Return the plaintext secret + otpauth URL so the client can render a QR code.
  // The encrypted copy is already stored server‑side.
  return NextResponse.json({ secret, otpauthUrl });
}

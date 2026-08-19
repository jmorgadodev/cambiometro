import { NextResponse } from "next/server";

export async function GET() {
  return NextResponse.json({
    status: "unavailable",
    code: "PUSH_SUBSCRIPTIONS_DISABLED",
    message: "Las suscripciones push no están habilitadas.",
  }, { status: 503 });
}

import { NextResponse } from "next/server";

const unavailablePayload = {
  status: "unavailable",
  code: "API_KEY_PROVISIONING_UNAVAILABLE",
  message: "El provisionamiento de llaves comerciales todavía no está configurado.",
  public_api: {
    documentation_url: "https://cambiometro.impulsacv.cl/como-funciona",
    authentication: "No requerida para los endpoints públicos actuales",
  },
};

export async function GET() {
  return NextResponse.json(unavailablePayload, { status: 503 });
}

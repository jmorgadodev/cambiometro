import { NextRequest, NextResponse } from "next/server";
import { queryTransferencias } from "@/lib/transferencias-d1";

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const page = Number(searchParams.get("page")) || 1;
  const limit = Number(searchParams.get("limit")) || 50;
  const search = searchParams.get("q") || searchParams.get("search") || "";
  const year = searchParams.get("year") || "";
  const emisor = searchParams.get("emisor") || "";
  const sortBy = searchParams.get("sort") === "fecha" ? "fecha" : "monto";
  const sortOrder = searchParams.get("order") === "asc" ? "asc" : "desc";

  try {
    const result = await queryTransferencias({
      page,
      limit,
      search,
      year,
      emisor,
      sortBy,
      sortOrder,
    });

    return NextResponse.json(result, {
      headers: {
        "Cache-Control": "public, s-maxage=3600, stale-while-revalidate=86400",
      },
    });
  } catch (error) {
    console.error("API /api/v1/transferencias error:", error);
    return NextResponse.json(
      { error: "Error al consultar transferencias" },
      { status: 500 }
    );
  }
}

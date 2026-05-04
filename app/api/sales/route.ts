import { NextResponse } from "next/server";
import { fetchSalesRows } from "@/lib/sheet";

export const revalidate = 60;

export async function GET() {
  try {
    const rows = await fetchSalesRows();
    return NextResponse.json({
      ok: true,
      updatedAt: new Date().toISOString(),
      total: rows.length,
      rows,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json(
      { ok: false, error: message },
      { status: 500 },
    );
  }
}

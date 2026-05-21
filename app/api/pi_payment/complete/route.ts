import { NextResponse } from "next/server";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { paymentId, txid } = body;

    console.log("[Pi] Completing payment:", paymentId, txid);

    // TODO: finalize payment in DB

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("Complete error:", err);
    return NextResponse.json(
      { success: false, error: "Complete failed" },
      { status: 500 }
    );
  }
}
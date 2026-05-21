import { NextResponse } from "next/server";

export const runtime = "nodejs";

export async function POST(req: Request) {
  try {
    const { paymentId } = await req.json();

    console.log("👉 APPROVE HIT:", paymentId);

    const apiKey = process.env.PI_API_KEY;

    if (!apiKey) {
      throw new Error("PI_API_KEY missing");
    }

    const url = `https://api.minepi.com/v2/payments/${paymentId}/approve`;

    console.log("👉 Calling Pi:", url);

    const res = await fetch(url, {
      method: "POST",
      headers: {
        Authorization: `Key ${apiKey}`,
        "Content-Type": "application/json",
      },
    });

    const text = await res.text();

    console.log("👉 Pi status:", res.status);
    console.log("👉 Pi body:", text);

    if (!res.ok) {
      return NextResponse.json(
        { error: "pi_failed", details: text },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (err: any) {
    console.error("❌ APPROVE ERROR:", err);
    return NextResponse.json(
      { error: "server_error", message: err.message },
      { status: 500 }
    );
  }
}
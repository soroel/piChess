import { NextResponse } from "next/server";

export async function POST(req: Request) {
  try {
    const { paymentId } = await req.json();

    console.log("👉 APPROVE HIT:", paymentId);
    console.log("👉 API KEY EXISTS:", !!process.env.PI_API_KEY);

    if (!process.env.PI_API_KEY) {
      throw new Error("PI_API_KEY is missing in environment variables");
    }

    const url = `https://api.minepi.com/v2/payments/${paymentId}/approve`;

    console.log("👉 Calling Pi:", url);

    const res = await fetch(url, {
      method: "POST",
      headers: {
        Authorization: `Key ${process.env.PI_API_KEY}`,
      },
    });

    const text = await res.text();

    console.log("👉 Pi response status:", res.status);
    console.log("👉 Pi response body:", text);

    if (!res.ok) {
      return NextResponse.json(
        { error: "pi_failed", details: text },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (err: any) {
    console.error("❌ APPROVE ERROR:", err.message || err);

    return NextResponse.json(
      { error: "server_error", message: err.message },
      { status: 500 }
    );
  }
}
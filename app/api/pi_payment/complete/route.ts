import { NextResponse } from "next/server";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { paymentId, txid } = body;

    console.log("[Pi] Completing payment:", paymentId, txid);

    const response = await fetch(
      `https://api.minepi.com/v2/payments/${paymentId}/complete`,
      {
        method: "POST",
        headers: {
          Authorization: `Key ${process.env.PI_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          txid,
        }),
      }
    );

    const data = await response.json();

    console.log("[Pi] Complete response:", data);

    if (!response.ok) {
      return NextResponse.json(
        {
          success: false,
          error: data,
        },
        { status: response.status }
      );
    }

    // OPTIONAL:
    // save completed payment in DB here

    return NextResponse.json({
      success: true,
      data,
    });
  } catch (err: any) {
    console.error("Complete error:", err);

    return NextResponse.json(
      {
        success: false,
        error: err.message,
      },
      { status: 500 }
    );
  }
}
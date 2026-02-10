import { NextResponse } from "next/server";
import { notifyOrderReceived } from "../../actions/whatsapp-actions";

/**
 * This API is called whenever a new order is received
 * (order already exists in DB)
 */
export async function POST(req: Request) {
  try {
    const body = await req.json();

    /**
     * Expected payload:
     * {
     *   "orderId": 123
     * }
     */
    const { orderId } = body;

    if (!orderId) {
      return NextResponse.json(
        { success: false, error: "orderId is required" },
        { status: 400 }
      );
    }

    // 🔔 AUTOMATIC WHATSAPP SEND
    await notifyOrderReceived(Number(orderId));

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("❌ Order API Error:", error);

    return NextResponse.json(
      { success: false, error: "Failed to process order" },
      { status: 500 }
    );
  }
}

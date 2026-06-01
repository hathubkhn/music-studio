import { NextRequest, NextResponse } from "next/server"
import crypto from "crypto"

const WEBHOOK_SECRET = process.env.KIE_CALLBACK_SECRET || ""

function verifySignature(payload: string, signature: string, secret: string): boolean {
  if (!secret) return true // Allow in dev mode
  const expected = crypto
    .createHmac("sha256", secret)
    .update(payload)
    .digest("hex")
  return crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expected))
}

export async function POST(req: NextRequest) {
  try {
    const rawBody = await req.text()
    const signature = req.headers.get("x-signature") || ""

    if (!verifySignature(rawBody, signature, WEBHOOK_SECRET)) {
      return NextResponse.json({ error: "Invalid signature" }, { status: 401 })
    }

    const body = JSON.parse(rawBody)
    const { taskId, type, status, result } = body

    console.log(`[Webhook] Task ${taskId} (${type}): ${status}`)

    // Here you would update the job status in the database
    // and trigger any downstream processing

    return NextResponse.json({ received: true })
  } catch (error) {
    return NextResponse.json({ error: "Invalid webhook payload" }, { status: 400 })
  }
}

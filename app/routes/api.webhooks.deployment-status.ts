import type { ActionFunctionArgs } from "@remix-run/node"
import { json } from "@remix-run/node"
import { webhookStore } from "~/lib/stores/webhook"

export async function action({ request }: ActionFunctionArgs) {
  if (request.method !== "POST") {
    return json({ success: false, message: "Method not allowed" }, { status: 405 })
  }

  try {
    const payload = await request.json()
    const signature = request.headers.get("X-Webhook-Signature")

    // Handle the incoming webhook
    const result = await webhookStore.handleIncomingWebhook(payload, signature || undefined)

    return json(result, { status: result.success ? 200 : 400 })
  } catch (error) {
    console.error("Error processing deployment status webhook:", error)
    return json({ success: false, message: "Invalid request body" }, { status: 400 })
  }
}

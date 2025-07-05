import type { LoaderFunctionArgs } from "@remix-run/node"

export async function loader({ request }: LoaderFunctionArgs) {
  // Set up Server-Sent Events for real-time webhook monitoring
  const stream = new ReadableStream({
    start(controller) {
      const encoder = new TextEncoder()

      // Send initial connection message
      controller.enqueue(
        encoder.encode(
          `data: ${JSON.stringify({
            type: "connection",
            message: "Connected to webhook monitor",
            timestamp: new Date().toISOString(),
          })}\n\n`,
        ),
      )

      // Simulate webhook events for demo purposes
      const interval = setInterval(() => {
        const events = [
          {
            type: "webhook.sent",
            url: "https://hooks.slack.com/services/example",
            status: 200,
            timestamp: new Date().toISOString(),
          },
          {
            type: "webhook.received",
            endpoint: "/api/webhooks/approval-response",
            status: 200,
            timestamp: new Date().toISOString(),
          },
          {
            type: "webhook.failed",
            url: "https://api.example.com/webhook",
            status: 500,
            error: "Internal Server Error",
            timestamp: new Date().toISOString(),
          },
        ]

        const randomEvent = events[Math.floor(Math.random() * events.length)]

        try {
          controller.enqueue(encoder.encode(`data: ${JSON.stringify(randomEvent)}\n\n`))
        } catch (error) {
          // Client disconnected
          clearInterval(interval)
        }
      }, 5000) // Send event every 5 seconds

      // Clean up on close
      request.signal.addEventListener("abort", () => {
        clearInterval(interval)
        try {
          controller.close()
        } catch (error) {
          // Stream already closed
        }
      })
    },
  })

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Headers": "Cache-Control",
    },
  })
}

import type { ActionFunctionArgs } from "@remix-run/node"
import { json } from "@remix-run/node"

export async function action({ request }: ActionFunctionArgs) {
  if (request.method !== "POST") {
    return json({ error: "Method not allowed" }, { status: 405 })
  }

  try {
    const { url, method, headers, payload, followRedirects, validateSSL } = await request.json()

    if (!url) {
      return json({ error: "URL is required" }, { status: 400 })
    }

    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), 30000) // 30 second timeout

    try {
      const fetchOptions: RequestInit = {
        method: method || "POST",
        headers: headers || {},
        signal: controller.signal,
      }

      if (payload && (method === "POST" || method === "PUT" || method === "PATCH")) {
        fetchOptions.body = payload
      }

      const response = await fetch(url, fetchOptions)
      clearTimeout(timeoutId)

      const responseHeaders: Record<string, string> = {}
      response.headers.forEach((value, key) => {
        responseHeaders[key] = value
      })

      let responseBody = ""
      try {
        responseBody = await response.text()
      } catch (error) {
        responseBody = "Failed to read response body"
      }

      return json({
        status: response.status,
        statusText: response.statusText,
        headers: responseHeaders,
        body: responseBody,
        url: response.url,
      })
    } catch (error) {
      clearTimeout(timeoutId)

      if (error instanceof Error) {
        if (error.name === "AbortError") {
          return json({ error: "Request timeout" }, { status: 408 })
        }
        return json({ error: error.message }, { status: 500 })
      }

      return json({ error: "Unknown error occurred" }, { status: 500 })
    }
  } catch (error) {
    return json({ error: "Invalid request body" }, { status: 400 })
  }
}

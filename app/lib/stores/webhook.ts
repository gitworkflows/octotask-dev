import { map } from "nanostores"
import { approvalStore } from "./approval"

export interface WebhookEvent {
  type:
    | "approval.requested"
    | "approval.approved"
    | "approval.rejected"
    | "approval.expired"
    | "deployment.started"
    | "deployment.completed"
    | "deployment.failed"
  description: string
}

export interface WebhookEndpoint {
  id: string
  name: string
  url: string
  isEnabled: boolean
  events: WebhookEvent[]
  authentication: {
    type: "none" | "bearer" | "basic" | "custom"
    token?: string
    username?: string
    password?: string
    headers?: Record<string, string>
  }
  retryConfig: {
    maxRetries: number
    retryDelay: number
    backoffMultiplier: number
  }
  timeout: number
  createdAt: string
  updatedAt: string
}

export interface WebhookLog {
  id: string
  webhookId: string
  event: string
  url: string
  method: string
  headers: Record<string, string>
  payload: any
  response?: string
  error?: string
  statusCode?: number
  success: boolean
  duration: number
  retryCount: number
  timestamp: string
}

export interface WebhookPayload {
  event: string
  timestamp: string
  data: any
  signature?: string
}

interface WebhookState {
  endpoints: Record<string, WebhookEndpoint>
  logs: Record<string, WebhookLog>
  deliveryQueue: WebhookDelivery[]
}

interface WebhookDelivery {
  id: string
  webhookId: string
  payload: WebhookPayload
  attempt: number
  nextRetry?: string
}

class WebhookStore {
  webhooks = map<WebhookState>({
    endpoints: {},
    logs: {},
    deliveryQueue: [],
  })

  private deliveryInProgress = new Set<string>()

  // Webhook Endpoints
  addWebhook(webhook: WebhookEndpoint) {
    const current = this.webhooks.get()
    this.webhooks.set({
      ...current,
      endpoints: {
        ...current.endpoints,
        [webhook.id]: webhook,
      },
    })
    this.saveToStorage()
  }

  updateWebhook(id: string, updates: Partial<WebhookEndpoint>) {
    const current = this.webhooks.get()
    const webhook = current.endpoints[id]
    if (webhook) {
      this.webhooks.set({
        ...current,
        endpoints: {
          ...current.endpoints,
          [id]: {
            ...webhook,
            ...updates,
            updatedAt: new Date().toISOString(),
          },
        },
      })
      this.saveToStorage()
    }
  }

  removeWebhook(id: string) {
    const current = this.webhooks.get()
    const { [id]: removed, ...endpoints } = current.endpoints
    this.webhooks.set({
      ...current,
      endpoints,
    })
    this.saveToStorage()
  }

  // Webhook Delivery
  async sendWebhook(webhookId: string, payload: WebhookPayload): Promise<void> {
    const current = this.webhooks.get()
    const webhook = current.endpoints[webhookId]

    if (!webhook || !webhook.isEnabled || !webhook.url) {
      throw new Error("Webhook not found or disabled")
    }

    const deliveryId = `${webhookId}-${Date.now()}`

    if (this.deliveryInProgress.has(deliveryId)) {
      return
    }

    this.deliveryInProgress.add(deliveryId)

    try {
      await this.deliverWebhook(webhook, payload, 0)
    } finally {
      this.deliveryInProgress.delete(deliveryId)
    }
  }

  private async deliverWebhook(webhook: WebhookEndpoint, payload: WebhookPayload, attempt: number): Promise<void> {
    const startTime = Date.now()
    const logId = `${webhook.id}-${Date.now()}-${attempt}`

    // Add signature if needed
    const signedPayload = this.signPayload(payload, webhook)

    // Prepare headers
    const headers: Record<string, string> = {
      "Content-Type": "application/json",
      "User-Agent": "OctoTask-Webhook/1.0",
      "X-Webhook-Event": payload.event,
      "X-Webhook-Timestamp": payload.timestamp,
      "X-Webhook-Attempt": (attempt + 1).toString(),
    }

    // Add authentication headers
    this.addAuthenticationHeaders(headers, webhook.authentication)

    // Add signature header
    if (signedPayload.signature) {
      headers["X-Webhook-Signature"] = signedPayload.signature
    }

    let success = false
    let statusCode: number | undefined
    let response: string | undefined
    let error: string | undefined

    try {
      const controller = new AbortController()
      const timeoutId = setTimeout(() => controller.abort(), webhook.timeout)

      const fetchResponse = await fetch(webhook.url, {
        method: "POST",
        headers,
        body: JSON.stringify(signedPayload),
        signal: controller.signal,
      })

      clearTimeout(timeoutId)

      statusCode = fetchResponse.status
      response = await fetchResponse.text()
      success = fetchResponse.ok

      if (!success && attempt < webhook.retryConfig.maxRetries) {
        // Schedule retry
        const delay = webhook.retryConfig.retryDelay * Math.pow(webhook.retryConfig.backoffMultiplier, attempt)
        setTimeout(() => {
          this.deliverWebhook(webhook, payload, attempt + 1)
        }, delay)
      }
    } catch (err) {
      error = err instanceof Error ? err.message : "Unknown error"

      if (attempt < webhook.retryConfig.maxRetries) {
        // Schedule retry
        const delay = webhook.retryConfig.retryDelay * Math.pow(webhook.retryConfig.backoffMultiplier, attempt)
        setTimeout(() => {
          this.deliverWebhook(webhook, payload, attempt + 1)
        }, delay)
      }
    }

    // Log the delivery attempt
    const log: WebhookLog = {
      id: logId,
      webhookId: webhook.id,
      event: payload.event,
      url: webhook.url,
      method: "POST",
      headers,
      payload: signedPayload,
      response,
      error,
      statusCode,
      success,
      duration: Date.now() - startTime,
      retryCount: attempt,
      timestamp: new Date().toISOString(),
    }

    this.addLog(log)
  }

  private signPayload(payload: WebhookPayload, webhook: WebhookEndpoint): WebhookPayload {
    // For now, we'll use a simple HMAC-like signature
    // In a real implementation, you'd use a proper HMAC with a secret key
    const payloadString = JSON.stringify(payload)
    const signature = btoa(payloadString).slice(0, 32) // Simple signature for demo

    return {
      ...payload,
      signature,
    }
  }

  private addAuthenticationHeaders(headers: Record<string, string>, auth: WebhookEndpoint["authentication"]) {
    switch (auth.type) {
      case "bearer":
        if (auth.token) {
          headers["Authorization"] = `Bearer ${auth.token}`
        }
        break
      case "basic":
        if (auth.username && auth.password) {
          const credentials = btoa(`${auth.username}:${auth.password}`)
          headers["Authorization"] = `Basic ${credentials}`
        }
        break
      case "custom":
        if (auth.headers) {
          Object.assign(headers, auth.headers)
        }
        break
    }
  }

  // Event Broadcasting
  async broadcastEvent(eventType: WebhookEvent["type"], data: any) {
    const current = this.webhooks.get()
    const webhooks = Object.values(current.endpoints).filter(
      (webhook) => webhook.isEnabled && webhook.events.some((event) => event.type === eventType),
    )

    const payload: WebhookPayload = {
      event: eventType,
      timestamp: new Date().toISOString(),
      data,
    }

    // Send to all matching webhooks
    const promises = webhooks.map((webhook) =>
      this.sendWebhook(webhook.id, payload).catch((error) => {
        console.error(`Failed to send webhook ${webhook.id}:`, error)
      }),
    )

    await Promise.allSettled(promises)
  }

  // Webhook Logs
  addLog(log: WebhookLog) {
    const current = this.webhooks.get()
    this.webhooks.set({
      ...current,
      logs: {
        ...current.logs,
        [log.id]: log,
      },
    })

    // Keep only last 1000 logs
    const logs = Object.values(current.logs)
    if (logs.length > 1000) {
      const sortedLogs = logs.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
      const logsToKeep = sortedLogs.slice(0, 1000)
      const logsMap = logsToKeep.reduce(
        (acc, log) => {
          acc[log.id] = log
          return acc
        },
        {} as Record<string, WebhookLog>,
      )

      this.webhooks.set({
        ...current,
        logs: logsMap,
      })
    }

    this.saveToStorage()
  }

  clearLogs(webhookId?: string) {
    const current = this.webhooks.get()

    if (webhookId) {
      // Clear logs for specific webhook
      const filteredLogs = Object.fromEntries(
        Object.entries(current.logs).filter(([_, log]) => log.webhookId !== webhookId),
      )
      this.webhooks.set({
        ...current,
        logs: filteredLogs,
      })
    } else {
      // Clear all logs
      this.webhooks.set({
        ...current,
        logs: {},
      })
    }

    this.saveToStorage()
  }

  // Webhook API Endpoints (for receiving webhooks from external systems)
  async handleIncomingWebhook(payload: any, signature?: string): Promise<{ success: boolean; message: string }> {
    try {
      // Verify signature if provided
      if (signature && !this.verifySignature(payload, signature)) {
        return { success: false, message: "Invalid signature" }
      }

      // Handle different webhook events
      switch (payload.event) {
        case "approval.response":
          return await this.handleApprovalResponse(payload.data)
        case "deployment.status":
          return await this.handleDeploymentStatus(payload.data)
        default:
          return { success: false, message: "Unknown event type" }
      }
    } catch (error) {
      console.error("Error handling incoming webhook:", error)
      return { success: false, message: "Internal error" }
    }
  }

  private verifySignature(payload: any, signature: string): boolean {
    // Implement signature verification logic
    // This would typically use HMAC with a shared secret
    return true // Simplified for demo
  }

  private async handleApprovalResponse(data: any): Promise<{ success: boolean; message: string }> {
    const { requestId, action, userId, userName, userEmail, comment } = data

    if (!requestId || !action || !userId) {
      return { success: false, message: "Missing required fields" }
    }

    try {
      const approval = {
        id: Date.now().toString(),
        userId,
        userName: userName || "External User",
        userEmail: userEmail || "external@system.com",
        action,
        comment: comment || "",
        timestamp: new Date().toISOString(),
      }

      approvalStore.addApprovalToRequest(requestId, approval)

      return { success: true, message: "Approval response processed" }
    } catch (error) {
      return { success: false, message: "Failed to process approval response" }
    }
  }

  private async handleDeploymentStatus(data: any): Promise<{ success: boolean; message: string }> {
    // Handle deployment status updates from external systems
    console.log("Deployment status update:", data)
    return { success: true, message: "Deployment status updated" }
  }

  // Storage methods
  loadFromStorage() {
    if (typeof window === "undefined") return

    const stored = localStorage.getItem("octotask_webhooks")
    if (stored) {
      try {
        const webhooks = JSON.parse(stored)
        this.webhooks.set(webhooks)
      } catch (error) {
        console.error("Failed to load webhooks from storage:", error)
      }
    }
  }

  saveToStorage() {
    if (typeof window === "undefined") return

    try {
      localStorage.setItem("octotask_webhooks", JSON.stringify(this.webhooks.get()))
    } catch (error) {
      console.error("Failed to save webhooks to storage:", error)
    }
  }

  // Create default webhooks
  createDefaultWebhooks() {
    const defaultWebhooks: WebhookEndpoint[] = [
      {
        id: "slack-webhook-" + Date.now(),
        name: "Slack Notifications",
        url: "https://hooks.slack.com/services/YOUR/SLACK/WEBHOOK",
        isEnabled: false,
        events: [
          { type: "approval.requested", description: "When an approval is requested" },
          { type: "approval.approved", description: "When an approval is approved" },
          { type: "approval.rejected", description: "When an approval is rejected" },
        ],
        authentication: {
          type: "none",
        },
        retryConfig: {
          maxRetries: 3,
          retryDelay: 1000,
          backoffMultiplier: 2,
        },
        timeout: 30000,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
      {
        id: "jira-webhook-" + Date.now(),
        name: "Jira Integration",
        url: "https://your-domain.atlassian.net/rest/api/3/webhook",
        isEnabled: false,
        events: [
          { type: "deployment.started", description: "When a deployment starts" },
          { type: "deployment.completed", description: "When a deployment completes" },
          { type: "deployment.failed", description: "When a deployment fails" },
        ],
        authentication: {
          type: "bearer",
          token: "your-jira-api-token",
        },
        retryConfig: {
          maxRetries: 5,
          retryDelay: 2000,
          backoffMultiplier: 1.5,
        },
        timeout: 45000,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
    ]

    defaultWebhooks.forEach((webhook) => {
      this.addWebhook(webhook)
    })
  }
}

export const webhookStore = new WebhookStore()

// Auto-save to localStorage when webhooks change
webhookStore.webhooks.subscribe(() => {
  webhookStore.saveToStorage()
})

// Load from localStorage on initialization
if (typeof window !== "undefined") {
  webhookStore.loadFromStorage()
}

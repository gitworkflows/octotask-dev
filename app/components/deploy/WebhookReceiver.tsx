"use client"

import { useState, useEffect } from "react"
import { Card } from "~/components/ui/Card"
import { Button } from "~/components/ui/Button"
import { Badge } from "~/components/ui/Badge"
import { Label } from "~/components/ui/Label"
import { classNames } from "~/utils/classNames"

interface WebhookEndpointInfo {
  url: string
  method: string
  description: string
  headers: Record<string, string>
  examplePayload: any
}

const WEBHOOK_ENDPOINTS: WebhookEndpointInfo[] = [
  {
    url: "/api/webhooks/approval-response",
    method: "POST",
    description: "Receive approval responses from external systems",
    headers: {
      "Content-Type": "application/json",
      "X-Webhook-Signature": "sha256=<signature>",
    },
    examplePayload: {
      event: "approval.response",
      data: {
        requestId: "approval-request-123",
        action: "approve", // or "reject"
        userId: "external-user-id",
        userName: "John Doe",
        userEmail: "john@example.com",
        comment: "Looks good to deploy",
      },
    },
  },
  {
    url: "/api/webhooks/deployment-status",
    method: "POST",
    description: "Receive deployment status updates from external systems",
    headers: {
      "Content-Type": "application/json",
      "X-Webhook-Signature": "sha256=<signature>",
    },
    examplePayload: {
      event: "deployment.status",
      data: {
        deploymentId: "deployment-123",
        status: "completed", // or "failed", "in-progress"
        environment: "production",
        url: "https://app.example.com",
        logs: "Deployment completed successfully",
      },
    },
  },
]

export function WebhookReceiver() {
  const [selectedEndpoint, setSelectedEndpoint] = useState<WebhookEndpointInfo | null>(null)
  const [testPayload, setTestPayload] = useState("")
  const [testResult, setTestResult] = useState<{ success: boolean; message: string } | null>(null)
  const [isTesting, setIsTesting] = useState(false)

  useEffect(() => {
    if (selectedEndpoint) {
      setTestPayload(JSON.stringify(selectedEndpoint.examplePayload, null, 2))
    }
  }, [selectedEndpoint])

  const testWebhookEndpoint = async () => {
    if (!selectedEndpoint || !testPayload) return

    setIsTesting(true)
    setTestResult(null)

    try {
      const payload = JSON.parse(testPayload)

      // Simulate webhook call to our API
      const response = await fetch(selectedEndpoint.url, {
        method: selectedEndpoint.method,
        headers: selectedEndpoint.headers,
        body: JSON.stringify(payload),
      })

      const result = await response.json()

      setTestResult({
        success: response.ok,
        message: result.message || (response.ok ? "Success" : "Failed"),
      })
    } catch (error) {
      setTestResult({
        success: false,
        message: error instanceof Error ? error.message : "Invalid JSON payload",
      })
    } finally {
      setIsTesting(false)
    }
  }

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text)
  }

  const getBaseUrl = () => {
    if (typeof window !== "undefined") {
      return window.location.origin
    }
    return "https://your-octotask-domain.com"
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-octotask-elements-textPrimary">Webhook Receiver</h2>
        <p className="text-octotask-elements-textSecondary">
          Configure external systems to send webhooks to these endpoints
        </p>
      </div>

      {/* Available Endpoints */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {WEBHOOK_ENDPOINTS.map((endpoint, index) => (
          <Card key={index} className="p-6">
            <div className="flex items-start justify-between mb-4">
              <div className="flex-1">
                <div className="flex items-center space-x-3 mb-2">
                  <Badge variant="outline">{endpoint.method}</Badge>
                  <h3 className="text-lg font-semibold text-octotask-elements-textPrimary">
                    {endpoint.url
                      .split("/")
                      .pop()
                      ?.replace("-", " ")
                      .replace(/\b\w/g, (l) => l.toUpperCase())}
                  </h3>
                </div>
                <p className="text-sm text-octotask-elements-textSecondary mb-3">{endpoint.description}</p>
                <div className="text-sm font-mono bg-octotask-elements-background-depth-2 p-2 rounded">
                  {getBaseUrl()}
                  {endpoint.url}
                </div>
              </div>
            </div>

            <div className="space-y-3">
              <div>
                <h4 className="font-medium text-octotask-elements-textPrimary mb-2">Required Headers</h4>
                <div className="space-y-1">
                  {Object.entries(endpoint.headers).map(([key, value]) => (
                    <div key={key} className="flex items-center justify-between text-sm">
                      <span className="text-octotask-elements-textSecondary font-mono">{key}:</span>
                      <span className="text-octotask-elements-textPrimary font-mono">{value}</span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="flex space-x-2">
                <Button size="sm" variant="ghost" onClick={() => copyToClipboard(`${getBaseUrl()}${endpoint.url}`)}>
                  <div className="i-ph:copy w-4 h-4 mr-2" />
                  Copy URL
                </Button>
                <Button size="sm" onClick={() => setSelectedEndpoint(endpoint)}>
                  <div className="i-ph:play w-4 h-4 mr-2" />
                  Test Endpoint
                </Button>
              </div>
            </div>
          </Card>
        ))}
      </div>

      {/* Test Endpoint Dialog */}
      {selectedEndpoint && (
        <Card className="p-6">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-lg font-semibold text-octotask-elements-textPrimary">
              Test{" "}
              {selectedEndpoint.url
                .split("/")
                .pop()
                ?.replace("-", " ")
                .replace(/\b\w/g, (l) => l.toUpperCase())}
            </h3>
            <Button variant="ghost" size="sm" onClick={() => setSelectedEndpoint(null)}>
              <div className="i-ph:x w-4 h-4" />
            </Button>
          </div>

          <div className="space-y-4">
            <div>
              <Label htmlFor="test-payload">Test Payload</Label>
              <textarea
                id="test-payload"
                value={testPayload}
                onChange={(e) => setTestPayload(e.target.value)}
                className="w-full h-64 px-3 py-2 border border-octotask-elements-borderColor rounded-md bg-octotask-elements-background-depth-1 text-octotask-elements-textPrimary font-mono text-sm resize-none"
                placeholder="Enter JSON payload..."
              />
            </div>

            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <Badge variant="outline">{selectedEndpoint.method}</Badge>
                <span className="text-sm text-octotask-elements-textSecondary font-mono">
                  {getBaseUrl()}
                  {selectedEndpoint.url}
                </span>
              </div>
              <Button onClick={testWebhookEndpoint} disabled={isTesting || !testPayload.trim()}>
                {isTesting ? (
                  <>
                    <div className="i-ph:spinner w-4 h-4 mr-2 animate-spin" />
                    Testing...
                  </>
                ) : (
                  <>
                    <div className="i-ph:play w-4 h-4 mr-2" />
                    Send Test
                  </>
                )}
              </Button>
            </div>

            {testResult && (
              <div
                className={classNames(
                  "p-4 rounded-lg border",
                  testResult.success
                    ? "bg-green-50 border-green-200 text-green-800"
                    : "bg-red-50 border-red-200 text-red-800",
                )}
              >
                <div className="flex items-center space-x-2">
                  <div className={classNames("w-4 h-4", testResult.success ? "i-ph:check-circle" : "i-ph:x-circle")} />
                  <span className="font-medium">{testResult.success ? "Success" : "Error"}</span>
                </div>
                <p className="mt-1 text-sm">{testResult.message}</p>
              </div>
            )}
          </div>
        </Card>
      )}

      {/* Integration Examples */}
      <Card className="p-6">
        <h3 className="text-lg font-semibold text-octotask-elements-textPrimary mb-4">Integration Examples</h3>

        <div className="space-y-6">
          <div>
            <h4 className="font-medium text-octotask-elements-textPrimary mb-2">cURL Example</h4>
            <div className="bg-octotask-elements-background-depth-2 p-4 rounded-lg font-mono text-sm overflow-x-auto">
              <pre>{`curl -X POST ${getBaseUrl()}/api/webhooks/approval-response \\
  -H "Content-Type: application/json" \\
  -H "X-Webhook-Signature: sha256=<signature>" \\
  -d '{
    "event": "approval.response",
    "data": {
      "requestId": "approval-request-123",
      "action": "approve",
      "userId": "external-user-id",
      "userName": "John Doe",
      "userEmail": "john@example.com",
      "comment": "Looks good to deploy"
    }
  }'`}</pre>
            </div>
          </div>

          <div>
            <h4 className="font-medium text-octotask-elements-textPrimary mb-2">JavaScript Example</h4>
            <div className="bg-octotask-elements-background-depth-2 p-4 rounded-lg font-mono text-sm overflow-x-auto">
              <pre>{`const response = await fetch('${getBaseUrl()}/api/webhooks/approval-response', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'X-Webhook-Signature': 'sha256=<signature>'
  },
  body: JSON.stringify({
    event: 'approval.response',
    data: {
      requestId: 'approval-request-123',
      action: 'approve',
      userId: 'external-user-id',
      userName: 'John Doe',
      userEmail: 'john@example.com',
      comment: 'Looks good to deploy'
    }
  })
});

const result = await response.json();
console.log(result);`}</pre>
            </div>
          </div>

          <div>
            <h4 className="font-medium text-octotask-elements-textPrimary mb-2">Python Example</h4>
            <div className="bg-octotask-elements-background-depth-2 p-4 rounded-lg font-mono text-sm overflow-x-auto">
              <pre>{`import requests
import json

url = "${getBaseUrl()}/api/webhooks/approval-response"
headers = {
    "Content-Type": "application/json",
    "X-Webhook-Signature": "sha256=<signature>"
}
payload = {
    "event": "approval.response",
    "data": {
        "requestId": "approval-request-123",
        "action": "approve",
        "userId": "external-user-id",
        "userName": "John Doe",
        "userEmail": "john@example.com",
        "comment": "Looks good to deploy"
    }
}

response = requests.post(url, headers=headers, data=json.dumps(payload))
result = response.json()
print(result)`}</pre>
            </div>
          </div>
        </div>
      </Card>

      {/* Security Information */}
      <Card className="p-6">
        <h3 className="text-lg font-semibold text-octotask-elements-textPrimary mb-4">Security & Authentication</h3>

        <div className="space-y-4">
          <div>
            <h4 className="font-medium text-octotask-elements-textPrimary mb-2">Webhook Signatures</h4>
            <p className="text-sm text-octotask-elements-textSecondary mb-2">
              All incoming webhooks should include a signature header for verification:
            </p>
            <div className="bg-octotask-elements-background-depth-2 p-3 rounded font-mono text-sm">
              X-Webhook-Signature: sha256=&lt;hmac_signature&gt;
            </div>
          </div>

          <div>
            <h4 className="font-medium text-octotask-elements-textPrimary mb-2">IP Allowlist</h4>
            <p className="text-sm text-octotask-elements-textSecondary">
              Configure your firewall to only allow webhook requests from trusted IP addresses.
            </p>
          </div>

          <div>
            <h4 className="font-medium text-octotask-elements-textPrimary mb-2">Rate Limiting</h4>
            <p className="text-sm text-octotask-elements-textSecondary">
              Webhook endpoints are rate limited to 100 requests per minute per IP address.
            </p>
          </div>
        </div>
      </Card>
    </div>
  )
}

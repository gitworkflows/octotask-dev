"use client"

import { useState, useEffect, useRef } from "react"
import { Card } from "~/components/ui/Card"
import { Button } from "~/components/ui/Button"
import { Badge } from "~/components/ui/Badge"
import { Input } from "~/components/ui/Input"
import { Label } from "~/components/ui/Label"
import { Switch } from "~/components/ui/Switch"
import { Tabs } from "~/components/ui/Tabs"
import { classNames } from "~/utils/classNames"
import { formatDistanceToNow } from "date-fns"

interface WebhookTest {
  id: string
  name: string
  url: string
  method: string
  headers: Record<string, string>
  payload: string
  expectedStatus: number
  timeout: number
  followRedirects: boolean
  validateSSL: boolean
  createdAt: string
}

interface WebhookResponse {
  id: string
  testId: string
  status: number
  statusText: string
  headers: Record<string, string>
  body: string
  duration: number
  timestamp: string
  error?: string
}

interface MockEndpoint {
  id: string
  path: string
  method: string
  responseStatus: number
  responseHeaders: Record<string, string>
  responseBody: string
  delay: number
  isEnabled: boolean
  hitCount: number
  lastHit?: string
}

const DEFAULT_WEBHOOK_TESTS = [
  {
    name: "Slack Notification",
    url: "https://hooks.slack.com/services/YOUR/SLACK/WEBHOOK",
    method: "POST",
    headers: { "Content-Type": "application/json" },
    payload: JSON.stringify(
      {
        text: "Test notification from OctoTask",
        channel: "#deployments",
        username: "OctoTask Bot",
      },
      null,
      2,
    ),
    expectedStatus: 200,
  },
  {
    name: "Discord Webhook",
    url: "https://discord.com/api/webhooks/YOUR/WEBHOOK/URL",
    method: "POST",
    headers: { "Content-Type": "application/json" },
    payload: JSON.stringify(
      {
        content: "Test message from OctoTask",
        embeds: [
          {
            title: "Deployment Status",
            description: "Test deployment completed successfully",
            color: 3066993,
          },
        ],
      },
      null,
      2,
    ),
    expectedStatus: 204,
  },
  {
    name: "Generic API Endpoint",
    url: "https://api.example.com/webhooks/deployment",
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: "Bearer YOUR_API_TOKEN",
    },
    payload: JSON.stringify(
      {
        event: "deployment.completed",
        data: {
          id: "deploy-123",
          status: "success",
          environment: "production",
        },
      },
      null,
      2,
    ),
    expectedStatus: 200,
  },
]

export function WebhookPlayground() {
  const [activeTab, setActiveTab] = useState("tester")
  const [webhookTests, setWebhookTests] = useState<WebhookTest[]>([])
  const [responses, setResponses] = useState<WebhookResponse[]>([])
  const [mockEndpoints, setMockEndpoints] = useState<MockEndpoint[]>([])
  const [selectedTest, setSelectedTest] = useState<WebhookTest | null>(null)
  const [isRunningTest, setIsRunningTest] = useState<string | null>(null)
  const [realTimeEvents, setRealTimeEvents] = useState<any[]>([])
  const [isMonitoring, setIsMonitoring] = useState(false)
  const [payloadValidation, setPayloadValidation] = useState<{
    isValid: boolean
    errors: string[]
  } | null>(null)

  const eventSourceRef = useRef<EventSource | null>(null)

  useEffect(() => {
    // Load saved tests from localStorage
    const savedTests = localStorage.getItem("octotask_webhook_tests")
    if (savedTests) {
      try {
        setWebhookTests(JSON.parse(savedTests))
      } catch (error) {
        console.error("Failed to load webhook tests:", error)
      }
    } else {
      // Create default tests
      const defaultTests = DEFAULT_WEBHOOK_TESTS.map((test, index) => ({
        id: `test-${Date.now()}-${index}`,
        ...test,
        timeout: 30000,
        followRedirects: true,
        validateSSL: true,
        createdAt: new Date().toISOString(),
      }))
      setWebhookTests(defaultTests)
    }

    // Load mock endpoints
    const savedMocks = localStorage.getItem("octotask_mock_endpoints")
    if (savedMocks) {
      try {
        setMockEndpoints(JSON.parse(savedMocks))
      } catch (error) {
        console.error("Failed to load mock endpoints:", error)
      }
    }

    return () => {
      if (eventSourceRef.current) {
        eventSourceRef.current.close()
      }
    }
  }, [])

  useEffect(() => {
    // Save tests to localStorage
    localStorage.setItem("octotask_webhook_tests", JSON.stringify(webhookTests))
  }, [webhookTests])

  useEffect(() => {
    // Save mock endpoints to localStorage
    localStorage.setItem("octotask_mock_endpoints", JSON.stringify(mockEndpoints))
  }, [mockEndpoints])

  const createNewTest = () => {
    const newTest: WebhookTest = {
      id: `test-${Date.now()}`,
      name: "New Webhook Test",
      url: "",
      method: "POST",
      headers: { "Content-Type": "application/json" },
      payload: JSON.stringify({ message: "Hello, World!" }, null, 2),
      expectedStatus: 200,
      timeout: 30000,
      followRedirects: true,
      validateSSL: true,
      createdAt: new Date().toISOString(),
    }
    setWebhookTests([...webhookTests, newTest])
    setSelectedTest(newTest)
  }

  const updateTest = (testId: string, updates: Partial<WebhookTest>) => {
    setWebhookTests((tests) => tests.map((test) => (test.id === testId ? { ...test, ...updates } : test)))
    if (selectedTest?.id === testId) {
      setSelectedTest({ ...selectedTest, ...updates })
    }
  }

  const deleteTest = (testId: string) => {
    setWebhookTests((tests) => tests.filter((test) => test.id !== testId))
    if (selectedTest?.id === testId) {
      setSelectedTest(null)
    }
  }

  const runWebhookTest = async (test: WebhookTest) => {
    setIsRunningTest(test.id)
    const startTime = Date.now()

    try {
      const controller = new AbortController()
      const timeoutId = setTimeout(() => controller.abort(), test.timeout)

      const response = await fetch("/api/webhooks/test", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          url: test.url,
          method: test.method,
          headers: test.headers,
          payload: test.payload,
          followRedirects: test.followRedirects,
          validateSSL: test.validateSSL,
        }),
        signal: controller.signal,
      })

      clearTimeout(timeoutId)

      const result = await response.json()
      const duration = Date.now() - startTime

      const webhookResponse: WebhookResponse = {
        id: `response-${Date.now()}`,
        testId: test.id,
        status: result.status || 0,
        statusText: result.statusText || "Unknown",
        headers: result.headers || {},
        body: result.body || "",
        duration,
        timestamp: new Date().toISOString(),
        error: result.error,
      }

      setResponses((prev) => [webhookResponse, ...prev.slice(0, 99)]) // Keep last 100 responses
    } catch (error) {
      const webhookResponse: WebhookResponse = {
        id: `response-${Date.now()}`,
        testId: test.id,
        status: 0,
        statusText: "Error",
        headers: {},
        body: "",
        duration: Date.now() - startTime,
        timestamp: new Date().toISOString(),
        error: error instanceof Error ? error.message : "Unknown error",
      }

      setResponses((prev) => [webhookResponse, ...prev.slice(0, 99)])
    } finally {
      setIsRunningTest(null)
    }
  }

  const validatePayload = (payload: string) => {
    try {
      JSON.parse(payload)
      setPayloadValidation({ isValid: true, errors: [] })
    } catch (error) {
      setPayloadValidation({
        isValid: false,
        errors: [error instanceof Error ? error.message : "Invalid JSON"],
      })
    }
  }

  const startRealTimeMonitoring = () => {
    if (eventSourceRef.current) {
      eventSourceRef.current.close()
    }

    eventSourceRef.current = new EventSource("/api/webhooks/monitor")

    eventSourceRef.current.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data)
        setRealTimeEvents((prev) => [data, ...prev.slice(0, 99)])
      } catch (error) {
        console.error("Failed to parse SSE data:", error)
      }
    }

    eventSourceRef.current.onerror = (error) => {
      console.error("SSE error:", error)
      setIsMonitoring(false)
    }

    setIsMonitoring(true)
  }

  const stopRealTimeMonitoring = () => {
    if (eventSourceRef.current) {
      eventSourceRef.current.close()
      eventSourceRef.current = null
    }
    setIsMonitoring(false)
  }

  const createMockEndpoint = () => {
    const newMock: MockEndpoint = {
      id: `mock-${Date.now()}`,
      path: "/api/mock/webhook",
      method: "POST",
      responseStatus: 200,
      responseHeaders: { "Content-Type": "application/json" },
      responseBody: JSON.stringify({ success: true, message: "Mock response" }, null, 2),
      delay: 0,
      isEnabled: true,
      hitCount: 0,
    }
    setMockEndpoints([...mockEndpoints, newMock])
  }

  const updateMockEndpoint = (mockId: string, updates: Partial<MockEndpoint>) => {
    setMockEndpoints((mocks) => mocks.map((mock) => (mock.id === mockId ? { ...mock, ...updates } : mock)))
  }

  const deleteMockEndpoint = (mockId: string) => {
    setMockEndpoints((mocks) => mocks.filter((mock) => mock.id !== mockId))
  }

  const getStatusColor = (status: number) => {
    if (status >= 200 && status < 300) return "text-green-600"
    if (status >= 300 && status < 400) return "text-yellow-600"
    if (status >= 400) return "text-red-600"
    return "text-gray-600"
  }

  const getStatusBadgeVariant = (status: number) => {
    if (status >= 200 && status < 300) return "success"
    if (status >= 300 && status < 400) return "warning"
    if (status >= 400) return "error"
    return "secondary"
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-octotask-elements-textPrimary">Webhook Playground</h2>
        <p className="text-octotask-elements-textSecondary">
          Interactive testing and debugging environment for webhooks
        </p>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <div className="flex space-x-1 bg-octotask-elements-background-depth-2 p-1 rounded-lg">
          <button
            className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
              activeTab === "tester"
                ? "bg-octotask-elements-background-depth-1 text-octotask-elements-textPrimary shadow-sm"
                : "text-octotask-elements-textSecondary hover:text-octotask-elements-textPrimary"
            }`}
            onClick={() => setActiveTab("tester")}
          >
            <div className="flex items-center space-x-2">
              <div className="i-ph:play w-4 h-4" />
              <span>Webhook Tester</span>
            </div>
          </button>
          <button
            className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
              activeTab === "monitor"
                ? "bg-octotask-elements-background-depth-1 text-octotask-elements-textPrimary shadow-sm"
                : "text-octotask-elements-textSecondary hover:text-octotask-elements-textPrimary"
            }`}
            onClick={() => setActiveTab("monitor")}
          >
            <div className="flex items-center space-x-2">
              <div className="i-ph:monitor w-4 h-4" />
              <span>Real-time Monitor</span>
            </div>
          </button>
          <button
            className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
              activeTab === "mock"
                ? "bg-octotask-elements-background-depth-1 text-octotask-elements-textPrimary shadow-sm"
                : "text-octotask-elements-textSecondary hover:text-octotask-elements-textPrimary"
            }`}
            onClick={() => setActiveTab("mock")}
          >
            <div className="flex items-center space-x-2">
              <div className="i-ph:globe w-4 h-4" />
              <span>Mock Server</span>
            </div>
          </button>
          <button
            className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
              activeTab === "validator"
                ? "bg-octotask-elements-background-depth-1 text-octotask-elements-textPrimary shadow-sm"
                : "text-octotask-elements-textSecondary hover:text-octotask-elements-textPrimary"
            }`}
            onClick={() => setActiveTab("validator")}
          >
            <div className="flex items-center space-x-2">
              <div className="i-ph:check-circle w-4 h-4" />
              <span>Payload Validator</span>
            </div>
          </button>
        </div>

        <div className="mt-6">
          {/* Webhook Tester Tab */}
          {activeTab === "tester" && (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Test List */}
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-semibold text-octotask-elements-textPrimary">Webhook Tests</h3>
                  <Button size="sm" onClick={createNewTest}>
                    <div className="i-ph:plus w-4 h-4 mr-2" />
                    New Test
                  </Button>
                </div>

                <div className="space-y-2">
                  {webhookTests.map((test) => (
                    <Card
                      key={test.id}
                      className={classNames(
                        "p-4 cursor-pointer transition-colors",
                        selectedTest?.id === test.id
                          ? "ring-2 ring-blue-500 bg-blue-50"
                          : "hover:bg-octotask-elements-item-backgroundHover",
                      )}
                      onClick={() => setSelectedTest(test)}
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <h4 className="font-medium text-octotask-elements-textPrimary">{test.name}</h4>
                          <p className="text-sm text-octotask-elements-textSecondary font-mono truncate">
                            {test.method} {test.url || "No URL"}
                          </p>
                          <div className="flex items-center space-x-2 mt-2">
                            <Badge variant="outline" size="sm">
                              {test.method}
                            </Badge>
                            <Badge variant="outline" size="sm">
                              {test.expectedStatus}
                            </Badge>
                          </div>
                        </div>
                        <div className="flex space-x-1">
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={(e) => {
                              e.stopPropagation()
                              runWebhookTest(test)
                            }}
                            disabled={isRunningTest === test.id || !test.url}
                          >
                            {isRunningTest === test.id ? (
                              <div className="i-ph:spinner w-4 h-4 animate-spin" />
                            ) : (
                              <div className="i-ph:play w-4 h-4" />
                            )}
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={(e) => {
                              e.stopPropagation()
                              deleteTest(test.id)
                            }}
                          >
                            <div className="i-ph:trash w-4 h-4" />
                          </Button>
                        </div>
                      </div>
                    </Card>
                  ))}
                </div>
              </div>

              {/* Test Configuration */}
              <div className="space-y-4">
                {selectedTest ? (
                  <>
                    <div className="flex items-center justify-between">
                      <h3 className="text-lg font-semibold text-octotask-elements-textPrimary">Test Configuration</h3>
                      <Button
                        onClick={() => runWebhookTest(selectedTest)}
                        disabled={isRunningTest === selectedTest.id || !selectedTest.url}
                      >
                        {isRunningTest === selectedTest.id ? (
                          <>
                            <div className="i-ph:spinner w-4 h-4 mr-2 animate-spin" />
                            Running...
                          </>
                        ) : (
                          <>
                            <div className="i-ph:play w-4 h-4 mr-2" />
                            Run Test
                          </>
                        )}
                      </Button>
                    </div>

                    <Card className="p-4 space-y-4">
                      <div>
                        <Label htmlFor="test-name">Test Name</Label>
                        <Input
                          id="test-name"
                          value={selectedTest.name}
                          onChange={(e) => updateTest(selectedTest.id, { name: e.target.value })}
                        />
                      </div>

                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <Label htmlFor="test-method">Method</Label>
                          <select
                            id="test-method"
                            value={selectedTest.method}
                            onChange={(e) => updateTest(selectedTest.id, { method: e.target.value })}
                            className="w-full px-3 py-2 border border-octotask-elements-borderColor rounded-md bg-octotask-elements-background-depth-1 text-octotask-elements-textPrimary"
                          >
                            <option value="GET">GET</option>
                            <option value="POST">POST</option>
                            <option value="PUT">PUT</option>
                            <option value="PATCH">PATCH</option>
                            <option value="DELETE">DELETE</option>
                          </select>
                        </div>

                        <div>
                          <Label htmlFor="expected-status">Expected Status</Label>
                          <Input
                            id="expected-status"
                            type="number"
                            value={selectedTest.expectedStatus}
                            onChange={(e) =>
                              updateTest(selectedTest.id, { expectedStatus: Number.parseInt(e.target.value) || 200 })
                            }
                          />
                        </div>
                      </div>

                      <div>
                        <Label htmlFor="test-url">URL</Label>
                        <Input
                          id="test-url"
                          value={selectedTest.url}
                          onChange={(e) => updateTest(selectedTest.id, { url: e.target.value })}
                          placeholder="https://api.example.com/webhook"
                        />
                      </div>

                      <div>
                        <Label htmlFor="test-headers">Headers (JSON)</Label>
                        <textarea
                          id="test-headers"
                          value={JSON.stringify(selectedTest.headers, null, 2)}
                          onChange={(e) => {
                            try {
                              const headers = JSON.parse(e.target.value)
                              updateTest(selectedTest.id, { headers })
                            } catch (error) {
                              // Invalid JSON, don't update
                            }
                          }}
                          className="w-full h-24 px-3 py-2 border border-octotask-elements-borderColor rounded-md bg-octotask-elements-background-depth-1 text-octotask-elements-textPrimary font-mono text-sm resize-none"
                        />
                      </div>

                      <div>
                        <Label htmlFor="test-payload">Payload</Label>
                        <textarea
                          id="test-payload"
                          value={selectedTest.payload}
                          onChange={(e) => {
                            updateTest(selectedTest.id, { payload: e.target.value })
                            validatePayload(e.target.value)
                          }}
                          className="w-full h-32 px-3 py-2 border border-octotask-elements-borderColor rounded-md bg-octotask-elements-background-depth-1 text-octotask-elements-textPrimary font-mono text-sm resize-none"
                        />
                        {payloadValidation && !payloadValidation.isValid && (
                          <div className="mt-2 text-sm text-red-600">{payloadValidation.errors.join(", ")}</div>
                        )}
                      </div>

                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <Label htmlFor="timeout">Timeout (ms)</Label>
                          <Input
                            id="timeout"
                            type="number"
                            value={selectedTest.timeout}
                            onChange={(e) =>
                              updateTest(selectedTest.id, { timeout: Number.parseInt(e.target.value) || 30000 })
                            }
                          />
                        </div>
                        <div className="space-y-2">
                          <div className="flex items-center space-x-2">
                            <Switch
                              id="follow-redirects"
                              checked={selectedTest.followRedirects}
                              onCheckedChange={(checked) => updateTest(selectedTest.id, { followRedirects: checked })}
                            />
                            <Label htmlFor="follow-redirects">Follow Redirects</Label>
                          </div>
                          <div className="flex items-center space-x-2">
                            <Switch
                              id="validate-ssl"
                              checked={selectedTest.validateSSL}
                              onCheckedChange={(checked) => updateTest(selectedTest.id, { validateSSL: checked })}
                            />
                            <Label htmlFor="validate-ssl">Validate SSL</Label>
                          </div>
                        </div>
                      </div>
                    </Card>
                  </>
                ) : (
                  <Card className="p-12">
                    <div className="text-center">
                      <div className="w-16 h-16 bg-gray-100 rounded-lg flex items-center justify-center mx-auto mb-4">
                        <div className="i-ph:play w-8 h-8 text-gray-400" />
                      </div>
                      <h3 className="text-lg font-semibold text-octotask-elements-textPrimary mb-2">Select a Test</h3>
                      <p className="text-octotask-elements-textSecondary">
                        Choose a webhook test from the list to configure and run it
                      </p>
                    </div>
                  </Card>
                )}
              </div>

              {/* Test Results */}
              <div className="space-y-4">
                <h3 className="text-lg font-semibold text-octotask-elements-textPrimary">Test Results</h3>

                <div className="space-y-3 max-h-96 overflow-y-auto">
                  {responses.map((response) => {
                    const test = webhookTests.find((t) => t.id === response.testId)
                    return (
                      <Card key={response.id} className="p-4">
                        <div className="flex items-start justify-between mb-3">
                          <div>
                            <div className="font-medium text-octotask-elements-textPrimary">
                              {test?.name || "Unknown Test"}
                            </div>
                            <div className="text-sm text-octotask-elements-textSecondary">
                              {formatDistanceToNow(new Date(response.timestamp), { addSuffix: true })}
                            </div>
                          </div>
                          <div className="flex items-center space-x-2">
                            <Badge variant={getStatusBadgeVariant(response.status)}>
                              {response.status} {response.statusText}
                            </Badge>
                            <Badge variant="outline" size="sm">
                              {response.duration}ms
                            </Badge>
                          </div>
                        </div>

                        {response.error && (
                          <div className="mb-3 p-2 bg-red-50 border border-red-200 rounded text-sm text-red-800">
                            {response.error}
                          </div>
                        )}

                        <div className="space-y-2">
                          <div>
                            <div className="text-sm font-medium text-octotask-elements-textPrimary">
                              Response Headers
                            </div>
                            <div className="text-xs font-mono bg-octotask-elements-background-depth-2 p-2 rounded max-h-20 overflow-y-auto">
                              {Object.entries(response.headers).map(([key, value]) => (
                                <div key={key}>
                                  {key}: {value}
                                </div>
                              ))}
                            </div>
                          </div>

                          {response.body && (
                            <div>
                              <div className="text-sm font-medium text-octotask-elements-textPrimary">
                                Response Body
                              </div>
                              <div className="text-xs font-mono bg-octotask-elements-background-depth-2 p-2 rounded max-h-32 overflow-y-auto">
                                {response.body}
                              </div>
                            </div>
                          )}
                        </div>
                      </Card>
                    )
                  })}

                  {responses.length === 0 && (
                    <Card className="p-8">
                      <div className="text-center">
                        <div className="w-12 h-12 bg-gray-100 rounded-lg flex items-center justify-center mx-auto mb-3">
                          <div className="i-ph:chart-line w-6 h-6 text-gray-400" />
                        </div>
                        <p className="text-octotask-elements-textSecondary">Test results will appear here</p>
                      </div>
                    </Card>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Real-time Monitor Tab */}
          {activeTab === "monitor" && (
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold text-octotask-elements-textPrimary">Real-time Webhook Monitor</h3>
                <div className="flex items-center space-x-3">
                  <div className="flex items-center space-x-2">
                    <div
                      className={classNames("w-2 h-2 rounded-full", isMonitoring ? "bg-green-500" : "bg-gray-400")}
                    />
                    <span className="text-sm text-octotask-elements-textSecondary">
                      {isMonitoring ? "Monitoring" : "Stopped"}
                    </span>
                  </div>
                  <Button
                    onClick={isMonitoring ? stopRealTimeMonitoring : startRealTimeMonitoring}
                    variant={isMonitoring ? "secondary" : "default"}
                  >
                    {isMonitoring ? (
                      <>
                        <div className="i-ph:stop w-4 h-4 mr-2" />
                        Stop Monitoring
                      </>
                    ) : (
                      <>
                        <div className="i-ph:play w-4 h-4 mr-2" />
                        Start Monitoring
                      </>
                    )}
                  </Button>
                </div>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <Card className="p-6">
                  <h4 className="font-semibold text-octotask-elements-textPrimary mb-4">Live Events</h4>
                  <div className="space-y-3 max-h-96 overflow-y-auto">
                    {realTimeEvents.map((event, index) => (
                      <div key={index} className="border border-octotask-elements-borderColor rounded p-3">
                        <div className="flex items-center justify-between mb-2">
                          <Badge variant="outline">{event.type}</Badge>
                          <span className="text-xs text-octotask-elements-textSecondary">
                            {formatDistanceToNow(new Date(event.timestamp), { addSuffix: true })}
                          </span>
                        </div>
                        <div className="text-sm text-octotask-elements-textPrimary">{event.url || event.endpoint}</div>
                        {event.status && (
                          <Badge variant={getStatusBadgeVariant(event.status)} size="sm" className="mt-2">
                            {event.status}
                          </Badge>
                        )}
                      </div>
                    ))}

                    {realTimeEvents.length === 0 && (
                      <div className="text-center py-8">
                        <div className="w-12 h-12 bg-gray-100 rounded-lg flex items-center justify-center mx-auto mb-3">
                          <div className="i-ph:activity w-6 h-6 text-gray-400" />
                        </div>
                        <p className="text-octotask-elements-textSecondary">
                          {isMonitoring ? "Waiting for webhook events..." : "Start monitoring to see live events"}
                        </p>
                      </div>
                    )}
                  </div>
                </Card>

                <Card className="p-6">
                  <h4 className="font-semibold text-octotask-elements-textPrimary mb-4">Event Statistics</h4>
                  <div className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div className="text-center p-4 bg-octotask-elements-background-depth-2 rounded">
                        <div className="text-2xl font-bold text-octotask-elements-textPrimary">
                          {realTimeEvents.length}
                        </div>
                        <div className="text-sm text-octotask-elements-textSecondary">Total Events</div>
                      </div>
                      <div className="text-center p-4 bg-octotask-elements-background-depth-2 rounded">
                        <div className="text-2xl font-bold text-green-600">
                          {realTimeEvents.filter((e) => e.status >= 200 && e.status < 300).length}
                        </div>
                        <div className="text-sm text-octotask-elements-textSecondary">Successful</div>
                      </div>
                    </div>

                    <div className="space-y-2">
                      <div className="text-sm font-medium text-octotask-elements-textPrimary">Event Types</div>
                      {Object.entries(
                        realTimeEvents.reduce(
                          (acc, event) => {
                            acc[event.type] = (acc[event.type] || 0) + 1
                            return acc
                          },
                          {} as Record<string, number>,
                        ),
                      ).map(([type, count]) => (
                        <div key={type} className="flex items-center justify-between">
                          <span className="text-sm text-octotask-elements-textSecondary">{type}</span>
                          <Badge variant="outline" size="sm">
                            {count}
                          </Badge>
                        </div>
                      ))}
                    </div>
                  </div>
                </Card>
              </div>
            </div>
          )}

          {/* Mock Server Tab */}
          {activeTab === "mock" && (
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold text-octotask-elements-textPrimary">Mock Webhook Server</h3>
                <Button onClick={createMockEndpoint}>
                  <div className="i-ph:plus w-4 h-4 mr-2" />
                  Add Mock Endpoint
                </Button>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {mockEndpoints.map((mock) => (
                  <Card key={mock.id} className="p-6">
                    <div className="flex items-start justify-between mb-4">
                      <div className="flex-1">
                        <div className="flex items-center space-x-3 mb-2">
                          <Badge variant="outline">{mock.method}</Badge>
                          <div
                            className={classNames(
                              "w-2 h-2 rounded-full",
                              mock.isEnabled ? "bg-green-500" : "bg-gray-400",
                            )}
                          />
                        </div>
                        <div className="text-sm font-mono bg-octotask-elements-background-depth-2 p-2 rounded mb-3">
                          {window.location.origin}
                          {mock.path}
                        </div>
                        <div className="flex items-center space-x-4 text-sm text-octotask-elements-textSecondary">
                          <span>Status: {mock.responseStatus}</span>
                          <span>Hits: {mock.hitCount}</span>
                          {mock.delay > 0 && <span>Delay: {mock.delay}ms</span>}
                        </div>
                      </div>
                      <Button size="sm" variant="ghost" onClick={() => deleteMockEndpoint(mock.id)}>
                        <div className="i-ph:trash w-4 h-4" />
                      </Button>
                    </div>

                    <div className="space-y-3">
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <Label htmlFor={`mock-path-${mock.id}`}>Path</Label>
                          <Input
                            id={`mock-path-${mock.id}`}
                            value={mock.path}
                            onChange={(e) => updateMockEndpoint(mock.id, { path: e.target.value })}
                          />
                        </div>
                        <div>
                          <Label htmlFor={`mock-method-${mock.id}`}>Method</Label>
                          <select
                            id={`mock-method-${mock.id}`}
                            value={mock.method}
                            onChange={(e) => updateMockEndpoint(mock.id, { method: e.target.value })}
                            className="w-full px-3 py-2 border border-octotask-elements-borderColor rounded-md bg-octotask-elements-background-depth-1 text-octotask-elements-textPrimary"
                          >
                            <option value="GET">GET</option>
                            <option value="POST">POST</option>
                            <option value="PUT">PUT</option>
                            <option value="PATCH">PATCH</option>
                            <option value="DELETE">DELETE</option>
                          </select>
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <Label htmlFor={`mock-status-${mock.id}`}>Response Status</Label>
                          <Input
                            id={`mock-status-${mock.id}`}
                            type="number"
                            value={mock.responseStatus}
                            onChange={(e) =>
                              updateMockEndpoint(mock.id, { responseStatus: Number.parseInt(e.target.value) || 200 })
                            }
                          />
                        </div>
                        <div>
                          <Label htmlFor={`mock-delay-${mock.id}`}>Delay (ms)</Label>
                          <Input
                            id={`mock-delay-${mock.id}`}
                            type="number"
                            value={mock.delay}
                            onChange={(e) =>
                              updateMockEndpoint(mock.id, { delay: Number.parseInt(e.target.value) || 0 })
                            }
                          />
                        </div>
                      </div>

                      <div>
                        <Label htmlFor={`mock-headers-${mock.id}`}>Response Headers (JSON)</Label>
                        <textarea
                          id={`mock-headers-${mock.id}`}
                          value={JSON.stringify(mock.responseHeaders, null, 2)}
                          onChange={(e) => {
                            try {
                              const headers = JSON.parse(e.target.value)
                              updateMockEndpoint(mock.id, { responseHeaders: headers })
                            } catch (error) {
                              // Invalid JSON, don't update
                            }
                          }}
                          className="w-full h-20 px-3 py-2 border border-octotask-elements-borderColor rounded-md bg-octotask-elements-background-depth-1 text-octotask-elements-textPrimary font-mono text-sm resize-none"
                        />
                      </div>

                      <div>
                        <Label htmlFor={`mock-body-${mock.id}`}>Response Body</Label>
                        <textarea
                          id={`mock-body-${mock.id}`}
                          value={mock.responseBody}
                          onChange={(e) => updateMockEndpoint(mock.id, { responseBody: e.target.value })}
                          className="w-full h-24 px-3 py-2 border border-octotask-elements-borderColor rounded-md bg-octotask-elements-background-depth-1 text-octotask-elements-textPrimary font-mono text-sm resize-none"
                        />
                      </div>

                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-2">
                          <Switch
                            id={`mock-enabled-${mock.id}`}
                            checked={mock.isEnabled}
                            onCheckedChange={(checked) => updateMockEndpoint(mock.id, { isEnabled: checked })}
                          />
                          <Label htmlFor={`mock-enabled-${mock.id}`}>Enabled</Label>
                        </div>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => navigator.clipboard.writeText(`${window.location.origin}${mock.path}`)}
                        >
                          <div className="i-ph:copy w-4 h-4 mr-2" />
                          Copy URL
                        </Button>
                      </div>
                    </div>
                  </Card>
                ))}

                {mockEndpoints.length === 0 && (
                  <div className="col-span-full">
                    <Card className="p-12">
                      <div className="text-center">
                        <div className="w-16 h-16 bg-gray-100 rounded-lg flex items-center justify-center mx-auto mb-4">
                          <div className="i-ph:globe w-8 h-8 text-gray-400" />
                        </div>
                        <h3 className="text-lg font-semibold text-octotask-elements-textPrimary mb-2">
                          No Mock Endpoints
                        </h3>
                        <p className="text-octotask-elements-textSecondary mb-4">
                          Create mock endpoints to simulate webhook responses
                        </p>
                        <Button onClick={createMockEndpoint}>
                          <div className="i-ph:plus w-4 h-4 mr-2" />
                          Create Mock Endpoint
                        </Button>
                      </div>
                    </Card>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Payload Validator Tab */}
          {activeTab === "validator" && (
            <div className="space-y-6">
              <h3 className="text-lg font-semibold text-octotask-elements-textPrimary">Webhook Payload Validator</h3>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <Card className="p-6">
                  <h4 className="font-semibold text-octotask-elements-textPrimary mb-4">JSON Validator</h4>
                  <div className="space-y-4">
                    <div>
                      <Label htmlFor="json-payload">JSON Payload</Label>
                      <textarea
                        id="json-payload"
                        className="w-full h-64 px-3 py-2 border border-octotask-elements-borderColor rounded-md bg-octotask-elements-background-depth-1 text-octotask-elements-textPrimary font-mono text-sm resize-none"
                        placeholder="Paste your JSON payload here..."
                        onChange={(e) => validatePayload(e.target.value)}
                      />
                    </div>

                    {payloadValidation && (
                      <div
                        className={classNames(
                          "p-4 rounded-lg border",
                          payloadValidation.isValid
                            ? "bg-green-50 border-green-200 text-green-800"
                            : "bg-red-50 border-red-200 text-red-800",
                        )}
                      >
                        <div className="flex items-center space-x-2">
                          <div
                            className={classNames(
                              "w-4 h-4",
                              payloadValidation.isValid ? "i-ph:check-circle" : "i-ph:x-circle",
                            )}
                          />
                          <span className="font-medium">
                            {payloadValidation.isValid ? "Valid JSON" : "Invalid JSON"}
                          </span>
                        </div>
                        {!payloadValidation.isValid && (
                          <div className="mt-2">
                            {payloadValidation.errors.map((error, index) => (
                              <div key={index} className="text-sm">
                                {error}
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </Card>

                <Card className="p-6">
                  <h4 className="font-semibold text-octotask-elements-textPrimary mb-4">Schema Templates</h4>
                  <div className="space-y-3">
                    {[
                      {
                        name: "Slack Webhook",
                        schema: {
                          text: "string",
                          channel: "string (optional)",
                          username: "string (optional)",
                          icon_emoji: "string (optional)",
                        },
                      },
                      {
                        name: "Discord Webhook",
                        schema: {
                          content: "string",
                          username: "string (optional)",
                          avatar_url: "string (optional)",
                          embeds: "array (optional)",
                        },
                      },
                      {
                        name: "Generic API",
                        schema: {
                          event: "string",
                          timestamp: "string",
                          data: "object",
                        },
                      },
                    ].map((template) => (
                      <div key={template.name} className="border border-octotask-elements-borderColor rounded p-3">
                        <h5 className="font-medium text-octotask-elements-textPrimary mb-2">{template.name}</h5>
                        <div className="space-y-1">
                          {Object.entries(template.schema).map(([key, type]) => (
                            <div key={key} className="flex items-center justify-between text-sm">
                              <span className="text-octotask-elements-textSecondary font-mono">{key}:</span>
                              <span className="text-octotask-elements-textPrimary">{type}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                </Card>
              </div>
            </div>
          )}
        </div>
      </Tabs>
    </div>
  )
}

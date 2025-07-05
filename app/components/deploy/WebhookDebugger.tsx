"use client"

import { useState } from "react"
import { Card } from "~/components/ui/Card"
import { Button } from "~/components/ui/Button"
import { Badge } from "~/components/ui/Badge"
import { Input } from "~/components/ui/Input"
import { Label } from "~/components/ui/Label"
import { Tabs } from "~/components/ui/Tabs"
import { classNames } from "~/utils/classNames"

interface WebhookDebugSession {
  id: string
  name: string
  url: string
  method: string
  headers: Record<string, string>
  payload: string
  responses: WebhookDebugResponse[]
  createdAt: string
}

interface WebhookDebugResponse {
  id: string
  request: {
    url: string
    method: string
    headers: Record<string, string>
    body: string
  }
  response: {
    status: number
    statusText: string
    headers: Record<string, string>
    body: string
  }
  timing: {
    dns: number
    connect: number
    tls: number
    request: number
    response: number
    total: number
  }
  timestamp: string
}

export function WebhookDebugger() {
  const [activeTab, setActiveTab] = useState("request")
  const [debugSession, setDebugSession] = useState<WebhookDebugSession | null>(null)
  const [isDebugging, setIsDebugging] = useState(false)
  const [selectedResponse, setSelectedResponse] = useState<WebhookDebugResponse | null>(null)

  const startDebugSession = () => {
    const session: WebhookDebugSession = {
      id: `debug-${Date.now()}`,
      name: "Debug Session",
      url: "",
      method: "POST",
      headers: { "Content-Type": "application/json" },
      payload: JSON.stringify({ message: "Debug test" }, null, 2),
      responses: [],
      createdAt: new Date().toISOString(),
    }
    setDebugSession(session)
  }

  const sendDebugRequest = async () => {
    if (!debugSession) return

    setIsDebugging(true)
    const startTime = performance.now()

    try {
      // Simulate detailed timing information
      const timing = {
        dns: Math.random() * 50,
        connect: Math.random() * 100,
        tls: Math.random() * 200,
        request: Math.random() * 50,
        response: Math.random() * 100,
        total: 0,
      }
      timing.total = timing.dns + timing.connect + timing.tls + timing.request + timing.response

      const response = await fetch("/api/webhooks/test", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          url: debugSession.url,
          method: debugSession.method,
          headers: debugSession.headers,
          payload: debugSession.payload,
        }),
      })

      const result = await response.json()

      const debugResponse: WebhookDebugResponse = {
        id: `response-${Date.now()}`,
        request: {
          url: debugSession.url,
          method: debugSession.method,
          headers: debugSession.headers,
          body: debugSession.payload,
        },
        response: {
          status: result.status || 0,
          statusText: result.statusText || "Unknown",
          headers: result.headers || {},
          body: result.body || "",
        },
        timing,
        timestamp: new Date().toISOString(),
      }

      setDebugSession({
        ...debugSession,
        responses: [debugResponse, ...debugSession.responses],
      })

      setSelectedResponse(debugResponse)
    } catch (error) {
      console.error("Debug request failed:", error)
    } finally {
      setIsDebugging(false)
    }
  }

  const formatTiming = (ms: number) => {
    return `${ms.toFixed(1)}ms`
  }

  const getStatusColor = (status: number) => {
    if (status >= 200 && status < 300) return "text-green-600"
    if (status >= 300 && status < 400) return "text-yellow-600"
    if (status >= 400) return "text-red-600"
    return "text-gray-600"
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-octotask-elements-textPrimary">Webhook Debugger</h2>
          <p className="text-octotask-elements-textSecondary">
            Advanced debugging tools for webhook requests and responses
          </p>
        </div>
        <Button onClick={startDebugSession} disabled={!!debugSession}>
          <div className="i-ph:bug w-4 h-4 mr-2" />
          Start Debug Session
        </Button>
      </div>

      {debugSession ? (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Request Configuration */}
          <Card className="p-6">
            <h3 className="text-lg font-semibold text-octotask-elements-textPrimary mb-4">Request Configuration</h3>

            <div className="space-y-4">
              <div>
                <Label htmlFor="debug-url">URL</Label>
                <Input
                  id="debug-url"
                  value={debugSession.url}
                  onChange={(e) => setDebugSession({ ...debugSession, url: e.target.value })}
                  placeholder="https://api.example.com/webhook"
                />
              </div>

              <div>
                <Label htmlFor="debug-method">Method</Label>
                <select
                  id="debug-method"
                  value={debugSession.method}
                  onChange={(e) => setDebugSession({ ...debugSession, method: e.target.value })}
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
                <Label htmlFor="debug-headers">Headers (JSON)</Label>
                <textarea
                  id="debug-headers"
                  value={JSON.stringify(debugSession.headers, null, 2)}
                  onChange={(e) => {
                    try {
                      const headers = JSON.parse(e.target.value)
                      setDebugSession({ ...debugSession, headers })
                    } catch (error) {
                      // Invalid JSON, don't update
                    }
                  }}
                  className="w-full h-24 px-3 py-2 border border-octotask-elements-borderColor rounded-md bg-octotask-elements-background-depth-1 text-octotask-elements-textPrimary font-mono text-sm resize-none"
                />
              </div>

              <div>
                <Label htmlFor="debug-payload">Payload</Label>
                <textarea
                  id="debug-payload"
                  value={debugSession.payload}
                  onChange={(e) => setDebugSession({ ...debugSession, payload: e.target.value })}
                  className="w-full h-32 px-3 py-2 border border-octotask-elements-borderColor rounded-md bg-octotask-elements-background-depth-1 text-octotask-elements-textPrimary font-mono text-sm resize-none"
                />
              </div>

              <Button onClick={sendDebugRequest} disabled={isDebugging || !debugSession.url} className="w-full">
                {isDebugging ? (
                  <>
                    <div className="i-ph:spinner w-4 h-4 mr-2 animate-spin" />
                    Debugging...
                  </>
                ) : (
                  <>
                    <div className="i-ph:play w-4 h-4 mr-2" />
                    Send Debug Request
                  </>
                )}
              </Button>
            </div>
          </Card>

          {/* Response History */}
          <Card className="p-6">
            <h3 className="text-lg font-semibold text-octotask-elements-textPrimary mb-4">Response History</h3>

            <div className="space-y-3 max-h-96 overflow-y-auto">
              {debugSession.responses.map((response) => (
                <div
                  key={response.id}
                  className={classNames(
                    "p-3 border rounded cursor-pointer transition-colors",
                    selectedResponse?.id === response.id
                      ? "border-blue-500 bg-blue-50"
                      : "border-octotask-elements-borderColor hover:bg-octotask-elements-item-backgroundHover",
                  )}
                  onClick={() => setSelectedResponse(response)}
                >
                  <div className="flex items-center justify-between mb-2">
                    <Badge
                      variant={response.response.status >= 200 && response.response.status < 300 ? "success" : "error"}
                    >
                      {response.response.status} {response.response.statusText}
                    </Badge>
                    <span className="text-xs text-octotask-elements-textSecondary">
                      {formatTiming(response.timing.total)}
                    </span>
                  </div>
                  <div className="text-sm text-octotask-elements-textPrimary">
                    {response.request.method} {response.request.url}
                  </div>
                  <div className="text-xs text-octotask-elements-textSecondary mt-1">
                    {new Date(response.timestamp).toLocaleTimeString()}
                  </div>
                </div>
              ))}

              {debugSession.responses.length === 0 && (
                <div className="text-center py-8">
                  <div className="w-12 h-12 bg-gray-100 rounded-lg flex items-center justify-center mx-auto mb-3">
                    <div className="i-ph:clock w-6 h-6 text-gray-400" />
                  </div>
                  <p className="text-octotask-elements-textSecondary">Debug responses will appear here</p>
                </div>
              )}
            </div>
          </Card>

          {/* Response Details */}
          <Card className="p-6">
            <h3 className="text-lg font-semibold text-octotask-elements-textPrimary mb-4">Response Details</h3>

            {selectedResponse ? (
              <Tabs value={activeTab} onValueChange={setActiveTab}>
                <div className="flex space-x-1 bg-octotask-elements-background-depth-2 p-1 rounded-lg mb-4">
                  <button
                    className={`px-3 py-1 rounded text-sm font-medium transition-colors ${
                      activeTab === "request"
                        ? "bg-octotask-elements-background-depth-1 text-octotask-elements-textPrimary shadow-sm"
                        : "text-octotask-elements-textSecondary hover:text-octotask-elements-textPrimary"
                    }`}
                    onClick={() => setActiveTab("request")}
                  >
                    Request
                  </button>
                  <button
                    className={`px-3 py-1 rounded text-sm font-medium transition-colors ${
                      activeTab === "response"
                        ? "bg-octotask-elements-background-depth-1 text-octotask-elements-textPrimary shadow-sm"
                        : "text-octotask-elements-textSecondary hover:text-octotask-elements-textPrimary"
                    }`}
                    onClick={() => setActiveTab("response")}
                  >
                    Response
                  </button>
                  <button
                    className={`px-3 py-1 rounded text-sm font-medium transition-colors ${
                      activeTab === "timing"
                        ? "bg-octotask-elements-background-depth-1 text-octotask-elements-textPrimary shadow-sm"
                        : "text-octotask-elements-textSecondary hover:text-octotask-elements-textPrimary"
                    }`}
                    onClick={() => setActiveTab("timing")}
                  >
                    Timing
                  </button>
                </div>

                <div className="space-y-4">
                  {activeTab === "request" && (
                    <>
                      <div>
                        <h4 className="font-medium text-octotask-elements-textPrimary mb-2">Request Headers</h4>
                        <div className="bg-octotask-elements-background-depth-2 p-3 rounded font-mono text-sm max-h-32 overflow-y-auto">
                          {Object.entries(selectedResponse.request.headers).map(([key, value]) => (
                            <div key={key} className="text-octotask-elements-textPrimary">
                              <span className="text-blue-600">{key}:</span> {value}
                            </div>
                          ))}
                        </div>
                      </div>

                      <div>
                        <h4 className="font-medium text-octotask-elements-textPrimary mb-2">Request Body</h4>
                        <div className="bg-octotask-elements-background-depth-2 p-3 rounded font-mono text-sm max-h-48 overflow-y-auto">
                          <pre className="text-octotask-elements-textPrimary whitespace-pre-wrap">
                            {selectedResponse.request.body}
                          </pre>
                        </div>
                      </div>
                    </>
                  )}

                  {activeTab === "response" && (
                    <>
                      <div className="flex items-center space-x-4 mb-4">
                        <Badge
                          variant={
                            selectedResponse.response.status >= 200 && selectedResponse.response.status < 300
                              ? "success"
                              : "error"
                          }
                        >
                          {selectedResponse.response.status} {selectedResponse.response.statusText}
                        </Badge>
                        <span className="text-sm text-octotask-elements-textSecondary">
                          Total: {formatTiming(selectedResponse.timing.total)}
                        </span>
                      </div>

                      <div>
                        <h4 className="font-medium text-octotask-elements-textPrimary mb-2">Response Headers</h4>
                        <div className="bg-octotask-elements-background-depth-2 p-3 rounded font-mono text-sm max-h-32 overflow-y-auto">
                          {Object.entries(selectedResponse.response.headers).map(([key, value]) => (
                            <div key={key} className="text-octotask-elements-textPrimary">
                              <span className="text-green-600">{key}:</span> {value}
                            </div>
                          ))}
                        </div>
                      </div>

                      <div>
                        <h4 className="font-medium text-octotask-elements-textPrimary mb-2">Response Body</h4>
                        <div className="bg-octotask-elements-background-depth-2 p-3 rounded font-mono text-sm max-h-48 overflow-y-auto">
                          <pre className="text-octotask-elements-textPrimary whitespace-pre-wrap">
                            {selectedResponse.response.body}
                          </pre>
                        </div>
                      </div>
                    </>
                  )}

                  {activeTab === "timing" && (
                    <div className="space-y-4">
                      <div className="grid grid-cols-2 gap-4">
                        <div className="text-center p-3 bg-octotask-elements-background-depth-2 rounded">
                          <div className="text-lg font-bold text-octotask-elements-textPrimary">
                            {formatTiming(selectedResponse.timing.dns)}
                          </div>
                          <div className="text-sm text-octotask-elements-textSecondary">DNS Lookup</div>
                        </div>
                        <div className="text-center p-3 bg-octotask-elements-background-depth-2 rounded">
                          <div className="text-lg font-bold text-octotask-elements-textPrimary">
                            {formatTiming(selectedResponse.timing.connect)}
                          </div>
                          <div className="text-sm text-octotask-elements-textSecondary">Connect</div>
                        </div>
                        <div className="text-center p-3 bg-octotask-elements-background-depth-2 rounded">
                          <div className="text-lg font-bold text-octotask-elements-textPrimary">
                            {formatTiming(selectedResponse.timing.tls)}
                          </div>
                          <div className="text-sm text-octotask-elements-textSecondary">TLS Handshake</div>
                        </div>
                        <div className="text-center p-3 bg-octotask-elements-background-depth-2 rounded">
                          <div className="text-lg font-bold text-octotask-elements-textPrimary">
                            {formatTiming(selectedResponse.timing.request)}
                          </div>
                          <div className="text-sm text-octotask-elements-textSecondary">Request</div>
                        </div>
                        <div className="text-center p-3 bg-octotask-elements-background-depth-2 rounded">
                          <div className="text-lg font-bold text-octotask-elements-textPrimary">
                            {formatTiming(selectedResponse.timing.response)}
                          </div>
                          <div className="text-sm text-octotask-elements-textSecondary">Response</div>
                        </div>
                        <div className="text-center p-3 bg-blue-50 border border-blue-200 rounded">
                          <div className="text-lg font-bold text-blue-600">
                            {formatTiming(selectedResponse.timing.total)}
                          </div>
                          <div className="text-sm text-blue-600">Total Time</div>
                        </div>
                      </div>

                      <div className="mt-6">
                        <h4 className="font-medium text-octotask-elements-textPrimary mb-3">Timing Breakdown</h4>
                        <div className="space-y-2">
                          {[
                            { name: "DNS Lookup", time: selectedResponse.timing.dns, color: "bg-blue-500" },
                            { name: "Connect", time: selectedResponse.timing.connect, color: "bg-green-500" },
                            { name: "TLS Handshake", time: selectedResponse.timing.tls, color: "bg-yellow-500" },
                            { name: "Request", time: selectedResponse.timing.request, color: "bg-purple-500" },
                            { name: "Response", time: selectedResponse.timing.response, color: "bg-red-500" },
                          ].map((phase) => (
                            <div key={phase.name} className="flex items-center space-x-3">
                              <div className={`w-3 h-3 rounded-full ${phase.color}`} />
                              <div className="flex-1 flex items-center justify-between">
                                <span className="text-sm text-octotask-elements-textPrimary">{phase.name}</span>
                                <span className="text-sm text-octotask-elements-textSecondary font-mono">
                                  {formatTiming(phase.time)}
                                </span>
                              </div>
                              <div className="flex-1 bg-gray-200 rounded-full h-2">
                                <div
                                  className={`h-2 rounded-full ${phase.color}`}
                                  style={{
                                    width: `${(phase.time / selectedResponse.timing.total) * 100}%`,
                                  }}
                                />
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </Tabs>
            ) : (
              <div className="text-center py-12">
                <div className="w-16 h-16 bg-gray-100 rounded-lg flex items-center justify-center mx-auto mb-4">
                  <div className="i-ph:magnifying-glass w-8 h-8 text-gray-400" />
                </div>
                <h3 className="text-lg font-semibold text-octotask-elements-textPrimary mb-2">Select a Response</h3>
                <p className="text-octotask-elements-textSecondary">
                  Choose a response from the history to view detailed debugging information
                </p>
              </div>
            )}
          </Card>
        </div>
      ) : (
        <Card className="p-12">
          <div className="text-center">
            <div className="w-16 h-16 bg-gray-100 rounded-lg flex items-center justify-center mx-auto mb-4">
              <div className="i-ph:bug w-8 h-8 text-gray-400" />
            </div>
            <h3 className="text-lg font-semibold text-octotask-elements-textPrimary mb-2">Start Debugging</h3>
            <p className="text-octotask-elements-textSecondary mb-4">
              Create a debug session to analyze webhook requests and responses in detail
            </p>
            <Button onClick={startDebugSession}>
              <div className="i-ph:bug w-4 h-4 mr-2" />
              Start Debug Session
            </Button>
          </div>
        </Card>
      )}
    </div>
  )
}

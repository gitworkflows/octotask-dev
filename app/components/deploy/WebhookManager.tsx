"use client"

import { useState, useEffect } from "react"
import { useStore } from "@nanostores/react"
import { Card } from "~/components/ui/Card"
import { Button } from "~/components/ui/Button"
import { Badge } from "~/components/ui/Badge"
import { Input } from "~/components/ui/Input"
import { Label } from "~/components/ui/Label"
import { Switch } from "~/components/ui/Switch"
import { Dialog } from "~/components/ui/Dialog"
import { Dropdown } from "~/components/ui/Dropdown"
import { webhookStore } from "~/lib/stores/webhook"
import { formatDistanceToNow } from "date-fns"
import { classNames } from "~/utils/classNames"

interface WebhookEndpoint {
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

interface WebhookEvent {
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

const AVAILABLE_EVENTS: WebhookEvent[] = [
  { type: "approval.requested", description: "When an approval is requested" },
  { type: "approval.approved", description: "When an approval is approved" },
  { type: "approval.rejected", description: "When an approval is rejected" },
  { type: "approval.expired", description: "When an approval expires" },
  { type: "deployment.started", description: "When a deployment starts" },
  { type: "deployment.completed", description: "When a deployment completes" },
  { type: "deployment.failed", description: "When a deployment fails" },
]

export function WebhookManager() {
  const webhooks = useStore(webhookStore.webhooks)
  const [selectedWebhook, setSelectedWebhook] = useState<WebhookEndpoint | null>(null)
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [isCreating, setIsCreating] = useState(false)
  const [testingWebhook, setTestingWebhook] = useState<string | null>(null)
  const [showLogs, setShowLogs] = useState(false)
  const [selectedLogWebhook, setSelectedLogWebhook] = useState<string | null>(null)

  useEffect(() => {
    webhookStore.loadFromStorage()
  }, [])

  const createWebhook = () => {
    const newWebhook: WebhookEndpoint = {
      id: Date.now().toString(),
      name: "New Webhook",
      url: "",
      isEnabled: true,
      events: [AVAILABLE_EVENTS[0]],
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
    }

    webhookStore.addWebhook(newWebhook)
    setSelectedWebhook(newWebhook)
    setIsCreating(true)
    setIsDialogOpen(true)
  }

  const updateWebhook = (webhookId: string, updates: Partial<WebhookEndpoint>) => {
    webhookStore.updateWebhook(webhookId, {
      ...updates,
      updatedAt: new Date().toISOString(),
    })

    if (selectedWebhook?.id === webhookId) {
      setSelectedWebhook({ ...selectedWebhook, ...updates })
    }
  }

  const deleteWebhook = (webhookId: string) => {
    webhookStore.removeWebhook(webhookId)
    if (selectedWebhook?.id === webhookId) {
      setSelectedWebhook(null)
      setIsDialogOpen(false)
    }
  }

  const testWebhook = async (webhookId: string) => {
    setTestingWebhook(webhookId)

    try {
      const testPayload = {
        event: "webhook.test",
        timestamp: new Date().toISOString(),
        data: {
          message: "This is a test webhook from OctoTask",
          webhook_id: webhookId,
        },
      }

      await webhookStore.sendWebhook(webhookId, testPayload)

      // Show success notification
      console.log("Test webhook sent successfully")
    } catch (error) {
      console.error("Failed to send test webhook:", error)
    } finally {
      setTestingWebhook(null)
    }
  }

  const toggleEvent = (eventType: string) => {
    if (!selectedWebhook) return

    const currentEvents = selectedWebhook.events
    const eventExists = currentEvents.some((e) => e.type === eventType)

    let newEvents: WebhookEvent[]
    if (eventExists) {
      newEvents = currentEvents.filter((e) => e.type !== eventType)
    } else {
      const eventToAdd = AVAILABLE_EVENTS.find((e) => e.type === eventType)
      if (eventToAdd) {
        newEvents = [...currentEvents, eventToAdd]
      } else {
        return
      }
    }

    updateWebhook(selectedWebhook.id, { events: newEvents })
  }

  const getStatusColor = (isEnabled: boolean) => {
    return isEnabled ? "text-green-600" : "text-gray-600"
  }

  const getStatusIcon = (isEnabled: boolean) => {
    return isEnabled ? "i-ph:check-circle" : "i-ph:pause-circle"
  }

  const webhookEndpoints = Object.values(webhooks.endpoints || {})
  const webhookLogs = Object.values(webhooks.logs || {})

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-octotask-elements-textPrimary">Webhook Integration</h2>
          <p className="text-octotask-elements-textSecondary">
            Configure webhooks for external approval systems integration
          </p>
        </div>
        <div className="flex space-x-3">
          <Button variant="ghost" onClick={() => setShowLogs(true)}>
            <div className="i-ph:list-bullets w-4 h-4 mr-2" />
            View Logs
          </Button>
          <Button onClick={createWebhook}>
            <div className="i-ph:plus w-4 h-4 mr-2" />
            Add Webhook
          </Button>
        </div>
      </div>

      {/* Webhook Endpoints */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {webhookEndpoints.map((webhook) => (
          <Card key={webhook.id} className="p-6 hover:shadow-lg transition-shadow">
            <div className="flex items-start justify-between mb-4">
              <div className="flex-1">
                <div className="flex items-center space-x-3 mb-2">
                  <h3 className="text-lg font-semibold text-octotask-elements-textPrimary">{webhook.name}</h3>
                  <div
                    className={classNames(
                      "w-4 h-4",
                      getStatusIcon(webhook.isEnabled),
                      getStatusColor(webhook.isEnabled),
                    )}
                  />
                </div>
                <div className="text-sm text-octotask-elements-textSecondary font-mono bg-octotask-elements-background-depth-2 p-2 rounded truncate">
                  {webhook.url || "No URL configured"}
                </div>
                <div className="flex items-center space-x-2 mt-2">
                  <Badge variant={webhook.isEnabled ? "success" : "secondary"}>
                    {webhook.isEnabled ? "Enabled" : "Disabled"}
                  </Badge>
                  <Badge variant="outline">{webhook.events.length} events</Badge>
                  <Badge variant="outline">{webhook.authentication.type}</Badge>
                </div>
              </div>
              <Dropdown
                trigger={
                  <Button size="sm" variant="ghost">
                    <div className="i-ph:dots-three-vertical w-4 h-4" />
                  </Button>
                }
              >
                <div className="py-1">
                  <button
                    className="block w-full text-left px-4 py-2 text-sm text-octotask-elements-textPrimary hover:bg-octotask-elements-item-backgroundHover"
                    onClick={() => {
                      setSelectedWebhook(webhook)
                      setIsCreating(false)
                      setIsDialogOpen(true)
                    }}
                  >
                    Edit Webhook
                  </button>
                  <button
                    className="block w-full text-left px-4 py-2 text-sm text-octotask-elements-textPrimary hover:bg-octotask-elements-item-backgroundHover"
                    onClick={() => testWebhook(webhook.id)}
                    disabled={testingWebhook === webhook.id || !webhook.url}
                  >
                    {testingWebhook === webhook.id ? "Testing..." : "Test Webhook"}
                  </button>
                  <button
                    className="block w-full text-left px-4 py-2 text-sm text-octotask-elements-textPrimary hover:bg-octotask-elements-item-backgroundHover"
                    onClick={() => {
                      setSelectedLogWebhook(webhook.id)
                      setShowLogs(true)
                    }}
                  >
                    View Logs
                  </button>
                  <button
                    className="block w-full text-left px-4 py-2 text-sm text-octotask-elements-textPrimary hover:bg-octotask-elements-item-backgroundHover"
                    onClick={() => updateWebhook(webhook.id, { isEnabled: !webhook.isEnabled })}
                  >
                    {webhook.isEnabled ? "Disable" : "Enable"}
                  </button>
                  <button
                    className="block w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-red-50"
                    onClick={() => deleteWebhook(webhook.id)}
                  >
                    Delete
                  </button>
                </div>
              </Dropdown>
            </div>

            <div className="space-y-3 text-sm">
              <div className="flex items-center justify-between">
                <span className="text-octotask-elements-textSecondary">Events:</span>
                <div className="flex flex-wrap gap-1">
                  {webhook.events.slice(0, 3).map((event) => (
                    <Badge key={event.type} variant="outline" size="sm">
                      {event.type.split(".")[1]}
                    </Badge>
                  ))}
                  {webhook.events.length > 3 && (
                    <Badge variant="outline" size="sm">
                      +{webhook.events.length - 3}
                    </Badge>
                  )}
                </div>
              </div>

              <div className="flex items-center justify-between">
                <span className="text-octotask-elements-textSecondary">Timeout:</span>
                <span className="text-octotask-elements-textPrimary">{webhook.timeout / 1000}s</span>
              </div>

              <div className="flex items-center justify-between">
                <span className="text-octotask-elements-textSecondary">Max Retries:</span>
                <span className="text-octotask-elements-textPrimary">{webhook.retryConfig.maxRetries}</span>
              </div>
            </div>

            <div className="mt-4 pt-4 border-t border-octotask-elements-borderColor">
              <div className="flex items-center justify-between text-xs text-octotask-elements-textSecondary">
                <span>Created {formatDistanceToNow(new Date(webhook.createdAt), { addSuffix: true })}</span>
                <span>Updated {formatDistanceToNow(new Date(webhook.updatedAt), { addSuffix: true })}</span>
              </div>
            </div>
          </Card>
        ))}

        {webhookEndpoints.length === 0 && (
          <div className="col-span-full">
            <Card className="p-12">
              <div className="text-center">
                <div className="w-16 h-16 bg-gray-100 rounded-lg flex items-center justify-center mx-auto mb-4">
                  <div className="i-ph:webhook w-8 h-8 text-gray-400" />
                </div>
                <h3 className="text-lg font-semibold text-octotask-elements-textPrimary mb-2">
                  No Webhooks Configured
                </h3>
                <p className="text-octotask-elements-textSecondary mb-4">
                  Add webhooks to integrate with external approval systems
                </p>
                <Button onClick={createWebhook}>
                  <div className="i-ph:plus w-4 h-4 mr-2" />
                  Create Webhook
                </Button>
              </div>
            </Card>
          </div>
        )}
      </div>

      {/* Webhook Configuration Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="bg-octotask-elements-background-depth-1 rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-hidden">
            <div className="p-6 border-b border-octotask-elements-borderColor">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold text-octotask-elements-textPrimary">
                  {isCreating ? "Create Webhook" : `Configure ${selectedWebhook?.name}`}
                </h3>
                <Button variant="ghost" size="sm" onClick={() => setIsDialogOpen(false)}>
                  <div className="i-ph:x w-4 h-4" />
                </Button>
              </div>
            </div>

            <div className="p-6 overflow-y-auto max-h-[calc(90vh-140px)]">
              {selectedWebhook && (
                <div className="space-y-8">
                  {/* General Settings */}
                  <div className="space-y-4">
                    <h4 className="text-base font-semibold text-octotask-elements-textPrimary">General Settings</h4>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <Label htmlFor="webhook-name">Webhook Name</Label>
                        <Input
                          id="webhook-name"
                          value={selectedWebhook.name}
                          onChange={(e) => updateWebhook(selectedWebhook.id, { name: e.target.value })}
                          placeholder="External Approval System"
                        />
                      </div>

                      <div>
                        <Label htmlFor="webhook-url">Webhook URL</Label>
                        <Input
                          id="webhook-url"
                          value={selectedWebhook.url}
                          onChange={(e) => updateWebhook(selectedWebhook.id, { url: e.target.value })}
                          placeholder="https://api.example.com/webhooks/approval"
                        />
                      </div>

                      <div>
                        <Label htmlFor="timeout">Timeout (seconds)</Label>
                        <Input
                          id="timeout"
                          type="number"
                          min="1"
                          max="300"
                          value={selectedWebhook.timeout / 1000}
                          onChange={(e) =>
                            updateWebhook(selectedWebhook.id, {
                              timeout: (Number.parseInt(e.target.value) || 30) * 1000,
                            })
                          }
                        />
                      </div>

                      <div className="flex items-center space-x-2">
                        <Switch
                          id="is-enabled"
                          checked={selectedWebhook.isEnabled}
                          onCheckedChange={(checked) => updateWebhook(selectedWebhook.id, { isEnabled: checked })}
                        />
                        <Label htmlFor="is-enabled">Webhook Enabled</Label>
                      </div>
                    </div>
                  </div>

                  {/* Events */}
                  <div className="space-y-4">
                    <h4 className="text-base font-semibold text-octotask-elements-textPrimary">Events</h4>
                    <p className="text-sm text-octotask-elements-textSecondary">
                      Select which events should trigger this webhook
                    </p>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      {AVAILABLE_EVENTS.map((event) => (
                        <div
                          key={event.type}
                          className="flex items-start space-x-3 p-3 border border-octotask-elements-borderColor rounded-lg"
                        >
                          <input
                            type="checkbox"
                            id={`event-${event.type}`}
                            checked={selectedWebhook.events.some((e) => e.type === event.type)}
                            onChange={() => toggleEvent(event.type)}
                            className="mt-1"
                          />
                          <div className="flex-1">
                            <Label htmlFor={`event-${event.type}`} className="font-medium">
                              {event.type}
                            </Label>
                            <p className="text-sm text-octotask-elements-textSecondary">{event.description}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Authentication */}
                  <div className="space-y-4">
                    <h4 className="text-base font-semibold text-octotask-elements-textPrimary">Authentication</h4>

                    <div>
                      <Label htmlFor="auth-type">Authentication Type</Label>
                      <select
                        id="auth-type"
                        value={selectedWebhook.authentication.type}
                        onChange={(e) =>
                          updateWebhook(selectedWebhook.id, {
                            authentication: {
                              ...selectedWebhook.authentication,
                              type: e.target.value as any,
                            },
                          })
                        }
                        className="w-full px-3 py-2 border border-octotask-elements-borderColor rounded-md bg-octotask-elements-background-depth-1 text-octotask-elements-textPrimary"
                      >
                        <option value="none">None</option>
                        <option value="bearer">Bearer Token</option>
                        <option value="basic">Basic Auth</option>
                        <option value="custom">Custom Headers</option>
                      </select>
                    </div>

                    {selectedWebhook.authentication.type === "bearer" && (
                      <div>
                        <Label htmlFor="bearer-token">Bearer Token</Label>
                        <Input
                          id="bearer-token"
                          type="password"
                          value={selectedWebhook.authentication.token || ""}
                          onChange={(e) =>
                            updateWebhook(selectedWebhook.id, {
                              authentication: {
                                ...selectedWebhook.authentication,
                                token: e.target.value,
                              },
                            })
                          }
                          placeholder="your-bearer-token"
                        />
                      </div>
                    )}

                    {selectedWebhook.authentication.type === "basic" && (
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <Label htmlFor="basic-username">Username</Label>
                          <Input
                            id="basic-username"
                            value={selectedWebhook.authentication.username || ""}
                            onChange={(e) =>
                              updateWebhook(selectedWebhook.id, {
                                authentication: {
                                  ...selectedWebhook.authentication,
                                  username: e.target.value,
                                },
                              })
                            }
                            placeholder="username"
                          />
                        </div>
                        <div>
                          <Label htmlFor="basic-password">Password</Label>
                          <Input
                            id="basic-password"
                            type="password"
                            value={selectedWebhook.authentication.password || ""}
                            onChange={(e) =>
                              updateWebhook(selectedWebhook.id, {
                                authentication: {
                                  ...selectedWebhook.authentication,
                                  password: e.target.value,
                                },
                              })
                            }
                            placeholder="password"
                          />
                        </div>
                      </div>
                    )}

                    {selectedWebhook.authentication.type === "custom" && (
                      <div className="space-y-3">
                        <Label>Custom Headers</Label>
                        {Object.entries(selectedWebhook.authentication.headers || {}).map(([key, value], index) => (
                          <div key={index} className="grid grid-cols-2 gap-2">
                            <Input
                              value={key}
                              onChange={(e) => {
                                const newHeaders = { ...selectedWebhook.authentication.headers }
                                delete newHeaders[key]
                                newHeaders[e.target.value] = value
                                updateWebhook(selectedWebhook.id, {
                                  authentication: {
                                    ...selectedWebhook.authentication,
                                    headers: newHeaders,
                                  },
                                })
                              }}
                              placeholder="Header name"
                            />
                            <div className="flex space-x-2">
                              <Input
                                value={value}
                                onChange={(e) => {
                                  const newHeaders = { ...selectedWebhook.authentication.headers }
                                  newHeaders[key] = e.target.value
                                  updateWebhook(selectedWebhook.id, {
                                    authentication: {
                                      ...selectedWebhook.authentication,
                                      headers: newHeaders,
                                    },
                                  })
                                }}
                                placeholder="Header value"
                              />
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => {
                                  const newHeaders = { ...selectedWebhook.authentication.headers }
                                  delete newHeaders[key]
                                  updateWebhook(selectedWebhook.id, {
                                    authentication: {
                                      ...selectedWebhook.authentication,
                                      headers: newHeaders,
                                    },
                                  })
                                }}
                              >
                                <div className="i-ph:trash w-4 h-4" />
                              </Button>
                            </div>
                          </div>
                        ))}
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => {
                            const newHeaders = { ...selectedWebhook.authentication.headers, "": "" }
                            updateWebhook(selectedWebhook.id, {
                              authentication: {
                                ...selectedWebhook.authentication,
                                headers: newHeaders,
                              },
                            })
                          }}
                        >
                          <div className="i-ph:plus w-4 h-4 mr-2" />
                          Add Header
                        </Button>
                      </div>
                    )}
                  </div>

                  {/* Retry Configuration */}
                  <div className="space-y-4">
                    <h4 className="text-base font-semibold text-octotask-elements-textPrimary">Retry Configuration</h4>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div>
                        <Label htmlFor="max-retries">Max Retries</Label>
                        <Input
                          id="max-retries"
                          type="number"
                          min="0"
                          max="10"
                          value={selectedWebhook.retryConfig.maxRetries}
                          onChange={(e) =>
                            updateWebhook(selectedWebhook.id, {
                              retryConfig: {
                                ...selectedWebhook.retryConfig,
                                maxRetries: Number.parseInt(e.target.value) || 0,
                              },
                            })
                          }
                        />
                      </div>

                      <div>
                        <Label htmlFor="retry-delay">Initial Delay (ms)</Label>
                        <Input
                          id="retry-delay"
                          type="number"
                          min="100"
                          value={selectedWebhook.retryConfig.retryDelay}
                          onChange={(e) =>
                            updateWebhook(selectedWebhook.id, {
                              retryConfig: {
                                ...selectedWebhook.retryConfig,
                                retryDelay: Number.parseInt(e.target.value) || 1000,
                              },
                            })
                          }
                        />
                      </div>

                      <div>
                        <Label htmlFor="backoff-multiplier">Backoff Multiplier</Label>
                        <Input
                          id="backoff-multiplier"
                          type="number"
                          min="1"
                          step="0.1"
                          value={selectedWebhook.retryConfig.backoffMultiplier}
                          onChange={(e) =>
                            updateWebhook(selectedWebhook.id, {
                              retryConfig: {
                                ...selectedWebhook.retryConfig,
                                backoffMultiplier: Number.parseFloat(e.target.value) || 2,
                              },
                            })
                          }
                        />
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>

            <div className="p-6 border-t border-octotask-elements-borderColor flex justify-between">
              <div>
                {selectedWebhook && !isCreating && (
                  <Button
                    variant="ghost"
                    onClick={() => deleteWebhook(selectedWebhook.id)}
                    className="text-red-600 hover:text-red-700 hover:bg-red-50"
                  >
                    <div className="i-ph:trash w-4 h-4 mr-2" />
                    Delete Webhook
                  </Button>
                )}
              </div>
              <div className="flex space-x-3">
                <Button variant="ghost" onClick={() => setIsDialogOpen(false)}>
                  Cancel
                </Button>
                {selectedWebhook && (
                  <Button
                    onClick={() => testWebhook(selectedWebhook.id)}
                    disabled={testingWebhook === selectedWebhook.id || !selectedWebhook.url}
                    variant="ghost"
                  >
                    {testingWebhook === selectedWebhook.id ? (
                      <>
                        <div className="i-ph:spinner w-4 h-4 mr-2 animate-spin" />
                        Testing...
                      </>
                    ) : (
                      <>
                        <div className="i-ph:play w-4 h-4 mr-2" />
                        Test Webhook
                      </>
                    )}
                  </Button>
                )}
                <Button onClick={() => setIsDialogOpen(false)}>{isCreating ? "Create Webhook" : "Save Changes"}</Button>
              </div>
            </div>
          </div>
        </div>
      </Dialog>

      {/* Webhook Logs Dialog */}
      <Dialog open={showLogs} onOpenChange={setShowLogs}>
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="bg-octotask-elements-background-depth-1 rounded-lg shadow-xl max-w-6xl w-full max-h-[90vh] overflow-hidden">
            <div className="p-6 border-b border-octotask-elements-borderColor">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold text-octotask-elements-textPrimary">Webhook Logs</h3>
                <div className="flex items-center space-x-3">
                  {selectedLogWebhook && (
                    <Button size="sm" variant="ghost" onClick={() => setSelectedLogWebhook(null)}>
                      Show All
                    </Button>
                  )}
                  <Button variant="ghost" size="sm" onClick={() => setShowLogs(false)}>
                    <div className="i-ph:x w-4 h-4" />
                  </Button>
                </div>
              </div>
            </div>

            <div className="p-6 overflow-y-auto max-h-[calc(90vh-140px)]">
              <div className="space-y-4">
                {webhookLogs
                  .filter((log) => !selectedLogWebhook || log.webhookId === selectedLogWebhook)
                  .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
                  .map((log) => (
                    <div key={log.id} className="border border-octotask-elements-borderColor rounded-lg p-4">
                      <div className="flex items-start justify-between mb-3">
                        <div className="flex items-center space-x-3">
                          <div
                            className={classNames("w-3 h-3 rounded-full", log.success ? "bg-green-500" : "bg-red-500")}
                          />
                          <div>
                            <div className="font-medium text-octotask-elements-textPrimary">
                              {webhooks.endpoints[log.webhookId]?.name || "Unknown Webhook"}
                            </div>
                            <div className="text-sm text-octotask-elements-textSecondary">
                              {log.event} • {formatDistanceToNow(new Date(log.timestamp), { addSuffix: true })}
                            </div>
                          </div>
                        </div>
                        <Badge variant={log.success ? "success" : "error"}>
                          {log.statusCode || (log.success ? "Success" : "Failed")}
                        </Badge>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                        <div>
                          <div className="font-medium text-octotask-elements-textPrimary mb-1">Request</div>
                          <div className="bg-octotask-elements-background-depth-2 p-2 rounded font-mono text-xs overflow-x-auto">
                            {log.url}
                          </div>
                        </div>
                        <div>
                          <div className="font-medium text-octotask-elements-textPrimary mb-1">Response</div>
                          <div className="bg-octotask-elements-background-depth-2 p-2 rounded font-mono text-xs">
                            {log.response || log.error || "No response"}
                          </div>
                        </div>
                      </div>

                      {log.retryCount > 0 && (
                        <div className="mt-3 pt-3 border-t border-octotask-elements-borderColor">
                          <div className="text-sm text-octotask-elements-textSecondary">
                            Retried {log.retryCount} times • Duration: {log.duration}ms
                          </div>
                        </div>
                      )}
                    </div>
                  ))}

                {webhookLogs.length === 0 && (
                  <div className="text-center py-12">
                    <div className="w-16 h-16 bg-gray-100 rounded-lg flex items-center justify-center mx-auto mb-4">
                      <div className="i-ph:list-bullets w-8 h-8 text-gray-400" />
                    </div>
                    <h3 className="text-lg font-semibold text-octotask-elements-textPrimary mb-2">No Webhook Logs</h3>
                    <p className="text-octotask-elements-textSecondary">
                      Webhook delivery logs will appear here once webhooks are triggered
                    </p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </Dialog>
    </div>
  )
}

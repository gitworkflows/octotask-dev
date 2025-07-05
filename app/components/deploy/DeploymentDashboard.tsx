"use client"

import { useStore } from "@nanostores/react"
import { useState } from "react"
import { Card } from "~/components/ui/Card"
import { Button } from "~/components/ui/Button"
import { Badge } from "~/components/ui/Badge"
import { Progress } from "~/components/ui/Progress"
import { Tabs } from "~/components/ui/Tabs"
import { netlifyConnection } from "~/lib/stores/netlify"
import { vercelConnection } from "~/lib/stores/vercel"
import { deploymentStore } from "~/lib/stores/deployment"
import { classNames } from "~/utils/classNames"
import { formatDistanceToNow } from "date-fns"

interface DeploymentDashboardProps {
  className?: string
}

export function DeploymentDashboard({ className }: DeploymentDashboardProps) {
  const netlifyConn = useStore(netlifyConnection)
  const vercelConn = useStore(vercelConnection)
  const deployments = useStore(deploymentStore.deployments)
  const [activeTab, setActiveTab] = useState("overview")

  const recentDeployments = Object.values(deployments)
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
    .slice(0, 10)

  const activeDeployments = Object.values(deployments).filter(
    (d) => d.status === "building" || d.status === "deploying",
  )

  const successfulDeployments = Object.values(deployments).filter((d) => d.status === "success").length

  const failedDeployments = Object.values(deployments).filter((d) => d.status === "failed").length

  const successRate =
    deployments.length > 0 ? Math.round((successfulDeployments / Object.keys(deployments).length) * 100) : 0

  return (
    <div className={classNames("deployment-dashboard", className)}>
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-octotask-elements-textPrimary mb-2">Deployment & Operations</h2>
        <p className="text-octotask-elements-textSecondary">
          Monitor and manage your application deployments across all platforms
        </p>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <div className="flex space-x-1 mb-6">
          <button
            onClick={() => setActiveTab("overview")}
            className={classNames(
              "px-4 py-2 rounded-lg text-sm font-medium transition-colors",
              activeTab === "overview"
                ? "bg-accent-500 text-white"
                : "text-octotask-elements-textSecondary hover:text-octotask-elements-textPrimary hover:bg-octotask-elements-item-backgroundHover",
            )}
          >
            Overview
          </button>
          <button
            onClick={() => setActiveTab("deployments")}
            className={classNames(
              "px-4 py-2 rounded-lg text-sm font-medium transition-colors",
              activeTab === "deployments"
                ? "bg-accent-500 text-white"
                : "text-octotask-elements-textSecondary hover:text-octotask-elements-textPrimary hover:bg-octotask-elements-item-backgroundHover",
            )}
          >
            Deployments
          </button>
          <button
            onClick={() => setActiveTab("monitoring")}
            className={classNames(
              "px-4 py-2 rounded-lg text-sm font-medium transition-colors",
              activeTab === "monitoring"
                ? "bg-accent-500 text-white"
                : "text-octotask-elements-textSecondary hover:text-octotask-elements-textPrimary hover:bg-octotask-elements-item-backgroundHover",
            )}
          >
            Monitoring
          </button>
          <button
            onClick={() => setActiveTab("environments")}
            className={classNames(
              "px-4 py-2 rounded-lg text-sm font-medium transition-colors",
              activeTab === "environments"
                ? "bg-accent-500 text-white"
                : "text-octotask-elements-textSecondary hover:text-octotask-elements-textPrimary hover:bg-octotask-elements-item-backgroundHover",
            )}
          >
            Environments
          </button>
        </div>

        {activeTab === "overview" && (
          <div className="space-y-6">
            {/* Stats Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <Card className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-octotask-elements-textSecondary">Active Deployments</p>
                    <p className="text-2xl font-bold text-octotask-elements-textPrimary">{activeDeployments.length}</p>
                  </div>
                  <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center">
                    <div className="i-ph:rocket text-blue-600" />
                  </div>
                </div>
              </Card>

              <Card className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-octotask-elements-textSecondary">Success Rate</p>
                    <p className="text-2xl font-bold text-octotask-elements-textPrimary">{successRate}%</p>
                  </div>
                  <div className="w-8 h-8 bg-green-100 rounded-lg flex items-center justify-center">
                    <div className="i-ph:check-circle text-green-600" />
                  </div>
                </div>
              </Card>

              <Card className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-octotask-elements-textSecondary">Total Deployments</p>
                    <p className="text-2xl font-bold text-octotask-elements-textPrimary">
                      {Object.keys(deployments).length}
                    </p>
                  </div>
                  <div className="w-8 h-8 bg-purple-100 rounded-lg flex items-center justify-center">
                    <div className="i-ph:chart-bar text-purple-600" />
                  </div>
                </div>
              </Card>

              <Card className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-octotask-elements-textSecondary">Failed Deployments</p>
                    <p className="text-2xl font-bold text-octotask-elements-textPrimary">{failedDeployments}</p>
                  </div>
                  <div className="w-8 h-8 bg-red-100 rounded-lg flex items-center justify-center">
                    <div className="i-ph:x-circle text-red-600" />
                  </div>
                </div>
              </Card>
            </div>

            {/* Active Deployments */}
            {activeDeployments.length > 0 && (
              <Card className="p-6">
                <h3 className="text-lg font-semibold text-octotask-elements-textPrimary mb-4">Active Deployments</h3>
                <div className="space-y-4">
                  {activeDeployments.map((deployment) => (
                    <div
                      key={deployment.id}
                      className="flex items-center justify-between p-4 bg-octotask-elements-background-depth-1 rounded-lg"
                    >
                      <div className="flex items-center space-x-3">
                        <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse" />
                        <div>
                          <p className="font-medium text-octotask-elements-textPrimary">{deployment.projectName}</p>
                          <p className="text-sm text-octotask-elements-textSecondary">
                            {deployment.platform} • {deployment.environment}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center space-x-3">
                        <Badge variant={deployment.status === "building" ? "warning" : "info"}>
                          {deployment.status}
                        </Badge>
                        {deployment.progress && (
                          <div className="w-24">
                            <Progress value={deployment.progress} />
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </Card>
            )}

            {/* Recent Deployments */}
            <Card className="p-6">
              <h3 className="text-lg font-semibold text-octotask-elements-textPrimary mb-4">Recent Deployments</h3>
              <div className="space-y-3">
                {recentDeployments.map((deployment) => (
                  <div
                    key={deployment.id}
                    className="flex items-center justify-between p-3 hover:bg-octotask-elements-item-backgroundHover rounded-lg transition-colors"
                  >
                    <div className="flex items-center space-x-3">
                      <div
                        className={classNames(
                          "w-2 h-2 rounded-full",
                          deployment.status === "success"
                            ? "bg-green-500"
                            : deployment.status === "failed"
                              ? "bg-red-500"
                              : "bg-yellow-500",
                        )}
                      />
                      <div>
                        <p className="font-medium text-octotask-elements-textPrimary">{deployment.projectName}</p>
                        <p className="text-sm text-octotask-elements-textSecondary">
                          {deployment.platform} •{" "}
                          {formatDistanceToNow(new Date(deployment.createdAt), { addSuffix: true })}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Badge
                        variant={
                          deployment.status === "success"
                            ? "success"
                            : deployment.status === "failed"
                              ? "error"
                              : "warning"
                        }
                      >
                        {deployment.status}
                      </Badge>
                      {deployment.url && (
                        <Button size="sm" variant="ghost" onClick={() => window.open(deployment.url, "_blank")}>
                          <div className="i-ph:external-link w-4 h-4" />
                        </Button>
                      )}
                    </div>
                  </div>
                ))}
                {recentDeployments.length === 0 && (
                  <p className="text-center text-octotask-elements-textSecondary py-8">
                    No deployments yet. Deploy your first project to get started!
                  </p>
                )}
              </div>
            </Card>
          </div>
        )}

        {activeTab === "deployments" && <DeploymentHistory />}

        {activeTab === "monitoring" && <MonitoringPanel />}

        {activeTab === "environments" && <EnvironmentManager />}
      </Tabs>
    </div>
  )
}

function DeploymentHistory() {
  const deployments = useStore(deploymentStore.deployments)
  const [filter, setFilter] = useState("all")

  const filteredDeployments = Object.values(deployments).filter((deployment) => {
    if (filter === "all") return true
    return deployment.status === filter
  })

  return (
    <Card className="p-6">
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-lg font-semibold text-octotask-elements-textPrimary">Deployment History</h3>
        <div className="flex space-x-2">
          {["all", "success", "failed", "building"].map((status) => (
            <button
              key={status}
              onClick={() => setFilter(status)}
              className={classNames(
                "px-3 py-1 rounded-md text-sm font-medium transition-colors",
                filter === status
                  ? "bg-accent-500 text-white"
                  : "text-octotask-elements-textSecondary hover:text-octotask-elements-textPrimary hover:bg-octotask-elements-item-backgroundHover",
              )}
            >
              {status.charAt(0).toUpperCase() + status.slice(1)}
            </button>
          ))}
        </div>
      </div>

      <div className="space-y-4">
        {filteredDeployments.map((deployment) => (
          <div key={deployment.id} className="border border-octotask-elements-borderColor rounded-lg p-4">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center space-x-3">
                <h4 className="font-medium text-octotask-elements-textPrimary">{deployment.projectName}</h4>
                <Badge
                  variant={
                    deployment.status === "success" ? "success" : deployment.status === "failed" ? "error" : "warning"
                  }
                >
                  {deployment.status}
                </Badge>
              </div>
              <div className="flex items-center space-x-2">
                <span className="text-sm text-octotask-elements-textSecondary">
                  {formatDistanceToNow(new Date(deployment.createdAt), { addSuffix: true })}
                </span>
                {deployment.url && (
                  <Button size="sm" variant="ghost" onClick={() => window.open(deployment.url, "_blank")}>
                    <div className="i-ph:external-link w-4 h-4" />
                  </Button>
                )}
              </div>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
              <div>
                <span className="text-octotask-elements-textSecondary">Platform:</span>
                <span className="ml-2 text-octotask-elements-textPrimary">{deployment.platform}</span>
              </div>
              <div>
                <span className="text-octotask-elements-textSecondary">Environment:</span>
                <span className="ml-2 text-octotask-elements-textPrimary">{deployment.environment}</span>
              </div>
              <div>
                <span className="text-octotask-elements-textSecondary">Duration:</span>
                <span className="ml-2 text-octotask-elements-textPrimary">
                  {deployment.duration ? `${deployment.duration}s` : "N/A"}
                </span>
              </div>
              <div>
                <span className="text-octotask-elements-textSecondary">Commit:</span>
                <span className="ml-2 text-octotask-elements-textPrimary font-mono">
                  {deployment.commitHash?.slice(0, 7) || "N/A"}
                </span>
              </div>
            </div>

            {deployment.logs && deployment.logs.length > 0 && (
              <details className="mt-3">
                <summary className="cursor-pointer text-sm text-octotask-elements-textSecondary hover:text-octotask-elements-textPrimary">
                  View Logs
                </summary>
                <div className="mt-2 p-3 bg-octotask-elements-background-depth-1 rounded-md">
                  <pre className="text-xs text-octotask-elements-textSecondary whitespace-pre-wrap">
                    {deployment.logs.join("\n")}
                  </pre>
                </div>
              </details>
            )}
          </div>
        ))}
      </div>
    </Card>
  )
}

function MonitoringPanel() {
  const [metrics, setMetrics] = useState({
    uptime: 99.9,
    responseTime: 245,
    errorRate: 0.1,
    requests: 1234,
  })

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-octotask-elements-textSecondary">Uptime</p>
              <p className="text-2xl font-bold text-green-600">{metrics.uptime}%</p>
            </div>
            <div className="w-8 h-8 bg-green-100 rounded-lg flex items-center justify-center">
              <div className="i-ph:check-circle text-green-600" />
            </div>
          </div>
        </Card>

        <Card className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-octotask-elements-textSecondary">Response Time</p>
              <p className="text-2xl font-bold text-octotask-elements-textPrimary">{metrics.responseTime}ms</p>
            </div>
            <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center">
              <div className="i-ph:clock text-blue-600" />
            </div>
          </div>
        </Card>

        <Card className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-octotask-elements-textSecondary">Error Rate</p>
              <p className="text-2xl font-bold text-octotask-elements-textPrimary">{metrics.errorRate}%</p>
            </div>
            <div className="w-8 h-8 bg-red-100 rounded-lg flex items-center justify-center">
              <div className="i-ph:warning text-red-600" />
            </div>
          </div>
        </Card>

        <Card className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-octotask-elements-textSecondary">Requests/min</p>
              <p className="text-2xl font-bold text-octotask-elements-textPrimary">{metrics.requests}</p>
            </div>
            <div className="w-8 h-8 bg-purple-100 rounded-lg flex items-center justify-center">
              <div className="i-ph:chart-line text-purple-600" />
            </div>
          </div>
        </Card>
      </div>

      <Card className="p-6">
        <h3 className="text-lg font-semibold text-octotask-elements-textPrimary mb-4">Health Checks</h3>
        <div className="space-y-3">
          {[
            { name: "API Endpoint", status: "healthy", url: "https://api.example.com" },
            { name: "Database", status: "healthy", url: "postgresql://..." },
            { name: "Redis Cache", status: "warning", url: "redis://..." },
            { name: "CDN", status: "healthy", url: "https://cdn.example.com" },
          ].map((check) => (
            <div
              key={check.name}
              className="flex items-center justify-between p-3 border border-octotask-elements-borderColor rounded-lg"
            >
              <div className="flex items-center space-x-3">
                <div
                  className={classNames(
                    "w-3 h-3 rounded-full",
                    check.status === "healthy"
                      ? "bg-green-500"
                      : check.status === "warning"
                        ? "bg-yellow-500"
                        : "bg-red-500",
                  )}
                />
                <div>
                  <p className="font-medium text-octotask-elements-textPrimary">{check.name}</p>
                  <p className="text-sm text-octotask-elements-textSecondary">{check.url}</p>
                </div>
              </div>
              <Badge
                variant={check.status === "healthy" ? "success" : check.status === "warning" ? "warning" : "error"}
              >
                {check.status}
              </Badge>
            </div>
          ))}
        </div>
      </Card>
    </div>
  )
}

function EnvironmentManager() {
  const [environments, setEnvironments] = useState([
    { name: "production", url: "https://app.example.com", status: "active", lastDeploy: new Date() },
    { name: "staging", url: "https://staging.example.com", status: "active", lastDeploy: new Date() },
    { name: "development", url: "https://dev.example.com", status: "inactive", lastDeploy: new Date() },
  ])

  return (
    <Card className="p-6">
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-lg font-semibold text-octotask-elements-textPrimary">Environment Management</h3>
        <Button size="sm">
          <div className="i-ph:plus w-4 h-4 mr-2" />
          Add Environment
        </Button>
      </div>

      <div className="space-y-4">
        {environments.map((env) => (
          <div key={env.name} className="border border-octotask-elements-borderColor rounded-lg p-4">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center space-x-3">
                <h4 className="font-medium text-octotask-elements-textPrimary capitalize">{env.name}</h4>
                <Badge variant={env.status === "active" ? "success" : "secondary"}>{env.status}</Badge>
              </div>
              <div className="flex items-center space-x-2">
                <Button size="sm" variant="ghost">
                  <div className="i-ph:gear w-4 h-4" />
                </Button>
                <Button size="sm" variant="ghost">
                  <div className="i-ph:external-link w-4 h-4" />
                </Button>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
              <div>
                <span className="text-octotask-elements-textSecondary">URL:</span>
                <span className="ml-2 text-octotask-elements-textPrimary">{env.url}</span>
              </div>
              <div>
                <span className="text-octotask-elements-textSecondary">Last Deploy:</span>
                <span className="ml-2 text-octotask-elements-textPrimary">
                  {formatDistanceToNow(env.lastDeploy, { addSuffix: true })}
                </span>
              </div>
              <div>
                <span className="text-octotask-elements-textSecondary">Status:</span>
                <span className="ml-2 text-octotask-elements-textPrimary capitalize">{env.status}</span>
              </div>
            </div>
          </div>
        ))}
      </div>
    </Card>
  )
}

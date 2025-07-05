"use client"

import { useState } from "react"
import { useStore } from "@nanostores/react"
import { Card } from "~/components/ui/Card"
import { Badge } from "~/components/ui/Badge"
import { Button } from "~/components/ui/Button"
import { Progress } from "~/components/ui/Progress"
import { deploymentStore } from "~/lib/stores/deployment"
import { environmentStore } from "~/lib/stores/environment"
import { classNames } from "~/utils/classNames"
import { formatDistanceToNow } from "date-fns"

interface DeploymentStatusProps {
  deploymentId?: string
  showAll?: boolean
}

export function DeploymentStatus({ deploymentId, showAll = false }: DeploymentStatusProps) {
  const deployments = useStore(deploymentStore.deployments)
  const environments = useStore(environmentStore.environments)
  const [selectedEnvironment, setSelectedEnvironment] = useState<string>("all")

  const filteredDeployments = Object.values(deployments).filter((deployment) => {
    if (deploymentId) return deployment.id === deploymentId
    if (selectedEnvironment === "all") return true
    return deployment.environment === selectedEnvironment
  })

  const recentDeployments = filteredDeployments
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
    .slice(0, showAll ? undefined : 10)

  const getStatusColor = (status: string) => {
    switch (status) {
      case "success":
        return "text-green-600"
      case "failed":
        return "text-red-600"
      case "building":
      case "deploying":
        return "text-blue-600"
      case "cancelled":
        return "text-gray-600"
      default:
        return "text-octotask-elements-textPrimary"
    }
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "success":
        return "i-ph:check-circle"
      case "failed":
        return "i-ph:x-circle"
      case "building":
      case "deploying":
        return "i-ph:spinner animate-spin"
      case "cancelled":
        return "i-ph:stop-circle"
      default:
        return "i-ph:clock"
    }
  }

  const getStatusBadgeVariant = (status: string) => {
    switch (status) {
      case "success":
        return "success" as const
      case "failed":
        return "error" as const
      case "building":
      case "deploying":
        return "info" as const
      case "cancelled":
        return "secondary" as const
      default:
        return "secondary" as const
    }
  }

  const environmentTypes = ["all", "production", "staging", "preview", "development"]

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold text-octotask-elements-textPrimary">Deployment Status</h3>

        {showAll && (
          <div className="flex items-center space-x-2">
            <span className="text-sm text-octotask-elements-textSecondary">Filter by environment:</span>
            <select
              value={selectedEnvironment}
              onChange={(e) => setSelectedEnvironment(e.target.value)}
              className="px-3 py-1 border border-octotask-elements-borderColor rounded-md bg-octotask-elements-background-depth-1 text-octotask-elements-textPrimary text-sm"
            >
              {environmentTypes.map((type) => (
                <option key={type} value={type}>
                  {type.charAt(0).toUpperCase() + type.slice(1)}
                </option>
              ))}
            </select>
          </div>
        )}
      </div>

      <Card className="p-6">
        {recentDeployments.length > 0 ? (
          <div className="space-y-4">
            {recentDeployments.map((deployment) => (
              <div
                key={deployment.id}
                className="border border-octotask-elements-borderColor rounded-lg p-4 hover:bg-octotask-elements-item-backgroundHover transition-colors"
              >
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center space-x-3">
                    <div
                      className={classNames(
                        "w-5 h-5",
                        getStatusIcon(deployment.status),
                        getStatusColor(deployment.status),
                      )}
                    />
                    <div>
                      <h4 className="font-medium text-octotask-elements-textPrimary">{deployment.projectName}</h4>
                      <p className="text-sm text-octotask-elements-textSecondary">
                        {deployment.platform} •{" "}
                        {formatDistanceToNow(new Date(deployment.createdAt), { addSuffix: true })}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Badge variant={getStatusBadgeVariant(deployment.status)}>{deployment.status}</Badge>
                    <Badge variant="secondary">{deployment.environment}</Badge>
                  </div>
                </div>

                {deployment.progress !== undefined &&
                  (deployment.status === "building" || deployment.status === "deploying") && (
                    <div className="mb-3">
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-sm text-octotask-elements-textSecondary">Progress</span>
                        <span className="text-sm text-octotask-elements-textSecondary">{deployment.progress}%</span>
                      </div>
                      <Progress value={deployment.progress} className="h-2" />
                    </div>
                  )}

                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                  <div>
                    <span className="text-octotask-elements-textSecondary">Platform:</span>
                    <span className="ml-2 text-octotask-elements-textPrimary capitalize">{deployment.platform}</span>
                  </div>
                  <div>
                    <span className="text-octotask-elements-textSecondary">Environment:</span>
                    <span className="ml-2 text-octotask-elements-textPrimary capitalize">{deployment.environment}</span>
                  </div>
                  <div>
                    <span className="text-octotask-elements-textSecondary">Duration:</span>
                    <span className="ml-2 text-octotask-elements-textPrimary">
                      {deployment.duration ? `${Math.round(deployment.duration / 1000)}s` : "N/A"}
                    </span>
                  </div>
                  <div>
                    <span className="text-octotask-elements-textSecondary">Branch:</span>
                    <span className="ml-2 text-octotask-elements-textPrimary font-mono">
                      {deployment.branch || "N/A"}
                    </span>
                  </div>
                </div>

                {deployment.url && (
                  <div className="mt-3 pt-3 border-t border-octotask-elements-borderColor">
                    <div className="flex items-center justify-between">
                      <a
                        href={deployment.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-accent-500 hover:underline text-sm"
                      >
                        View Deployment →
                      </a>
                      <div className="flex items-center space-x-2">
                        <Button size="sm" variant="ghost">
                          <div className="i-ph:copy w-4 h-4" />
                        </Button>
                        <Button size="sm" variant="ghost">
                          <div className="i-ph:share w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  </div>
                )}

                {deployment.error && (
                  <div className="mt-3 p-3 bg-red-50 border border-red-200 rounded-lg">
                    <p className="text-sm text-red-600">{deployment.error}</p>
                  </div>
                )}

                {deployment.logs && deployment.logs.length > 0 && (
                  <details className="mt-3">
                    <summary className="cursor-pointer text-sm text-octotask-elements-textSecondary hover:text-octotask-elements-textPrimary">
                      View Logs
                    </summary>
                    <div className="mt-2 p-3 bg-octotask-elements-background-depth-2 rounded-md">
                      <pre className="text-xs text-octotask-elements-textSecondary whitespace-pre-wrap max-h-32 overflow-y-auto">
                        {deployment.logs.join("\n")}
                      </pre>
                    </div>
                  </details>
                )}
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-12">
            <div className="w-16 h-16 bg-gray-100 rounded-lg flex items-center justify-center mx-auto mb-4">
              <div className="i-ph:rocket w-8 h-8 text-gray-400" />
            </div>
            <h3 className="text-lg font-semibold text-octotask-elements-textPrimary mb-2">No Deployments</h3>
            <p className="text-octotask-elements-textSecondary">
              {deploymentId ? "No deployment found with this ID" : "No deployments found for the selected environment"}
            </p>
          </div>
        )}
      </Card>
    </div>
  )
}

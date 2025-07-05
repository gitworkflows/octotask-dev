"use client"

import { useState } from "react"
import { useStore } from "@nanostores/react"
import { Card } from "~/components/ui/Card"
import { Button } from "~/components/ui/Button"
import { Badge } from "~/components/ui/Badge"
import { Switch } from "~/components/ui/Switch"
import { Label } from "~/components/ui/Label"
import { Progress } from "~/components/ui/Progress"
import { environmentStore } from "~/lib/stores/environment"
import { deploymentStore } from "~/lib/stores/deployment"
import { vercelConnection } from "~/lib/stores/vercel"
import { workbenchStore } from "~/lib/stores/workbench"
import { EnvironmentSelector } from "./EnvironmentSelector"
import { classNames } from "~/utils/classNames"

interface DeploymentProgress {
  environmentId: string
  status: "pending" | "deploying" | "success" | "failed"
  progress: number
  url?: string
  error?: string
}

export function MultiEnvironmentDeploy() {
  const environments = useStore(environmentStore.environments)
  const vercelConn = useStore(vercelConnection)
  const [selectedEnvironments, setSelectedEnvironments] = useState<string[]>([])
  const [deploymentProgress, setDeploymentProgress] = useState<Record<string, DeploymentProgress>>({})
  const [isDeploying, setIsDeploying] = useState(false)
  const [deploySequentially, setDeploySequentially] = useState(false)

  const activeEnvironments = Object.values(environments).filter((env) => env.isActive)

  const toggleEnvironmentSelection = (envId: string) => {
    setSelectedEnvironments((prev) => (prev.includes(envId) ? prev.filter((id) => id !== envId) : [...prev, envId]))
  }

  const selectAllEnvironments = () => {
    setSelectedEnvironments(activeEnvironments.map((env) => env.id))
  }

  const clearSelection = () => {
    setSelectedEnvironments([])
  }

  const deployToEnvironments = async () => {
    if (!vercelConn.token || selectedEnvironments.length === 0) return

    setIsDeploying(true)

    // Initialize progress tracking
    const initialProgress: Record<string, DeploymentProgress> = {}
    selectedEnvironments.forEach((envId) => {
      initialProgress[envId] = {
        environmentId: envId,
        status: "pending",
        progress: 0,
      }
    })
    setDeploymentProgress(initialProgress)

    try {
      if (deploySequentially) {
        // Deploy one by one
        for (const envId of selectedEnvironments) {
          await deployToSingleEnvironment(envId)
        }
      } else {
        // Deploy in parallel
        await Promise.all(selectedEnvironments.map((envId) => deployToSingleEnvironment(envId)))
      }
    } catch (error) {
      console.error("Multi-environment deployment failed:", error)
    } finally {
      setIsDeploying(false)
    }
  }

  const deployToSingleEnvironment = async (envId: string) => {
    const environment = environments[envId]
    if (!environment) return

    // Update progress to deploying
    setDeploymentProgress((prev) => ({
      ...prev,
      [envId]: { ...prev[envId], status: "deploying", progress: 10 },
    }))

    try {
      // Get current files from workbench
      const files = workbenchStore.files.get()
      const fileEntries: Record<string, string> = {}

      Object.entries(files).forEach(([path, file]) => {
        if (file.content) {
          fileEntries[path] = file.content
        }
      })

      // Prepare deployment data with environment-specific settings
      const deploymentData = {
        files: fileEntries,
        token: vercelConn.token,
        chatId: "multi-env-deploy",
        buildCommand: environment.buildSettings.buildCommand,
        outputDirectory: environment.buildSettings.outputDirectory,
        installCommand: environment.buildSettings.installCommand,
        nodeVersion: environment.buildSettings.nodeVersion,
        environmentVariables: environment.variables.reduce(
          (acc, variable) => {
            acc[variable.key] = variable.value
            return acc
          },
          {} as Record<string, string>,
        ),
        projectId: environment.projectId,
      }

      // Update progress
      setDeploymentProgress((prev) => ({
        ...prev,
        [envId]: { ...prev[envId], progress: 30 },
      }))

      // Make deployment request
      const response = await fetch("/api/vercel-deploy", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(deploymentData),
      })

      const result = await response.json()

      if (response.ok && result.success) {
        // Update progress to success
        setDeploymentProgress((prev) => ({
          ...prev,
          [envId]: {
            ...prev[envId],
            status: "success",
            progress: 100,
            url: result.deploy.url,
          },
        }))

        // Update environment with deployment info
        environmentStore.updateEnvironment(envId, {
          lastDeployment: {
            id: result.deploy.id,
            status: "success",
            url: result.deploy.url,
            createdAt: new Date().toISOString(),
          },
          projectId: result.project.id,
        })

        // Add to deployment store
        deploymentStore.addDeployment({
          id: result.deploy.id,
          projectName: environment.name,
          platform: "vercel",
          environment: environment.type,
          status: "success",
          url: result.deploy.url,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        })
      } else {
        throw new Error(result.error || "Deployment failed")
      }
    } catch (error) {
      console.error(`Deployment to ${environment.name} failed:`, error)

      // Update progress to failed
      setDeploymentProgress((prev) => ({
        ...prev,
        [envId]: {
          ...prev[envId],
          status: "failed",
          progress: 0,
          error: error instanceof Error ? error.message : "Unknown error",
        },
      }))

      // Update environment with failure info
      environmentStore.updateEnvironment(envId, {
        lastDeployment: {
          id: `failed-${Date.now()}`,
          status: "failed",
          url: "",
          createdAt: new Date().toISOString(),
        },
      })
    }
  }

  const getEnvironmentTypeColor = (type: string) => {
    switch (type) {
      case "production":
        return "bg-red-100 text-red-800"
      case "staging":
        return "bg-yellow-100 text-yellow-800"
      case "preview":
        return "bg-blue-100 text-blue-800"
      case "development":
        return "bg-green-100 text-green-800"
      default:
        return "bg-gray-100 text-gray-800"
    }
  }

  const getStatusColor = (status: DeploymentProgress["status"]) => {
    switch (status) {
      case "success":
        return "text-green-600"
      case "failed":
        return "text-red-600"
      case "deploying":
        return "text-blue-600"
      default:
        return "text-gray-600"
    }
  }

  const getStatusIcon = (status: DeploymentProgress["status"]) => {
    switch (status) {
      case "success":
        return "i-ph:check-circle"
      case "failed":
        return "i-ph:x-circle"
      case "deploying":
        return "i-ph:spinner animate-spin"
      default:
        return "i-ph:clock"
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-octotask-elements-textPrimary">Multi-Environment Deploy</h2>
          <p className="text-octotask-elements-textSecondary">
            Deploy to multiple environments simultaneously or sequentially
          </p>
        </div>
        <EnvironmentSelector />
      </div>

      {/* Environment Selection */}
      <Card className="p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-octotask-elements-textPrimary">Select Environments</h3>
          <div className="flex items-center space-x-2">
            <Button size="sm" variant="ghost" onClick={selectAllEnvironments}>
              Select All
            </Button>
            <Button size="sm" variant="ghost" onClick={clearSelection}>
              Clear
            </Button>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {activeEnvironments.map((env) => {
            const isSelected = selectedEnvironments.includes(env.id)
            const progress = deploymentProgress[env.id]

            return (
              <div
                key={env.id}
                className={classNames(
                  "border rounded-lg p-4 cursor-pointer transition-all",
                  isSelected
                    ? "border-accent-500 bg-accent-50"
                    : "border-octotask-elements-borderColor hover:border-accent-300",
                )}
                onClick={() => !isDeploying && toggleEnvironmentSelection(env.id)}
              >
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center space-x-3">
                    <div
                      className={classNames(
                        "w-4 h-4 rounded border-2 flex items-center justify-center",
                        isSelected ? "border-accent-500 bg-accent-500" : "border-gray-300",
                      )}
                    >
                      {isSelected && <div className="i-ph:check w-3 h-3 text-white" />}
                    </div>
                    <div>
                      <h4 className="font-medium text-octotask-elements-textPrimary">{env.name}</h4>
                      <Badge size="sm" className={getEnvironmentTypeColor(env.type)}>
                        {env.type}
                      </Badge>
                    </div>
                  </div>
                  {progress && (
                    <div
                      className={classNames("w-5 h-5", getStatusIcon(progress.status), getStatusColor(progress.status))}
                    />
                  )}
                </div>

                <div className="space-y-2 text-sm text-octotask-elements-textSecondary">
                  <div>Branch: {env.branch}</div>
                  {env.domain && <div>Domain: {env.domain}</div>}
                  <div>Variables: {env.variables.length}</div>
                </div>

                {progress && (
                  <div className="mt-3">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-xs text-octotask-elements-textSecondary capitalize">{progress.status}</span>
                      <span className="text-xs text-octotask-elements-textSecondary">{progress.progress}%</span>
                    </div>
                    <Progress value={progress.progress} className="h-2" />
                    {progress.error && <div className="text-xs text-red-600 mt-1">{progress.error}</div>}
                    {progress.url && (
                      <a
                        href={progress.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-xs text-accent-500 hover:underline mt-1 block"
                      >
                        View Deployment
                      </a>
                    )}
                  </div>
                )}
              </div>
            )
          })}
        </div>

        {activeEnvironments.length === 0 && (
          <div className="text-center py-8 text-octotask-elements-textSecondary">
            No active environments found. Create and activate environments to deploy.
          </div>
        )}
      </Card>

      {/* Deployment Options */}
      {selectedEnvironments.length > 0 && (
        <Card className="p-6">
          <h3 className="text-lg font-semibold text-octotask-elements-textPrimary mb-4">Deployment Options</h3>

          <div className="space-y-4">
            <div className="flex items-center space-x-2">
              <Switch
                id="deploy-sequentially"
                checked={deploySequentially}
                onCheckedChange={setDeploySequentially}
                disabled={isDeploying}
              />
              <Label htmlFor="deploy-sequentially">Deploy sequentially (one at a time)</Label>
            </div>

            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-octotask-elements-textSecondary">
                  {selectedEnvironments.length} environment{selectedEnvironments.length !== 1 ? "s" : ""} selected
                </p>
                {deploySequentially && selectedEnvironments.length > 1 && (
                  <p className="text-xs text-octotask-elements-textSecondary">Deployments will run one after another</p>
                )}
              </div>

              <Button
                onClick={deployToEnvironments}
                disabled={isDeploying || selectedEnvironments.length === 0 || !vercelConn.token}
                className="bg-black text-white hover:bg-gray-800"
              >
                {isDeploying ? (
                  <>
                    <div className="i-ph:spinner w-4 h-4 mr-2 animate-spin" />
                    Deploying...
                  </>
                ) : (
                  <>
                    <div className="i-simple-icons:vercel w-4 h-4 mr-2" />
                    Deploy to {selectedEnvironments.length} Environment{selectedEnvironments.length !== 1 ? "s" : ""}
                  </>
                )}
              </Button>
            </div>
          </div>
        </Card>
      )}

      {/* Deployment Progress */}
      {Object.keys(deploymentProgress).length > 0 && (
        <Card className="p-6">
          <h3 className="text-lg font-semibold text-octotask-elements-textPrimary mb-4">Deployment Progress</h3>

          <div className="space-y-4">
            {Object.entries(deploymentProgress).map(([envId, progress]) => {
              const env = environments[envId]
              if (!env) return null

              return (
                <div key={envId} className="border border-octotask-elements-borderColor rounded-lg p-4">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center space-x-3">
                      <div
                        className={classNames(
                          "w-5 h-5",
                          getStatusIcon(progress.status),
                          getStatusColor(progress.status),
                        )}
                      />
                      <div>
                        <span className="font-medium text-octotask-elements-textPrimary">{env.name}</span>
                        <Badge size="sm" className={`ml-2 ${getEnvironmentTypeColor(env.type)}`}>
                          {env.type}
                        </Badge>
                      </div>
                    </div>
                    <span className={classNames("text-sm font-medium capitalize", getStatusColor(progress.status))}>
                      {progress.status}
                    </span>
                  </div>

                  {progress.status === "deploying" && (
                    <div className="mb-2">
                      <Progress value={progress.progress} className="h-2" />
                    </div>
                  )}

                  {progress.error && (
                    <div className="text-sm text-red-600 bg-red-50 p-2 rounded mt-2">{progress.error}</div>
                  )}

                  {progress.url && (
                    <div className="mt-2">
                      <a
                        href={progress.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-sm text-accent-500 hover:underline"
                      >
                        View Deployment →
                      </a>
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        </Card>
      )}
    </div>
  )
}

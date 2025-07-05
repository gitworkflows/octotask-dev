"use client"

import { useStore } from "@nanostores/react"
import { useState, useEffect } from "react"
import { Card } from "~/components/ui/Card"
import { Button } from "~/components/ui/Button"
import { Badge } from "~/components/ui/Badge"
import { Input } from "~/components/ui/Input"
import { Label } from "~/components/ui/Label"
import { Switch } from "~/components/ui/Switch"
import { vercelConnection } from "~/lib/stores/vercel"
import { deploymentStore } from "~/lib/stores/deployment"
import { workbenchStore } from "~/lib/stores/workbench"
import { useVercelDeploy } from "./VercelDeploy.client"
import { classNames } from "~/utils/classNames"
import { formatDistanceToNow } from "date-fns"

interface VercelProject {
  id: string
  name: string
  framework: string | null
  createdAt: string
  updatedAt: string
  link?: {
    type: string
    repo: string
    org: string
  }
}

interface VercelDeployment {
  uid: string
  name: string
  url: string
  state: string
  type: string
  created: number
  building: boolean
  ready: boolean
}

export function VercelDeploymentManager() {
  const vercelConn = useStore(vercelConnection)
  const deployments = useStore(deploymentStore.deployments)
  const { handleVercelDeploy, isDeploying } = useVercelDeploy()

  const [projects, setProjects] = useState<VercelProject[]>([])
  const [vercelDeployments, setVercelDeployments] = useState<VercelDeployment[]>([])
  const [selectedProject, setSelectedProject] = useState<string>("")
  const [isLoadingProjects, setIsLoadingProjects] = useState(false)
  const [isLoadingDeployments, setIsLoadingDeployments] = useState(false)

  // Deployment settings
  const [deploymentSettings, setDeploymentSettings] = useState({
    autoRedirect: true,
    buildCommand: "npm run build",
    outputDirectory: "dist",
    installCommand: "npm install",
    nodeVersion: "18.x",
    environmentVariables: {} as Record<string, string>,
  })

  const [newEnvKey, setNewEnvKey] = useState("")
  const [newEnvValue, setNewEnvValue] = useState("")

  useEffect(() => {
    if (vercelConn.token) {
      loadProjects()
    }
  }, [vercelConn.token])

  useEffect(() => {
    if (selectedProject && vercelConn.token) {
      loadDeployments(selectedProject)
    }
  }, [selectedProject, vercelConn.token])

  const loadProjects = async () => {
    if (!vercelConn.token) return

    setIsLoadingProjects(true)
    try {
      const response = await fetch("https://api.vercel.com/v9/projects", {
        headers: {
          Authorization: `Bearer ${vercelConn.token}`,
        },
      })

      if (response.ok) {
        const data = await response.json()
        setProjects(data.projects || [])
      }
    } catch (error) {
      console.error("Failed to load Vercel projects:", error)
    } finally {
      setIsLoadingProjects(false)
    }
  }

  const loadDeployments = async (projectId: string) => {
    if (!vercelConn.token) return

    setIsLoadingDeployments(true)
    try {
      const response = await fetch(`https://api.vercel.com/v6/deployments?projectId=${projectId}&limit=10`, {
        headers: {
          Authorization: `Bearer ${vercelConn.token}`,
        },
      })

      if (response.ok) {
        const data = await response.json()
        setVercelDeployments(data.deployments || [])
      }
    } catch (error) {
      console.error("Failed to load Vercel deployments:", error)
    } finally {
      setIsLoadingDeployments(false)
    }
  }

  const createProject = async () => {
    if (!vercelConn.token) return

    const projectName = `octotask-${Date.now()}`

    try {
      const response = await fetch("https://api.vercel.com/v9/projects", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${vercelConn.token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          name: projectName,
          framework: null,
        }),
      })

      if (response.ok) {
        const project = await response.json()
        setProjects((prev) => [project, ...prev])
        setSelectedProject(project.id)
      }
    } catch (error) {
      console.error("Failed to create Vercel project:", error)
    }
  }

  const addEnvironmentVariable = () => {
    if (newEnvKey && newEnvValue) {
      setDeploymentSettings((prev) => ({
        ...prev,
        environmentVariables: {
          ...prev.environmentVariables,
          [newEnvKey]: newEnvValue,
        },
      }))
      setNewEnvKey("")
      setNewEnvValue("")
    }
  }

  const removeEnvironmentVariable = (key: string) => {
    setDeploymentSettings((prev) => {
      const newEnvVars = { ...prev.environmentVariables }
      delete newEnvVars[key]
      return {
        ...prev,
        environmentVariables: newEnvVars,
      }
    })
  }

  const getDeploymentStatusColor = (state: string) => {
    switch (state.toLowerCase()) {
      case "ready":
        return "text-green-500"
      case "error":
        return "text-red-500"
      case "building":
      case "queued":
        return "text-blue-500"
      case "canceled":
        return "text-gray-500"
      default:
        return "text-octotask-elements-textPrimary"
    }
  }

  const getDeploymentBadgeVariant = (state: string) => {
    switch (state.toLowerCase()) {
      case "ready":
        return "success" as const
      case "error":
        return "error" as const
      case "building":
      case "queued":
        return "info" as const
      case "canceled":
        return "secondary" as const
      default:
        return "secondary" as const
    }
  }

  if (!vercelConn.user) {
    return (
      <Card className="p-6">
        <div className="text-center">
          <div className="w-16 h-16 bg-gray-100 rounded-lg flex items-center justify-center mx-auto mb-4">
            <div className="i-simple-icons:vercel w-8 h-8 text-gray-400" />
          </div>
          <h3 className="text-lg font-semibold text-octotask-elements-textPrimary mb-2">Connect to Vercel</h3>
          <p className="text-octotask-elements-textSecondary mb-4">
            Connect your Vercel account to deploy your projects
          </p>
          <Button
            onClick={() => {
              /* Open settings */
            }}
          >
            Connect Vercel Account
          </Button>
        </div>
      </Card>
    )
  }

  return (
    <div className="space-y-6">
      {/* Quick Deploy */}
      <Card className="p-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-lg font-semibold text-octotask-elements-textPrimary">Quick Deploy</h3>
            <p className="text-sm text-octotask-elements-textSecondary">Deploy your current project to Vercel</p>
          </div>
          <Button
            onClick={handleVercelDeploy}
            disabled={isDeploying || !workbenchStore.firstArtifact}
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
                Deploy to Vercel
              </>
            )}
          </Button>
        </div>

        {!workbenchStore.firstArtifact && (
          <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
            <p className="text-sm text-yellow-800">
              No active project found. Create or open a project to enable deployment.
            </p>
          </div>
        )}
      </Card>

      {/* Project Management */}
      <Card className="p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-octotask-elements-textPrimary">Vercel Projects</h3>
          <Button size="sm" onClick={createProject}>
            <div className="i-ph:plus w-4 h-4 mr-2" />
            New Project
          </Button>
        </div>

        {isLoadingProjects ? (
          <div className="flex items-center justify-center py-8">
            <div className="i-ph:spinner w-6 h-6 animate-spin text-octotask-elements-textSecondary" />
          </div>
        ) : (
          <div className="space-y-3">
            {projects.map((project) => (
              <div
                key={project.id}
                className={classNames(
                  "p-4 border rounded-lg cursor-pointer transition-colors",
                  selectedProject === project.id
                    ? "border-blue-500 bg-blue-50"
                    : "border-octotask-elements-borderColor hover:bg-octotask-elements-item-backgroundHover",
                )}
                onClick={() => setSelectedProject(project.id)}
              >
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="font-medium text-octotask-elements-textPrimary">{project.name}</h4>
                    <p className="text-sm text-octotask-elements-textSecondary">
                      {project.framework || "No framework"} • Created{" "}
                      {formatDistanceToNow(new Date(project.createdAt), { addSuffix: true })}
                    </p>
                  </div>
                  <div className="flex items-center space-x-2">
                    {project.link && (
                      <Badge variant="secondary">
                        {project.link.org}/{project.link.repo}
                      </Badge>
                    )}
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={(e) => {
                        e.stopPropagation()
                        window.open(`https://vercel.com/${vercelConn.user?.username}/${project.name}`, "_blank")
                      }}
                    >
                      <div className="i-ph:external-link w-4 h-4" />
                    </Button>
                  </div>
                </div>
              </div>
            ))}

            {projects.length === 0 && (
              <div className="text-center py-8 text-octotask-elements-textSecondary">
                No projects found. Create your first project to get started.
              </div>
            )}
          </div>
        )}
      </Card>

      {/* Deployment Settings */}
      <Card className="p-6">
        <h3 className="text-lg font-semibold text-octotask-elements-textPrimary mb-4">Deployment Settings</h3>

        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="buildCommand">Build Command</Label>
              <Input
                id="buildCommand"
                value={deploymentSettings.buildCommand}
                onChange={(e) => setDeploymentSettings((prev) => ({ ...prev, buildCommand: e.target.value }))}
                placeholder="npm run build"
              />
            </div>
            <div>
              <Label htmlFor="outputDirectory">Output Directory</Label>
              <Input
                id="outputDirectory"
                value={deploymentSettings.outputDirectory}
                onChange={(e) => setDeploymentSettings((prev) => ({ ...prev, outputDirectory: e.target.value }))}
                placeholder="dist"
              />
            </div>
            <div>
              <Label htmlFor="installCommand">Install Command</Label>
              <Input
                id="installCommand"
                value={deploymentSettings.installCommand}
                onChange={(e) => setDeploymentSettings((prev) => ({ ...prev, installCommand: e.target.value }))}
                placeholder="npm install"
              />
            </div>
            <div>
              <Label htmlFor="nodeVersion">Node.js Version</Label>
              <Input
                id="nodeVersion"
                value={deploymentSettings.nodeVersion}
                onChange={(e) => setDeploymentSettings((prev) => ({ ...prev, nodeVersion: e.target.value }))}
                placeholder="18.x"
              />
            </div>
          </div>

          <div className="flex items-center space-x-2">
            <Switch
              id="autoRedirect"
              checked={deploymentSettings.autoRedirect}
              onCheckedChange={(checked) => setDeploymentSettings((prev) => ({ ...prev, autoRedirect: checked }))}
            />
            <Label htmlFor="autoRedirect">Auto-redirect to HTTPS</Label>
          </div>

          {/* Environment Variables */}
          <div>
            <Label className="text-base font-medium">Environment Variables</Label>
            <div className="mt-2 space-y-3">
              {Object.entries(deploymentSettings.environmentVariables).map(([key, value]) => (
                <div key={key} className="flex items-center space-x-2">
                  <Input value={key} readOnly className="flex-1" />
                  <Input value={value} readOnly className="flex-1" />
                  <Button size="sm" variant="ghost" onClick={() => removeEnvironmentVariable(key)}>
                    <div className="i-ph:trash w-4 h-4" />
                  </Button>
                </div>
              ))}

              <div className="flex items-center space-x-2">
                <Input
                  placeholder="Key"
                  value={newEnvKey}
                  onChange={(e) => setNewEnvKey(e.target.value)}
                  className="flex-1"
                />
                <Input
                  placeholder="Value"
                  value={newEnvValue}
                  onChange={(e) => setNewEnvValue(e.target.value)}
                  className="flex-1"
                />
                <Button size="sm" onClick={addEnvironmentVariable}>
                  <div className="i-ph:plus w-4 h-4" />
                </Button>
              </div>
            </div>
          </div>
        </div>
      </Card>

      {/* Recent Deployments */}
      {selectedProject && (
        <Card className="p-6">
          <h3 className="text-lg font-semibold text-octotask-elements-textPrimary mb-4">Recent Deployments</h3>

          {isLoadingDeployments ? (
            <div className="flex items-center justify-center py-8">
              <div className="i-ph:spinner w-6 h-6 animate-spin text-octotask-elements-textSecondary" />
            </div>
          ) : (
            <div className="space-y-3">
              {vercelDeployments.map((deployment) => (
                <div
                  key={deployment.uid}
                  className="flex items-center justify-between p-4 border border-octotask-elements-borderColor rounded-lg"
                >
                  <div className="flex items-center space-x-3">
                    <div
                      className={classNames(
                        "w-3 h-3 rounded-full",
                        deployment.state === "READY"
                          ? "bg-green-500"
                          : deployment.state === "ERROR"
                            ? "bg-red-500"
                            : "bg-blue-500",
                      )}
                    />
                    <div>
                      <p className="font-medium text-octotask-elements-textPrimary">{deployment.name}</p>
                      <p className="text-sm text-octotask-elements-textSecondary">
                        {formatDistanceToNow(new Date(deployment.created), { addSuffix: true })}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Badge variant={getDeploymentBadgeVariant(deployment.state)}>{deployment.state}</Badge>
                    {deployment.url && (
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => window.open(`https://${deployment.url}`, "_blank")}
                      >
                        <div className="i-ph:external-link w-4 h-4" />
                      </Button>
                    )}
                  </div>
                </div>
              ))}

              {vercelDeployments.length === 0 && (
                <div className="text-center py-8 text-octotask-elements-textSecondary">
                  No deployments found for this project.
                </div>
              )}
            </div>
          )}
        </Card>
      )}
    </div>
  )
}

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
import { environmentStore } from "~/lib/stores/environment"
import { vercelConnection } from "~/lib/stores/vercel"
import { formatDistanceToNow } from "date-fns"

interface EnvironmentVariable {
  key: string
  value: string
  isSecret: boolean
  description?: string
}

interface DeploymentEnvironment {
  id: string
  name: string
  type: "production" | "staging" | "preview" | "development"
  projectId?: string
  domain?: string
  branch: string
  autoDeployEnabled: boolean
  variables: EnvironmentVariable[]
  buildSettings: {
    buildCommand: string
    outputDirectory: string
    installCommand: string
    nodeVersion: string
    framework?: string
  }
  lastDeployment?: {
    id: string
    status: string
    url: string
    createdAt: string
  }
  isActive: boolean
  createdAt: string
  updatedAt: string
}

export function EnvironmentManager() {
  const environments = useStore(environmentStore.environments)
  const vercelConn = useStore(vercelConnection)
  const [selectedEnv, setSelectedEnv] = useState<DeploymentEnvironment | null>(null)
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [isCreating, setIsCreating] = useState(false)
  const [newVariable, setNewVariable] = useState({ key: "", value: "", isSecret: false, description: "" })

  useEffect(() => {
    environmentStore.loadFromStorage()
  }, [])

  const createEnvironment = () => {
    const newEnv: DeploymentEnvironment = {
      id: Date.now().toString(),
      name: "New Environment",
      type: "development",
      branch: "main",
      autoDeployEnabled: false,
      variables: [],
      buildSettings: {
        buildCommand: "npm run build",
        outputDirectory: "dist",
        installCommand: "npm install",
        nodeVersion: "18.x",
      },
      isActive: true,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    }

    environmentStore.addEnvironment(newEnv)
    setSelectedEnv(newEnv)
    setIsCreating(true)
    setIsDialogOpen(true)
  }

  const updateEnvironment = (envId: string, updates: Partial<DeploymentEnvironment>) => {
    environmentStore.updateEnvironment(envId, {
      ...updates,
      updatedAt: new Date().toISOString(),
    })

    if (selectedEnv?.id === envId) {
      setSelectedEnv({ ...selectedEnv, ...updates })
    }
  }

  const deleteEnvironment = (envId: string) => {
    environmentStore.removeEnvironment(envId)
    if (selectedEnv?.id === envId) {
      setSelectedEnv(null)
      setIsDialogOpen(false)
    }
  }

  const addVariable = () => {
    if (!selectedEnv || !newVariable.key || !newVariable.value) return

    const updatedVariables = [...selectedEnv.variables, { ...newVariable }]
    updateEnvironment(selectedEnv.id, { variables: updatedVariables })
    setNewVariable({ key: "", value: "", isSecret: false, description: "" })
  }

  const removeVariable = (variableKey: string) => {
    if (!selectedEnv) return

    const updatedVariables = selectedEnv.variables.filter((v) => v.key !== variableKey)
    updateEnvironment(selectedEnv.id, { variables: updatedVariables })
  }

  const deployToEnvironment = async (env: DeploymentEnvironment) => {
    if (!vercelConn.token) {
      alert("Please connect to Vercel first")
      return
    }

    try {
      // This would trigger the deployment with environment-specific settings
      console.log("Deploying to environment:", env.name)
      // Implementation would call the deployment API with environment settings
    } catch (error) {
      console.error("Deployment failed:", error)
    }
  }

  const getEnvironmentTypeColor = (type: DeploymentEnvironment["type"]) => {
    switch (type) {
      case "production":
        return "bg-red-100 text-red-800 border-red-200"
      case "staging":
        return "bg-yellow-100 text-yellow-800 border-yellow-200"
      case "preview":
        return "bg-blue-100 text-blue-800 border-blue-200"
      case "development":
        return "bg-green-100 text-green-800 border-green-200"
      default:
        return "bg-gray-100 text-gray-800 border-gray-200"
    }
  }

  const getEnvironmentIcon = (type: DeploymentEnvironment["type"]) => {
    switch (type) {
      case "production":
        return "i-ph:globe"
      case "staging":
        return "i-ph:test-tube"
      case "preview":
        return "i-ph:eye"
      case "development":
        return "i-ph:code"
      default:
        return "i-ph:circle"
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-octotask-elements-textPrimary">Environment Management</h2>
          <p className="text-octotask-elements-textSecondary">
            Manage deployment environments for staging, preview, and production
          </p>
        </div>
        <Button onClick={createEnvironment}>
          <div className="i-ph:plus w-4 h-4 mr-2" />
          Add Environment
        </Button>
      </div>

      {/* Environment Cards */}
      <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
        {Object.values(environments).map((env) => (
          <Card key={env.id} className="p-6 hover:shadow-lg transition-shadow">
            <div className="flex items-start justify-between mb-4">
              <div className="flex items-center space-x-3">
                <div
                  className={`w-10 h-10 rounded-lg flex items-center justify-center ${getEnvironmentTypeColor(env.type)}`}
                >
                  <div className={`w-5 h-5 ${getEnvironmentIcon(env.type)}`} />
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-octotask-elements-textPrimary">{env.name}</h3>
                  <Badge className={getEnvironmentTypeColor(env.type)}>{env.type}</Badge>
                </div>
              </div>
              <div className="flex items-center space-x-2">
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => {
                    setSelectedEnv(env)
                    setIsCreating(false)
                    setIsDialogOpen(true)
                  }}
                >
                  <div className="i-ph:gear w-4 h-4" />
                </Button>
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
                      onClick={() => deployToEnvironment(env)}
                    >
                      Deploy Now
                    </button>
                    <button
                      className="block w-full text-left px-4 py-2 text-sm text-octotask-elements-textPrimary hover:bg-octotask-elements-item-backgroundHover"
                      onClick={() => updateEnvironment(env.id, { isActive: !env.isActive })}
                    >
                      {env.isActive ? "Deactivate" : "Activate"}
                    </button>
                    <button
                      className="block w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-red-50"
                      onClick={() => deleteEnvironment(env.id)}
                    >
                      Delete
                    </button>
                  </div>
                </Dropdown>
              </div>
            </div>

            <div className="space-y-3 text-sm">
              <div className="flex items-center justify-between">
                <span className="text-octotask-elements-textSecondary">Branch:</span>
                <span className="text-octotask-elements-textPrimary font-mono">{env.branch}</span>
              </div>

              {env.domain && (
                <div className="flex items-center justify-between">
                  <span className="text-octotask-elements-textSecondary">Domain:</span>
                  <a
                    href={`https://${env.domain}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-accent-500 hover:underline truncate max-w-32"
                  >
                    {env.domain}
                  </a>
                </div>
              )}

              <div className="flex items-center justify-between">
                <span className="text-octotask-elements-textSecondary">Auto Deploy:</span>
                <Badge variant={env.autoDeployEnabled ? "success" : "secondary"}>
                  {env.autoDeployEnabled ? "Enabled" : "Disabled"}
                </Badge>
              </div>

              <div className="flex items-center justify-between">
                <span className="text-octotask-elements-textSecondary">Variables:</span>
                <span className="text-octotask-elements-textPrimary">{env.variables.length}</span>
              </div>

              <div className="flex items-center justify-between">
                <span className="text-octotask-elements-textSecondary">Status:</span>
                <Badge variant={env.isActive ? "success" : "secondary"}>{env.isActive ? "Active" : "Inactive"}</Badge>
              </div>

              {env.lastDeployment && (
                <div className="pt-2 border-t border-octotask-elements-borderColor">
                  <div className="flex items-center justify-between">
                    <span className="text-octotask-elements-textSecondary">Last Deploy:</span>
                    <Badge
                      variant={
                        env.lastDeployment.status === "success"
                          ? "success"
                          : env.lastDeployment.status === "failed"
                            ? "error"
                            : "warning"
                      }
                    >
                      {env.lastDeployment.status}
                    </Badge>
                  </div>
                  <p className="text-xs text-octotask-elements-textSecondary mt-1">
                    {formatDistanceToNow(new Date(env.lastDeployment.createdAt), { addSuffix: true })}
                  </p>
                </div>
              )}
            </div>

            <div className="mt-4 pt-4 border-t border-octotask-elements-borderColor">
              <Button size="sm" className="w-full" onClick={() => deployToEnvironment(env)} disabled={!env.isActive}>
                <div className="i-ph:rocket w-4 h-4 mr-2" />
                Deploy to {env.name}
              </Button>
            </div>
          </Card>
        ))}

        {Object.keys(environments).length === 0 && (
          <div className="col-span-full">
            <Card className="p-12">
              <div className="text-center">
                <div className="w-16 h-16 bg-gray-100 rounded-lg flex items-center justify-center mx-auto mb-4">
                  <div className="i-ph:stack w-8 h-8 text-gray-400" />
                </div>
                <h3 className="text-lg font-semibold text-octotask-elements-textPrimary mb-2">No Environments</h3>
                <p className="text-octotask-elements-textSecondary mb-4">
                  Create your first deployment environment to get started
                </p>
                <Button onClick={createEnvironment}>
                  <div className="i-ph:plus w-4 h-4 mr-2" />
                  Create Environment
                </Button>
              </div>
            </Card>
          </div>
        )}
      </div>

      {/* Environment Configuration Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="bg-octotask-elements-background-depth-1 rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-hidden">
            <div className="p-6 border-b border-octotask-elements-borderColor">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold text-octotask-elements-textPrimary">
                  {isCreating ? "Create Environment" : `Configure ${selectedEnv?.name}`}
                </h3>
                <Button variant="ghost" size="sm" onClick={() => setIsDialogOpen(false)}>
                  <div className="i-ph:x w-4 h-4" />
                </Button>
              </div>
            </div>

            <div className="p-6 overflow-y-auto max-h-[calc(90vh-140px)]">
              {selectedEnv && (
                <div className="space-y-8">
                  {/* General Settings */}
                  <div className="space-y-4">
                    <h4 className="text-base font-semibold text-octotask-elements-textPrimary">General Settings</h4>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <Label htmlFor="env-name">Environment Name</Label>
                        <Input
                          id="env-name"
                          value={selectedEnv.name}
                          onChange={(e) => updateEnvironment(selectedEnv.id, { name: e.target.value })}
                          placeholder="My Environment"
                        />
                      </div>

                      <div>
                        <Label htmlFor="env-type">Environment Type</Label>
                        <select
                          id="env-type"
                          value={selectedEnv.type}
                          onChange={(e) => updateEnvironment(selectedEnv.id, { type: e.target.value as any })}
                          className="w-full px-3 py-2 border border-octotask-elements-borderColor rounded-md bg-octotask-elements-background-depth-1 text-octotask-elements-textPrimary"
                        >
                          <option value="development">Development</option>
                          <option value="preview">Preview</option>
                          <option value="staging">Staging</option>
                          <option value="production">Production</option>
                        </select>
                      </div>

                      <div>
                        <Label htmlFor="env-branch">Git Branch</Label>
                        <Input
                          id="env-branch"
                          value={selectedEnv.branch}
                          onChange={(e) => updateEnvironment(selectedEnv.id, { branch: e.target.value })}
                          placeholder="main"
                        />
                      </div>

                      <div>
                        <Label htmlFor="env-domain">Custom Domain</Label>
                        <Input
                          id="env-domain"
                          value={selectedEnv.domain || ""}
                          onChange={(e) => updateEnvironment(selectedEnv.id, { domain: e.target.value })}
                          placeholder="example.com"
                        />
                      </div>
                    </div>

                    <div className="flex items-center space-x-4">
                      <div className="flex items-center space-x-2">
                        <Switch
                          id="auto-deploy"
                          checked={selectedEnv.autoDeployEnabled}
                          onCheckedChange={(checked) =>
                            updateEnvironment(selectedEnv.id, { autoDeployEnabled: checked })
                          }
                        />
                        <Label htmlFor="auto-deploy">Enable Auto Deploy</Label>
                      </div>

                      <div className="flex items-center space-x-2">
                        <Switch
                          id="is-active"
                          checked={selectedEnv.isActive}
                          onCheckedChange={(checked) => updateEnvironment(selectedEnv.id, { isActive: checked })}
                        />
                        <Label htmlFor="is-active">Environment Active</Label>
                      </div>
                    </div>
                  </div>

                  {/* Build Settings */}
                  <div className="space-y-4">
                    <h4 className="text-base font-semibold text-octotask-elements-textPrimary">Build Settings</h4>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <Label htmlFor="build-command">Build Command</Label>
                        <Input
                          id="build-command"
                          value={selectedEnv.buildSettings.buildCommand}
                          onChange={(e) =>
                            updateEnvironment(selectedEnv.id, {
                              buildSettings: { ...selectedEnv.buildSettings, buildCommand: e.target.value },
                            })
                          }
                          placeholder="npm run build"
                        />
                      </div>

                      <div>
                        <Label htmlFor="output-dir">Output Directory</Label>
                        <Input
                          id="output-dir"
                          value={selectedEnv.buildSettings.outputDirectory}
                          onChange={(e) =>
                            updateEnvironment(selectedEnv.id, {
                              buildSettings: { ...selectedEnv.buildSettings, outputDirectory: e.target.value },
                            })
                          }
                          placeholder="dist"
                        />
                      </div>

                      <div>
                        <Label htmlFor="install-command">Install Command</Label>
                        <Input
                          id="install-command"
                          value={selectedEnv.buildSettings.installCommand}
                          onChange={(e) =>
                            updateEnvironment(selectedEnv.id, {
                              buildSettings: { ...selectedEnv.buildSettings, installCommand: e.target.value },
                            })
                          }
                          placeholder="npm install"
                        />
                      </div>

                      <div>
                        <Label htmlFor="node-version">Node.js Version</Label>
                        <Input
                          id="node-version"
                          value={selectedEnv.buildSettings.nodeVersion}
                          onChange={(e) =>
                            updateEnvironment(selectedEnv.id, {
                              buildSettings: { ...selectedEnv.buildSettings, nodeVersion: e.target.value },
                            })
                          }
                          placeholder="18.x"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Environment Variables */}
                  <div className="space-y-4">
                    <h4 className="text-base font-semibold text-octotask-elements-textPrimary">
                      Environment Variables
                    </h4>

                    <div className="space-y-3 max-h-64 overflow-y-auto">
                      {selectedEnv.variables.map((variable, index) => (
                        <div
                          key={index}
                          className="flex items-start space-x-3 p-3 border border-octotask-elements-borderColor rounded-lg"
                        >
                          <div className="flex-1 space-y-2">
                            <div className="flex items-center space-x-2">
                              <span className="font-mono text-sm text-octotask-elements-textPrimary font-medium">
                                {variable.key}
                              </span>
                              {variable.isSecret && (
                                <Badge variant="warning" size="sm">
                                  Secret
                                </Badge>
                              )}
                            </div>
                            <div className="text-xs text-octotask-elements-textSecondary">
                              {variable.isSecret ? "••••••••" : variable.value}
                            </div>
                            {variable.description && (
                              <div className="text-xs text-octotask-elements-textSecondary italic">
                                {variable.description}
                              </div>
                            )}
                          </div>
                          <Button size="sm" variant="ghost" onClick={() => removeVariable(variable.key)}>
                            <div className="i-ph:trash w-4 h-4 text-red-500" />
                          </Button>
                        </div>
                      ))}
                    </div>

                    {/* Add New Variable */}
                    <div className="border border-octotask-elements-borderColor rounded-lg p-4 bg-octotask-elements-background-depth-2">
                      <h5 className="font-medium text-octotask-elements-textPrimary mb-3">Add Variable</h5>
                      <div className="space-y-3">
                        <div className="grid grid-cols-2 gap-3">
                          <Input
                            placeholder="Variable name"
                            value={newVariable.key}
                            onChange={(e) => setNewVariable({ ...newVariable, key: e.target.value })}
                          />
                          <Input
                            placeholder="Variable value"
                            type={newVariable.isSecret ? "password" : "text"}
                            value={newVariable.value}
                            onChange={(e) => setNewVariable({ ...newVariable, value: e.target.value })}
                          />
                        </div>
                        <Input
                          placeholder="Description (optional)"
                          value={newVariable.description}
                          onChange={(e) => setNewVariable({ ...newVariable, description: e.target.value })}
                        />
                        <div className="flex items-center justify-between">
                          <div className="flex items-center space-x-2">
                            <Switch
                              id="new-var-secret"
                              checked={newVariable.isSecret}
                              onCheckedChange={(checked) => setNewVariable({ ...newVariable, isSecret: checked })}
                            />
                            <Label htmlFor="new-var-secret">Secret Variable</Label>
                          </div>
                          <Button size="sm" onClick={addVariable} disabled={!newVariable.key || !newVariable.value}>
                            <div className="i-ph:plus w-4 h-4 mr-2" />
                            Add Variable
                          </Button>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>

            <div className="p-6 border-t border-octotask-elements-borderColor flex justify-between">
              <div>
                {selectedEnv && !isCreating && (
                  <Button
                    variant="ghost"
                    onClick={() => deleteEnvironment(selectedEnv.id)}
                    className="text-red-600 hover:text-red-700 hover:bg-red-50"
                  >
                    <div className="i-ph:trash w-4 h-4 mr-2" />
                    Delete Environment
                  </Button>
                )}
              </div>
              <div className="flex space-x-3">
                <Button variant="ghost" onClick={() => setIsDialogOpen(false)}>
                  Cancel
                </Button>
                <Button onClick={() => setIsDialogOpen(false)}>
                  {isCreating ? "Create Environment" : "Save Changes"}
                </Button>
              </div>
            </div>
          </div>
        </div>
      </Dialog>
    </div>
  )
}

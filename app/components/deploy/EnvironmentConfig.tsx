"use client"

import { useState } from "react"
import { Card } from "~/components/ui/Card"
import { Button } from "~/components/ui/Button"
import { Input } from "~/components/ui/Input"
import { Label } from "~/components/ui/Label"
import { Badge } from "~/components/ui/Badge"
import { Switch } from "~/components/ui/Switch"
import { Tabs } from "~/components/ui/Tabs"
import { Dialog } from "~/components/ui/Dialog"

interface EnvironmentVariable {
  key: string
  value: string
  isSecret: boolean
  description?: string
}

interface Environment {
  id: string
  name: string
  type: "production" | "staging" | "development" | "preview"
  url?: string
  branch?: string
  autoDeployEnabled: boolean
  variables: EnvironmentVariable[]
  buildCommand?: string
  outputDirectory?: string
  nodeVersion?: string
}

export function EnvironmentConfig() {
  const [environments, setEnvironments] = useState<Environment[]>([
    {
      id: "1",
      name: "Production",
      type: "production",
      url: "https://myapp.com",
      branch: "main",
      autoDeployEnabled: true,
      variables: [
        { key: "NODE_ENV", value: "production", isSecret: false },
        { key: "API_KEY", value: "***", isSecret: true },
        { key: "DATABASE_URL", value: "***", isSecret: true },
      ],
      buildCommand: "npm run build",
      outputDirectory: "dist",
      nodeVersion: "18.x",
    },
    {
      id: "2",
      name: "Staging",
      type: "staging",
      url: "https://staging.myapp.com",
      branch: "develop",
      autoDeployEnabled: true,
      variables: [
        { key: "NODE_ENV", value: "staging", isSecret: false },
        { key: "API_KEY", value: "***", isSecret: true },
      ],
      buildCommand: "npm run build",
      outputDirectory: "dist",
      nodeVersion: "18.x",
    },
  ])

  const [selectedEnv, setSelectedEnv] = useState<Environment | null>(null)
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [newVariable, setNewVariable] = useState({ key: "", value: "", isSecret: false })

  const addEnvironment = () => {
    const newEnv: Environment = {
      id: Date.now().toString(),
      name: "New Environment",
      type: "development",
      autoDeployEnabled: false,
      variables: [],
      buildCommand: "npm run build",
      outputDirectory: "dist",
      nodeVersion: "18.x",
    }
    setEnvironments([...environments, newEnv])
    setSelectedEnv(newEnv)
    setIsDialogOpen(true)
  }

  const updateEnvironment = (envId: string, updates: Partial<Environment>) => {
    setEnvironments((envs) => envs.map((env) => (env.id === envId ? { ...env, ...updates } : env)))
  }

  const addVariable = (envId: string) => {
    if (!newVariable.key || !newVariable.value) return

    updateEnvironment(envId, {
      variables: [...(environments.find((e) => e.id === envId)?.variables || []), { ...newVariable }],
    })

    setNewVariable({ key: "", value: "", isSecret: false })
  }

  const removeVariable = (envId: string, variableKey: string) => {
    const env = environments.find((e) => e.id === envId)
    if (!env) return

    updateEnvironment(envId, {
      variables: env.variables.filter((v) => v.key !== variableKey),
    })
  }

  const getEnvironmentTypeColor = (type: Environment["type"]) => {
    switch (type) {
      case "production":
        return "bg-red-100 text-red-800"
      case "staging":
        return "bg-yellow-100 text-yellow-800"
      case "development":
        return "bg-green-100 text-green-800"
      case "preview":
        return "bg-blue-100 text-blue-800"
      default:
        return "bg-gray-100 text-gray-800"
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-octotask-elements-textPrimary">Environment Configuration</h2>
          <p className="text-octotask-elements-textSecondary">
            Manage deployment environments and their configurations
          </p>
        </div>
        <Button onClick={addEnvironment}>
          <div className="i-ph:plus w-4 h-4 mr-2" />
          Add Environment
        </Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
        {environments.map((env) => (
          <Card key={env.id} className="p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center space-x-3">
                <h3 className="text-lg font-semibold text-octotask-elements-textPrimary">{env.name}</h3>
                <Badge className={getEnvironmentTypeColor(env.type)}>{env.type}</Badge>
              </div>
              <Button
                size="sm"
                variant="ghost"
                onClick={() => {
                  setSelectedEnv(env)
                  setIsDialogOpen(true)
                }}
              >
                <div className="i-ph:gear w-4 h-4" />
              </Button>
            </div>

            <div className="space-y-3 text-sm">
              {env.url && (
                <div className="flex items-center justify-between">
                  <span className="text-octotask-elements-textSecondary">URL:</span>
                  <a
                    href={env.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-accent-500 hover:underline"
                  >
                    {env.url}
                  </a>
                </div>
              )}

              {env.branch && (
                <div className="flex items-center justify-between">
                  <span className="text-octotask-elements-textSecondary">Branch:</span>
                  <span className="text-octotask-elements-textPrimary font-mono">{env.branch}</span>
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
                <span className="text-octotask-elements-textSecondary">Node Version:</span>
                <span className="text-octotask-elements-textPrimary">{env.nodeVersion || "Default"}</span>
              </div>
            </div>

            <div className="mt-4 pt-4 border-t border-octotask-elements-borderColor">
              <Button
                size="sm"
                className="w-full"
                onClick={() => {
                  // Trigger deployment for this environment
                  console.log("Deploy to", env.name)
                }}
              >
                <div className="i-ph:rocket w-4 h-4 mr-2" />
                Deploy Now
              </Button>
            </div>
          </Card>
        ))}
      </div>

      {/* Environment Configuration Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="bg-octotask-elements-background-depth-1 rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-hidden">
            <div className="p-6 border-b border-octotask-elements-borderColor">
              <h3 className="text-lg font-semibold text-octotask-elements-textPrimary">
                Configure Environment: {selectedEnv?.name}
              </h3>
            </div>

            <div className="p-6 overflow-y-auto max-h-[calc(90vh-120px)]">
              {selectedEnv && (
                <Tabs defaultValue="general">
                  <div className="flex space-x-1 mb-6">
                    <button className="px-4 py-2 rounded-lg text-sm font-medium bg-accent-500 text-white">
                      General
                    </button>
                    <button className="px-4 py-2 rounded-lg text-sm font-medium text-octotask-elements-textSecondary hover:text-octotask-elements-textPrimary">
                      Variables
                    </button>
                    <button className="px-4 py-2 rounded-lg text-sm font-medium text-octotask-elements-textSecondary hover:text-octotask-elements-textPrimary">
                      Build Settings
                    </button>
                  </div>

                  <div className="space-y-6">
                    {/* General Settings */}
                    <div className="space-y-4">
                      <div>
                        <Label htmlFor="env-name">Environment Name</Label>
                        <Input
                          id="env-name"
                          value={selectedEnv.name}
                          onChange={(e) => updateEnvironment(selectedEnv.id, { name: e.target.value })}
                        />
                      </div>

                      <div>
                        <Label htmlFor="env-url">URL</Label>
                        <Input
                          id="env-url"
                          value={selectedEnv.url || ""}
                          onChange={(e) => updateEnvironment(selectedEnv.id, { url: e.target.value })}
                          placeholder="https://example.com"
                        />
                      </div>

                      <div>
                        <Label htmlFor="env-branch">Git Branch</Label>
                        <Input
                          id="env-branch"
                          value={selectedEnv.branch || ""}
                          onChange={(e) => updateEnvironment(selectedEnv.id, { branch: e.target.value })}
                          placeholder="main"
                        />
                      </div>

                      <div className="flex items-center space-x-2">
                        <Switch
                          checked={selectedEnv.autoDeployEnabled}
                          onCheckedChange={(checked) =>
                            updateEnvironment(selectedEnv.id, { autoDeployEnabled: checked })
                          }
                        />
                        <Label>Enable Auto Deploy</Label>
                      </div>
                    </div>

                    {/* Environment Variables */}
                    <div className="space-y-4">
                      <h4 className="font-medium text-octotask-elements-textPrimary">Environment Variables</h4>

                      <div className="space-y-3">
                        {selectedEnv.variables.map((variable, index) => (
                          <div
                            key={index}
                            className="flex items-center space-x-3 p-3 border border-octotask-elements-borderColor rounded-lg"
                          >
                            <div className="flex-1">
                              <div className="font-mono text-sm text-octotask-elements-textPrimary">{variable.key}</div>
                              <div className="text-xs text-octotask-elements-textSecondary">
                                {variable.isSecret ? "***" : variable.value}
                              </div>
                            </div>
                            {variable.isSecret && (
                              <Badge variant="warning" size="sm">
                                Secret
                              </Badge>
                            )}
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => removeVariable(selectedEnv.id, variable.key)}
                            >
                              <div className="i-ph:trash w-4 h-4" />
                            </Button>
                          </div>
                        ))}
                      </div>

                      {/* Add New Variable */}
                      <div className="border border-octotask-elements-borderColor rounded-lg p-4">
                        <h5 className="font-medium text-octotask-elements-textPrimary mb-3">Add Variable</h5>
                        <div className="grid grid-cols-2 gap-3 mb-3">
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
                        <div className="flex items-center justify-between">
                          <div className="flex items-center space-x-2">
                            <Switch
                              checked={newVariable.isSecret}
                              onCheckedChange={(checked) => setNewVariable({ ...newVariable, isSecret: checked })}
                            />
                            <Label>Secret</Label>
                          </div>
                          <Button
                            size="sm"
                            onClick={() => addVariable(selectedEnv.id)}
                            disabled={!newVariable.key || !newVariable.value}
                          >
                            Add Variable
                          </Button>
                        </div>
                      </div>
                    </div>
                  </div>
                </Tabs>
              )}
            </div>

            <div className="p-6 border-t border-octotask-elements-borderColor flex justify-end space-x-3">
              <Button variant="ghost" onClick={() => setIsDialogOpen(false)}>
                Cancel
              </Button>
              <Button onClick={() => setIsDialogOpen(false)}>Save Changes</Button>
            </div>
          </div>
        </div>
      </Dialog>
    </div>
  )
}

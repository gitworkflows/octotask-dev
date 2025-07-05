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
import { approvalStore } from "~/lib/stores/approval"
import { environmentStore } from "~/lib/stores/environment"
import { formatDistanceToNow } from "date-fns"

interface ApprovalRule {
  id: string
  name: string
  environmentId: string
  environmentType: string
  isEnabled: boolean
  approvalType: "manual" | "automatic" | "conditional"
  requiredApprovers: number
  approvers: ApprovalUser[]
  conditions: ApprovalCondition[]
  timeoutHours: number
  autoApproveOnTimeout: boolean
  createdAt: string
  updatedAt: string
}

interface ApprovalUser {
  id: string
  name: string
  email: string
  role: "admin" | "developer" | "reviewer"
}

interface ApprovalCondition {
  id: string
  type: "branch" | "time" | "tests" | "size" | "author"
  operator: "equals" | "contains" | "greater_than" | "less_than" | "in_range"
  value: string
  description: string
}

export function ApprovalGates() {
  const approvals = useStore(approvalStore.approvals)
  const environments = useStore(environmentStore.environments)
  const [selectedRule, setSelectedRule] = useState<ApprovalRule | null>(null)
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [isCreating, setIsCreating] = useState(false)
  const [newApprover, setNewApprover] = useState({ name: "", email: "", role: "developer" as const })
  const [newCondition, setNewCondition] = useState({
    type: "branch" as const,
    operator: "equals" as const,
    value: "",
    description: "",
  })

  useEffect(() => {
    approvalStore.loadFromStorage()
  }, [])

  const createApprovalRule = () => {
    const newRule: ApprovalRule = {
      id: Date.now().toString(),
      name: "New Approval Rule",
      environmentId: "",
      environmentType: "production",
      isEnabled: true,
      approvalType: "manual",
      requiredApprovers: 1,
      approvers: [],
      conditions: [],
      timeoutHours: 24,
      autoApproveOnTimeout: false,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    }

    approvalStore.addApprovalRule(newRule)
    setSelectedRule(newRule)
    setIsCreating(true)
    setIsDialogOpen(true)
  }

  const updateApprovalRule = (ruleId: string, updates: Partial<ApprovalRule>) => {
    approvalStore.updateApprovalRule(ruleId, {
      ...updates,
      updatedAt: new Date().toISOString(),
    })

    if (selectedRule?.id === ruleId) {
      setSelectedRule({ ...selectedRule, ...updates })
    }
  }

  const deleteApprovalRule = (ruleId: string) => {
    approvalStore.removeApprovalRule(ruleId)
    if (selectedRule?.id === ruleId) {
      setSelectedRule(null)
      setIsDialogOpen(false)
    }
  }

  const addApprover = () => {
    if (!selectedRule || !newApprover.name || !newApprover.email) return

    const approver: ApprovalUser = {
      id: Date.now().toString(),
      ...newApprover,
    }

    const updatedApprovers = [...selectedRule.approvers, approver]
    updateApprovalRule(selectedRule.id, { approvers: updatedApprovers })
    setNewApprover({ name: "", email: "", role: "developer" })
  }

  const removeApprover = (approverId: string) => {
    if (!selectedRule) return

    const updatedApprovers = selectedRule.approvers.filter((a) => a.id !== approverId)
    updateApprovalRule(selectedRule.id, { approvers: updatedApprovers })
  }

  const addCondition = () => {
    if (!selectedRule || !newCondition.value) return

    const condition: ApprovalCondition = {
      id: Date.now().toString(),
      ...newCondition,
    }

    const updatedConditions = [...selectedRule.conditions, condition]
    updateApprovalRule(selectedRule.id, { conditions: updatedConditions })
    setNewCondition({
      type: "branch",
      operator: "equals",
      value: "",
      description: "",
    })
  }

  const removeCondition = (conditionId: string) => {
    if (!selectedRule) return

    const updatedConditions = selectedRule.conditions.filter((c) => c.id !== conditionId)
    updateApprovalRule(selectedRule.id, { conditions: updatedConditions })
  }

  const getApprovalTypeColor = (type: ApprovalRule["approvalType"]) => {
    switch (type) {
      case "manual":
        return "bg-blue-100 text-blue-800"
      case "automatic":
        return "bg-green-100 text-green-800"
      case "conditional":
        return "bg-yellow-100 text-yellow-800"
      default:
        return "bg-gray-100 text-gray-800"
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

  const approvalRules = Object.values(approvals.rules || {})

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-octotask-elements-textPrimary">Approval Gates</h2>
          <p className="text-octotask-elements-textSecondary">
            Configure approval workflows for production deployments
          </p>
        </div>
        <Button onClick={createApprovalRule}>
          <div className="i-ph:plus w-4 h-4 mr-2" />
          Add Approval Rule
        </Button>
      </div>

      {/* Approval Rules */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {approvalRules.map((rule) => (
          <Card key={rule.id} className="p-6 hover:shadow-lg transition-shadow">
            <div className="flex items-start justify-between mb-4">
              <div>
                <h3 className="text-lg font-semibold text-octotask-elements-textPrimary">{rule.name}</h3>
                <div className="flex items-center space-x-2 mt-2">
                  <Badge className={getEnvironmentTypeColor(rule.environmentType)}>{rule.environmentType}</Badge>
                  <Badge className={getApprovalTypeColor(rule.approvalType)}>{rule.approvalType}</Badge>
                  <Badge variant={rule.isEnabled ? "success" : "secondary"}>
                    {rule.isEnabled ? "Enabled" : "Disabled"}
                  </Badge>
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
                      setSelectedRule(rule)
                      setIsCreating(false)
                      setIsDialogOpen(true)
                    }}
                  >
                    Edit Rule
                  </button>
                  <button
                    className="block w-full text-left px-4 py-2 text-sm text-octotask-elements-textPrimary hover:bg-octotask-elements-item-backgroundHover"
                    onClick={() => updateApprovalRule(rule.id, { isEnabled: !rule.isEnabled })}
                  >
                    {rule.isEnabled ? "Disable" : "Enable"}
                  </button>
                  <button
                    className="block w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-red-50"
                    onClick={() => deleteApprovalRule(rule.id)}
                  >
                    Delete
                  </button>
                </div>
              </Dropdown>
            </div>

            <div className="space-y-3 text-sm">
              <div className="flex items-center justify-between">
                <span className="text-octotask-elements-textSecondary">Required Approvers:</span>
                <span className="text-octotask-elements-textPrimary font-medium">{rule.requiredApprovers}</span>
              </div>

              <div className="flex items-center justify-between">
                <span className="text-octotask-elements-textSecondary">Total Approvers:</span>
                <span className="text-octotask-elements-textPrimary">{rule.approvers.length}</span>
              </div>

              <div className="flex items-center justify-between">
                <span className="text-octotask-elements-textSecondary">Conditions:</span>
                <span className="text-octotask-elements-textPrimary">{rule.conditions.length}</span>
              </div>

              <div className="flex items-center justify-between">
                <span className="text-octotask-elements-textSecondary">Timeout:</span>
                <span className="text-octotask-elements-textPrimary">{rule.timeoutHours}h</span>
              </div>

              {rule.autoApproveOnTimeout && (
                <div className="flex items-center justify-between">
                  <span className="text-octotask-elements-textSecondary">Auto-approve on timeout:</span>
                  <Badge variant="warning" size="sm">
                    Yes
                  </Badge>
                </div>
              )}
            </div>

            <div className="mt-4 pt-4 border-t border-octotask-elements-borderColor">
              <div className="flex items-center justify-between text-xs text-octotask-elements-textSecondary">
                <span>Created {formatDistanceToNow(new Date(rule.createdAt), { addSuffix: true })}</span>
                <span>Updated {formatDistanceToNow(new Date(rule.updatedAt), { addSuffix: true })}</span>
              </div>
            </div>
          </Card>
        ))}

        {approvalRules.length === 0 && (
          <div className="col-span-full">
            <Card className="p-12">
              <div className="text-center">
                <div className="w-16 h-16 bg-gray-100 rounded-lg flex items-center justify-center mx-auto mb-4">
                  <div className="i-ph:shield-check w-8 h-8 text-gray-400" />
                </div>
                <h3 className="text-lg font-semibold text-octotask-elements-textPrimary mb-2">No Approval Rules</h3>
                <p className="text-octotask-elements-textSecondary mb-4">
                  Create approval rules to control production deployments
                </p>
                <Button onClick={createApprovalRule}>
                  <div className="i-ph:plus w-4 h-4 mr-2" />
                  Create Approval Rule
                </Button>
              </div>
            </Card>
          </div>
        )}
      </div>

      {/* Approval Rule Configuration Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="bg-octotask-elements-background-depth-1 rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-hidden">
            <div className="p-6 border-b border-octotask-elements-borderColor">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold text-octotask-elements-textPrimary">
                  {isCreating ? "Create Approval Rule" : `Configure ${selectedRule?.name}`}
                </h3>
                <Button variant="ghost" size="sm" onClick={() => setIsDialogOpen(false)}>
                  <div className="i-ph:x w-4 h-4" />
                </Button>
              </div>
            </div>

            <div className="p-6 overflow-y-auto max-h-[calc(90vh-140px)]">
              {selectedRule && (
                <div className="space-y-8">
                  {/* General Settings */}
                  <div className="space-y-4">
                    <h4 className="text-base font-semibold text-octotask-elements-textPrimary">General Settings</h4>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <Label htmlFor="rule-name">Rule Name</Label>
                        <Input
                          id="rule-name"
                          value={selectedRule.name}
                          onChange={(e) => updateApprovalRule(selectedRule.id, { name: e.target.value })}
                          placeholder="Production Approval"
                        />
                      </div>

                      <div>
                        <Label htmlFor="environment-type">Environment Type</Label>
                        <select
                          id="environment-type"
                          value={selectedRule.environmentType}
                          onChange={(e) => updateApprovalRule(selectedRule.id, { environmentType: e.target.value })}
                          className="w-full px-3 py-2 border border-octotask-elements-borderColor rounded-md bg-octotask-elements-background-depth-1 text-octotask-elements-textPrimary"
                        >
                          <option value="production">Production</option>
                          <option value="staging">Staging</option>
                          <option value="preview">Preview</option>
                          <option value="development">Development</option>
                        </select>
                      </div>

                      <div>
                        <Label htmlFor="approval-type">Approval Type</Label>
                        <select
                          id="approval-type"
                          value={selectedRule.approvalType}
                          onChange={(e) => updateApprovalRule(selectedRule.id, { approvalType: e.target.value as any })}
                          className="w-full px-3 py-2 border border-octotask-elements-borderColor rounded-md bg-octotask-elements-background-depth-1 text-octotask-elements-textPrimary"
                        >
                          <option value="manual">Manual Approval</option>
                          <option value="automatic">Automatic Approval</option>
                          <option value="conditional">Conditional Approval</option>
                        </select>
                      </div>

                      <div>
                        <Label htmlFor="required-approvers">Required Approvers</Label>
                        <Input
                          id="required-approvers"
                          type="number"
                          min="1"
                          value={selectedRule.requiredApprovers}
                          onChange={(e) =>
                            updateApprovalRule(selectedRule.id, {
                              requiredApprovers: Number.parseInt(e.target.value) || 1,
                            })
                          }
                        />
                      </div>

                      <div>
                        <Label htmlFor="timeout-hours">Timeout (Hours)</Label>
                        <Input
                          id="timeout-hours"
                          type="number"
                          min="1"
                          max="168"
                          value={selectedRule.timeoutHours}
                          onChange={(e) =>
                            updateApprovalRule(selectedRule.id, { timeoutHours: Number.parseInt(e.target.value) || 24 })
                          }
                        />
                      </div>

                      <div>
                        <Label htmlFor="environment-select">Specific Environment</Label>
                        <select
                          id="environment-select"
                          value={selectedRule.environmentId}
                          onChange={(e) => updateApprovalRule(selectedRule.id, { environmentId: e.target.value })}
                          className="w-full px-3 py-2 border border-octotask-elements-borderColor rounded-md bg-octotask-elements-background-depth-1 text-octotask-elements-textPrimary"
                        >
                          <option value="">All environments of this type</option>
                          {Object.values(environments)
                            .filter((env) => env.type === selectedRule.environmentType)
                            .map((env) => (
                              <option key={env.id} value={env.id}>
                                {env.name}
                              </option>
                            ))}
                        </select>
                      </div>
                    </div>

                    <div className="flex items-center space-x-4">
                      <div className="flex items-center space-x-2">
                        <Switch
                          id="is-enabled"
                          checked={selectedRule.isEnabled}
                          onCheckedChange={(checked) => updateApprovalRule(selectedRule.id, { isEnabled: checked })}
                        />
                        <Label htmlFor="is-enabled">Rule Enabled</Label>
                      </div>

                      <div className="flex items-center space-x-2">
                        <Switch
                          id="auto-approve-timeout"
                          checked={selectedRule.autoApproveOnTimeout}
                          onCheckedChange={(checked) =>
                            updateApprovalRule(selectedRule.id, { autoApproveOnTimeout: checked })
                          }
                        />
                        <Label htmlFor="auto-approve-timeout">Auto-approve on timeout</Label>
                      </div>
                    </div>
                  </div>

                  {/* Approvers */}
                  <div className="space-y-4">
                    <h4 className="text-base font-semibold text-octotask-elements-textPrimary">Approvers</h4>

                    <div className="space-y-3 max-h-48 overflow-y-auto">
                      {selectedRule.approvers.map((approver) => (
                        <div
                          key={approver.id}
                          className="flex items-center justify-between p-3 border border-octotask-elements-borderColor rounded-lg"
                        >
                          <div className="flex items-center space-x-3">
                            <div className="w-8 h-8 bg-gray-100 rounded-full flex items-center justify-center">
                              <div className="i-ph:user w-4 h-4 text-gray-600" />
                            </div>
                            <div>
                              <div className="font-medium text-octotask-elements-textPrimary">{approver.name}</div>
                              <div className="text-sm text-octotask-elements-textSecondary">{approver.email}</div>
                            </div>
                          </div>
                          <div className="flex items-center space-x-2">
                            <Badge variant="secondary" size="sm">
                              {approver.role}
                            </Badge>
                            <Button size="sm" variant="ghost" onClick={() => removeApprover(approver.id)}>
                              <div className="i-ph:trash w-4 h-4 text-red-500" />
                            </Button>
                          </div>
                        </div>
                      ))}
                    </div>

                    {/* Add New Approver */}
                    <div className="border border-octotask-elements-borderColor rounded-lg p-4 bg-octotask-elements-background-depth-2">
                      <h5 className="font-medium text-octotask-elements-textPrimary mb-3">Add Approver</h5>
                      <div className="space-y-3">
                        <div className="grid grid-cols-2 gap-3">
                          <Input
                            placeholder="Full name"
                            value={newApprover.name}
                            onChange={(e) => setNewApprover({ ...newApprover, name: e.target.value })}
                          />
                          <Input
                            placeholder="Email address"
                            type="email"
                            value={newApprover.email}
                            onChange={(e) => setNewApprover({ ...newApprover, email: e.target.value })}
                          />
                        </div>
                        <div className="flex items-center justify-between">
                          <select
                            value={newApprover.role}
                            onChange={(e) => setNewApprover({ ...newApprover, role: e.target.value as any })}
                            className="px-3 py-2 border border-octotask-elements-borderColor rounded-md bg-octotask-elements-background-depth-1 text-octotask-elements-textPrimary"
                          >
                            <option value="developer">Developer</option>
                            <option value="reviewer">Reviewer</option>
                            <option value="admin">Admin</option>
                          </select>
                          <Button size="sm" onClick={addApprover} disabled={!newApprover.name || !newApprover.email}>
                            <div className="i-ph:plus w-4 h-4 mr-2" />
                            Add Approver
                          </Button>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Conditions */}
                  {selectedRule.approvalType === "conditional" && (
                    <div className="space-y-4">
                      <h4 className="text-base font-semibold text-octotask-elements-textPrimary">
                        Approval Conditions
                      </h4>

                      <div className="space-y-3 max-h-48 overflow-y-auto">
                        {selectedRule.conditions.map((condition) => (
                          <div
                            key={condition.id}
                            className="flex items-start justify-between p-3 border border-octotask-elements-borderColor rounded-lg"
                          >
                            <div className="flex-1">
                              <div className="flex items-center space-x-2 mb-1">
                                <Badge variant="secondary" size="sm">
                                  {condition.type}
                                </Badge>
                                <Badge variant="outline" size="sm">
                                  {condition.operator}
                                </Badge>
                              </div>
                              <div className="text-sm text-octotask-elements-textPrimary font-mono">
                                {condition.value}
                              </div>
                              {condition.description && (
                                <div className="text-xs text-octotask-elements-textSecondary mt-1">
                                  {condition.description}
                                </div>
                              )}
                            </div>
                            <Button size="sm" variant="ghost" onClick={() => removeCondition(condition.id)}>
                              <div className="i-ph:trash w-4 h-4 text-red-500" />
                            </Button>
                          </div>
                        ))}
                      </div>

                      {/* Add New Condition */}
                      <div className="border border-octotask-elements-borderColor rounded-lg p-4 bg-octotask-elements-background-depth-2">
                        <h5 className="font-medium text-octotask-elements-textPrimary mb-3">Add Condition</h5>
                        <div className="space-y-3">
                          <div className="grid grid-cols-3 gap-3">
                            <select
                              value={newCondition.type}
                              onChange={(e) => setNewCondition({ ...newCondition, type: e.target.value as any })}
                              className="px-3 py-2 border border-octotask-elements-borderColor rounded-md bg-octotask-elements-background-depth-1 text-octotask-elements-textPrimary"
                            >
                              <option value="branch">Branch</option>
                              <option value="time">Time</option>
                              <option value="tests">Tests</option>
                              <option value="size">Size</option>
                              <option value="author">Author</option>
                            </select>
                            <select
                              value={newCondition.operator}
                              onChange={(e) => setNewCondition({ ...newCondition, operator: e.target.value as any })}
                              className="px-3 py-2 border border-octotask-elements-borderColor rounded-md bg-octotask-elements-background-depth-1 text-octotask-elements-textPrimary"
                            >
                              <option value="equals">Equals</option>
                              <option value="contains">Contains</option>
                              <option value="greater_than">Greater Than</option>
                              <option value="less_than">Less Than</option>
                              <option value="in_range">In Range</option>
                            </select>
                            <Input
                              placeholder="Value"
                              value={newCondition.value}
                              onChange={(e) => setNewCondition({ ...newCondition, value: e.target.value })}
                            />
                          </div>
                          <Input
                            placeholder="Description (optional)"
                            value={newCondition.description}
                            onChange={(e) => setNewCondition({ ...newCondition, description: e.target.value })}
                          />
                          <div className="flex justify-end">
                            <Button size="sm" onClick={addCondition} disabled={!newCondition.value}>
                              <div className="i-ph:plus w-4 h-4 mr-2" />
                              Add Condition
                            </Button>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>

            <div className="p-6 border-t border-octotask-elements-borderColor flex justify-between">
              <div>
                {selectedRule && !isCreating && (
                  <Button
                    variant="ghost"
                    onClick={() => deleteApprovalRule(selectedRule.id)}
                    className="text-red-600 hover:text-red-700 hover:bg-red-50"
                  >
                    <div className="i-ph:trash w-4 h-4 mr-2" />
                    Delete Rule
                  </Button>
                )}
              </div>
              <div className="flex space-x-3">
                <Button variant="ghost" onClick={() => setIsDialogOpen(false)}>
                  Cancel
                </Button>
                <Button onClick={() => setIsDialogOpen(false)}>{isCreating ? "Create Rule" : "Save Changes"}</Button>
              </div>
            </div>
          </div>
        </div>
      </Dialog>
    </div>
  )
}

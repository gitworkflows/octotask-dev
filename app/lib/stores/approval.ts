import { map } from "nanostores"

export interface ApprovalUser {
  id: string
  name: string
  email: string
  role: "admin" | "developer" | "reviewer"
}

export interface ApprovalCondition {
  id: string
  type: "branch" | "time" | "tests" | "size" | "author"
  operator: "equals" | "contains" | "greater_than" | "less_than" | "in_range"
  value: string
  description: string
}

export interface ApprovalRule {
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

export interface ApprovalAction {
  id: string
  userId: string
  userName: string
  userEmail: string
  action: "approve" | "reject"
  comment: string
  timestamp: string
}

export interface ApprovalRequest {
  id: string
  deploymentId: string
  environmentId: string
  environmentType: string
  status: "pending" | "approved" | "rejected" | "expired"
  requiredApprovals: number
  approvals: ApprovalAction[]
  rules: string[]
  createdAt: string
  updatedAt: string
  expiresAt: string
}

export interface ApprovalNotification {
  id: string
  type: "approval_required" | "approval_approved" | "approval_rejected" | "approval_expired"
  title: string
  message: string
  requestId: string
  userId: string
  isRead: boolean
  createdAt: string
}

interface ApprovalState {
  rules: Record<string, ApprovalRule>
  requests: Record<string, ApprovalRequest>
  notifications: Record<string, ApprovalNotification>
}

class ApprovalStore {
  approvals = map<ApprovalState>({
    rules: {},
    requests: {},
    notifications: {},
  })

  // Approval Rules
  addApprovalRule(rule: ApprovalRule) {
    const current = this.approvals.get()
    this.approvals.set({
      ...current,
      rules: {
        ...current.rules,
        [rule.id]: rule,
      },
    })
    this.saveToStorage()
  }

  updateApprovalRule(id: string, updates: Partial<ApprovalRule>) {
    const current = this.approvals.get()
    const rule = current.rules[id]
    if (rule) {
      this.approvals.set({
        ...current,
        rules: {
          ...current.rules,
          [id]: {
            ...rule,
            ...updates,
            updatedAt: new Date().toISOString(),
          },
        },
      })
      this.saveToStorage()
    }
  }

  removeApprovalRule(id: string) {
    const current = this.approvals.get()
    const { [id]: removed, ...rules } = current.rules
    this.approvals.set({
      ...current,
      rules,
    })
    this.saveToStorage()
  }

  // Approval Requests
  createApprovalRequest(request: ApprovalRequest) {
    const current = this.approvals.get()
    this.approvals.set({
      ...current,
      requests: {
        ...current.requests,
        [request.id]: request,
      },
    })

    // Create notification for required approval
    this.addNotification({
      id: `approval-required-${request.id}`,
      type: "approval_required",
      title: "Approval Required",
      message: `Deployment to ${request.environmentType} requires your approval`,
      requestId: request.id,
      userId: "all", // This would be more specific in a real app
      isRead: false,
      createdAt: new Date().toISOString(),
    })

    this.saveToStorage()
  }

  updateApprovalRequest(id: string, updates: Partial<ApprovalRequest>) {
    const current = this.approvals.get()
    const request = current.requests[id]
    if (request) {
      const updatedRequest = {
        ...request,
        ...updates,
        updatedAt: new Date().toISOString(),
      }

      this.approvals.set({
        ...current,
        requests: {
          ...current.requests,
          [id]: updatedRequest,
        },
      })

      // Create status change notification
      if (updates.status && updates.status !== request.status) {
        this.addNotification({
          id: `approval-${updates.status}-${id}`,
          type: `approval_${updates.status}` as any,
          title: `Approval ${updates.status.charAt(0).toUpperCase() + updates.status.slice(1)}`,
          message: `Deployment approval has been ${updates.status}`,
          requestId: id,
          userId: "all",
          isRead: false,
          createdAt: new Date().toISOString(),
        })
      }

      this.saveToStorage()
    }
  }

  addApprovalToRequest(requestId: string, approval: ApprovalAction) {
    const current = this.approvals.get()
    const request = current.requests[requestId]
    if (request) {
      const updatedRequest = {
        ...request,
        approvals: [...request.approvals, approval],
        updatedAt: new Date().toISOString(),
      }

      this.approvals.set({
        ...current,
        requests: {
          ...current.requests,
          [requestId]: updatedRequest,
        },
      })
      this.saveToStorage()
    }
  }

  // Notifications
  addNotification(notification: ApprovalNotification) {
    const current = this.approvals.get()
    this.approvals.set({
      ...current,
      notifications: {
        ...current.notifications,
        [notification.id]: notification,
      },
    })
    this.saveToStorage()
  }

  markNotificationAsRead(id: string) {
    const current = this.approvals.get()
    const notification = current.notifications[id]
    if (notification) {
      this.approvals.set({
        ...current,
        notifications: {
          ...current.notifications,
          [id]: {
            ...notification,
            isRead: true,
          },
        },
      })
      this.saveToStorage()
    }
  }

  // Utility methods
  getApprovalRulesForEnvironment(environmentId: string, environmentType: string): ApprovalRule[] {
    const current = this.approvals.get()
    return Object.values(current.rules).filter(
      (rule) =>
        rule.isEnabled &&
        rule.environmentType === environmentType &&
        (rule.environmentId === "" || rule.environmentId === environmentId),
    )
  }

  getPendingApprovalRequests(): ApprovalRequest[] {
    const current = this.approvals.get()
    return Object.values(current.requests).filter((request) => request.status === "pending")
  }

  getUnreadNotifications(): ApprovalNotification[] {
    const current = this.approvals.get()
    return Object.values(current.notifications)
      .filter((notification) => !notification.isRead)
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
  }

  // Check if deployment needs approval
  requiresApproval(environmentId: string, environmentType: string): boolean {
    const rules = this.getApprovalRulesForEnvironment(environmentId, environmentType)
    return rules.length > 0
  }

  // Evaluate conditions for conditional approval
  evaluateConditions(conditions: ApprovalCondition[], deploymentData: any): boolean {
    return conditions.every((condition) => {
      switch (condition.type) {
        case "branch":
          return this.evaluateBranchCondition(condition, deploymentData.branch)
        case "time":
          return this.evaluateTimeCondition(condition)
        case "tests":
          return this.evaluateTestCondition(condition, deploymentData.testResults)
        case "size":
          return this.evaluateSizeCondition(condition, deploymentData.size)
        case "author":
          return this.evaluateAuthorCondition(condition, deploymentData.author)
        default:
          return true
      }
    })
  }

  private evaluateBranchCondition(condition: ApprovalCondition, branch: string): boolean {
    switch (condition.operator) {
      case "equals":
        return branch === condition.value
      case "contains":
        return branch.includes(condition.value)
      default:
        return true
    }
  }

  private evaluateTimeCondition(condition: ApprovalCondition): boolean {
    const now = new Date()
    const hour = now.getHours()

    switch (condition.operator) {
      case "greater_than":
        return hour > Number.parseInt(condition.value)
      case "less_than":
        return hour < Number.parseInt(condition.value)
      case "in_range":
        const [start, end] = condition.value.split("-").map(Number)
        return hour >= start && hour <= end
      default:
        return true
    }
  }

  private evaluateTestCondition(condition: ApprovalCondition, testResults: any): boolean {
    if (!testResults) return false

    switch (condition.operator) {
      case "greater_than":
        return testResults.coverage > Number.parseFloat(condition.value)
      case "equals":
        return testResults.status === condition.value
      default:
        return true
    }
  }

  private evaluateSizeCondition(condition: ApprovalCondition, size: number): boolean {
    const sizeInMB = size / (1024 * 1024)

    switch (condition.operator) {
      case "less_than":
        return sizeInMB < Number.parseFloat(condition.value)
      case "greater_than":
        return sizeInMB > Number.parseFloat(condition.value)
      default:
        return true
    }
  }

  private evaluateAuthorCondition(condition: ApprovalCondition, author: string): boolean {
    switch (condition.operator) {
      case "equals":
        return author === condition.value
      case "contains":
        return condition.value.split(",").includes(author)
      default:
        return true
    }
  }

  // Storage methods
  loadFromStorage() {
    if (typeof window === "undefined") return

    const stored = localStorage.getItem("octotask_approvals")
    if (stored) {
      try {
        const approvals = JSON.parse(stored)
        this.approvals.set(approvals)
      } catch (error) {
        console.error("Failed to load approvals from storage:", error)
      }
    }
  }

  saveToStorage() {
    if (typeof window === "undefined") return

    try {
      localStorage.setItem("octotask_approvals", JSON.stringify(this.approvals.get()))
    } catch (error) {
      console.error("Failed to save approvals to storage:", error)
    }
  }

  // Create default approval rules
  createDefaultApprovalRules() {
    const defaultRules: ApprovalRule[] = [
      {
        id: "prod-approval-" + Date.now(),
        name: "Production Deployment Approval",
        environmentId: "",
        environmentType: "production",
        isEnabled: true,
        approvalType: "manual",
        requiredApprovers: 2,
        approvers: [
          {
            id: "admin-1",
            name: "Admin User",
            email: "admin@example.com",
            role: "admin",
          },
          {
            id: "reviewer-1",
            name: "Senior Developer",
            email: "senior@example.com",
            role: "reviewer",
          },
        ],
        conditions: [],
        timeoutHours: 24,
        autoApproveOnTimeout: false,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
      {
        id: "staging-approval-" + Date.now(),
        name: "Staging Deployment Approval",
        environmentId: "",
        environmentType: "staging",
        isEnabled: true,
        approvalType: "conditional",
        requiredApprovers: 1,
        approvers: [
          {
            id: "reviewer-1",
            name: "Senior Developer",
            email: "senior@example.com",
            role: "reviewer",
          },
        ],
        conditions: [
          {
            id: "branch-condition",
            type: "branch",
            operator: "equals",
            value: "main",
            description: "Only main branch deployments require approval",
          },
        ],
        timeoutHours: 12,
        autoApproveOnTimeout: true,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
    ]

    defaultRules.forEach((rule) => {
      this.addApprovalRule(rule)
    })
  }
}

export const approvalStore = new ApprovalStore()

// Auto-save to localStorage when approvals change
approvalStore.approvals.subscribe(() => {
  approvalStore.saveToStorage()
})

// Load from localStorage on initialization
if (typeof window !== "undefined") {
  approvalStore.loadFromStorage()
}

"use client"

import { useState } from "react"
import { useStore } from "@nanostores/react"
import { Card } from "~/components/ui/Card"
import { Badge } from "~/components/ui/Badge"
import { Button } from "~/components/ui/Button"
import { Input } from "~/components/ui/Input"
import { approvalStore } from "~/lib/stores/approval"
import { environmentStore } from "~/lib/stores/environment"
import { formatDistanceToNow } from "date-fns"
import { classNames } from "~/utils/classNames"

export function ApprovalHistory() {
  const approvals = useStore(approvalStore.approvals)
  const environments = useStore(environmentStore.environments)
  const [searchTerm, setSearchTerm] = useState("")
  const [statusFilter, setStatusFilter] = useState<string>("all")
  const [environmentFilter, setEnvironmentFilter] = useState<string>("all")

  const requests = Object.values(approvals.requests || {})
  const filteredRequests = requests.filter((request) => {
    const matchesSearch = request.deploymentId.toLowerCase().includes(searchTerm.toLowerCase())
    const matchesStatus = statusFilter === "all" || request.status === statusFilter
    const matchesEnvironment = environmentFilter === "all" || request.environmentType === environmentFilter
    return matchesSearch && matchesStatus && matchesEnvironment
  })

  const sortedRequests = filteredRequests.sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
  )

  const getStatusColor = (status: string) => {
    switch (status) {
      case "approved":
        return "text-green-600"
      case "rejected":
        return "text-red-600"
      case "expired":
        return "text-gray-600"
      default:
        return "text-yellow-600"
    }
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "approved":
        return "i-ph:check-circle"
      case "rejected":
        return "i-ph:x-circle"
      case "expired":
        return "i-ph:clock-countdown"
      default:
        return "i-ph:clock"
    }
  }

  const getStatusBadgeVariant = (status: string) => {
    switch (status) {
      case "approved":
        return "success" as const
      case "rejected":
        return "error" as const
      case "expired":
        return "secondary" as const
      default:
        return "warning" as const
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

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-octotask-elements-textPrimary">Approval History</h2>
          <p className="text-octotask-elements-textSecondary">View and manage deployment approval requests</p>
        </div>
      </div>

      {/* Filters */}
      <Card className="p-6">
        <div className="flex flex-col md:flex-row gap-4">
          <div className="flex-1">
            <Input
              placeholder="Search by deployment ID..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full"
            />
          </div>
          <div className="flex gap-4">
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="px-3 py-2 border border-octotask-elements-borderColor rounded-md bg-octotask-elements-background-depth-1 text-octotask-elements-textPrimary"
            >
              <option value="all">All Status</option>
              <option value="pending">Pending</option>
              <option value="approved">Approved</option>
              <option value="rejected">Rejected</option>
              <option value="expired">Expired</option>
            </select>
            <select
              value={environmentFilter}
              onChange={(e) => setEnvironmentFilter(e.target.value)}
              className="px-3 py-2 border border-octotask-elements-borderColor rounded-md bg-octotask-elements-background-depth-1 text-octotask-elements-textPrimary"
            >
              <option value="all">All Environments</option>
              <option value="production">Production</option>
              <option value="staging">Staging</option>
              <option value="preview">Preview</option>
              <option value="development">Development</option>
            </select>
          </div>
        </div>
      </Card>

      {/* Approval Requests */}
      <div className="space-y-4">
        {sortedRequests.map((request) => {
          const environment = environments[request.environmentId]
          const approvedCount = request.approvals.filter((a) => a.action === "approve").length
          const rejectedCount = request.approvals.filter((a) => a.action === "reject").length
          const isExpired = new Date() > new Date(request.expiresAt)

          return (
            <Card key={request.id} className="p-6">
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center space-x-4">
                  <div
                    className={classNames(
                      "w-10 h-10 rounded-lg flex items-center justify-center",
                      request.status === "approved"
                        ? "bg-green-100"
                        : request.status === "rejected"
                          ? "bg-red-100"
                          : isExpired
                            ? "bg-gray-100"
                            : "bg-yellow-100",
                    )}
                  >
                    <div
                      className={classNames(
                        "w-5 h-5",
                        getStatusIcon(isExpired ? "expired" : request.status),
                        getStatusColor(isExpired ? "expired" : request.status),
                      )}
                    />
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold text-octotask-elements-textPrimary">
                      Deployment {request.deploymentId.slice(0, 8)}
                    </h3>
                    <div className="flex items-center space-x-2 mt-1">
                      <Badge className={getEnvironmentTypeColor(request.environmentType)}>
                        {request.environmentType}
                      </Badge>
                      {environment && (
                        <Badge variant="outline" size="sm">
                          {environment.name}
                        </Badge>
                      )}
                    </div>
                  </div>
                </div>
                <div className="text-right">
                  <Badge variant={getStatusBadgeVariant(isExpired ? "expired" : request.status)}>
                    {isExpired ? "Expired" : request.status}
                  </Badge>
                  <div className="text-sm text-octotask-elements-textSecondary mt-1">
                    {formatDistanceToNow(new Date(request.createdAt), { addSuffix: true })}
                  </div>
                </div>
              </div>

              {/* Progress Bar */}
              <div className="mb-4">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm text-octotask-elements-textSecondary">Approval Progress</span>
                  <span className="text-sm text-octotask-elements-textSecondary">
                    {approvedCount} of {request.requiredApprovals} required
                  </span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div
                    className={classNames(
                      "h-2 rounded-full transition-all",
                      request.status === "approved"
                        ? "bg-green-500"
                        : request.status === "rejected"
                          ? "bg-red-500"
                          : "bg-yellow-500",
                    )}
                    style={{
                      width: `${Math.min((approvedCount / request.requiredApprovals) * 100, 100)}%`,
                    }}
                  />
                </div>
              </div>

              {/* Request Details */}
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-4 text-sm">
                <div>
                  <span className="text-octotask-elements-textSecondary">Required Approvals:</span>
                  <span className="ml-2 text-octotask-elements-textPrimary font-medium">
                    {request.requiredApprovals}
                  </span>
                </div>
                <div>
                  <span className="text-octotask-elements-textSecondary">Approved:</span>
                  <span className="ml-2 text-green-600 font-medium">{approvedCount}</span>
                </div>
                <div>
                  <span className="text-octotask-elements-textSecondary">Rejected:</span>
                  <span className="ml-2 text-red-600 font-medium">{rejectedCount}</span>
                </div>
                <div>
                  <span className="text-octotask-elements-textSecondary">Expires:</span>
                  <span
                    className={classNames(
                      "ml-2 font-medium",
                      isExpired ? "text-red-600" : "text-octotask-elements-textPrimary",
                    )}
                  >
                    {formatDistanceToNow(new Date(request.expiresAt), { addSuffix: true })}
                  </span>
                </div>
              </div>

              {/* Approval Actions */}
              {request.approvals.length > 0 && (
                <div className="border-t border-octotask-elements-borderColor pt-4">
                  <h4 className="font-medium text-octotask-elements-textPrimary mb-3">Approval Actions</h4>
                  <div className="space-y-3">
                    {request.approvals.map((approval) => (
                      <div key={approval.id} className="flex items-start space-x-3">
                        <div
                          className={classNames(
                            "w-6 h-6 rounded-full flex items-center justify-center",
                            approval.action === "approve" ? "bg-green-100" : "bg-red-100",
                          )}
                        >
                          <div
                            className={classNames(
                              "w-3 h-3",
                              approval.action === "approve" ? "i-ph:check text-green-600" : "i-ph:x text-red-600",
                            )}
                          />
                        </div>
                        <div className="flex-1">
                          <div className="flex items-center justify-between">
                            <span className="font-medium text-octotask-elements-textPrimary">{approval.userName}</span>
                            <span className="text-sm text-octotask-elements-textSecondary">
                              {formatDistanceToNow(new Date(approval.timestamp), { addSuffix: true })}
                            </span>
                          </div>
                          <div className="text-sm text-octotask-elements-textSecondary">{approval.userEmail}</div>
                          {approval.comment && (
                            <div className="text-sm text-octotask-elements-textPrimary bg-octotask-elements-background-depth-2 p-2 rounded mt-2">
                              {approval.comment}
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </Card>
          )
        })}

        {sortedRequests.length === 0 && (
          <Card className="p-12">
            <div className="text-center">
              <div className="w-16 h-16 bg-gray-100 rounded-lg flex items-center justify-center mx-auto mb-4">
                <div className="i-ph:clock-countdown w-8 h-8 text-gray-400" />
              </div>
              <h3 className="text-lg font-semibold text-octotask-elements-textPrimary mb-2">No Approval Requests</h3>
              <p className="text-octotask-elements-textSecondary">
                {searchTerm || statusFilter !== "all" || environmentFilter !== "all"
                  ? "No approval requests match your current filters"
                  : "No approval requests have been created yet"}
              </p>
              {(searchTerm || statusFilter !== "all" || environmentFilter !== "all") && (
                <Button
                  variant="ghost"
                  onClick={() => {
                    setSearchTerm("")
                    setStatusFilter("all")
                    setEnvironmentFilter("all")
                  }}
                  className="mt-4"
                >
                  Clear Filters
                </Button>
              )}
            </div>
          </Card>
        )}
      </div>
    </div>
  )
}

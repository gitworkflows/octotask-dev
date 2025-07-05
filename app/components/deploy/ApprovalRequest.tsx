"use client"

import { useState, useEffect } from "react"
import { useStore } from "@nanostores/react"
import { Card } from "~/components/ui/Card"
import { Button } from "~/components/ui/Button"
import { Badge } from "~/components/ui/Badge"
import { Label } from "~/components/ui/Label"
import { Dialog } from "~/components/ui/Dialog"
import { approvalStore } from "~/lib/stores/approval"
import { environmentStore } from "~/lib/stores/environment"
import { formatDistanceToNow } from "date-fns"
import { classNames } from "~/utils/classNames"

interface ApprovalRequestProps {
  deploymentId: string
  environmentId: string
  onApprovalComplete?: (approved: boolean) => void
}

export function ApprovalRequest({ deploymentId, environmentId, onApprovalComplete }: ApprovalRequestProps) {
  const approvals = useStore(approvalStore.approvals)
  const environments = useStore(environmentStore.environments)
  const [comment, setComment] = useState("")
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [showCommentDialog, setShowCommentDialog] = useState(false)
  const [pendingAction, setPendingAction] = useState<"approve" | "reject" | null>(null)

  const environment = environments[environmentId]
  const request = approvals.requests?.[deploymentId]
  const applicableRules = Object.values(approvals.rules || {}).filter(
    (rule) =>
      rule.isEnabled &&
      rule.environmentType === environment?.type &&
      (rule.environmentId === "" || rule.environmentId === environmentId),
  )

  useEffect(() => {
    if (!request && applicableRules.length > 0) {
      // Create approval request if rules exist and no request exists
      approvalStore.createApprovalRequest({
        id: deploymentId,
        deploymentId,
        environmentId,
        environmentType: environment?.type || "production",
        status: "pending",
        requiredApprovals: Math.max(...applicableRules.map((r) => r.requiredApprovers)),
        approvals: [],
        rules: applicableRules.map((r) => r.id),
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        expiresAt: new Date(
          Date.now() + Math.min(...applicableRules.map((r) => r.timeoutHours)) * 60 * 60 * 1000,
        ).toISOString(),
      })
    }
  }, [deploymentId, environmentId, environment, applicableRules, request])

  if (applicableRules.length === 0) {
    return null // No approval rules, deployment can proceed
  }

  if (!request) {
    return (
      <Card className="p-6">
        <div className="text-center">
          <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center mx-auto mb-4">
            <div className="i-ph:spinner w-6 h-6 text-blue-600 animate-spin" />
          </div>
          <h3 className="text-lg font-semibold text-octotask-elements-textPrimary mb-2">Creating Approval Request</h3>
          <p className="text-octotask-elements-textSecondary">Setting up approval workflow...</p>
        </div>
      </Card>
    )
  }

  const handleApprovalAction = async (action: "approve" | "reject") => {
    if (!comment.trim() && action === "reject") {
      setPendingAction(action)
      setShowCommentDialog(true)
      return
    }

    setIsSubmitting(true)

    try {
      const approval = {
        id: Date.now().toString(),
        userId: "current-user", // This would come from auth context
        userName: "Current User", // This would come from auth context
        userEmail: "user@example.com", // This would come from auth context
        action,
        comment: comment.trim(),
        timestamp: new Date().toISOString(),
      }

      approvalStore.addApprovalToRequest(deploymentId, approval)

      // Check if approval is complete
      const updatedRequest = approvalStore.approvals.get().requests?.[deploymentId]
      if (updatedRequest) {
        const approvedCount = updatedRequest.approvals.filter((a) => a.action === "approve").length
        const rejectedCount = updatedRequest.approvals.filter((a) => a.action === "reject").length

        if (rejectedCount > 0) {
          approvalStore.updateApprovalRequest(deploymentId, { status: "rejected" })
          onApprovalComplete?.(false)
        } else if (approvedCount >= updatedRequest.requiredApprovals) {
          approvalStore.updateApprovalRequest(deploymentId, { status: "approved" })
          onApprovalComplete?.(true)
        }
      }

      setComment("")
      setShowCommentDialog(false)
      setPendingAction(null)
    } catch (error) {
      console.error("Failed to submit approval:", error)
    } finally {
      setIsSubmitting(false)
    }
  }

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

  const isExpired = new Date() > new Date(request.expiresAt)
  const currentUserHasApproved = request.approvals.some((a) => a.userId === "current-user")
  const approvedCount = request.approvals.filter((a) => a.action === "approve").length
  const rejectedCount = request.approvals.filter((a) => a.action === "reject").length

  return (
    <div className="space-y-6">
      <Card className="p-6">
        <div className="flex items-start justify-between mb-6">
          <div className="flex items-center space-x-4">
            <div
              className={classNames(
                "w-12 h-12 rounded-lg flex items-center justify-center",
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
                  "w-6 h-6",
                  getStatusIcon(isExpired ? "expired" : request.status),
                  getStatusColor(isExpired ? "expired" : request.status),
                )}
              />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-octotask-elements-textPrimary">Deployment Approval Required</h3>
              <p className="text-octotask-elements-textSecondary">
                {environment?.name} ({environment?.type}) deployment needs approval
              </p>
            </div>
          </div>
          <Badge
            variant={
              request.status === "approved"
                ? "success"
                : request.status === "rejected"
                  ? "error"
                  : isExpired
                    ? "secondary"
                    : "warning"
            }
          >
            {isExpired ? "Expired" : request.status}
          </Badge>
        </div>

        {/* Progress */}
        <div className="mb-6">
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

        {/* Details */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
          <div>
            <h4 className="font-medium text-octotask-elements-textPrimary mb-2">Request Details</h4>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-octotask-elements-textSecondary">Environment:</span>
                <span className="text-octotask-elements-textPrimary">{environment?.name}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-octotask-elements-textSecondary">Type:</span>
                <span className="text-octotask-elements-textPrimary capitalize">{environment?.type}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-octotask-elements-textSecondary">Required:</span>
                <span className="text-octotask-elements-textPrimary">{request.requiredApprovals} approvals</span>
              </div>
            </div>
          </div>

          <div>
            <h4 className="font-medium text-octotask-elements-textPrimary mb-2">Timeline</h4>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-octotask-elements-textSecondary">Created:</span>
                <span className="text-octotask-elements-textPrimary">
                  {formatDistanceToNow(new Date(request.createdAt), { addSuffix: true })}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-octotask-elements-textSecondary">Expires:</span>
                <span className={classNames("text-octotask-elements-textPrimary", isExpired && "text-red-600")}>
                  {formatDistanceToNow(new Date(request.expiresAt), { addSuffix: true })}
                </span>
              </div>
            </div>
          </div>

          <div>
            <h4 className="font-medium text-octotask-elements-textPrimary mb-2">Status</h4>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-octotask-elements-textSecondary">Approved:</span>
                <span className="text-green-600 font-medium">{approvedCount}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-octotask-elements-textSecondary">Rejected:</span>
                <span className="text-red-600 font-medium">{rejectedCount}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Actions */}
        {request.status === "pending" && !isExpired && !currentUserHasApproved && (
          <div className="flex items-center space-x-4 pt-4 border-t border-octotask-elements-borderColor">
            <Button
              onClick={() => handleApprovalAction("approve")}
              disabled={isSubmitting}
              className="bg-green-600 hover:bg-green-700 text-white"
            >
              <div className="i-ph:check w-4 h-4 mr-2" />
              Approve Deployment
            </Button>
            <Button
              onClick={() => handleApprovalAction("reject")}
              disabled={isSubmitting}
              variant="ghost"
              className="text-red-600 hover:text-red-700 hover:bg-red-50"
            >
              <div className="i-ph:x w-4 h-4 mr-2" />
              Reject Deployment
            </Button>
          </div>
        )}

        {currentUserHasApproved && (
          <div className="pt-4 border-t border-octotask-elements-borderColor">
            <div className="flex items-center space-x-2 text-sm text-octotask-elements-textSecondary">
              <div className="i-ph:check-circle w-4 h-4 text-green-600" />
              You have already provided your approval for this deployment
            </div>
          </div>
        )}
      </Card>

      {/* Approval History */}
      {request.approvals.length > 0 && (
        <Card className="p-6">
          <h4 className="font-medium text-octotask-elements-textPrimary mb-4">Approval History</h4>
          <div className="space-y-4">
            {request.approvals.map((approval) => (
              <div
                key={approval.id}
                className="flex items-start space-x-4 p-4 border border-octotask-elements-borderColor rounded-lg"
              >
                <div
                  className={classNames(
                    "w-8 h-8 rounded-full flex items-center justify-center",
                    approval.action === "approve" ? "bg-green-100" : "bg-red-100",
                  )}
                >
                  <div
                    className={classNames(
                      "w-4 h-4",
                      approval.action === "approve" ? "i-ph:check text-green-600" : "i-ph:x text-red-600",
                    )}
                  />
                </div>
                <div className="flex-1">
                  <div className="flex items-center justify-between mb-1">
                    <span className="font-medium text-octotask-elements-textPrimary">{approval.userName}</span>
                    <span className="text-sm text-octotask-elements-textSecondary">
                      {formatDistanceToNow(new Date(approval.timestamp), { addSuffix: true })}
                    </span>
                  </div>
                  <div className="text-sm text-octotask-elements-textSecondary mb-1">{approval.userEmail}</div>
                  {approval.comment && (
                    <div className="text-sm text-octotask-elements-textPrimary bg-octotask-elements-background-depth-2 p-2 rounded">
                      {approval.comment}
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* Comment Dialog */}
      <Dialog open={showCommentDialog} onOpenChange={setShowCommentDialog}>
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="bg-octotask-elements-background-depth-1 rounded-lg shadow-xl max-w-md w-full">
            <div className="p-6 border-b border-octotask-elements-borderColor">
              <h3 className="text-lg font-semibold text-octotask-elements-textPrimary">
                {pendingAction === "approve" ? "Approve Deployment" : "Reject Deployment"}
              </h3>
            </div>

            <div className="p-6">
              <div className="space-y-4">
                <div>
                  <Label htmlFor="approval-comment">
                    Comment {pendingAction === "reject" && <span className="text-red-500">*</span>}
                  </Label>
                  <textarea
                    id="approval-comment"
                    value={comment}
                    onChange={(e) => setComment(e.target.value)}
                    placeholder={
                      pendingAction === "approve"
                        ? "Optional comment about your approval..."
                        : "Please explain why you're rejecting this deployment..."
                    }
                    className="w-full px-3 py-2 border border-octotask-elements-borderColor rounded-md bg-octotask-elements-background-depth-1 text-octotask-elements-textPrimary resize-none"
                    rows={4}
                  />
                </div>
              </div>
            </div>

            <div className="p-6 border-t border-octotask-elements-borderColor flex justify-end space-x-3">
              <Button variant="ghost" onClick={() => setShowCommentDialog(false)} disabled={isSubmitting}>
                Cancel
              </Button>
              <Button
                onClick={() => pendingAction && handleApprovalAction(pendingAction)}
                disabled={isSubmitting || (pendingAction === "reject" && !comment.trim())}
                className={
                  pendingAction === "approve"
                    ? "bg-green-600 hover:bg-green-700 text-white"
                    : "bg-red-600 hover:bg-red-700 text-white"
                }
              >
                {isSubmitting ? (
                  <>
                    <div className="i-ph:spinner w-4 h-4 mr-2 animate-spin" />
                    Submitting...
                  </>
                ) : (
                  <>
                    <div className={`w-4 h-4 mr-2 ${pendingAction === "approve" ? "i-ph:check" : "i-ph:x"}`} />
                    {pendingAction === "approve" ? "Approve" : "Reject"}
                  </>
                )}
              </Button>
            </div>
          </div>
        </div>
      </Dialog>
    </div>
  )
}

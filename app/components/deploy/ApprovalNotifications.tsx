"use client"

import { useState } from "react"
import { useStore } from "@nanostores/react"
import { Badge } from "~/components/ui/Badge"
import { Button } from "~/components/ui/Button"
import { Dialog } from "~/components/ui/Dialog"
import { approvalStore } from "~/lib/stores/approval"
import { formatDistanceToNow } from "date-fns"
import { classNames } from "~/utils/classNames"

export function ApprovalNotifications() {
  const approvals = useStore(approvalStore.approvals)
  const [isOpen, setIsOpen] = useState(false)
  const [selectedNotification, setSelectedNotification] = useState<string | null>(null)

  const notifications = Object.values(approvals.notifications || {})
  const unreadNotifications = notifications.filter((n) => !n.isRead)
  const sortedNotifications = notifications.sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
  )

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case "approval_required":
        return "i-ph:clock"
      case "approval_approved":
        return "i-ph:check-circle"
      case "approval_rejected":
        return "i-ph:x-circle"
      case "approval_expired":
        return "i-ph:clock-countdown"
      default:
        return "i-ph:bell"
    }
  }

  const getNotificationColor = (type: string) => {
    switch (type) {
      case "approval_required":
        return "text-yellow-600"
      case "approval_approved":
        return "text-green-600"
      case "approval_rejected":
        return "text-red-600"
      case "approval_expired":
        return "text-gray-600"
      default:
        return "text-blue-600"
    }
  }

  const markAsRead = (notificationId: string) => {
    approvalStore.markNotificationAsRead(notificationId)
  }

  const markAllAsRead = () => {
    unreadNotifications.forEach((notification) => {
      approvalStore.markNotificationAsRead(notification.id)
    })
  }

  return (
    <>
      {/* Notification Bell */}
      <div className="relative">
        <Button variant="ghost" size="sm" onClick={() => setIsOpen(true)} className="relative">
          <div className="i-ph:bell w-5 h-5" />
          {unreadNotifications.length > 0 && (
            <div className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 text-white text-xs rounded-full flex items-center justify-center">
              {unreadNotifications.length > 9 ? "9+" : unreadNotifications.length}
            </div>
          )}
        </Button>
      </div>

      {/* Notifications Dialog */}
      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="bg-octotask-elements-background-depth-1 rounded-lg shadow-xl max-w-2xl w-full max-h-[80vh] overflow-hidden">
            <div className="p-6 border-b border-octotask-elements-borderColor">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-lg font-semibold text-octotask-elements-textPrimary">Approval Notifications</h3>
                  <p className="text-sm text-octotask-elements-textSecondary">
                    {unreadNotifications.length} unread notifications
                  </p>
                </div>
                <div className="flex items-center space-x-2">
                  {unreadNotifications.length > 0 && (
                    <Button size="sm" variant="ghost" onClick={markAllAsRead}>
                      Mark All Read
                    </Button>
                  )}
                  <Button variant="ghost" size="sm" onClick={() => setIsOpen(false)}>
                    <div className="i-ph:x w-4 h-4" />
                  </Button>
                </div>
              </div>
            </div>

            <div className="overflow-y-auto max-h-[calc(80vh-120px)]">
              {sortedNotifications.length > 0 ? (
                <div className="divide-y divide-octotask-elements-borderColor">
                  {sortedNotifications.map((notification) => (
                    <div
                      key={notification.id}
                      className={classNames(
                        "p-4 hover:bg-octotask-elements-item-backgroundHover transition-colors cursor-pointer",
                        !notification.isRead && "bg-blue-50/50",
                      )}
                      onClick={() => {
                        if (!notification.isRead) {
                          markAsRead(notification.id)
                        }
                        setSelectedNotification(notification.id)
                      }}
                    >
                      <div className="flex items-start space-x-3">
                        <div
                          className={classNames(
                            "w-8 h-8 rounded-full flex items-center justify-center",
                            notification.type === "approval_required"
                              ? "bg-yellow-100"
                              : notification.type === "approval_approved"
                                ? "bg-green-100"
                                : notification.type === "approval_rejected"
                                  ? "bg-red-100"
                                  : "bg-gray-100",
                          )}
                        >
                          <div
                            className={classNames(
                              "w-4 h-4",
                              getNotificationIcon(notification.type),
                              getNotificationColor(notification.type),
                            )}
                          />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between">
                            <h4 className="font-medium text-octotask-elements-textPrimary truncate">
                              {notification.title}
                            </h4>
                            <div className="flex items-center space-x-2 ml-2">
                              {!notification.isRead && <div className="w-2 h-2 bg-blue-500 rounded-full" />}
                              <span className="text-xs text-octotask-elements-textSecondary whitespace-nowrap">
                                {formatDistanceToNow(new Date(notification.createdAt), { addSuffix: true })}
                              </span>
                            </div>
                          </div>
                          <p className="text-sm text-octotask-elements-textSecondary mt-1">{notification.message}</p>
                          <div className="flex items-center space-x-2 mt-2">
                            <Badge
                              variant={
                                notification.type === "approval_required"
                                  ? "warning"
                                  : notification.type === "approval_approved"
                                    ? "success"
                                    : notification.type === "approval_rejected"
                                      ? "error"
                                      : "secondary"
                              }
                              size="sm"
                            >
                              {notification.type.replace("approval_", "").replace("_", " ")}
                            </Badge>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="p-12 text-center">
                  <div className="w-16 h-16 bg-gray-100 rounded-lg flex items-center justify-center mx-auto mb-4">
                    <div className="i-ph:bell-slash w-8 h-8 text-gray-400" />
                  </div>
                  <h3 className="text-lg font-semibold text-octotask-elements-textPrimary mb-2">No Notifications</h3>
                  <p className="text-octotask-elements-textSecondary">
                    You'll see approval notifications here when they're available
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      </Dialog>
    </>
  )
}

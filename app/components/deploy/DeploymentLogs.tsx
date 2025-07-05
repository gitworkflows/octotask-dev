"use client"

import { useState, useEffect, useRef } from "react"
import { useStore } from "@nanostores/react"
import { Card } from "~/components/ui/Card"
import { Button } from "~/components/ui/Button"
import { Badge } from "~/components/ui/Badge"
import { Switch } from "~/components/ui/Switch"
import { Label } from "~/components/ui/Label"
import { deploymentStore } from "~/lib/stores/deployment"
import { classNames } from "~/utils/classNames"

interface DeploymentLogsProps {
  deploymentId: string
  isLive?: boolean
}

interface LogEntry {
  timestamp: string
  level: "info" | "warn" | "error" | "debug"
  message: string
  source?: string
}

export function DeploymentLogs({ deploymentId, isLive = false }: DeploymentLogsProps) {
  const deployments = useStore(deploymentStore.deployments)
  const [logs, setLogs] = useState<LogEntry[]>([])
  const [isAutoScroll, setIsAutoScroll] = useState(true)
  const [filter, setFilter] = useState<string>("all")
  const [isFollowing, setIsFollowing] = useState(isLive)
  const logsEndRef = useRef<HTMLDivElement>(null)
  const logsContainerRef = useRef<HTMLDivElement>(null)

  const deployment = deployments[deploymentId]

  useEffect(() => {
    if (deployment?.logs) {
      // Convert simple logs to structured format
      const structuredLogs: LogEntry[] = deployment.logs.map((log, index) => ({
        timestamp: new Date(Date.now() - (deployment.logs!.length - index) * 1000).toISOString(),
        level: detectLogLevel(log),
        message: log,
        source: "build",
      }))
      setLogs(structuredLogs)
    }
  }, [deployment?.logs])

  useEffect(() => {
    if (isFollowing && isLive) {
      // Simulate live log streaming
      const interval = setInterval(() => {
        if (deployment?.status === "building" || deployment?.status === "deploying") {
          const newLog: LogEntry = {
            timestamp: new Date().toISOString(),
            level: "info",
            message: generateMockLogMessage(),
            source: "build",
          }
          setLogs((prev) => [...prev, newLog])
        }
      }, 2000)

      return () => clearInterval(interval)
    }
  }, [isFollowing, isLive, deployment?.status])

  useEffect(() => {
    if (isAutoScroll && logsEndRef.current) {
      logsEndRef.current.scrollIntoView({ behavior: "smooth" })
    }
  }, [logs, isAutoScroll])

  const detectLogLevel = (message: string): LogEntry["level"] => {
    const lowerMessage = message.toLowerCase()
    if (lowerMessage.includes("error") || lowerMessage.includes("failed")) return "error"
    if (lowerMessage.includes("warn") || lowerMessage.includes("warning")) return "warn"
    if (lowerMessage.includes("debug")) return "debug"
    return "info"
  }

  const generateMockLogMessage = (): string => {
    const messages = [
      "Installing dependencies...",
      "Building application...",
      "Optimizing assets...",
      "Running tests...",
      "Deploying to CDN...",
      "Updating DNS records...",
      "Deployment successful!",
    ]
    return messages[Math.floor(Math.random() * messages.length)]
  }

  const filteredLogs = logs.filter((log) => {
    if (filter === "all") return true
    return log.level === filter
  })

  const getLevelColor = (level: LogEntry["level"]) => {
    switch (level) {
      case "error":
        return "text-red-600 bg-red-50"
      case "warn":
        return "text-yellow-600 bg-yellow-50"
      case "debug":
        return "text-gray-600 bg-gray-50"
      default:
        return "text-blue-600 bg-blue-50"
    }
  }

  const getLevelIcon = (level: LogEntry["level"]) => {
    switch (level) {
      case "error":
        return "i-ph:x-circle"
      case "warn":
        return "i-ph:warning"
      case "debug":
        return "i-ph:bug"
      default:
        return "i-ph:info"
    }
  }

  const downloadLogs = () => {
    const logText = logs.map((log) => `[${log.timestamp}] ${log.level.toUpperCase()}: ${log.message}`).join("\n")

    const blob = new Blob([logText], { type: "text/plain" })
    const url = URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = `deployment-${deploymentId}-logs.txt`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  }

  const clearLogs = () => {
    setLogs([])
  }

  return (
    <Card className="p-6">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="text-lg font-semibold text-octotask-elements-textPrimary">Deployment Logs</h3>
          {deployment && (
            <p className="text-sm text-octotask-elements-textSecondary">
              {deployment.projectName} • {deployment.environment}
            </p>
          )}
        </div>
        <div className="flex items-center space-x-2">
          <Badge
            variant={deployment?.status === "success" ? "success" : deployment?.status === "failed" ? "error" : "info"}
          >
            {deployment?.status || "Unknown"}
          </Badge>
          <Button size="sm" variant="ghost" onClick={downloadLogs}>
            <div className="i-ph:download w-4 h-4" />
          </Button>
          <Button size="sm" variant="ghost" onClick={clearLogs}>
            <div className="i-ph:trash w-4 h-4" />
          </Button>
        </div>
      </div>

      {/* Controls */}
      <div className="flex items-center justify-between mb-4 p-3 bg-octotask-elements-background-depth-1 rounded-lg">
        <div className="flex items-center space-x-4">
          <div className="flex items-center space-x-2">
            <Switch id="auto-scroll" checked={isAutoScroll} onCheckedChange={setIsAutoScroll} />
            <Label htmlFor="auto-scroll" className="text-sm">
              Auto-scroll
            </Label>
          </div>

          {isLive && (
            <div className="flex items-center space-x-2">
              <Switch id="follow-logs" checked={isFollowing} onCheckedChange={setIsFollowing} />
              <Label htmlFor="follow-logs" className="text-sm">
                Follow logs
              </Label>
            </div>
          )}
        </div>

        <div className="flex items-center space-x-2">
          <span className="text-sm text-octotask-elements-textSecondary">Filter:</span>
          <select
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            className="px-2 py-1 border border-octotask-elements-borderColor rounded bg-octotask-elements-background-depth-1 text-octotask-elements-textPrimary text-sm"
          >
            <option value="all">All</option>
            <option value="info">Info</option>
            <option value="warn">Warnings</option>
            <option value="error">Errors</option>
            <option value="debug">Debug</option>
          </select>
        </div>
      </div>

      {/* Logs Display */}
      <div
        ref={logsContainerRef}
        className="bg-gray-900 text-gray-100 rounded-lg p-4 h-96 overflow-y-auto font-mono text-sm"
      >
        {filteredLogs.length > 0 ? (
          <div className="space-y-1">
            {filteredLogs.map((log, index) => (
              <div key={index} className="flex items-start space-x-3 py-1">
                <span className="text-gray-400 text-xs whitespace-nowrap">
                  {new Date(log.timestamp).toLocaleTimeString()}
                </span>
                <div className={classNames("w-4 h-4 mt-0.5", getLevelIcon(log.level))} />
                <span className={classNames("px-1 py-0.5 rounded text-xs font-medium", getLevelColor(log.level))}>
                  {log.level.toUpperCase()}
                </span>
                <span className="flex-1 text-gray-100">{log.message}</span>
                {log.source && <span className="text-gray-500 text-xs">[{log.source}]</span>}
              </div>
            ))}
            <div ref={logsEndRef} />
          </div>
        ) : (
          <div className="flex items-center justify-center h-full text-gray-400">
            <div className="text-center">
              <div className="i-ph:terminal-window w-12 h-12 mx-auto mb-2 opacity-50" />
              <p>No logs available</p>
              {isLive && isFollowing && <p className="text-sm mt-1">Waiting for new logs...</p>}
            </div>
          </div>
        )}
      </div>

      {/* Log Statistics */}
      <div className="mt-4 flex items-center justify-between text-sm text-octotask-elements-textSecondary">
        <div className="flex items-center space-x-4">
          <span>Total: {logs.length}</span>
          <span>Errors: {logs.filter((l) => l.level === "error").length}</span>
          <span>Warnings: {logs.filter((l) => l.level === "warn").length}</span>
        </div>
        {isLive && isFollowing && (
          <div className="flex items-center space-x-2">
            <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
            <span>Live</span>
          </div>
        )}
      </div>
    </Card>
  )
}

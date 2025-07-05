"use client"

import { useState } from "react"
import { Card } from "~/components/ui/Card"
import { Button } from "~/components/ui/Button"
import { Badge } from "~/components/ui/Badge"
import { Progress } from "~/components/ui/Progress"
import { classNames } from "~/utils/classNames"

interface PipelineStep {
  id: string
  name: string
  status: "pending" | "running" | "success" | "failed" | "skipped"
  duration?: number
  logs?: string[]
  startTime?: Date
  endTime?: Date
}

interface DeploymentPipelineProps {
  deploymentId: string
  onComplete?: (success: boolean) => void
}

export function DeploymentPipeline({ deploymentId, onComplete }: DeploymentPipelineProps) {
  const [steps, setSteps] = useState<PipelineStep[]>([
    { id: "validate", name: "Validate Code", status: "pending" },
    { id: "test", name: "Run Tests", status: "pending" },
    { id: "build", name: "Build Application", status: "pending" },
    { id: "security", name: "Security Scan", status: "pending" },
    { id: "deploy", name: "Deploy to Platform", status: "pending" },
    { id: "verify", name: "Verify Deployment", status: "pending" },
  ])

  const [currentStep, setCurrentStep] = useState(0)
  const [isRunning, setIsRunning] = useState(false)
  const [overallProgress, setOverallProgress] = useState(0)

  const runPipeline = async () => {
    setIsRunning(true)

    for (let i = 0; i < steps.length; i++) {
      setCurrentStep(i)

      // Update step to running
      setSteps((prev) =>
        prev.map((step, index) => (index === i ? { ...step, status: "running", startTime: new Date() } : step)),
      )

      // Simulate step execution
      const success = await executeStep(steps[i])

      // Update step completion
      setSteps((prev) =>
        prev.map((step, index) =>
          index === i
            ? {
                ...step,
                status: success ? "success" : "failed",
                endTime: new Date(),
                duration: Date.now() - (step.startTime?.getTime() || Date.now()),
              }
            : step,
        ),
      )

      // Update progress
      setOverallProgress(((i + 1) / steps.length) * 100)

      // If step failed, stop pipeline
      if (!success) {
        setIsRunning(false)
        onComplete?.(false)
        return
      }

      // Small delay between steps
      await new Promise((resolve) => setTimeout(resolve, 500))
    }

    setIsRunning(false)
    onComplete?.(true)
  }

  const executeStep = async (step: PipelineStep): Promise<boolean> => {
    // Simulate different step durations and success rates
    const duration = Math.random() * 3000 + 1000 // 1-4 seconds
    const successRate = step.id === "security" ? 0.9 : 0.95 // Security scan has higher failure rate

    await new Promise((resolve) => setTimeout(resolve, duration))

    return Math.random() < successRate
  }

  const retryStep = async (stepIndex: number) => {
    setSteps((prev) =>
      prev.map((step, index) => (index === stepIndex ? { ...step, status: "running", startTime: new Date() } : step)),
    )

    const success = await executeStep(steps[stepIndex])

    setSteps((prev) =>
      prev.map((step, index) =>
        index === stepIndex
          ? {
              ...step,
              status: success ? "success" : "failed",
              endTime: new Date(),
              duration: Date.now() - (step.startTime?.getTime() || Date.now()),
            }
          : step,
      ),
    )

    return success
  }

  const getStepIcon = (status: PipelineStep["status"]) => {
    switch (status) {
      case "pending":
        return "i-ph:circle text-gray-400"
      case "running":
        return "i-ph:spinner text-blue-500 animate-spin"
      case "success":
        return "i-ph:check-circle text-green-500"
      case "failed":
        return "i-ph:x-circle text-red-500"
      case "skipped":
        return "i-ph:minus-circle text-gray-400"
      default:
        return "i-ph:circle text-gray-400"
    }
  }

  const getStepColor = (status: PipelineStep["status"]) => {
    switch (status) {
      case "running":
        return "border-blue-500 bg-blue-50"
      case "success":
        return "border-green-500 bg-green-50"
      case "failed":
        return "border-red-500 bg-red-50"
      default:
        return "border-octotask-elements-borderColor bg-octotask-elements-background-depth-1"
    }
  }

  return (
    <Card className="p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h3 className="text-lg font-semibold text-octotask-elements-textPrimary">Deployment Pipeline</h3>
          <p className="text-sm text-octotask-elements-textSecondary">
            Automated deployment process with quality gates
          </p>
        </div>
        <div className="flex items-center space-x-3">
          <div className="text-sm text-octotask-elements-textSecondary">Progress: {Math.round(overallProgress)}%</div>
          <div className="w-32">
            <Progress value={overallProgress} />
          </div>
          <Button onClick={runPipeline} disabled={isRunning} size="sm">
            {isRunning ? (
              <>
                <div className="i-ph:spinner w-4 h-4 mr-2 animate-spin" />
                Running
              </>
            ) : (
              <>
                <div className="i-ph:play w-4 h-4 mr-2" />
                Start Pipeline
              </>
            )}
          </Button>
        </div>
      </div>

      <div className="space-y-4">
        {steps.map((step, index) => (
          <div
            key={step.id}
            className={classNames(
              "border rounded-lg p-4 transition-all duration-200",
              getStepColor(step.status),
              currentStep === index && isRunning ? "ring-2 ring-blue-200" : "",
            )}
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <div className={classNames("w-5 h-5", getStepIcon(step.status))} />
                <div>
                  <h4 className="font-medium text-octotask-elements-textPrimary">{step.name}</h4>
                  {step.duration && (
                    <p className="text-sm text-octotask-elements-textSecondary">
                      Completed in {(step.duration / 1000).toFixed(1)}s
                    </p>
                  )}
                </div>
              </div>

              <div className="flex items-center space-x-2">
                <Badge
                  variant={
                    step.status === "success"
                      ? "success"
                      : step.status === "failed"
                        ? "error"
                        : step.status === "running"
                          ? "info"
                          : "secondary"
                  }
                >
                  {step.status}
                </Badge>

                {step.status === "failed" && (
                  <Button size="sm" variant="ghost" onClick={() => retryStep(index)}>
                    <div className="i-ph:arrow-clockwise w-4 h-4" />
                  </Button>
                )}
              </div>
            </div>

            {step.logs && step.logs.length > 0 && (
              <details className="mt-3">
                <summary className="cursor-pointer text-sm text-octotask-elements-textSecondary hover:text-octotask-elements-textPrimary">
                  View Logs
                </summary>
                <div className="mt-2 p-3 bg-octotask-elements-background-depth-2 rounded-md">
                  <pre className="text-xs text-octotask-elements-textSecondary whitespace-pre-wrap">
                    {step.logs.join("\n")}
                  </pre>
                </div>
              </details>
            )}
          </div>
        ))}
      </div>

      {/* Pipeline Summary */}
      <div className="mt-6 p-4 bg-octotask-elements-background-depth-1 rounded-lg">
        <div className="flex items-center justify-between text-sm">
          <div className="flex items-center space-x-4">
            <span className="text-octotask-elements-textSecondary">
              Steps: {steps.filter((s) => s.status === "success").length}/{steps.length}
            </span>
            <span className="text-octotask-elements-textSecondary">
              Duration: {steps.reduce((acc, step) => acc + (step.duration || 0), 0) / 1000}s
            </span>
          </div>
          <div className="flex items-center space-x-2">
            {steps.some((s) => s.status === "failed") && <Badge variant="error">Pipeline Failed</Badge>}
            {steps.every((s) => s.status === "success") && <Badge variant="success">Pipeline Completed</Badge>}
            {isRunning && <Badge variant="info">Pipeline Running</Badge>}
          </div>
        </div>
      </div>
    </Card>
  )
}

"use client"

import { useState } from "react"
import { Card } from "~/components/ui/Card"
import { Badge } from "~/components/ui/Badge"
import { Tabs } from "~/components/ui/Tabs"
import { VercelDeploymentManager } from "./VercelDeploymentManager"
import { DeploymentStatus } from "./DeploymentStatus"
import { DeploymentLogs } from "./DeploymentLogs"
import { DeploymentPipeline } from "./DeploymentPipeline"

export function VercelIntegration() {
  const [activeTab, setActiveTab] = useState("deploy")
  const [selectedDeployment, setSelectedDeployment] = useState<string | null>(null)

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 bg-black rounded-lg flex items-center justify-center">
            <div className="i-simple-icons:vercel w-6 h-6 text-white" />
          </div>
          <div>
            <h2 className="text-2xl font-bold text-octotask-elements-textPrimary">Vercel Integration</h2>
            <p className="text-octotask-elements-textSecondary">Deploy and manage your applications on Vercel</p>
          </div>
        </div>
        <Badge variant="success" className="text-sm">
          Connected
        </Badge>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <div className="flex space-x-1 mb-6">
          {[
            { id: "deploy", label: "Deploy", icon: "i-ph:rocket" },
            { id: "status", label: "Status", icon: "i-ph:chart-line" },
            { id: "logs", label: "Logs", icon: "i-ph:terminal-window" },
            { id: "pipeline", label: "Pipeline", icon: "i-ph:git-branch" },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`
                flex items-center space-x-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors
                ${
                  activeTab === tab.id
                    ? "bg-accent-500 text-white"
                    : "text-octotask-elements-textSecondary hover:text-octotask-elements-textPrimary hover:bg-octotask-elements-item-backgroundHover"
                }
              `}
            >
              <div className={`w-4 h-4 ${tab.icon}`} />
              <span>{tab.label}</span>
            </button>
          ))}
        </div>

        <div className="tab-content">
          {activeTab === "deploy" && <VercelDeploymentManager />}

          {activeTab === "status" && (
            <DeploymentStatus deploymentId={selectedDeployment || undefined} showAll={!selectedDeployment} />
          )}

          {activeTab === "logs" && selectedDeployment && (
            <DeploymentLogs deploymentId={selectedDeployment} isLive={true} />
          )}

          {activeTab === "pipeline" && selectedDeployment && (
            <DeploymentPipeline
              deploymentId={selectedDeployment}
              onComplete={(success) => {
                console.log(`Pipeline ${success ? "completed" : "failed"}`)
              }}
            />
          )}

          {activeTab === "logs" && !selectedDeployment && (
            <Card className="p-6">
              <div className="text-center text-octotask-elements-textSecondary">Select a deployment to view logs</div>
            </Card>
          )}

          {activeTab === "pipeline" && !selectedDeployment && (
            <Card className="p-6">
              <div className="text-center text-octotask-elements-textSecondary">
                Select a deployment to view pipeline
              </div>
            </Card>
          )}
        </div>
      </Tabs>
    </div>
  )
}

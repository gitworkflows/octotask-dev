"use client"

import { useState } from "react"
import { Tabs } from "~/components/ui/Tabs"
import { WebhookManager } from "./WebhookManager"
import { WebhookReceiver } from "./WebhookReceiver"
import { WebhookPlayground } from "./WebhookPlayground"
import { WebhookDebugger } from "./WebhookDebugger"

export function WebhookIntegration() {
  const [activeTab, setActiveTab] = useState("outgoing")

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-octotask-elements-textPrimary">Webhook Integration</h1>
        <p className="text-octotask-elements-textSecondary">
          Configure webhooks for seamless integration with external approval systems
        </p>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <div className="flex space-x-1 bg-octotask-elements-background-depth-2 p-1 rounded-lg">
          <button
            className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
              activeTab === "outgoing"
                ? "bg-octotask-elements-background-depth-1 text-octotask-elements-textPrimary shadow-sm"
                : "text-octotask-elements-textSecondary hover:text-octotask-elements-textPrimary"
            }`}
            onClick={() => setActiveTab("outgoing")}
          >
            <div className="flex items-center space-x-2">
              <div className="i-ph:arrow-square-out w-4 h-4" />
              <span>Outgoing Webhooks</span>
            </div>
          </button>
          <button
            className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
              activeTab === "incoming"
                ? "bg-octotask-elements-background-depth-1 text-octotask-elements-textPrimary shadow-sm"
                : "text-octotask-elements-textSecondary hover:text-octotask-elements-textPrimary"
            }`}
            onClick={() => setActiveTab("incoming")}
          >
            <div className="flex items-center space-x-2">
              <div className="i-ph:arrow-square-in w-4 h-4" />
              <span>Incoming Webhooks</span>
            </div>
          </button>
          <button
            className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
              activeTab === "playground"
                ? "bg-octotask-elements-background-depth-1 text-octotask-elements-textPrimary shadow-sm"
                : "text-octotask-elements-textSecondary hover:text-octotask-elements-textPrimary"
            }`}
            onClick={() => setActiveTab("playground")}
          >
            <div className="flex items-center space-x-2">
              <div className="i-ph:play w-4 h-4" />
              <span>Playground</span>
            </div>
          </button>
          <button
            className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
              activeTab === "debugger"
                ? "bg-octotask-elements-background-depth-1 text-octotask-elements-textPrimary shadow-sm"
                : "text-octotask-elements-textSecondary hover:text-octotask-elements-textPrimary"
            }`}
            onClick={() => setActiveTab("debugger")}
          >
            <div className="flex items-center space-x-2">
              <div className="i-ph:bug w-4 h-4" />
              <span>Debugger</span>
            </div>
          </button>
        </div>

        <div className="mt-6">
          {activeTab === "outgoing" && <WebhookManager />}
          {activeTab === "incoming" && <WebhookReceiver />}
          {activeTab === "playground" && <WebhookPlayground />}
          {activeTab === "debugger" && <WebhookDebugger />}
        </div>
      </Tabs>
    </div>
  )
}

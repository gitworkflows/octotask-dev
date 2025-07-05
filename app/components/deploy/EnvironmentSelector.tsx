"use client"

import { useState } from "react"
import { useStore } from "@nanostores/react"
import { Badge } from "~/components/ui/Badge"
import { Button } from "~/components/ui/Button"
import { Dropdown } from "~/components/ui/Dropdown"
import { environmentStore } from "~/lib/stores/environment"
import { classNames } from "~/utils/classNames"

export function EnvironmentSelector() {
  const environments = useStore(environmentStore.environments)
  const activeEnvironment = useStore(environmentStore.activeEnvironment)
  const [isOpen, setIsOpen] = useState(false)

  const activeEnv = activeEnvironment ? environments[activeEnvironment] : null
  const environmentList = Object.values(environments).filter((env) => env.isActive)

  const selectEnvironment = (envId: string) => {
    environmentStore.setActiveEnvironment(envId)
    setIsOpen(false)
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

  const getEnvironmentIcon = (type: string) => {
    switch (type) {
      case "production":
        return "i-ph:globe"
      case "staging":
        return "i-ph:test-tube"
      case "preview":
        return "i-ph:eye"
      case "development":
        return "i-ph:code"
      default:
        return "i-ph:circle"
    }
  }

  return (
    <Dropdown
      trigger={
        <Button variant="ghost" className="flex items-center space-x-2">
          {activeEnv ? (
            <>
              <div className={classNames("w-4 h-4", getEnvironmentIcon(activeEnv.type))} />
              <span>{activeEnv.name}</span>
              <Badge className={getEnvironmentTypeColor(activeEnv.type)} size="sm">
                {activeEnv.type}
              </Badge>
            </>
          ) : (
            <>
              <div className="i-ph:stack w-4 h-4" />
              <span>Select Environment</span>
            </>
          )}
          <div className="i-ph:caret-down w-4 h-4" />
        </Button>
      }
      open={isOpen}
      onOpenChange={setIsOpen}
    >
      <div className="py-1 min-w-64">
        <div className="px-3 py-2 text-xs font-medium text-octotask-elements-textSecondary uppercase tracking-wider">
          Active Environments
        </div>
        {environmentList.map((env) => (
          <button
            key={env.id}
            className={classNames(
              "w-full flex items-center space-x-3 px-3 py-2 text-left hover:bg-octotask-elements-item-backgroundHover transition-colors",
              activeEnvironment === env.id && "bg-octotask-elements-item-backgroundHover",
            )}
            onClick={() => selectEnvironment(env.id)}
          >
            <div className={classNames("w-4 h-4", getEnvironmentIcon(env.type))} />
            <div className="flex-1">
              <div className="font-medium text-octotask-elements-textPrimary">{env.name}</div>
              <div className="text-sm text-octotask-elements-textSecondary">
                {env.branch} • {env.variables.length} variables
              </div>
            </div>
            <Badge className={getEnvironmentTypeColor(env.type)} size="sm">
              {env.type}
            </Badge>
            {activeEnvironment === env.id && <div className="i-ph:check w-4 h-4 text-green-600" />}
          </button>
        ))}
        {environmentList.length === 0 && (
          <div className="px-3 py-4 text-center text-octotask-elements-textSecondary">No active environments found</div>
        )}
        <div className="border-t border-octotask-elements-borderColor mt-1 pt-1">
          <button
            className="w-full flex items-center space-x-2 px-3 py-2 text-left hover:bg-octotask-elements-item-backgroundHover transition-colors text-octotask-elements-textSecondary"
            onClick={() => {
              environmentStore.setActiveEnvironment(null)
              setIsOpen(false)
            }}
          >
            <div className="i-ph:x w-4 h-4" />
            <span>Clear Selection</span>
          </button>
        </div>
      </div>
    </Dropdown>
  )
}

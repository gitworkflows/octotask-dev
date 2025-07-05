import { atom, map } from "nanostores"

export interface EnvironmentVariable {
  key: string
  value: string
  isSecret: boolean
  description?: string
}

export interface DeploymentEnvironment {
  id: string
  name: string
  type: "production" | "staging" | "preview" | "development"
  projectId?: string
  domain?: string
  branch: string
  autoDeployEnabled: boolean
  variables: EnvironmentVariable[]
  buildSettings: {
    buildCommand: string
    outputDirectory: string
    installCommand: string
    nodeVersion: string
    framework?: string
  }
  lastDeployment?: {
    id: string
    status: string
    url: string
    createdAt: string
  }
  isActive: boolean
  createdAt: string
  updatedAt: string
}

class EnvironmentStore {
  environments = map<Record<string, DeploymentEnvironment>>({})
  activeEnvironment = atom<string | null>(null)

  addEnvironment(environment: DeploymentEnvironment) {
    this.environments.setKey(environment.id, environment)
    this.saveToStorage()
  }

  updateEnvironment(id: string, updates: Partial<DeploymentEnvironment>) {
    const current = this.environments.get()[id]
    if (current) {
      this.environments.setKey(id, {
        ...current,
        ...updates,
        updatedAt: new Date().toISOString(),
      })
      this.saveToStorage()
    }
  }

  removeEnvironment(id: string) {
    const environments = { ...this.environments.get() }
    delete environments[id]
    this.environments.set(environments)

    // If this was the active environment, clear it
    if (this.activeEnvironment.get() === id) {
      this.activeEnvironment.set(null)
    }

    this.saveToStorage()
  }

  setActiveEnvironment(id: string | null) {
    this.activeEnvironment.set(id)
    if (typeof window !== "undefined") {
      localStorage.setItem("octotask_active_environment", id || "")
    }
  }

  getEnvironmentsByType(type: DeploymentEnvironment["type"]): DeploymentEnvironment[] {
    return Object.values(this.environments.get())
      .filter((env) => env.type === type)
      .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime())
  }

  getActiveEnvironments(): DeploymentEnvironment[] {
    return Object.values(this.environments.get())
      .filter((env) => env.isActive)
      .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime())
  }

  getEnvironmentByBranch(branch: string): DeploymentEnvironment | null {
    return Object.values(this.environments.get()).find((env) => env.branch === branch) || null
  }

  // Load environments from localStorage
  loadFromStorage() {
    if (typeof window === "undefined") return

    const stored = localStorage.getItem("octotask_environments")
    if (stored) {
      try {
        const environments = JSON.parse(stored)
        this.environments.set(environments)
      } catch (error) {
        console.error("Failed to load environments from storage:", error)
      }
    }

    const activeEnv = localStorage.getItem("octotask_active_environment")
    if (activeEnv) {
      this.activeEnvironment.set(activeEnv)
    }
  }

  // Save environments to localStorage
  saveToStorage() {
    if (typeof window === "undefined") return

    try {
      localStorage.setItem("octotask_environments", JSON.stringify(this.environments.get()))
    } catch (error) {
      console.error("Failed to save environments to storage:", error)
    }
  }

  // Create default environments
  createDefaultEnvironments() {
    const defaultEnvironments: DeploymentEnvironment[] = [
      {
        id: "prod-" + Date.now(),
        name: "Production",
        type: "production",
        branch: "main",
        autoDeployEnabled: true,
        variables: [{ key: "NODE_ENV", value: "production", isSecret: false }],
        buildSettings: {
          buildCommand: "npm run build",
          outputDirectory: "dist",
          installCommand: "npm install",
          nodeVersion: "18.x",
        },
        isActive: true,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
      {
        id: "staging-" + Date.now(),
        name: "Staging",
        type: "staging",
        branch: "develop",
        autoDeployEnabled: true,
        variables: [{ key: "NODE_ENV", value: "staging", isSecret: false }],
        buildSettings: {
          buildCommand: "npm run build",
          outputDirectory: "dist",
          installCommand: "npm install",
          nodeVersion: "18.x",
        },
        isActive: true,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
      {
        id: "dev-" + Date.now(),
        name: "Development",
        type: "development",
        branch: "feature/*",
        autoDeployEnabled: false,
        variables: [{ key: "NODE_ENV", value: "development", isSecret: false }],
        buildSettings: {
          buildCommand: "npm run build",
          outputDirectory: "dist",
          installCommand: "npm install",
          nodeVersion: "18.x",
        },
        isActive: true,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
    ]

    defaultEnvironments.forEach((env) => {
      this.addEnvironment(env)
    })
  }
}

export const environmentStore = new EnvironmentStore()

// Auto-save to localStorage when environments change
environmentStore.environments.subscribe(() => {
  environmentStore.saveToStorage()
})

// Load from localStorage on initialization
if (typeof window !== "undefined") {
  environmentStore.loadFromStorage()
}

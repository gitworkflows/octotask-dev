import { atom, map } from "nanostores"

export interface Deployment {
  id: string
  projectName: string
  platform: "netlify" | "vercel" | "cloudflare"
  environment: "production" | "staging" | "development" | "preview"
  status: "building" | "deploying" | "success" | "failed" | "cancelled"
  progress?: number
  url?: string
  createdAt: string
  updatedAt: string
  duration?: number
  commitHash?: string
  branch?: string
  logs?: string[]
  buildOutput?: {
    path: string
    size: number
  }
  error?: string
}

export interface DeploymentMetrics {
  totalDeployments: number
  successfulDeployments: number
  failedDeployments: number
  averageDeployTime: number
  successRate: number
  deploymentsToday: number
  deploymentsThisWeek: number
}

class DeploymentStore {
  deployments = map<Record<string, Deployment>>({})
  metrics = atom<DeploymentMetrics>({
    totalDeployments: 0,
    successfulDeployments: 0,
    failedDeployments: 0,
    averageDeployTime: 0,
    successRate: 0,
    deploymentsToday: 0,
    deploymentsThisWeek: 0,
  })

  addDeployment(deployment: Deployment) {
    this.deployments.setKey(deployment.id, deployment)
    this.updateMetrics()
  }

  updateDeployment(id: string, updates: Partial<Deployment>) {
    const current = this.deployments.get()[id]
    if (current) {
      this.deployments.setKey(id, {
        ...current,
        ...updates,
        updatedAt: new Date().toISOString(),
      })
      this.updateMetrics()
    }
  }

  removeDeployment(id: string) {
    const deployments = { ...this.deployments.get() }
    delete deployments[id]
    this.deployments.set(deployments)
    this.updateMetrics()
  }

  getDeploymentsByProject(projectName: string): Deployment[] {
    return Object.values(this.deployments.get())
      .filter((d) => d.projectName === projectName)
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
  }

  getDeploymentsByEnvironment(environment: string): Deployment[] {
    return Object.values(this.deployments.get())
      .filter((d) => d.environment === environment)
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
  }

  getActiveDeployments(): Deployment[] {
    return Object.values(this.deployments.get()).filter((d) => d.status === "building" || d.status === "deploying")
  }

  private updateMetrics() {
    const deployments = Object.values(this.deployments.get())
    const now = new Date()
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())
    const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)

    const successful = deployments.filter((d) => d.status === "success")
    const failed = deployments.filter((d) => d.status === "failed")
    const completedDeployments = deployments.filter((d) => d.duration)

    const averageDeployTime =
      completedDeployments.length > 0
        ? completedDeployments.reduce((sum, d) => sum + (d.duration || 0), 0) / completedDeployments.length
        : 0

    const successRate = deployments.length > 0 ? (successful.length / deployments.length) * 100 : 0

    const deploymentsToday = deployments.filter((d) => new Date(d.createdAt) >= today).length

    const deploymentsThisWeek = deployments.filter((d) => new Date(d.createdAt) >= weekAgo).length

    this.metrics.set({
      totalDeployments: deployments.length,
      successfulDeployments: successful.length,
      failedDeployments: failed.length,
      averageDeployTime,
      successRate,
      deploymentsToday,
      deploymentsThisWeek,
    })
  }

  // Load deployments from localStorage
  loadFromStorage() {
    if (typeof window === "undefined") return

    const stored = localStorage.getItem("octotask_deployments")
    if (stored) {
      try {
        const deployments = JSON.parse(stored)
        this.deployments.set(deployments)
        this.updateMetrics()
      } catch (error) {
        console.error("Failed to load deployments from storage:", error)
      }
    }
  }

  // Save deployments to localStorage
  saveToStorage() {
    if (typeof window === "undefined") return

    try {
      localStorage.setItem("octotask_deployments", JSON.stringify(this.deployments.get()))
    } catch (error) {
      console.error("Failed to save deployments to storage:", error)
    }
  }
}

export const deploymentStore = new DeploymentStore()

// Auto-save to localStorage when deployments change
deploymentStore.deployments.subscribe(() => {
  deploymentStore.saveToStorage()
})

// Load from localStorage on initialization
if (typeof window !== "undefined") {
  deploymentStore.loadFromStorage()
}

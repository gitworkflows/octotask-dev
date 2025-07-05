"use client"

import { toast } from "react-toastify"
import { useStore } from "@nanostores/react"
import { vercelConnection } from "~/lib/stores/vercel"
import { workbenchStore } from "~/lib/stores/workbench"
import { deploymentStore } from "~/lib/stores/deployment"
import { webcontainer } from "~/lib/webcontainer"
import { path } from "~/utils/path"
import { useState } from "react"
import type { ActionCallbackData } from "~/lib/runtime/message-parser"
import { chatId } from "~/lib/persistence/useChatHistory"

export function useVercelDeploy() {
  const [isDeploying, setIsDeploying] = useState(false)
  const vercelConn = useStore(vercelConnection)
  const currentChatId = useStore(chatId)

  const handleVercelDeploy = async () => {
    if (!vercelConn.user || !vercelConn.token) {
      toast.error("Please connect to Vercel first in the settings tab!")
      return false
    }

    if (!currentChatId) {
      toast.error("No active chat found")
      return false
    }

    const deploymentId = `vercel-${Date.now()}`

    try {
      setIsDeploying(true)

      const artifact = workbenchStore.firstArtifact

      if (!artifact) {
        throw new Error("No active project found")
      }

      // Create deployment record
      deploymentStore.addDeployment({
        id: deploymentId,
        projectName: artifact.title || "OctoTask Project",
        platform: "vercel",
        environment: "production",
        status: "building",
        progress: 10,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        logs: ["Starting Vercel deployment..."],
      })

      // Update progress
      deploymentStore.updateDeployment(deploymentId, {
        status: "building",
        progress: 20,
        logs: ["Building project..."],
      })

      const actionId = "build-" + Date.now()
      const actionData: ActionCallbackData = {
        messageId: "vercel build",
        artifactId: artifact.id,
        actionId,
        action: {
          type: "build" as const,
          content: "npm run build",
        },
      }

      // Add and run build action
      artifact.runner.addAction(actionData)
      await artifact.runner.runAction(actionData)

      if (!artifact.runner.buildOutput) {
        deploymentStore.updateDeployment(deploymentId, {
          status: "failed",
          error: "Build failed. Check the terminal for details.",
          logs: ["Build failed - no output generated"],
        })
        throw new Error("Build failed")
      }

      // Update progress
      deploymentStore.updateDeployment(deploymentId, {
        status: "deploying",
        progress: 60,
        logs: ["Build completed, starting deployment..."],
      })

      // Get the build files
      const container = await webcontainer
      const buildPath = artifact.runner.buildOutput.path.replace("/home/project", "")

      // Find build directory
      let finalBuildPath = buildPath
      const commonOutputDirs = [buildPath, "/dist", "/build", "/out", "/output", "/.next", "/public"]
      let buildPathExists = false

      for (const dir of commonOutputDirs) {
        try {
          await container.fs.readdir(dir)
          finalBuildPath = dir
          buildPathExists = true
          console.log(`Using build directory: ${finalBuildPath}`)
          break
        } catch (error) {
          console.log(`Directory ${dir} doesn't exist, trying next option.`)
          continue
        }
      }

      if (!buildPathExists) {
        deploymentStore.updateDeployment(deploymentId, {
          status: "failed",
          error: "Could not find build output directory",
          logs: ["Error: Build output directory not found"],
        })
        throw new Error("Could not find build output directory. Please check your build configuration.")
      }

      // Get all files recursively
      async function getAllFiles(dirPath: string): Promise<Record<string, string>> {
        const files: Record<string, string> = {}
        const entries = await container.fs.readdir(dirPath, { withFileTypes: true })

        for (const entry of entries) {
          const fullPath = path.join(dirPath, entry.name)

          if (entry.isFile()) {
            const content = await container.fs.readFile(fullPath, "utf-8")
            const deployPath = fullPath.replace(finalBuildPath, "")
            files[deployPath] = content
          } else if (entry.isDirectory()) {
            const subFiles = await getAllFiles(fullPath)
            Object.assign(files, subFiles)
          }
        }

        return files
      }

      const fileContents = await getAllFiles(finalBuildPath)

      // Update progress
      deploymentStore.updateDeployment(deploymentId, {
        progress: 80,
        logs: ["Files prepared, uploading to Vercel..."],
      })

      const existingProjectId = localStorage.getItem(`vercel-project-${currentChatId}`)

      const response = await fetch("/api/vercel-deploy", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          projectId: existingProjectId || undefined,
          files: fileContents,
          token: vercelConn.token,
          chatId: currentChatId,
        }),
      })

      const data = (await response.json()) as any

      if (!response.ok || !data.deploy || !data.project) {
        console.error("Invalid deploy response:", data)
        deploymentStore.updateDeployment(deploymentId, {
          status: "failed",
          error: data.error || "Invalid deployment response",
          logs: [`Error: ${data.error || "Invalid deployment response"}`],
        })
        throw new Error(data.error || "Invalid deployment response")
      }

      if (data.project) {
        localStorage.setItem(`vercel-project-${currentChatId}`, data.project.id)
      }

      // Update deployment success
      deploymentStore.updateDeployment(deploymentId, {
        status: "success",
        progress: 100,
        url: data.deploy.url,
        duration: Math.floor(
          (Date.now() - new Date(deploymentStore.deployments.get()[deploymentId]?.createdAt || Date.now()).getTime()) /
            1000,
        ),
        logs: ["Deployment completed successfully!", `Live at: ${data.deploy.url}`],
      })

      toast.success(`Deployed successfully to ${data.deploy.url}`)
      return true
    } catch (err) {
      console.error("Vercel deploy error:", err)

      deploymentStore.updateDeployment(deploymentId, {
        status: "failed",
        error: err instanceof Error ? err.message : "Vercel deployment failed",
        logs: [`Error: ${err instanceof Error ? err.message : "Unknown error"}`],
      })

      toast.error(err instanceof Error ? err.message : "Vercel deployment failed")
      return false
    } finally {
      setIsDeploying(false)
    }
  }

  return {
    isDeploying,
    handleVercelDeploy,
    isConnected: !!vercelConn.user,
  }
}

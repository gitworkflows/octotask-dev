import { type ActionFunctionArgs, type LoaderFunctionArgs, json } from "@remix-run/cloudflare"
import type { VercelProjectInfo } from "~/types/vercel"

// Add loader function to handle GET requests
export async function loader({ request }: LoaderFunctionArgs) {
  const url = new URL(request.url)
  const projectId = url.searchParams.get("projectId")
  const token = url.searchParams.get("token")

  if (!projectId || !token) {
    return json({ error: "Missing projectId or token" }, { status: 400 })
  }

  try {
    // Get project info
    const projectResponse = await fetch(`https://api.vercel.com/v9/projects/${projectId}`, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    })

    if (!projectResponse.ok) {
      const errorData = await projectResponse.json()
      return json(
        {
          error: `Failed to fetch project: ${errorData.error?.message || "Unknown error"}`,
        },
        { status: 400 },
      )
    }

    const projectData = (await projectResponse.json()) as any

    // Get latest deployment
    const deploymentsResponse = await fetch(`https://api.vercel.com/v6/deployments?projectId=${projectId}&limit=1`, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    })

    if (!deploymentsResponse.ok) {
      return json({ error: "Failed to fetch deployments" }, { status: 400 })
    }

    const deploymentsData = (await deploymentsResponse.json()) as any
    const latestDeployment = deploymentsData.deployments?.[0]

    return json({
      project: {
        id: projectData.id,
        name: projectData.name,
        url: `https://${projectData.name}.vercel.app`,
        framework: projectData.framework,
        createdAt: projectData.createdAt,
        updatedAt: projectData.updatedAt,
      },
      deploy: latestDeployment
        ? {
            id: latestDeployment.uid,
            state: latestDeployment.readyState || latestDeployment.state,
            url: latestDeployment.url ? `https://${latestDeployment.url}` : `https://${projectData.name}.vercel.app`,
            created: latestDeployment.created,
            building: latestDeployment.building,
            ready: latestDeployment.ready,
          }
        : null,
    })
  } catch (error) {
    console.error("Error fetching Vercel deployment:", error)
    return json({ error: "Failed to fetch deployment" }, { status: 500 })
  }
}

interface DeployRequestBody {
  projectId?: string
  files: Record<string, string>
  chatId: string
  buildCommand?: string
  outputDirectory?: string
  installCommand?: string
  nodeVersion?: string
  environmentVariables?: Record<string, string>
}

// Enhanced action function for POST requests
export async function action({ request }: ActionFunctionArgs) {
  try {
    const {
      projectId,
      files,
      token,
      chatId,
      buildCommand = "npm run build",
      outputDirectory = "dist",
      installCommand = "npm install",
      nodeVersion = "18.x",
      environmentVariables = {},
    } = (await request.json()) as DeployRequestBody & { token: string }

    if (!token) {
      return json({ error: "Not connected to Vercel" }, { status: 401 })
    }

    if (!files || Object.keys(files).length === 0) {
      return json({ error: "No files provided for deployment" }, { status: 400 })
    }

    let targetProjectId = projectId
    let projectInfo: VercelProjectInfo | undefined

    // If no projectId provided, create a new project
    if (!targetProjectId) {
      const projectName = `octotask-${chatId}-${Date.now()}`.toLowerCase().replace(/[^a-z0-9-]/g, "-")

      const createProjectResponse = await fetch("https://api.vercel.com/v9/projects", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          name: projectName,
          framework: null,
          buildCommand,
          outputDirectory,
          installCommand,
          nodeVersion,
          environmentVariables: Object.entries(environmentVariables).map(([key, value]) => ({
            key,
            value,
            type: "encrypted",
            target: ["production", "preview", "development"],
          })),
        }),
      })

      if (!createProjectResponse.ok) {
        const errorData = (await createProjectResponse.json()) as any
        return json(
          {
            error: `Failed to create project: ${errorData.error?.message || "Unknown error"}`,
            details: errorData,
          },
          { status: 400 },
        )
      }

      const newProject = (await createProjectResponse.json()) as any
      targetProjectId = newProject.id
      projectInfo = {
        id: newProject.id,
        name: newProject.name,
        url: `https://${newProject.name}.vercel.app`,
        chatId,
        framework: newProject.framework,
        createdAt: newProject.createdAt,
        updatedAt: newProject.updatedAt,
      }
    } else {
      // Get existing project info
      const projectResponse = await fetch(`https://api.vercel.com/v9/projects/${targetProjectId}`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      })

      if (projectResponse.ok) {
        const existingProject = (await projectResponse.json()) as any
        projectInfo = {
          id: existingProject.id,
          name: existingProject.name,
          url: `https://${existingProject.name}.vercel.app`,
          chatId,
          framework: existingProject.framework,
          createdAt: existingProject.createdAt,
          updatedAt: existingProject.updatedAt,
        }

        // Update project settings if provided
        if (
          buildCommand ||
          outputDirectory ||
          installCommand ||
          nodeVersion ||
          Object.keys(environmentVariables).length > 0
        ) {
          const updateData: any = {}

          if (buildCommand) updateData.buildCommand = buildCommand
          if (outputDirectory) updateData.outputDirectory = outputDirectory
          if (installCommand) updateData.installCommand = installCommand
          if (nodeVersion) updateData.nodeVersion = nodeVersion

          if (Object.keys(environmentVariables).length > 0) {
            updateData.environmentVariables = Object.entries(environmentVariables).map(([key, value]) => ({
              key,
              value,
              type: "encrypted",
              target: ["production", "preview", "development"],
            }))
          }

          await fetch(`https://api.vercel.com/v9/projects/${targetProjectId}`, {
            method: "PATCH",
            headers: {
              Authorization: `Bearer ${token}`,
              "Content-Type": "application/json",
            },
            body: JSON.stringify(updateData),
          })
        }
      } else {
        return json({ error: "Project not found" }, { status: 404 })
      }
    }

    // Prepare files for deployment
    const deploymentFiles = []

    for (const [filePath, content] of Object.entries(files)) {
      // Ensure file path doesn't start with a slash for Vercel
      const normalizedPath = filePath.startsWith("/") ? filePath.substring(1) : filePath

      // Skip empty files or directories
      if (!content || normalizedPath.endsWith("/")) continue

      deploymentFiles.push({
        file: normalizedPath,
        data: content,
      })
    }

    if (deploymentFiles.length === 0) {
      return json({ error: "No valid files found for deployment" }, { status: 400 })
    }

    // Create a new deployment
    const deployResponse = await fetch(`https://api.vercel.com/v13/deployments`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        name: projectInfo.name,
        project: targetProjectId,
        target: "production",
        files: deploymentFiles,
        routes: [{ src: "/(.*)", dest: "/$1" }],
        meta: {
          deployedBy: "octotask",
          chatId: chatId,
        },
      }),
    })

    if (!deployResponse.ok) {
      const errorData = (await deployResponse.json()) as any
      return json(
        {
          error: `Failed to create deployment: ${errorData.error?.message || "Unknown error"}`,
          details: errorData,
        },
        { status: 400 },
      )
    }

    const deployData = (await deployResponse.json()) as any

    // Poll for deployment status with timeout
    let retryCount = 0
    const maxRetries = 60 // 2 minutes max
    let deploymentUrl = ""
    let deploymentState = ""

    while (retryCount < maxRetries) {
      const statusResponse = await fetch(`https://api.vercel.com/v13/deployments/${deployData.id}`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      })

      if (statusResponse.ok) {
        const status = (await statusResponse.json()) as any
        deploymentState = status.readyState || status.state
        deploymentUrl = status.url ? `https://${status.url}` : ""

        // Check for completion states
        if (deploymentState === "READY" || deploymentState === "ERROR" || deploymentState === "CANCELED") {
          break
        }
      }

      retryCount++
      await new Promise((resolve) => setTimeout(resolve, 2000))
    }

    if (deploymentState === "ERROR") {
      return json(
        {
          error: "Deployment failed during build process",
          deploy: {
            id: deployData.id,
            state: deploymentState,
            url: deploymentUrl,
          },
          project: projectInfo,
        },
        { status: 500 },
      )
    }

    if (retryCount >= maxRetries && deploymentState !== "READY") {
      return json(
        {
          error: "Deployment timed out - it may still be processing",
          deploy: {
            id: deployData.id,
            state: deploymentState || "BUILDING",
            url: deploymentUrl || projectInfo.url,
          },
          project: projectInfo,
        },
        { status: 202 },
      )
    }

    return json({
      success: true,
      deploy: {
        id: deployData.id,
        state: deploymentState,
        url: projectInfo.url || deploymentUrl,
        created: deployData.created,
        building: deploymentState === "BUILDING",
        ready: deploymentState === "READY",
      },
      project: projectInfo,
    })
  } catch (error) {
    console.error("Vercel deploy error:", error)
    return json(
      {
        error: "Deployment failed due to server error",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    )
  }
}

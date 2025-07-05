import type { ActionFunctionArgs, LoaderFunctionArgs } from "@remix-run/node"
import { json } from "@remix-run/node"

interface MockEndpoint {
  id: string
  path: string
  method: string
  responseStatus: number
  responseHeaders: Record<string, string>
  responseBody: string
  delay: number
  isEnabled: boolean
  hitCount: number
  lastHit?: string
}

// In a real implementation, this would be stored in a database
const mockEndpoints: MockEndpoint[] = []

function findMockEndpoint(path: string, method: string): MockEndpoint | null {
  return (
    mockEndpoints.find(
      (endpoint) => endpoint.path === `/${path}` && endpoint.method === method && endpoint.isEnabled,
    ) || null
  )
}

function updateHitCount(endpoint: MockEndpoint) {
  endpoint.hitCount++
  endpoint.lastHit = new Date().toISOString()
}

async function handleMockRequest(request: Request, params: any) {
  const path = params.path
  const method = request.method

  const mockEndpoint = findMockEndpoint(path, method)

  if (!mockEndpoint) {
    return json({ error: "Mock endpoint not found" }, { status: 404 })
  }

  updateHitCount(mockEndpoint)

  // Apply delay if specified
  if (mockEndpoint.delay > 0) {
    await new Promise((resolve) => setTimeout(resolve, mockEndpoint.delay))
  }

  // Parse response body
  let responseBody: any = mockEndpoint.responseBody
  try {
    responseBody = JSON.parse(mockEndpoint.responseBody)
  } catch (error) {
    // Keep as string if not valid JSON
  }

  return new Response(typeof responseBody === "string" ? responseBody : JSON.stringify(responseBody), {
    status: mockEndpoint.responseStatus,
    headers: mockEndpoint.responseHeaders,
  })
}

export async function loader({ request, params }: LoaderFunctionArgs) {
  return handleMockRequest(request, params)
}

export async function action({ request, params }: ActionFunctionArgs) {
  return handleMockRequest(request, params)
}

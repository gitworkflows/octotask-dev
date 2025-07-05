import type { ActionFunctionArgs } from "@remix-run/node"
import { json } from "@remix-run/node"
import {
  searchTemplates,
  getTemplateSuggestions,
  getRelatedTemplates,
  getPopularTemplates,
} from "~/utils/templateSearch"
import type { SearchFilters } from "~/utils/templateSearch"

export async function POST({ request }: ActionFunctionArgs) {
  try {
    const body = await request.json()
    const { action, ...params } = body

    switch (action) {
      case "search": {
        const filters: SearchFilters = {
          query: params.query || "",
          tags: params.tags || [],
          category: params.category || undefined,
          sortBy: params.sortBy || "relevance",
          sortOrder: params.sortOrder || "desc",
        }

        const results = searchTemplates(filters)
        return json(results)
      }

      case "suggestions": {
        const { query, limit = 5 } = params
        const suggestions = getTemplateSuggestions(query, limit)
        return json({ suggestions })
      }

      case "related": {
        const { template, limit = 3 } = params
        const related = getRelatedTemplates(template, limit)
        return json({ related })
      }

      case "popular": {
        const { limit = 10 } = params
        const popular = getPopularTemplates(limit)
        return json({ popular })
      }

      default:
        return json({ error: "Invalid action" }, { status: 400 })
    }
  } catch (error) {
    console.error("Template search API error:", error)
    return json({ error: "Internal server error" }, { status: 500 })
  }
}

// Default export function required by Remix
export default function TemplateSearchAPI() {
  return null
}

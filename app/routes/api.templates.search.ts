import { json, type LoaderFunctionArgs } from "@remix-run/node"
import { TemplateSearchEngine } from "~/utils/templateSearch"

// Mock template data - replace with your actual data source
const MOCK_TEMPLATES = [
  {
    id: "nextjs-blog",
    name: "Next.js Blog",
    label: "Blog Template",
    description: "A modern blog template built with Next.js, TypeScript, and Tailwind CSS",
    tags: ["nextjs", "typescript", "tailwind", "blog", "markdown"],
    icon: "nextjs",
    category: "Blog",
    popularity: 95,
    featured: true,
    createdAt: "2024-01-15",
  },
  {
    id: "react-dashboard",
    name: "React Dashboard",
    label: "Admin Dashboard",
    description: "Complete admin dashboard with charts, tables, and user management",
    tags: ["react", "typescript", "dashboard", "charts", "admin"],
    icon: "react",
    category: "Dashboard",
    popularity: 88,
    featured: true,
    createdAt: "2024-02-01",
  },
  {
    id: "ecommerce-store",
    name: "E-commerce Store",
    label: "Online Store",
    description: "Full-featured e-commerce store with cart, checkout, and payment integration",
    tags: ["nextjs", "ecommerce", "stripe", "cart", "responsive"],
    icon: "shopping-cart",
    category: "E-commerce",
    popularity: 92,
    featured: true,
    createdAt: "2024-01-20",
  },
  {
    id: "portfolio-site",
    name: "Portfolio Website",
    label: "Personal Portfolio",
    description: "Clean and modern portfolio website for developers and designers",
    tags: ["react", "portfolio", "responsive", "animation", "modern"],
    icon: "user",
    category: "Portfolio",
    popularity: 85,
    featured: false,
    createdAt: "2024-02-10",
  },
  {
    id: "landing-page",
    name: "Landing Page",
    label: "Product Landing",
    description: "High-converting landing page template with hero section and CTAs",
    tags: ["nextjs", "landing", "marketing", "responsive", "conversion"],
    icon: "rocket",
    category: "Landing Page",
    popularity: 78,
    featured: false,
    createdAt: "2024-02-05",
  },
]

export async function loader({ request }: LoaderFunctionArgs) {
  const url = new URL(request.url)
  const action = url.searchParams.get("action") || "search"

  const searchEngine = new TemplateSearchEngine(MOCK_TEMPLATES)

  try {
    switch (action) {
      case "search": {
        const query = url.searchParams.get("q") || ""
        const tags = url.searchParams.get("tags")?.split(",").filter(Boolean) || []
        const categories = url.searchParams.get("categories")?.split(",").filter(Boolean) || []
        const sortBy = (url.searchParams.get("sortBy") as any) || "relevance"
        const sortOrder = (url.searchParams.get("sortOrder") as any) || "desc"
        const limit = Number.parseInt(url.searchParams.get("limit") || "20")

        const result = searchEngine.search({
          query,
          tags,
          categories,
          sortBy,
          sortOrder,
          limit,
        })

        return json(result)
      }

      case "suggestions": {
        const query = url.searchParams.get("q") || ""
        const limit = Number.parseInt(url.searchParams.get("limit") || "5")

        const suggestions = searchEngine.getSuggestions(query, limit)
        return json({ suggestions })
      }

      case "related": {
        const templateId = url.searchParams.get("id") || ""
        const limit = Number.parseInt(url.searchParams.get("limit") || "4")

        const related = searchEngine.getRelatedTemplates(templateId, limit)
        return json({ related })
      }

      case "popular": {
        const limit = Number.parseInt(url.searchParams.get("limit") || "6")
        const popular = searchEngine.getPopularTemplates(limit)
        return json({ templates: popular })
      }

      case "featured": {
        const limit = Number.parseInt(url.searchParams.get("limit") || "8")
        const featured = searchEngine.getFeaturedTemplates(limit)
        return json({ templates: featured })
      }

      case "categories": {
        const categories = searchEngine.getAllCategories()
        return json({ categories })
      }

      case "tags": {
        const tags = searchEngine.getAllTags()
        return json({ tags })
      }

      default:
        return json({ error: "Invalid action" }, { status: 400 })
    }
  } catch (error) {
    console.error("Template search error:", error)
    return json({ error: "Search failed" }, { status: 500 })
  }
}

import type { Template } from "~/types/template"

export interface SearchFilters {
  query?: string
  tags?: string[]
  category?: string
  sortBy?: "name" | "popularity" | "recent" | "relevance"
  sortOrder?: "asc" | "desc"
}

export interface SearchResult extends Template {
  score: number
  matchedFields: string[]
  highlightedName?: string
  highlightedDescription?: string
  highlightedTags?: string[]
}

export interface SearchResponse {
  results: SearchResult[]
  totalCount: number
  categories: string[]
  availableTags: string[]
  searchTime: number
}

// Template categories based on common use cases
export const TEMPLATE_CATEGORIES = [
  "Frontend",
  "Full Stack",
  "Backend",
  "Mobile",
  "Desktop",
  "AI/ML",
  "Data",
  "DevOps",
  "Game",
  "E-commerce",
  "Blog",
  "Portfolio",
  "Dashboard",
  "Landing Page",
  "Documentation",
] as const

// Common tags for filtering
export const COMMON_TAGS = [
  "react",
  "nextjs",
  "typescript",
  "javascript",
  "tailwind",
  "node",
  "express",
  "api",
  "database",
  "auth",
  "responsive",
  "modern",
  "minimal",
  "dark-mode",
  "animation",
  "form",
  "chart",
  "table",
  "crud",
  "real-time",
] as const

class TemplateSearchEngine {
  private templates: Template[] = []

  constructor(templates: Template[]) {
    this.templates = templates
  }

  search(options: SearchFilters = {}): { results: SearchResult[]; stats: SearchResponse } {
    const startTime = performance.now()

    let results = this.templates.map((template) => ({
      ...template,
      score: 0,
      matchedFields: [] as string[],
    }))

    // Apply text search
    if (options.query) {
      results = this.applyTextSearch(results, options.query)
    }

    // Apply filters
    if (options.tags?.length) {
      results = results.filter((template) => options.tags!.every((tag) => template.tags.includes(tag)))
    }

    if (options.category) {
      results = results.filter((template) => template.category === options.category)
    }

    // Sort results
    results = this.sortResults(results, options.sortBy || "relevance", options.sortOrder || "desc")

    const endTime = performance.now()

    return {
      results,
      stats: {
        totalResults: results.length,
        searchTime: endTime - startTime,
        appliedFilters: {
          query: options.query,
          tags: options.tags || [],
          category: options.category || [],
        },
      },
    }
  }

  private applyTextSearch(templates: SearchResult[], query: string): SearchResult[] {
    const queryTerms = query
      .toLowerCase()
      .split(/\s+/)
      .filter((term) => term.length > 0)

    return templates
      .map((template) => {
        let score = 0
        const matchedFields: string[] = []
        let highlightedName = template.name
        let highlightedDescription = template.description
        const highlightedTags = [...template.tags]

        queryTerms.forEach((term) => {
          // Search in name (highest weight)
          if (template.name.toLowerCase().includes(term)) {
            score += template.name.toLowerCase() === term ? 100 : 50
            matchedFields.push("name")
            highlightedName = this.highlightText(template.name, term)
          }

          // Search in label
          if (template.label.toLowerCase().includes(term)) {
            score += template.label.toLowerCase() === term ? 80 : 40
            matchedFields.push("label")
          }

          // Search in description (medium weight)
          if (template.description.toLowerCase().includes(term)) {
            score += 20
            matchedFields.push("description")
            highlightedDescription = this.highlightText(template.description, term)
          }

          // Search in tags (medium weight)
          template.tags.forEach((tag, index) => {
            if (tag.toLowerCase().includes(term)) {
              score += tag.toLowerCase() === term ? 30 : 15
              matchedFields.push("tags")
              highlightedTags[index] = this.highlightText(tag, term)
            }
          })

          // Search in category
          if (template.category.toLowerCase().includes(term)) {
            score += 25
            matchedFields.push("category")
          }
        })

        // Boost score for multiple term matches
        const uniqueMatches = new Set(matchedFields).size
        score += uniqueMatches * 10

        // Boost popular templates slightly
        if (template.popularity) {
          score += template.popularity * 0.1
        }

        // Boost featured templates
        if (template.featured) {
          score += 5
        }

        return {
          ...template,
          score,
          matchedFields: [...new Set(matchedFields)],
          highlightedName,
          highlightedDescription,
          highlightedTags,
        }
      })
      .filter((template) => template.score > 0)
  }

  private highlightText(text: string, term: string): string {
    const regex = new RegExp(`(${term})`, "gi")
    return text.replace(regex, "<mark>$1</mark>")
  }

  private sortResults(results: SearchResult[], sortBy: string, sortOrder: string): SearchResult[] {
    return results.sort((a, b) => {
      let comparison = 0

      switch (sortBy) {
        case "relevance":
          comparison = b.score - a.score
          break
        case "popularity":
          comparison = (b.popularity || 0) - (a.popularity || 0)
          break
        case "name":
          comparison = a.name.localeCompare(b.name)
          break
        case "recent":
          comparison = new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime()
          break
        default:
          comparison = b.score - a.score
      }

      return sortOrder === "asc" ? -comparison : comparison
    })
  }

  getSuggestions(query: string, limit = 5): string[] {
    if (!query || query.length < 2) return []

    const suggestions = new Set<string>()
    const queryLower = query.toLowerCase()

    this.templates.forEach((template) => {
      // Add name suggestions
      if (template.name.toLowerCase().includes(queryLower)) {
        suggestions.add(template.name)
      }

      // Add tag suggestions
      template.tags.forEach((tag) => {
        if (tag.toLowerCase().includes(queryLower)) {
          suggestions.add(tag)
        }
      })

      // Add category suggestions
      if (template.category.toLowerCase().includes(queryLower)) {
        suggestions.add(template.category)
      }
    })

    return Array.from(suggestions).slice(0, limit)
  }

  getRelatedTemplates(templateId: string, limit = 4): Template[] {
    const template = this.templates.find((t) => t.id === templateId)
    if (!template) return []

    return this.templates
      .filter((t) => t.id !== templateId)
      .map((t) => ({
        ...t,
        similarity: this.calculateSimilarity(template, t),
      }))
      .sort((a, b) => b.similarity - a.similarity)
      .slice(0, limit)
  }

  private calculateSimilarity(template1: Template, template2: Template): number {
    const commonTags = template1.tags.filter((tag) => template2.tags.includes(tag))
    const categoryMatch = template1.category === template2.category ? 1 : 0

    return commonTags.length * 2 + categoryMatch
  }

  getPopularTemplates(limit = 6): Template[] {
    return this.templates
      .filter((t) => t.popularity && t.popularity > 0)
      .sort((a, b) => (b.popularity || 0) - (a.popularity || 0))
      .slice(0, limit)
  }

  getFeaturedTemplates(limit = 8): Template[] {
    return this.templates.filter((t) => t.featured).slice(0, limit)
  }

  getTemplatesByCategory(category: string): Template[] {
    return this.templates.filter((t) => t.category === category)
  }

  getTemplatesByTag(tag: string): Template[] {
    return this.templates.filter((t) => t.tags.includes(tag))
  }

  getAllTags(): string[] {
    const tags = new Set<string>()
    this.templates.forEach((template) => {
      template.tags.forEach((tag) => tags.add(tag))
    })
    return Array.from(tags).sort()
  }

  getAllCategories(): string[] {
    const categories = new Set<string>()
    this.templates.forEach((template) => {
      categories.add(template.category)
    })
    return Array.from(categories).sort()
  }
}

export { TemplateSearchEngine }

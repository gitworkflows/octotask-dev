import type { Template } from "~/types/template"
import { STARTER_TEMPLATES } from "./constants"

export interface SearchFilters {
  query?: string
  tags?: string[]
  category?: string
  sortBy?: "name" | "popularity" | "recent" | "relevance"
  sortOrder?: "asc" | "desc"
}

export interface SearchResult {
  template: Template
  score: number
  matchedFields: string[]
  highlightedName?: string
  highlightedDescription?: string
}

export interface SearchResponse {
  results: SearchResult[]
  totalCount: number
  categories: string[]
  availableTags: string[]
  searchTime: number
}

// Template categories based on common use cases
const TEMPLATE_CATEGORIES = {
  Frontend: ["react", "vue", "angular", "svelte", "nextjs", "nuxt"],
  "Full Stack": ["remix", "nextjs", "nuxt", "sveltekit"],
  Mobile: ["expo", "react-native", "nativescript"],
  Documentation: ["slidev", "docusaurus", "vitepress"],
  Animation: ["remotion", "framer-motion"],
  "UI Library": ["shadcn", "tailwind", "chakra"],
  "Build Tool": ["vite", "webpack", "rollup"],
  Backend: ["node", "express", "fastify", "koa"],
  "Static Site": ["astro", "gatsby", "eleventy"],
  Testing: ["jest", "vitest", "cypress", "playwright"],
}

// Popularity scores based on GitHub stars, downloads, etc.
const POPULARITY_SCORES: Record<string, number> = {
  "react-basic-starter": 100,
  "nextjs-starter": 95,
  "vue-starter": 85,
  "svelte-starter": 80,
  "angular-starter": 75,
  "astro-starter": 70,
  "remix-starter": 65,
  "nuxt-starter": 60,
  "expo-starter": 55,
  "slidev-starter": 50,
}

/**
 * Normalize text for searching (lowercase, remove special chars)
 */
function normalizeText(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^\w\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim()
}

/**
 * Calculate search relevance score
 */
function calculateRelevanceScore(template: Template, query: string): { score: number; matchedFields: string[] } {
  const normalizedQuery = normalizeText(query)
  const queryWords = normalizedQuery.split(" ").filter((word) => word.length > 0)

  let score = 0
  const matchedFields: string[] = []

  if (!queryWords.length) {
    return { score: 0, matchedFields: [] }
  }

  // Name matching (highest weight)
  const normalizedName = normalizeText(template.name)
  let nameMatches = 0
  queryWords.forEach((word) => {
    if (normalizedName.includes(word)) {
      nameMatches++
      score += 10 // High score for name matches
    }
  })
  if (nameMatches > 0) {
    matchedFields.push("name")
    // Bonus for exact name match
    if (normalizedName === normalizedQuery) {
      score += 20
    }
  }

  // Label matching
  const normalizedLabel = normalizeText(template.label)
  let labelMatches = 0
  queryWords.forEach((word) => {
    if (normalizedLabel.includes(word)) {
      labelMatches++
      score += 8
    }
  })
  if (labelMatches > 0) {
    matchedFields.push("label")
  }

  // Description matching
  const normalizedDescription = normalizeText(template.description)
  let descriptionMatches = 0
  queryWords.forEach((word) => {
    if (normalizedDescription.includes(word)) {
      descriptionMatches++
      score += 5
    }
  })
  if (descriptionMatches > 0) {
    matchedFields.push("description")
  }

  // Tags matching
  if (template.tags) {
    const normalizedTags = template.tags.map((tag) => normalizeText(tag))
    let tagMatches = 0
    queryWords.forEach((word) => {
      normalizedTags.forEach((tag) => {
        if (tag.includes(word)) {
          tagMatches++
          score += 7
        }
      })
    })
    if (tagMatches > 0) {
      matchedFields.push("tags")
    }
  }

  // Boost score based on match density
  const totalWords = queryWords.length
  const matchedWords = nameMatches + labelMatches + descriptionMatches
  const matchDensity = matchedWords / totalWords
  score *= 1 + matchDensity

  return { score, matchedFields }
}

/**
 * Highlight matching text in search results
 */
function highlightText(text: string, query: string): string {
  if (!query.trim()) return text

  const normalizedQuery = normalizeText(query)
  const queryWords = normalizedQuery.split(" ").filter((word) => word.length > 0)

  let highlightedText = text

  queryWords.forEach((word) => {
    const regex = new RegExp(`(${word})`, "gi")
    highlightedText = highlightedText.replace(regex, "<mark>$1</mark>")
  })

  return highlightedText
}

/**
 * Get template category
 */
function getTemplateCategory(template: Template): string {
  if (!template.tags) return "Other"

  for (const [category, categoryTags] of Object.entries(TEMPLATE_CATEGORIES)) {
    if (template.tags.some((tag) => categoryTags.includes(tag.toLowerCase()))) {
      return category
    }
  }

  return "Other"
}

/**
 * Filter templates by tags
 */
function filterByTags(templates: Template[], tags: string[]): Template[] {
  if (!tags.length) return templates

  return templates.filter((template) => {
    if (!template.tags) return false
    return tags.every((filterTag) =>
      template.tags!.some((templateTag) => normalizeText(templateTag).includes(normalizeText(filterTag))),
    )
  })
}

/**
 * Filter templates by category
 */
function filterByCategory(templates: Template[], category: string): Template[] {
  if (!category || category === "All") return templates

  return templates.filter((template) => getTemplateCategory(template) === category)
}

/**
 * Sort search results
 */
function sortResults(results: SearchResult[], sortBy: string, sortOrder: "asc" | "desc"): SearchResult[] {
  const sortedResults = [...results]

  sortedResults.sort((a, b) => {
    let comparison = 0

    switch (sortBy) {
      case "name":
        comparison = a.template.name.localeCompare(b.template.name)
        break
      case "popularity":
        const aPopularity = POPULARITY_SCORES[a.template.name] || 0
        const bPopularity = POPULARITY_SCORES[b.template.name] || 0
        comparison = bPopularity - aPopularity // Higher popularity first by default
        break
      case "recent":
        // For now, use popularity as a proxy for recency
        const aRecent = POPULARITY_SCORES[a.template.name] || 0
        const bRecent = POPULARITY_SCORES[b.template.name] || 0
        comparison = bRecent - aRecent
        break
      case "relevance":
      default:
        comparison = b.score - a.score // Higher score first by default
        break
    }

    return sortOrder === "desc" ? comparison : -comparison
  })

  return sortedResults
}

/**
 * Get all available tags from templates
 */
function getAllTags(templates: Template[]): string[] {
  const tagSet = new Set<string>()

  templates.forEach((template) => {
    if (template.tags) {
      template.tags.forEach((tag) => tagSet.add(tag))
    }
  })

  return Array.from(tagSet).sort()
}

/**
 * Get all categories from templates
 */
function getAllCategories(templates: Template[]): string[] {
  const categorySet = new Set<string>()

  templates.forEach((template) => {
    categorySet.add(getTemplateCategory(template))
  })

  return Array.from(categorySet).sort()
}

/**
 * Main search function
 */
export function searchTemplates(filters: SearchFilters = {}): SearchResponse {
  const startTime = performance.now()

  const { query = "", tags = [], category = "", sortBy = "relevance", sortOrder = "desc" } = filters

  let templates = [...STARTER_TEMPLATES]

  // Apply category filter
  templates = filterByCategory(templates, category)

  // Apply tag filter
  templates = filterByTags(templates, tags)

  // Calculate search scores and create results
  let results: SearchResult[] = []

  if (query.trim()) {
    // Search with query
    results = templates
      .map((template) => {
        const { score, matchedFields } = calculateRelevanceScore(template, query)

        if (score > 0) {
          return {
            template,
            score,
            matchedFields,
            highlightedName: highlightText(template.name, query),
            highlightedDescription: highlightText(template.description, query),
          }
        }

        return null
      })
      .filter((result): result is SearchResult => result !== null)
  } else {
    // No query, return all filtered templates
    results = templates.map((template) => ({
      template,
      score: POPULARITY_SCORES[template.name] || 0,
      matchedFields: [],
      highlightedName: template.name,
      highlightedDescription: template.description,
    }))
  }

  // Sort results
  results = sortResults(results, sortBy, sortOrder)

  const endTime = performance.now()
  const searchTime = endTime - startTime

  return {
    results,
    totalCount: results.length,
    categories: getAllCategories(STARTER_TEMPLATES),
    availableTags: getAllTags(STARTER_TEMPLATES),
    searchTime,
  }
}

/**
 * Get template suggestions based on partial input
 */
export function getTemplateSuggestions(partialQuery: string, limit = 5): string[] {
  if (!partialQuery.trim()) return []

  const normalizedQuery = normalizeText(partialQuery)
  const suggestions = new Set<string>()

  STARTER_TEMPLATES.forEach((template) => {
    // Add name suggestions
    if (normalizeText(template.name).includes(normalizedQuery)) {
      suggestions.add(template.name)
    }

    // Add label suggestions
    if (normalizeText(template.label).includes(normalizedQuery)) {
      suggestions.add(template.label)
    }

    // Add tag suggestions
    if (template.tags) {
      template.tags.forEach((tag) => {
        if (normalizeText(tag).includes(normalizedQuery)) {
          suggestions.add(tag)
        }
      })
    }
  })

  return Array.from(suggestions).slice(0, limit)
}

/**
 * Get related templates based on tags
 */
export function getRelatedTemplates(template: Template, limit = 3): Template[] {
  if (!template.tags || template.tags.length === 0) {
    return []
  }

  const relatedTemplates = STARTER_TEMPLATES.filter((t) => t.name !== template.name && t.tags)
    .map((t) => {
      const commonTags = t.tags!.filter((tag) =>
        template.tags!.some((templateTag) => normalizeText(templateTag) === normalizeText(tag)),
      )

      return {
        template: t,
        commonTagsCount: commonTags.length,
        popularity: POPULARITY_SCORES[t.name] || 0,
      }
    })
    .filter((item) => item.commonTagsCount > 0)
    .sort((a, b) => {
      // Sort by common tags count first, then by popularity
      if (a.commonTagsCount !== b.commonTagsCount) {
        return b.commonTagsCount - a.commonTagsCount
      }
      return b.popularity - a.popularity
    })
    .slice(0, limit)
    .map((item) => item.template)

  return relatedTemplates
}

/**
 * Get popular templates
 */
export function getPopularTemplates(limit = 10): Template[] {
  return STARTER_TEMPLATES.map((template) => ({
    template,
    popularity: POPULARITY_SCORES[template.name] || 0,
  }))
    .sort((a, b) => b.popularity - a.popularity)
    .slice(0, limit)
    .map((item) => item.template)
}

/**
 * Get templates by category
 */
export function getTemplatesByCategory(category: string): Template[] {
  return STARTER_TEMPLATES.filter((template) => getTemplateCategory(template) === category)
}

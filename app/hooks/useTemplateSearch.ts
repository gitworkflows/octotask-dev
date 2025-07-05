"use client"

import { useState, useEffect, useMemo, useCallback } from "react"
import {
  TemplateSearchEngine,
  type Template,
  type SearchResult,
  type SearchOptions,
  type SearchStats,
} from "~/utils/templateSearch"

interface UseTemplateSearchReturn {
  // Search state
  query: string
  setQuery: (query: string) => void
  selectedTags: string[]
  selectedCategories: string[]
  sortBy: "relevance" | "popularity" | "name" | "recent"
  sortOrder: "asc" | "desc"

  // Results
  results: SearchResult[]
  stats: SearchStats
  suggestions: string[]
  isLoading: boolean

  // Actions
  addTag: (tag: string) => void
  removeTag: (tag: string) => void
  toggleTag: (tag: string) => void
  addCategory: (category: string) => void
  removeCategory: (category: string) => void
  toggleCategory: (category: string) => void
  setSortBy: (sortBy: "relevance" | "popularity" | "name" | "recent") => void
  setSortOrder: (order: "asc" | "desc") => void
  clearFilters: () => void
  clearAll: () => void

  // Computed
  hasActiveFilters: boolean
  activeFilterCount: number

  // Template data
  allTags: string[]
  allCategories: string[]
  popularTemplates: Template[]
  featuredTemplates: Template[]
}

export function useTemplateSearch(templates: Template[]): UseTemplateSearchReturn {
  const [query, setQuery] = useState("")
  const [selectedTags, setSelectedTags] = useState<string[]>([])
  const [selectedCategories, setSelectedCategories] = useState<string[]>([])
  const [sortBy, setSortBy] = useState<"relevance" | "popularity" | "name" | "recent">("relevance")
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc")
  const [suggestions, setSuggestions] = useState<string[]>([])
  const [isLoading, setIsLoading] = useState(false)

  // Create search engine instance
  const searchEngine = useMemo(() => new TemplateSearchEngine(templates), [templates])

  // Perform search
  const searchOptions: SearchOptions = useMemo(
    () => ({
      query: query.trim(),
      tags: selectedTags,
      categories: selectedCategories,
      sortBy,
      sortOrder,
    }),
    [query, selectedTags, selectedCategories, sortBy, sortOrder],
  )

  const { results, stats } = useMemo(() => {
    if (!query.trim() && selectedTags.length === 0 && selectedCategories.length === 0) {
      return {
        results: searchEngine.getFeaturedTemplates(),
        stats: {
          totalResults: 0,
          searchTime: 0,
          appliedFilters: { tags: [], categories: [] },
        },
      }
    }
    return searchEngine.search(searchOptions)
  }, [searchEngine, searchOptions, query, selectedTags, selectedCategories])

  // Update suggestions when query changes
  useEffect(() => {
    if (query.length >= 2) {
      setIsLoading(true)
      const timer = setTimeout(() => {
        const newSuggestions = searchEngine.getSuggestions(query)
        setSuggestions(newSuggestions)
        setIsLoading(false)
      }, 150)
      return () => clearTimeout(timer)
    } else {
      setSuggestions([])
      setIsLoading(false)
    }
  }, [query, searchEngine])

  // Tag management
  const addTag = useCallback((tag: string) => {
    setSelectedTags((prev) => (prev.includes(tag) ? prev : [...prev, tag]))
  }, [])

  const removeTag = useCallback((tag: string) => {
    setSelectedTags((prev) => prev.filter((t) => t !== tag))
  }, [])

  const toggleTag = useCallback((tag: string) => {
    setSelectedTags((prev) => (prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag]))
  }, [])

  // Category management
  const addCategory = useCallback((category: string) => {
    setSelectedCategories((prev) => (prev.includes(category) ? prev : [...prev, category]))
  }, [])

  const removeCategory = useCallback((category: string) => {
    setSelectedCategories((prev) => prev.filter((c) => c !== category))
  }, [])

  const toggleCategory = useCallback((category: string) => {
    setSelectedCategories((prev) =>
      prev.includes(category) ? prev.filter((c) => c !== category) : [...prev, category],
    )
  }, [])

  // Clear functions
  const clearFilters = useCallback(() => {
    setSelectedTags([])
    setSelectedCategories([])
  }, [])

  const clearAll = useCallback(() => {
    setQuery("")
    setSelectedTags([])
    setSelectedCategories([])
    setSortBy("relevance")
    setSortOrder("desc")
  }, [])

  // Computed values
  const hasActiveFilters = useMemo(
    () => query.trim().length > 0 || selectedTags.length > 0 || selectedCategories.length > 0,
    [query, selectedTags, selectedCategories],
  )

  const activeFilterCount = useMemo(
    () => (query.trim() ? 1 : 0) + selectedTags.length + selectedCategories.length,
    [query, selectedTags, selectedCategories],
  )

  // Template data
  const allTags = useMemo(() => searchEngine.getAllTags(), [searchEngine])
  const allCategories = useMemo(() => searchEngine.getAllCategories(), [searchEngine])
  const popularTemplates = useMemo(() => searchEngine.getPopularTemplates(), [searchEngine])
  const featuredTemplates = useMemo(() => searchEngine.getFeaturedTemplates(), [searchEngine])

  return {
    // Search state
    query,
    setQuery,
    selectedTags,
    selectedCategories,
    sortBy,
    sortOrder,

    // Results
    results,
    stats,
    suggestions,
    isLoading,

    // Actions
    addTag,
    removeTag,
    toggleTag,
    addCategory,
    removeCategory,
    toggleCategory,
    setSortBy,
    setSortOrder,
    clearFilters,
    clearAll,

    // Computed
    hasActiveFilters,
    activeFilterCount,

    // Template data
    allTags,
    allCategories,
    popularTemplates,
    featuredTemplates,
  }
}

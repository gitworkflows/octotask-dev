"use client"

import { useState, useCallback, useMemo } from "react"
import { searchTemplates, getTemplateSuggestions, type SearchFilters } from "~/utils/templateSearch"

interface UseTemplateSearchOptions {
  initialFilters?: Partial<SearchFilters>
  debounceMs?: number
}

export function useTemplateSearch(options: UseTemplateSearchOptions = {}) {
  const { initialFilters = {}, debounceMs = 300 } = options

  const [filters, setFilters] = useState<SearchFilters>({
    query: "",
    tags: [],
    category: undefined,
    sortBy: "relevance",
    sortOrder: "desc",
    ...initialFilters,
  })

  const [isLoading, setIsLoading] = useState(false)
  const [suggestions, setSuggestions] = useState<string[]>([])

  // Perform search
  const searchResults = useMemo(() => {
    setIsLoading(true)
    const results = searchTemplates(filters)
    setIsLoading(false)
    return results
  }, [filters])

  // Update search query
  const updateQuery = useCallback((query: string) => {
    setFilters((prev) => ({ ...prev, query }))

    // Update suggestions
    if (query.trim()) {
      const newSuggestions = getTemplateSuggestions(query, 5)
      setSuggestions(newSuggestions)
    } else {
      setSuggestions([])
    }
  }, [])

  // Update filters
  const updateFilters = useCallback((newFilters: Partial<SearchFilters>) => {
    setFilters((prev) => ({ ...prev, ...newFilters }))
  }, [])

  // Add tag filter
  const addTag = useCallback((tag: string) => {
    setFilters((prev) => ({
      ...prev,
      tags: prev.tags?.includes(tag) ? prev.tags : [...(prev.tags || []), tag],
    }))
  }, [])

  // Remove tag filter
  const removeTag = useCallback((tag: string) => {
    setFilters((prev) => ({
      ...prev,
      tags: prev.tags?.filter((t) => t !== tag) || [],
    }))
  }, [])

  // Clear all filters
  const clearFilters = useCallback(() => {
    setFilters({
      query: "",
      tags: [],
      category: undefined,
      sortBy: "relevance",
      sortOrder: "desc",
    })
    setSuggestions([])
  }, [])

  // Toggle tag
  const toggleTag = useCallback(
    (tag: string) => {
      if (filters.tags?.includes(tag)) {
        removeTag(tag)
      } else {
        addTag(tag)
      }
    },
    [filters.tags, addTag, removeTag],
  )

  return {
    // State
    filters,
    searchResults,
    suggestions,
    isLoading,

    // Actions
    updateQuery,
    updateFilters,
    addTag,
    removeTag,
    toggleTag,
    clearFilters,

    // Computed
    hasActiveFilters: !!(
      filters.query ||
      (filters.tags && filters.tags.length > 0) ||
      (filters.category && filters.category !== "All")
    ),
    totalResults: searchResults.totalCount,
  }
}

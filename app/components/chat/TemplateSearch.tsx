"use client"

import { useState, useEffect, useRef } from "react"
import { Search, Filter, X, Grid, List, Tag, ChevronDown } from "lucide-react"
import { Button } from "~/components/ui/Button"
import { Input } from "~/components/ui/Input"
import { Badge } from "~/components/ui/Badge"
import { Card } from "~/components/ui/Card"
import { Dropdown } from "~/components/ui/Dropdown"
import { Checkbox } from "~/components/ui/Checkbox"
import { Collapsible } from "~/components/ui/Collapsible"
import { useTemplateSearch } from "~/hooks/useTemplateSearch"
import type { Template } from "~/types/template"
import type { SearchResult } from "~/utils/templateSearch"

interface TemplateSearchProps {
  onSelectTemplate: (template: Template) => void
  className?: string
}

type ViewMode = "grid" | "list"

export function TemplateSearch({ onSelectTemplate, className = "" }: TemplateSearchProps) {
  const [viewMode, setViewMode] = useState<ViewMode>("grid")
  const [showFilters, setShowFilters] = useState(false)
  const [showSuggestions, setShowSuggestions] = useState(false)
  const searchInputRef = useRef<HTMLInputElement>(null)

  const {
    filters,
    searchResults,
    suggestions,
    isLoading,
    updateQuery,
    updateFilters,
    toggleTag,
    clearFilters,
    hasActiveFilters,
    totalResults,
  } = useTemplateSearch()

  // Handle search input changes
  const handleSearchChange = (value: string) => {
    updateQuery(value)
    setShowSuggestions(value.length > 0 && suggestions.length > 0)
  }

  // Handle suggestion selection
  const handleSuggestionSelect = (suggestion: string) => {
    updateQuery(suggestion)
    setShowSuggestions(false)
    searchInputRef.current?.focus()
  }

  // Handle category change
  const handleCategoryChange = (category: string) => {
    updateFilters({ category: category === "All" ? undefined : category })
  }

  // Handle sort change
  const handleSortChange = (sortBy: string, sortOrder: "asc" | "desc") => {
    updateFilters({ sortBy: sortBy as any, sortOrder })
  }

  // Close suggestions when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (searchInputRef.current && !searchInputRef.current.contains(event.target as Node)) {
        setShowSuggestions(false)
      }
    }

    document.addEventListener("mousedown", handleClickOutside)
    return () => document.removeEventListener("mousedown", handleClickOutside)
  }, [])

  return (
    <div className={`template-search ${className}`}>
      {/* Search Header */}
      <div className="flex flex-col gap-4 mb-6">
        {/* Search Input */}
        <div className="relative">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
            <Input
              ref={searchInputRef}
              type="text"
              placeholder="Search templates by name, tags, or description..."
              value={filters.query || ""}
              onChange={(e) => handleSearchChange(e.target.value)}
              className="pl-10 pr-4 py-2 w-full"
              onFocus={() => setShowSuggestions(suggestions.length > 0)}
            />
            {filters.query && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => handleSearchChange("")}
                className="absolute right-2 top-1/2 transform -translate-y-1/2 p-1"
              >
                <X className="w-4 h-4" />
              </Button>
            )}
          </div>

          {/* Search Suggestions */}
          {showSuggestions && suggestions.length > 0 && (
            <div className="absolute top-full left-0 right-0 bg-white border border-gray-200 rounded-md shadow-lg z-50 mt-1">
              {suggestions.map((suggestion, index) => (
                <button
                  key={index}
                  onClick={() => handleSuggestionSelect(suggestion)}
                  className="w-full text-left px-4 py-2 hover:bg-gray-50 first:rounded-t-md last:rounded-b-md"
                >
                  <Search className="inline w-3 h-3 mr-2 text-gray-400" />
                  {suggestion}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Controls Row */}
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            {/* Filter Toggle */}
            <Button
              variant={showFilters ? "default" : "outline"}
              size="sm"
              onClick={() => setShowFilters(!showFilters)}
              className="flex items-center gap-2"
            >
              <Filter className="w-4 h-4" />
              Filters
              {hasActiveFilters && (
                <Badge variant="secondary" className="ml-1 px-1 py-0 text-xs">
                  {(filters.tags?.length || 0) + (filters.category ? 1 : 0)}
                </Badge>
              )}
            </Button>

            {/* Clear Filters */}
            {hasActiveFilters && (
              <Button variant="ghost" size="sm" onClick={clearFilters}>
                Clear All
              </Button>
            )}
          </div>

          <div className="flex items-center gap-2">
            {/* Sort Dropdown */}
            <Dropdown
              trigger={
                <Button variant="outline" size="sm" className="flex items-center gap-2 bg-transparent">
                  Sort:{" "}
                  {filters.sortBy === "relevance"
                    ? "Relevance"
                    : filters.sortBy === "popularity"
                      ? "Popularity"
                      : filters.sortBy === "name"
                        ? "Name"
                        : "Recent"}
                  <ChevronDown className="w-3 h-3" />
                </Button>
              }
            >
              <div className="p-2 space-y-1">
                {[
                  { key: "relevance", label: "Relevance" },
                  { key: "popularity", label: "Popularity" },
                  { key: "name", label: "Name" },
                  { key: "recent", label: "Recent" },
                ].map((option) => (
                  <button
                    key={option.key}
                    onClick={() => handleSortChange(option.key, "desc")}
                    className={`w-full text-left px-3 py-2 rounded hover:bg-gray-50 ${
                      filters.sortBy === option.key ? "bg-blue-50 text-blue-600" : ""
                    }`}
                  >
                    {option.label}
                  </button>
                ))}
              </div>
            </Dropdown>

            {/* View Mode Toggle */}
            <div className="flex border border-gray-200 rounded-md">
              <Button
                variant={viewMode === "grid" ? "default" : "ghost"}
                size="sm"
                onClick={() => setViewMode("grid")}
                className="rounded-r-none"
              >
                <Grid className="w-4 h-4" />
              </Button>
              <Button
                variant={viewMode === "list" ? "default" : "ghost"}
                size="sm"
                onClick={() => setViewMode("list")}
                className="rounded-l-none border-l"
              >
                <List className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </div>

        {/* Active Filters */}
        {hasActiveFilters && (
          <div className="flex flex-wrap gap-2">
            {filters.category && (
              <Badge variant="secondary" className="flex items-center gap-1">
                Category: {filters.category}
                <button
                  onClick={() => handleCategoryChange("All")}
                  className="ml-1 hover:bg-gray-300 rounded-full p-0.5"
                >
                  <X className="w-3 h-3" />
                </button>
              </Badge>
            )}
            {filters.tags?.map((tag) => (
              <Badge key={tag} variant="secondary" className="flex items-center gap-1">
                <Tag className="w-3 h-3" />
                {tag}
                <button onClick={() => toggleTag(tag)} className="ml-1 hover:bg-gray-300 rounded-full p-0.5">
                  <X className="w-3 h-3" />
                </button>
              </Badge>
            ))}
          </div>
        )}
      </div>

      {/* Filters Panel */}
      <Collapsible open={showFilters} onOpenChange={setShowFilters}>
        <div className="bg-gray-50 rounded-lg p-4 mb-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Categories */}
            <div>
              <h3 className="font-medium text-gray-900 mb-3">Categories</h3>
              <div className="space-y-2">
                {["All", ...searchResults.categories].map((category) => (
                  <label key={category} className="flex items-center gap-2 cursor-pointer">
                    <Checkbox
                      checked={filters.category === category || (!filters.category && category === "All")}
                      onChange={() => handleCategoryChange(category)}
                    />
                    <span className="text-sm">{category}</span>
                  </label>
                ))}
              </div>
            </div>

            {/* Popular Tags */}
            <div>
              <h3 className="font-medium text-gray-900 mb-3">Popular Tags</h3>
              <div className="flex flex-wrap gap-2">
                {searchResults.availableTags.slice(0, 20).map((tag) => (
                  <button
                    key={tag}
                    onClick={() => toggleTag(tag)}
                    className={`px-3 py-1 rounded-full text-sm border transition-colors ${
                      filters.tags?.includes(tag)
                        ? "bg-blue-100 border-blue-300 text-blue-700"
                        : "bg-white border-gray-200 text-gray-700 hover:border-gray-300"
                    }`}
                  >
                    {tag}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      </Collapsible>

      {/* Results Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <h2 className="text-lg font-semibold">{filters.query ? "Search Results" : "All Templates"}</h2>
          <Badge variant="outline">
            {totalResults} template{totalResults !== 1 ? "s" : ""}
          </Badge>
          {searchResults.searchTime > 0 && (
            <span className="text-sm text-gray-500">({searchResults.searchTime.toFixed(1)}ms)</span>
          )}
        </div>
      </div>

      {/* Loading State */}
      {isLoading && (
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        </div>
      )}

      {/* Results */}
      {!isLoading && (
        <>
          {searchResults.results.length === 0 ? (
            <EmptyState query={filters.query} hasFilters={hasActiveFilters} onClearFilters={clearFilters} />
          ) : (
            <div className={viewMode === "grid" ? "grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4" : "space-y-3"}>
              {searchResults.results.map((result) => (
                <TemplateCard
                  key={result.template.name}
                  result={result}
                  viewMode={viewMode}
                  onSelect={() => onSelectTemplate(result.template)}
                />
              ))}
            </div>
          )}
        </>
      )}
    </div>
  )
}

// Template Card Component
interface TemplateCardProps {
  result: SearchResult
  viewMode: ViewMode
  onSelect: () => void
}

function TemplateCard({ result, viewMode, onSelect }: TemplateCardProps) {
  const { template, matchedFields, highlightedName, highlightedDescription } = result

  if (viewMode === "list") {
    return (
      <Card className="p-4 hover:shadow-md transition-shadow cursor-pointer" onClick={onSelect}>
        <div className="flex items-start gap-4">
          <div className="flex-shrink-0">
            <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-purple-600 rounded-lg flex items-center justify-center text-white font-bold text-lg">
              {template.name.charAt(0).toUpperCase()}
            </div>
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between">
              <div>
                <h3
                  className="font-medium text-gray-900 mb-1"
                  dangerouslySetInnerHTML={{ __html: highlightedName || template.name }}
                />
                <p
                  className="text-sm text-gray-600 mb-2"
                  dangerouslySetInnerHTML={{ __html: highlightedDescription || template.description }}
                />
                {template.tags && (
                  <div className="flex flex-wrap gap-1">
                    {template.tags.slice(0, 4).map((tag) => (
                      <Badge key={tag} variant="outline" className="text-xs">
                        {tag}
                      </Badge>
                    ))}
                    {template.tags.length > 4 && (
                      <Badge variant="outline" className="text-xs">
                        +{template.tags.length - 4}
                      </Badge>
                    )}
                  </div>
                )}
              </div>
              {matchedFields.length > 0 && (
                <div className="flex flex-wrap gap-1 ml-4">
                  {matchedFields.map((field) => (
                    <Badge key={field} variant="secondary" className="text-xs">
                      {field}
                    </Badge>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </Card>
    )
  }

  return (
    <Card className="p-4 hover:shadow-md transition-shadow cursor-pointer h-full" onClick={onSelect}>
      <div className="flex flex-col h-full">
        <div className="flex items-center gap-3 mb-3">
          <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-purple-600 rounded-lg flex items-center justify-center text-white font-bold">
            {template.name.charAt(0).toUpperCase()}
          </div>
          <div className="flex-1 min-w-0">
            <h3
              className="font-medium text-gray-900 truncate"
              dangerouslySetInnerHTML={{ __html: highlightedName || template.name }}
            />
            <p className="text-sm text-gray-500">{template.label}</p>
          </div>
        </div>

        <p
          className="text-sm text-gray-600 mb-3 flex-1"
          dangerouslySetInnerHTML={{ __html: highlightedDescription || template.description }}
        />

        {template.tags && (
          <div className="flex flex-wrap gap-1 mb-3">
            {template.tags.slice(0, 3).map((tag) => (
              <Badge key={tag} variant="outline" className="text-xs">
                {tag}
              </Badge>
            ))}
            {template.tags.length > 3 && (
              <Badge variant="outline" className="text-xs">
                +{template.tags.length - 3}
              </Badge>
            )}
          </div>
        )}

        {matchedFields.length > 0 && (
          <div className="flex flex-wrap gap-1">
            {matchedFields.map((field) => (
              <Badge key={field} variant="secondary" className="text-xs">
                Matched: {field}
              </Badge>
            ))}
          </div>
        )}
      </div>
    </Card>
  )
}

// Empty State Component
interface EmptyStateProps {
  query?: string
  hasFilters: boolean
  onClearFilters: () => void
}

function EmptyState({ query, hasFilters, onClearFilters }: EmptyStateProps) {
  return (
    <div className="text-center py-12">
      <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
        <Search className="w-8 h-8 text-gray-400" />
      </div>
      <h3 className="text-lg font-medium text-gray-900 mb-2">
        {query ? `No templates found for "${query}"` : "No templates found"}
      </h3>
      <p className="text-gray-600 mb-4">
        {hasFilters
          ? "Try adjusting your filters or search terms"
          : "Try a different search term or browse all templates"}
      </p>
      {hasFilters && (
        <Button onClick={onClearFilters} variant="outline">
          Clear all filters
        </Button>
      )}
    </div>
  )
}

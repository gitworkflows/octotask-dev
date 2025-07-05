"use client"

import { useState } from "react"
import { Search, Grid, Sparkles } from "lucide-react"
import { Button } from "~/components/ui/Button"
import { Card } from "~/components/ui/Card"
import { Badge } from "~/components/ui/Badge"
import { TemplateSearch } from "./TemplateSearch"
import { STARTER_TEMPLATES } from "~/utils/constants"
import type { Template } from "~/types/template"

interface StarterTemplatesProps {
  onSelectTemplate: (template: Template) => void
  className?: string
}

type ViewMode = "simple" | "search"

export function StarterTemplates({ onSelectTemplate, className = "" }: StarterTemplatesProps) {
  const [viewMode, setViewMode] = useState<ViewMode>("simple")

  // Get featured templates (most popular ones)
  const featuredTemplates = STARTER_TEMPLATES.slice(0, 8)

  if (viewMode === "search") {
    return (
      <div className={className}>
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-blue-600" />
            <h2 className="text-xl font-semibold">Choose a Template</h2>
          </div>
          <Button variant="outline" size="sm" onClick={() => setViewMode("simple")} className="flex items-center gap-2">
            <Grid className="w-4 h-4" />
            Simple View
          </Button>
        </div>
        <TemplateSearch onSelectTemplate={onSelectTemplate} />
      </div>
    )
  }

  return (
    <div className={className}>
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-2">
          <Sparkles className="w-5 h-5 text-blue-600" />
          <h2 className="text-xl font-semibold">Quick Start Templates</h2>
        </div>
        <Button variant="outline" size="sm" onClick={() => setViewMode("search")} className="flex items-center gap-2">
          <Search className="w-4 h-4" />
          Advanced Search
        </Button>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 mb-6">
        {featuredTemplates.map((template) => (
          <TemplateIcon key={template.name} template={template} onSelect={() => onSelectTemplate(template)} />
        ))}
      </div>

      <div className="text-center">
        <Button variant="ghost" onClick={() => setViewMode("search")} className="text-blue-600 hover:text-blue-700">
          View all {STARTER_TEMPLATES.length} templates →
        </Button>
      </div>
    </div>
  )
}

// Template Icon Component for Simple View
interface TemplateIconProps {
  template: Template
  onSelect: () => void
}

function TemplateIcon({ template, onSelect }: TemplateIconProps) {
  return (
    <Card className="p-4 hover:shadow-md transition-all cursor-pointer group hover:scale-105" onClick={onSelect}>
      <div className="flex flex-col items-center text-center">
        <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-purple-600 rounded-xl flex items-center justify-center text-white font-bold text-lg mb-3 group-hover:scale-110 transition-transform">
          {template.name.charAt(0).toUpperCase()}
        </div>
        <h3 className="font-medium text-gray-900 mb-1 text-sm">{template.label}</h3>
        <p className="text-xs text-gray-600 mb-2 line-clamp-2">{template.description}</p>
        {template.tags && template.tags.length > 0 && (
          <div className="flex flex-wrap gap-1 justify-center">
            {template.tags.slice(0, 2).map((tag) => (
              <Badge key={tag} variant="outline" className="text-xs px-1 py-0">
                {tag}
              </Badge>
            ))}
            {template.tags.length > 2 && (
              <Badge variant="outline" className="text-xs px-1 py-0">
                +{template.tags.length - 2}
              </Badge>
            )}
          </div>
        )}
      </div>
    </Card>
  )
}

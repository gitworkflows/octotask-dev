export interface Template {
  name: string
  label: string
  description: string
  githubRepo: string
  tags?: string[]
  icon?: string
}

// Default export function required by Remix
export default function TemplateTypes() {
  return null
}

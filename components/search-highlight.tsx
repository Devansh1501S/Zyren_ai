"use client"

interface SearchHighlightProps {
  text: string
  searchQuery: string
}

export function SearchHighlight({ text, searchQuery }: SearchHighlightProps) {
  if (!searchQuery.trim()) {
    return <span>{text}</span>
  }

  const regex = new RegExp(`(${searchQuery.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")})`, "gi")
  const parts = text.split(regex)

  return (
    <span>
      {parts.map((part, index) =>
        regex.test(part) ? (
          <mark key={index} className="bg-accent/30 text-accent-foreground rounded px-1">
            {part}
          </mark>
        ) : (
          <span key={index}>{part}</span>
        ),
      )}
    </span>
  )
}

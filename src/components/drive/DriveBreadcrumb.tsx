'use client'

import { ChevronRight, Home } from 'lucide-react'
import type { BreadcrumbItem } from '@/types/drive'

interface DriveBreadcrumbProps {
  items: BreadcrumbItem[]
  onNavigate: (folderId: string, index: number) => void
}

export function DriveBreadcrumb({ items, onNavigate }: DriveBreadcrumbProps) {
  return (
    <nav className="flex items-center gap-1 text-sm overflow-x-auto">
      {items.map((item, index) => {
        const isLast = index === items.length - 1

        return (
          <div key={item.id} className="flex items-center gap-1 shrink-0">
            {index > 0 && (
              <ChevronRight className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
            )}
            {index === 0 ? (
              <button
                onClick={() => onNavigate(item.id, index)}
                className="flex items-center gap-1.5 px-2 py-1 rounded-md hover:bg-accent text-muted-foreground hover:text-foreground transition-colors"
              >
                <Home className="h-3.5 w-3.5" />
                <span className="hidden sm:inline">{item.name}</span>
              </button>
            ) : isLast ? (
              <span className="px-2 py-1 font-medium text-foreground truncate max-w-[200px]">
                {item.name}
              </span>
            ) : (
              <button
                onClick={() => onNavigate(item.id, index)}
                className="px-2 py-1 rounded-md hover:bg-accent text-muted-foreground hover:text-foreground transition-colors truncate max-w-[150px]"
              >
                {item.name}
              </button>
            )}
          </div>
        )
      })}
    </nav>
  )
}

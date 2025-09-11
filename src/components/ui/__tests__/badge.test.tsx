// ===================================================
// 📁 Archivo: badge.test.tsx
// 📌 Ubicación: src/components/ui/__tests__/badge.test.tsx
// 🔧 Descripción: Tests para el componente Badge
//
// 🧠 Uso: Validar variantes y estilos del Badge
// ✍️ Autor: Sistema GYS
// 📅 Última actualización: 2025-01-20
// ===================================================

import { render, screen } from '@testing-library/react'
import { Badge } from '../badge'

describe('🧪 Badge Component', () => {
  it('✅ should render with default variant', () => {
    render(<Badge>Default Badge</Badge>)
    const badge = screen.getByText('Default Badge')
    expect(badge).toBeInTheDocument()
    expect(badge).toHaveClass('bg-blue-500', 'text-white')
  })

  it('✅ should render with outline variant', () => {
    render(<Badge variant="outline">Outline Badge</Badge>)
    const badge = screen.getByText('Outline Badge')
    expect(badge).toBeInTheDocument()
    expect(badge).toHaveClass('border', 'border-gray-300', 'text-gray-800')
  })

  it('✅ should render with secondary variant', () => {
    render(<Badge variant="secondary">Secondary Badge</Badge>)
    const badge = screen.getByText('Secondary Badge')
    expect(badge).toBeInTheDocument()
    expect(badge).toHaveClass('bg-gray-200', 'text-gray-800')
  })

  it('✅ should render with destructive variant', () => {
    render(<Badge variant="destructive">Destructive Badge</Badge>)
    const badge = screen.getByText('Destructive Badge')
    expect(badge).toBeInTheDocument()
    expect(badge).toHaveClass('bg-red-500', 'text-white')
  })

  it('✅ should apply custom className', () => {
    render(<Badge className="custom-class">Custom Badge</Badge>)
    const badge = screen.getByText('Custom Badge')
    expect(badge).toBeInTheDocument()
    expect(badge).toHaveClass('custom-class')
  })

  it('✅ should render with children content', () => {
    render(
      <Badge>
        <span>Icon</span>
        Text Content
      </Badge>
    )
    expect(screen.getByText('Icon')).toBeInTheDocument()
    expect(screen.getByText('Text Content')).toBeInTheDocument()
  })
})

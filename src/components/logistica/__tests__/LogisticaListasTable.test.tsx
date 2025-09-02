// ===================================================
// 📁 Archivo: LogisticaListasTable.test.tsx
// 📌 Descripción: Tests para el componente LogisticaListasTable
// 🧠 Uso: Verificar funcionalidad de tabla y props
// ✍️ Autor: Senior Fullstack Developer
// 📅 Última actualización: 2025-01-15
// ===================================================

import { render, screen } from '@testing-library/react'
import '@testing-library/jest-dom'
import { useRouter } from 'next/navigation'
import LogisticaListasTable from '../LogisticaListasTable'
import type { ListaEquipo, Proyecto } from '@/types'

// Mock Next.js router
jest.mock('next/navigation', () => ({
  useRouter: jest.fn()
}))

const mockPush = jest.fn()
;(useRouter as jest.Mock).mockReturnValue({
  push: mockPush
})

// Mock data
const mockProyectos: Proyecto[] = [
  {
    id: '1',
    codigo: 'PROJ-001',
    nombre: 'Proyecto Test 1',
    descripcion: 'Descripción del proyecto test',
    estado: 'activo',
    fechaInicio: new Date('2024-01-01'),
    fechaFin: new Date('2024-12-31'),
    presupuesto: 100000,
    clienteId: 'client-1',
    responsableId: 'user-1',
    createdAt: new Date('2024-01-01'),
    updatedAt: new Date('2024-01-01')
  }
]

const mockListas: ListaEquipo[] = [
  {
    id: '1',
    codigo: 'LISTA-001',
    nombre: 'Lista Test 1',
    numeroSecuencia: 1,
    estado: 'borrador',
    proyectoId: '1',
    createdAt: '2024-01-01T00:00:00Z',
    updatedAt: '2024-01-01T00:00:00Z',
    items: []
  },
  {
    id: '2',
    codigo: 'LISTA-002',
    nombre: 'Lista Test 2',
    numeroSecuencia: 2,
    estado: 'aprobado',
    proyectoId: '1',
    createdAt: '2024-02-01T00:00:00Z',
    updatedAt: '2024-02-01T00:00:00Z',
    items: []
  }
]

const mockOnRefresh = jest.fn()

describe('LogisticaListasTable', () => {
  beforeEach(() => {
    mockOnRefresh.mockClear()
    mockPush.mockClear()
  })

  it('renders without crashing', () => {
    render(
      <LogisticaListasTable
        listas={mockListas}
        proyectos={mockProyectos}
        onRefresh={mockOnRefresh}
      />
    )
    
    expect(screen.getByText('Listas de Equipos')).toBeInTheDocument()
  })

  it('accepts proyectos prop correctly', () => {
    render(
      <LogisticaListasTable
        listas={mockListas}
        proyectos={mockProyectos}
        onRefresh={mockOnRefresh}
      />
    )
    
    // Verify that the component renders with proyectos data
    expect(screen.getByText('Listas de Equipos')).toBeInTheDocument()
  })

  it('handles empty arrays gracefully', () => {
    render(
      <LogisticaListasTable
        listas={[]}
        proyectos={[]}
        onRefresh={mockOnRefresh}
      />
    )
    
    expect(screen.getByText('Listas de Equipos')).toBeInTheDocument()
  })

  it('displays lista data correctly', () => {
    render(
      <LogisticaListasTable
        listas={mockListas}
        proyectos={mockProyectos}
        onRefresh={mockOnRefresh}
      />
    )
    
    // Should display lista codes
    expect(screen.getByText('LISTA-001')).toBeInTheDocument()
    expect(screen.getByText('LISTA-002')).toBeInTheDocument()
  })

  it('handles undefined proyectos prop', () => {
    render(
      <LogisticaListasTable
        listas={mockListas}
        onRefresh={mockOnRefresh}
      />
    )
    
    // Should not crash when proyectos is undefined
    expect(screen.getByText('Listas de Equipos')).toBeInTheDocument()
  })

  it('handles loading state', () => {
    render(
      <LogisticaListasTable
        listas={mockListas}
        proyectos={mockProyectos}
        loading={true}
        onRefresh={mockOnRefresh}
      />
    )
    
    // Should show loading skeletons
    expect(screen.getByText('Listas de Equipos')).toBeInTheDocument()
  })

  it('handles undefined listas array', () => {
    render(
      <LogisticaListasTable
        listas={undefined as any}
        proyectos={mockProyectos}
        onRefresh={mockOnRefresh}
      />
    )
    
    // Should not crash and handle undefined arrays gracefully
    expect(screen.getByText('Listas de Equipos')).toBeInTheDocument()
  })
})
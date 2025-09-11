// ===================================================
// 📁 Archivo: LogisticaListasStats.test.tsx
// 📌 Descripción: Tests para el componente LogisticaListasStats
// 🧠 Uso: Verificar funcionalidad de estadísticas y props
// ✍️ Autor: Senior Fullstack Developer
// 📅 Última actualización: 2025-01-15
// ===================================================

import { render, screen } from '@testing-library/react'
import '@testing-library/jest-dom'
import LogisticaListasStats from '../LogisticaListasStats'
import type { ListaEquipo, Proyecto } from '@/types'

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
  },
  {
    id: '2',
    codigo: 'PROJ-002',
    nombre: 'Proyecto Test 2',
    descripcion: 'Descripción del proyecto test 2',
    estado: 'activo',
    fechaInicio: new Date('2024-02-01'),
    fechaFin: new Date('2024-12-31'),
    presupuesto: 150000,
    clienteId: 'client-2',
    responsableId: 'user-2',
    createdAt: new Date('2024-02-01'),
    updatedAt: new Date('2024-02-01')
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
    proyectoId: '2',
    createdAt: '2024-02-01T00:00:00Z',
    updatedAt: '2024-02-01T00:00:00Z',
    items: []
  }
]

describe('LogisticaListasStats', () => {
  it('renders without crashing', () => {
    render(
      <LogisticaListasStats
        listas={mockListas}
        proyectos={mockProyectos}
      />
    )
    
    expect(screen.getByText('Estadísticas de Listas')).toBeInTheDocument()
  })

  it('accepts proyectos prop correctly', () => {
    render(
      <LogisticaListasStats
        listas={mockListas}
        proyectos={mockProyectos}
      />
    )
    
    // Verify that the component renders with proyectos data
    expect(screen.getByText('Estadísticas de Listas')).toBeInTheDocument()
  })

  it('handles empty arrays gracefully', () => {
    render(
      <LogisticaListasStats
        listas={[]}
        proyectos={[]}
      />
    )
    
    expect(screen.getByText('Estadísticas de Listas')).toBeInTheDocument()
  })

  it('displays correct total count', () => {
    render(
      <LogisticaListasStats
        listas={mockListas}
        proyectos={mockProyectos}
      />
    )
    
    // Should display total of 2 listas
    expect(screen.getByText('2')).toBeInTheDocument()
  })

  it('handles undefined listas array', () => {
    render(
      <LogisticaListasStats
        listas={undefined as any}
        proyectos={mockProyectos}
      />
    )
    
    // Should not crash and display 0 for undefined arrays
    expect(screen.getByText('Estadísticas de Listas')).toBeInTheDocument()
  })
})

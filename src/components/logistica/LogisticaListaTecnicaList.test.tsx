// ===================================================
// 📁 Archivo: LogisticaListaTecnicaList.test.tsx
// 📌 Descripción: Tests para el componente LogisticaListaTecnicaList
// 🧠 Uso: Verificar funcionalidad de props y renderizado
// ✍️ Autor: Senior Fullstack Developer
// 📅 Última actualización: 2025-01-15
// ===================================================

import { render, screen } from '@testing-library/react'
import LogisticaListaTecnicaList from './LogisticaListaTecnicaList'
import type { ListaEquipo } from '@/types'

// Mock del componente hijo
jest.mock('./LogisticaListaTecnicaCard', () => {
  return function MockLogisticaListaTecnicaCard({ lista }: { lista: ListaEquipo }) {
    return <div data-testid={`card-${lista.id}`}>{lista.nombre}</div>
  }
})

const mockListas: ListaEquipo[] = [
  {
    id: '1',
    codigo: 'LT-001',
    nombre: 'Lista Test 1',
    numeroSecuencia: 1,
    estado: 'borrador',
    proyectoId: 'proj-1',
    createdAt: '2025-01-15T10:00:00Z',
    updatedAt: '2025-01-15T10:00:00Z',
    items: []
  },
  {
    id: '2',
    codigo: 'LT-002',
    nombre: 'Lista Test 2',
    numeroSecuencia: 2,
    estado: 'por_revisar',
    proyectoId: 'proj-2',
    createdAt: '2025-01-15T11:00:00Z',
    updatedAt: '2025-01-15T11:00:00Z',
    items: []
  }
]

describe('LogisticaListaTecnicaList', () => {
  it('renders correctly with listas prop', () => {
    render(<LogisticaListaTecnicaList listas={mockListas} />)
    
    expect(screen.getByTestId('card-1')).toBeInTheDocument()
    expect(screen.getByTestId('card-2')).toBeInTheDocument()
    expect(screen.getByText('Lista Test 1')).toBeInTheDocument()
    expect(screen.getByText('Lista Test 2')).toBeInTheDocument()
  })

  it('renders empty state when no listas', () => {
    render(<LogisticaListaTecnicaList listas={[]} />)
    
    expect(screen.getByText('No hay listas técnicas disponibles.')).toBeInTheDocument()
  })

  it('accepts onRefresh prop without errors', () => {
    const mockOnRefresh = jest.fn()
    
    render(
      <LogisticaListaTecnicaList 
        listas={mockListas} 
        onRefresh={mockOnRefresh}
      />
    )
    
    expect(screen.getByTestId('card-1')).toBeInTheDocument()
  })

  it('handles empty listas array gracefully', () => {
    render(<LogisticaListaTecnicaList listas={[]} />)
    
    expect(screen.getByText('No hay listas técnicas disponibles.')).toBeInTheDocument()
  })
})
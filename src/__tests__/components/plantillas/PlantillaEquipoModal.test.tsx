// ===================================================
// 📁 Archivo: PlantillaEquipoModal.test.tsx
// 📌 Ubicación: src/components/plantillas/__tests__/
// 🔧 Descripción: Tests para PlantillaEquipoModal
// 🧪 Tipo: Client-side tests (React Testing Library)
// ✍️ Autor: Sistema GYS
// 📅 Fecha: 2025-01-27
// ===================================================

import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { toast } from 'sonner'
import PlantillaEquipoModal from '@/components/plantillas/PlantillaEquipoModal'
import { createPlantillaEquipo } from '@/lib/services/plantillaEquipo'

// ✅ Mock dependencies
jest.mock('sonner', () => ({
  toast: {
    success: jest.fn(),
    error: jest.fn(),
  },
}))

// ✅ Mock framer-motion to avoid animation issues in tests
jest.mock('framer-motion', () => ({
  motion: {
    div: 'div',
    form: 'form',
  },
}))

jest.mock('@/lib/services/plantillaEquipo', () => ({
  createPlantillaEquipo: jest.fn(),
}))

const mockCreatePlantillaEquipo = createPlantillaEquipo as jest.MockedFunction<typeof createPlantillaEquipo>
const mockToast = toast as jest.Mocked<typeof toast>

describe('PlantillaEquipoModal', () => {
  const mockOnCreated = jest.fn()
  const defaultProps = {
    plantillaId: 'test-plantilla-id',
    onCreated: mockOnCreated,
  }

  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('renders trigger button correctly', () => {
    render(<PlantillaEquipoModal {...defaultProps} />)
    
    expect(screen.getByRole('button', { name: /nuevo equipo/i })).toBeInTheDocument()
    expect(screen.getByText('Nuevo Equipo')).toBeInTheDocument()
  })

  it('renders custom trigger when provided', () => {
    const customTrigger = <button>Custom Trigger</button>
    render(<PlantillaEquipoModal {...defaultProps} trigger={customTrigger} />)
    
    expect(screen.getByText('Custom Trigger')).toBeInTheDocument()
  })

  // ✅ Test: Component exports and props validation
  it('accepts required props correctly', () => {
    const props = {
      plantillaId: 'test-id',
      onCreated: jest.fn()
    }
    
    expect(() => render(<PlantillaEquipoModal {...props} />)).not.toThrow()
  })
})
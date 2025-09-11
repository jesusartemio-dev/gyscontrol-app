// 📁 Archivo: CotizacionInfo.test.tsx
// 🎯 Propósito: Tests para el componente CotizacionInfo
// 🔧 Descripción: Tests para el componente CotizacionInfo
// 👤 Autor: Sistema GYS
// 📅 Fecha: 2024

import { render, screen } from '@testing-library/react'
import { CotizacionInfo, CotizacionBadge } from '../CotizacionSelector'
import { CotizacionProveedorItem } from '@/types/modelos'

// 🧪 Mock data para las pruebas
const mockCotizaciones: CotizacionProveedorItem[] = [
  {
    id: 'cot1',
    cotizacionId: 'cotiz1',
    proveedorId: 'prov1',
    precio: 100,
    moneda: 'USD',
    tiempoEntrega: 15,
    tiempoEntregaDias: 15,
    observaciones: 'Test 1',
    fechaCreacion: new Date(),
    fechaActualizacion: new Date(),
    cotizacion: {
      id: 'cotiz1',
      codigo: 'COT-001',
      fechaCreacion: new Date(),
      fechaActualizacion: new Date(),
      fechaVencimiento: new Date(),
      estado: 'ACTIVA',
      observaciones: '',
      usuarioId: 'user1',
      proveedor: {
        id: 'prov1',
        nombre: 'Proveedor Test 1',
        ruc: '12345678901',
        email: 'test1@test.com',
        telefono: '123456789',
        direccion: 'Test Address 1',
        contacto: 'Contact 1',
        fechaCreacion: new Date(),
        fechaActualizacion: new Date()
      }
    }
  },
  {
    id: 'cot2',
    cotizacionId: 'cotiz2',
    proveedorId: 'prov2',
    precio: 200,
    moneda: 'USD',
    tiempoEntrega: 20,
    tiempoEntregaDias: 20,
    observaciones: 'Test 2',
    fechaCreacion: new Date(),
    fechaActualizacion: new Date(),
    cotizacion: {
      id: 'cotiz2',
      codigo: 'COT-002',
      fechaCreacion: new Date(),
      fechaActualizacion: new Date(),
      fechaVencimiento: new Date(),
      estado: 'ACTIVA',
      observaciones: '',
      usuarioId: 'user1',
      proveedor: {
        id: 'prov2',
        nombre: 'Proveedor Test 2',
        ruc: '12345678902',
        email: 'test2@test.com',
        telefono: '123456790',
        direccion: 'Test Address 2',
        contacto: 'Contact 2',
        fechaCreacion: new Date(),
        fechaActualizacion: new Date()
      }
    }
  }
]

describe('CotizacionInfo', () => {
  // ✅ Test: Renderizar sin cotizaciones
  it('should render empty state when no cotizaciones', () => {
    render(
      <CotizacionInfo
        cotizaciones={[]}
        cotizacionSeleccionadaId={undefined}
      />
    )
    
    expect(screen.getByText('Sin cotizaciones')).toBeInTheDocument()
  })

  // ✅ Test: Renderizar cotizaciones sin selección
  it('should render all cotizaciones when none selected', () => {
    render(
      <CotizacionInfo
        cotizaciones={mockCotizaciones}
        cotizacionSeleccionadaId={undefined}
      />
    )
    
    expect(screen.getByText('COT-001')).toBeInTheDocument()
    expect(screen.getByText('COT-002')).toBeInTheDocument()
    expect(screen.getByText('No seleccionada')).toBeInTheDocument()
  })

  // ✅ Test: Renderizar con cotización seleccionada (vista completa)
  it('should highlight selected cotizacion in full view', () => {
    render(
      <CotizacionInfo
        cotizaciones={mockCotizaciones}
        cotizacionSeleccionadaId="cot1"
        compact={false}
      />
    )
    
    expect(screen.getByText('COT-001')).toBeInTheDocument()
    expect(screen.getByText('COT-002')).toBeInTheDocument()
    
    // ✅ Verificar que la seleccionada tiene el ícono de check
    const selectedBadge = screen.getByText('COT-001').closest('span')
    expect(selectedBadge).toHaveClass('bg-green-500')
  })

  // ✅ Test: Renderizar en modo compacto
  it('should render compact view correctly', () => {
    render(
      <CotizacionInfo
        cotizaciones={mockCotizaciones}
        cotizacionSeleccionadaId="cot1"
        compact={true}
      />
    )
    
    expect(screen.getByText('COT-001')).toBeInTheDocument()
    expect(screen.getByText('2 total')).toBeInTheDocument()
    
    // ✅ En modo compacto no debe mostrar todas las cotizaciones
    expect(screen.queryByText('COT-002')).not.toBeInTheDocument()
  })

  // ✅ Test: Manejar cotización sin código
  it('should handle cotizacion without codigo', () => {
    const cotizacionSinCodigo: CotizacionProveedorItem[] = [{
      ...mockCotizaciones[0],
      cotizacion: {
        ...mockCotizaciones[0].cotizacion!,
        codigo: ''
      }
    }]
    
    render(
      <CotizacionInfo
        cotizaciones={cotizacionSinCodigo}
        cotizacionSeleccionadaId={cotizacionSinCodigo[0].id}
      />
    )
    
    expect(screen.getByText('Sin código')).toBeInTheDocument()
  })
})

describe('CotizacionBadge', () => {
  // ✅ Test: Renderizar sin cotización
  it('should render "No seleccionada" when no cotizacion', () => {
    render(<CotizacionBadge cotizacion={undefined} />)
    
    expect(screen.getByText('No seleccionada')).toBeInTheDocument()
  })

  // ✅ Test: Renderizar cotización seleccionada
  it('should render selected cotizacion with green badge', () => {
    render(
      <CotizacionBadge 
        cotizacion={mockCotizaciones[0]} 
        isSelected={true} 
      />
    )
    
    expect(screen.getByText('COT-001')).toBeInTheDocument()
    
    const badge = screen.getByText('COT-001').closest('span')
    expect(badge).toHaveClass('bg-green-500')
  })

  // ✅ Test: Renderizar cotización no seleccionada
  it('should render unselected cotizacion with outline badge', () => {
    render(
      <CotizacionBadge 
        cotizacion={mockCotizaciones[0]} 
        isSelected={false} 
      />
    )
    
    expect(screen.getByText('COT-001')).toBeInTheDocument()
    
    const badge = screen.getByText('COT-001').closest('span')
    expect(badge).not.toHaveClass('bg-green-500')
  })
})

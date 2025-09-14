// ===================================================
// 🧪 Tests: ProveedorImportExport Component
// ===================================================
// 📝 Descripción: Tests unitarios para el componente de importación/exportación de proveedores
// 🔧 Tecnologías: Jest + React Testing Library + MSW
// ✍️ Autor: Senior Fullstack Developer
// 📅 Última actualización: 2025-01-15
// 🔄 Actualizado: Tests para nuevo patrón con BotonesImportExport
// ===================================================

import React from 'react'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { toast } from 'sonner'
import ProveedorImportExport from '@/components/logistica/ProveedorImportExport'
import { exportarProveedoresAExcel, leerProveedoresDesdeExcel, validarProveedores, crearProveedoresEnBD } from '@/lib/utils/proveedorImportUtils'
import type { Proveedor } from '@/types/modelos'

// ✅ Mock dependencies
jest.mock('sonner', () => ({
  toast: {
    success: jest.fn(),
    error: jest.fn(),
    warning: jest.fn(),
  },
}))

jest.mock('@/lib/utils/proveedorImportUtils', () => ({
  exportarProveedoresAExcel: jest.fn(),
  leerProveedoresDesdeExcel: jest.fn(),
  validarProveedores: jest.fn(),
  crearProveedoresEnBD: jest.fn(),
}))

jest.mock('@/components/catalogo/BotonesImportExport', () => ({
  BotonesImportExport: function MockBotonesImportExport({ onExportar, onImportar, importando }: any) {
    return (
      <div data-testid="botones-import-export">
        <button 
          data-testid="export-button" 
          onClick={onExportar}
          disabled={importando}
        >
          Exportar Excel
        </button>
        <input 
          data-testid="import-input"
          type="file"
          accept=".xlsx,.xls"
          onChange={onImportar}
          disabled={importando}
        />
        {importando && <span data-testid="loading">Importando...</span>}
      </div>
    )
  }
}))

const mockProveedores: Proveedor[] = [
  {
    id: '1',
    nombre: 'Proveedor Test 1',
    ruc: '12345678901',
    direccion: 'Dirección Test 1',
    telefono: '123456789',
    correo: 'test1@test.com',
    createdAt: new Date(),
    updatedAt: new Date()
  },
  {
    id: '2',
    nombre: 'Proveedor Test 2',
    ruc: '10987654321',
    direccion: 'Dirección Test 2',
    telefono: '987654321',
    correo: 'test2@test.com',
    createdAt: new Date(),
    updatedAt: new Date()
  }
]

describe('ProveedorImportExport', () => {
  const mockOnImported = jest.fn()
  const mockExportarProveedoresAExcel = exportarProveedoresAExcel as jest.MockedFunction<typeof exportarProveedoresAExcel>
  const mockLeerProveedoresDesdeExcel = leerProveedoresDesdeExcel as jest.MockedFunction<typeof leerProveedoresDesdeExcel>
  const mockValidarProveedores = validarProveedores as jest.MockedFunction<typeof validarProveedores>
  const mockCrearProveedoresEnBD = crearProveedoresEnBD as jest.MockedFunction<typeof crearProveedoresEnBD>

  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('should render BotonesImportExport component', () => {
    render(
      <ProveedorImportExport 
        proveedores={mockProveedores} 
        onImported={mockOnImported}
      />
    )

    expect(screen.getByTestId('botones-import-export')).toBeInTheDocument()
    expect(screen.getByTestId('export-button')).toBeInTheDocument()
    expect(screen.getByTestId('import-input')).toBeInTheDocument()
  })

  it('should call export function when export button is clicked', async () => {
    mockExportarProveedoresAExcel.mockResolvedValue()
    
    render(
      <ProveedorImportExport 
        proveedores={mockProveedores} 
        onImported={mockOnImported}
      />
    )

    const exportButton = screen.getByTestId('export-button')
    fireEvent.click(exportButton)

    await waitFor(() => {
      expect(mockExportarProveedoresAExcel).toHaveBeenCalledWith(mockProveedores)
      expect(toast.success).toHaveBeenCalledWith('2 proveedores exportados exitosamente')
    })
  })

  it('should handle successful import', async () => {
    const mockFile = new File(['test'], 'test.xlsx', { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' })
    const mockImportData = [
      { nombre: 'Nuevo Proveedor', ruc: '11111111111', direccion: 'Test', telefono: '123', correo: 'test@test.com' }
    ]
    const mockValidationResult = {
      nuevos: mockImportData,
      errores: [],
      duplicados: []
    }
    const mockCreatedProveedores = [{ id: '3', ...mockImportData[0] }]

    mockLeerProveedoresDesdeExcel.mockResolvedValue(mockImportData)
    mockValidarProveedores.mockReturnValue(mockValidationResult)
    mockCrearProveedoresEnBD.mockResolvedValue(mockCreatedProveedores)

    render(
      <ProveedorImportExport 
        proveedores={mockProveedores} 
        onImported={mockOnImported}
      />
    )

    const fileInput = screen.getByTestId('import-input')
    fireEvent.change(fileInput, { target: { files: [mockFile] } })

    await waitFor(() => {
      expect(mockLeerProveedoresDesdeExcel).toHaveBeenCalledWith(mockFile)
      expect(mockValidarProveedores).toHaveBeenCalledWith(mockImportData, mockProveedores)
      expect(mockCrearProveedoresEnBD).toHaveBeenCalledWith(mockImportData)
      expect(toast.success).toHaveBeenCalledWith('1 proveedores importados exitosamente')
      expect(mockOnImported).toHaveBeenCalled()
    })
  })

  it('should show loading state during import', async () => {
    const mockFile = new File(['test'], 'test.xlsx', { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' })
    
    // Mock a delayed response
    mockLeerProveedoresDesdeExcel.mockImplementation(() => 
      new Promise(resolve => setTimeout(() => resolve([]), 100))
    )
    mockValidarProveedores.mockReturnValue({ nuevos: [], errores: [], duplicados: [] })
    mockCrearProveedoresEnBD.mockResolvedValue([])

    render(
      <ProveedorImportExport 
        proveedores={mockProveedores} 
        onImported={mockOnImported}
      />
    )

    const fileInput = screen.getByTestId('import-input')
    fireEvent.change(fileInput, { target: { files: [mockFile] } })

    // Should show loading state
    expect(screen.getByTestId('loading')).toBeInTheDocument()
    expect(screen.getByTestId('export-button')).toBeDisabled()
    expect(screen.getByTestId('import-input')).toBeDisabled()

    await waitFor(() => {
      expect(screen.queryByTestId('loading')).not.toBeInTheDocument()
    })
  })

  it('should handle export error', async () => {
    mockExportarProveedoresAExcel.mockImplementation(() => {
      throw new Error('Export error')
    })

    render(
      <ProveedorImportExport 
        proveedores={mockProveedores} 
        onImported={mockOnImported}
      />
    )

    const exportButton = screen.getByTestId('export-button')
    fireEvent.click(exportButton)

    await waitFor(() => {
      expect(toast.error).toHaveBeenCalledWith('Error al exportar proveedores')
    })
  })

  it('should handle import error', async () => {
    const mockFile = new File(['test'], 'test.xlsx', { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' })
    
    mockLeerProveedoresDesdeExcel.mockRejectedValue(new Error('Import error'))

    render(
      <ProveedorImportExport 
        proveedores={mockProveedores} 
        onImported={mockOnImported}
      />
    )

    const fileInput = screen.getByTestId('import-input')
    fireEvent.change(fileInput, { target: { files: [mockFile] } })

    await waitFor(() => {
      expect(toast.error).toHaveBeenCalledWith('Error inesperado en la importación')
    })
  })

  it('should handle validation errors and duplicates', async () => {
    const mockFile = new File(['test'], 'test.xlsx', { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' })
    const mockImportData = [
      { nombre: 'Nuevo Proveedor', ruc: '11111111111' },
      { nombre: 'Proveedor Duplicado', ruc: '12345678901' }
    ]
    const mockValidationResult = {
      nuevos: [mockImportData[0]],
      errores: ['Error en fila 3: RUC inválido'],
      duplicados: [mockImportData[1]]
    }

    mockLeerProveedoresDesdeExcel.mockResolvedValue(mockImportData)
    mockValidarProveedores.mockReturnValue(mockValidationResult)
    mockCrearProveedoresEnBD.mockResolvedValue([{ id: '3', ...mockImportData[0] }])

    render(
      <ProveedorImportExport 
        proveedores={mockProveedores} 
        onImported={mockOnImported}
      />
    )

    const fileInput = screen.getByTestId('import-input')
    fireEvent.change(fileInput, { target: { files: [mockFile] } })

    await waitFor(() => {
      expect(toast.success).toHaveBeenCalledWith('1 proveedores importados exitosamente')
      expect(mockOnImported).toHaveBeenCalled()
    })
  })

  it('should handle case when no new providers to import', async () => {
    const mockFile = new File(['test'], 'test.xlsx', { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' })
    const mockImportData = [
      { nombre: 'Proveedor Duplicado', ruc: '12345678901' }
    ]
    const mockValidationResult = {
      nuevos: [],
      errores: [],
      duplicados: mockImportData
    }

    mockLeerProveedoresDesdeExcel.mockResolvedValue(mockImportData)
    mockValidarProveedores.mockReturnValue(mockValidationResult)

    render(
      <ProveedorImportExport 
        proveedores={mockProveedores} 
        onImported={mockOnImported}
      />
    )

    const fileInput = screen.getByTestId('import-input')
    fireEvent.change(fileInput, { target: { files: [mockFile] } })

    await waitFor(() => {
      expect(toast.success).toHaveBeenCalledWith('0 proveedores importados exitosamente')
      expect(mockCrearProveedoresEnBD).not.toHaveBeenCalled()
      expect(mockOnImported).toHaveBeenCalled()
    })
  })

  it('should call onErrores when validation errors occur', async () => {
    const mockOnErrores = jest.fn()
    const mockFile = new File(['test'], 'test.xlsx', { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' })
    const mockImportData = [
      { nombre: 'Proveedor Inválido', ruc: 'invalid' }
    ]
    const mockValidationResult = {
      nuevos: [],
      errores: ['Error en fila 2: RUC inválido', 'Error en fila 3: Nombre requerido'],
      duplicados: []
    }

    mockLeerProveedoresDesdeExcel.mockResolvedValue(mockImportData)
    mockValidarProveedores.mockReturnValue(mockValidationResult)

    render(
      <ProveedorImportExport 
        proveedores={mockProveedores} 
        onImported={mockOnImported}
        onErrores={mockOnErrores}
      />
    )

    const fileInput = screen.getByTestId('import-input')
    fireEvent.change(fileInput, { target: { files: [mockFile] } })

    await waitFor(() => {
      expect(mockOnErrores).toHaveBeenCalledWith(['Error en fila 2: RUC inválido', 'Error en fila 3: Nombre requerido'])
      expect(toast.success).toHaveBeenCalledWith('0 proveedores importados exitosamente')
      expect(toast.error).not.toHaveBeenCalled()
    })
  })

  it('should handle empty file', async () => {
    const mockFile = new File([''], 'empty.xlsx', { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' })
    
    mockLeerProveedoresDesdeExcel.mockResolvedValue([])
    mockValidarProveedores.mockReturnValue({ nuevos: [], errores: [], duplicados: [] })

    render(
      <ProveedorImportExport 
        proveedores={mockProveedores} 
        onImported={mockOnImported}
      />
    )

    const fileInput = screen.getByTestId('import-input')
    fireEvent.change(fileInput, { target: { files: [mockFile] } })

    await waitFor(() => {
      expect(toast.success).toHaveBeenCalledWith('0 proveedores importados exitosamente')
      expect(mockOnImported).toHaveBeenCalled()
    })
  })

  it('should handle file input without file selection', () => {
    render(
      <ProveedorImportExport 
        proveedores={mockProveedores} 
        onImported={mockOnImported}
      />
    )

    const fileInput = screen.getByTestId('import-input')
    fireEvent.change(fileInput, { target: { files: null } })

    // Should not trigger any import process
    expect(mockLeerProveedoresDesdeExcel).not.toHaveBeenCalled()
  })
})
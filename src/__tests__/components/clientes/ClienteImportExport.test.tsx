/**
 * @fileoverview Tests for ClienteImportExport component
 * @author GYS Team
 * @created 2024
 */

import React from 'react'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { toast } from 'sonner'
import ClienteImportExport from '@/components/clientes/ClienteImportExport'
import * as clienteImportUtils from '@/lib/utils/clienteImportUtils'
import * as clienteExcel from '@/lib/utils/clienteExcel'
import type { Cliente } from '@/types'

// ✅ Mock dependencies
jest.mock('sonner', () => ({
  toast: {
    success: jest.fn(),
    error: jest.fn(),
    warning: jest.fn(),
    info: jest.fn(),
    loading: jest.fn(),
    dismiss: jest.fn()
  }
}))

jest.mock('@/lib/utils/clienteImportUtils')
jest.mock('@/lib/utils/clienteExcel')

// ✅ Mock BotonesImportExport component
jest.mock('@/components/catalogo/BotonesImportExport', () => ({
  BotonesImportExport: function MockBotonesImportExport({ onExportar, onImportar, importando }: any) {
    return (
      <div data-testid="botones-import-export">
        <button 
          data-testid="export-button"
          onClick={onExportar}
        >
          Exportar Excel
        </button>
        <label>
          <input 
            data-testid="import-input"
            type="file" 
            accept=".xlsx" 
            onChange={onImportar}
            disabled={importando}
          />
          {importando ? 'Importando...' : 'Importar Excel'}
        </label>
      </div>
    )
  }
}))

const mockClienteImportUtils = clienteImportUtils as jest.Mocked<typeof clienteImportUtils>
const mockClienteExcel = clienteExcel as jest.Mocked<typeof clienteExcel>

// ✅ Mock data
const mockClientes: Cliente[] = [
  {
    id: '1',
    nombre: 'Cliente Test 1',
    ruc: '20123456789',
    direccion: 'Av. Test 123',
    telefono: '987654321',
    correo: 'test1@example.com',
    createdAt: new Date(),
    updatedAt: new Date()
  },
  {
    id: '2',
    nombre: 'Cliente Test 2',
    ruc: '20987654321',
    direccion: 'Jr. Test 456',
    telefono: '123456789',
    correo: 'test2@example.com',
    createdAt: new Date(),
    updatedAt: new Date()
  }
]

const mockClientesImportados = [
  {
    nombre: 'Nuevo Cliente',
    ruc: '20111111111',
    direccion: 'Av. Nueva 789',
    telefono: '555666777',
    correo: 'nuevo@example.com'
  }
]

const defaultProps = {
  clientes: mockClientes,
  onImported: jest.fn(),
  onImportErrors: jest.fn()
}

describe('ClienteImportExport', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  // ✅ Rendering tests
  describe('Rendering', () => {
    it('should render BotonesImportExport component', () => {
      render(<ClienteImportExport {...defaultProps} />)
      
      expect(screen.getByTestId('botones-import-export')).toBeInTheDocument()
      expect(screen.getByTestId('export-button')).toBeInTheDocument()
      expect(screen.getByTestId('import-input')).toBeInTheDocument()
    })

    it('should render correct button texts', () => {
      render(<ClienteImportExport {...defaultProps} />)
      
      expect(screen.getByText('Exportar Excel')).toBeInTheDocument()
      expect(screen.getByText('Importar Excel')).toBeInTheDocument()
    })
  })

  // ✅ Export functionality tests
  describe('Export Functionality', () => {
    it('should call exportarClientesAExcel when export button is clicked', async () => {
      mockClienteExcel.exportarClientesAExcel.mockResolvedValue(undefined)
      
      render(<ClienteImportExport {...defaultProps} />)
      
      const exportButton = screen.getByTestId('export-button')
      fireEvent.click(exportButton)
      
      await waitFor(() => {
        expect(mockClienteExcel.exportarClientesAExcel).toHaveBeenCalledWith(mockClientes)
      })
    })

    it('should show success toast on successful export', async () => {
      mockClienteExcel.exportarClientesAExcel.mockResolvedValue(undefined)
      
      render(<ClienteImportExport {...defaultProps} />)
      
      const exportButton = screen.getByTestId('export-button')
      fireEvent.click(exportButton)
      
      await waitFor(() => {
        expect(toast.success).toHaveBeenCalledWith('2 clientes exportados exitosamente')
      })
    })

    it('should show error toast on export failure', async () => {
      const errorMessage = 'Export failed'
      mockClienteExcel.exportarClientesAExcel.mockImplementation(() => {
        throw new Error(errorMessage)
      })
      
      render(<ClienteImportExport {...defaultProps} />)
      
      const exportButton = screen.getByTestId('export-button')
      fireEvent.click(exportButton)
      
      await waitFor(() => {
        expect(toast.error).toHaveBeenCalledWith('Error al exportar clientes')
      })
    })
  })

  // ✅ Import functionality tests
  describe('Import Functionality', () => {
    it('should handle file selection and import', async () => {
      const file = new File(['test content'], 'clientes.xlsx', {
        type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
      })

      mockClienteImportUtils.leerClientesDesdeExcel.mockResolvedValue(mockClientesImportados)
      mockClienteImportUtils.validarClientes.mockReturnValue({ 
        nuevos: mockClientesImportados, 
        errores: [], 
        duplicados: [] 
      })
      mockClienteImportUtils.crearClientesEnBD.mockResolvedValue({ creados: 1 })
      
      render(<ClienteImportExport {...defaultProps} />)
      
      const fileInput = screen.getByTestId('import-input')
      fireEvent.change(fileInput, { target: { files: [file] } })
      
      await waitFor(() => {
        expect(mockClienteImportUtils.leerClientesDesdeExcel).toHaveBeenCalledWith(file)
        expect(mockClienteImportUtils.validarClientes).toHaveBeenCalled()
        expect(mockClienteImportUtils.crearClientesEnBD).toHaveBeenCalledWith(mockClientesImportados)
      })
    })

    it('should show validation errors when import has invalid data', async () => {
      const file = new File(['test content'], 'clientes.xlsx', {
        type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
      })
      const errores = ['RUC inválido en fila 2', 'Email inválido en fila 3']

      mockClienteImportUtils.leerClientesDesdeExcel.mockResolvedValue(mockClientesImportados)
      mockClienteImportUtils.validarClientes.mockReturnValue({ 
        nuevos: [], 
        errores, 
        duplicados: [] 
      })
      
      render(<ClienteImportExport {...defaultProps} />)
      
      const fileInput = screen.getByTestId('import-input')
      fireEvent.change(fileInput, { target: { files: [file] } })
      
      await waitFor(() => {
        expect(defaultProps.onImportErrors).toHaveBeenCalledWith(errores)
        expect(toast.error).toHaveBeenCalledWith('Se encontraron 2 errores de validación')
      })
    })

    it('should call onImported callback on successful import', async () => {
      const file = new File(['test content'], 'clientes.xlsx', {
        type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
      })

      mockClienteImportUtils.leerClientesDesdeExcel.mockResolvedValue(mockClientesImportados)
      mockClienteImportUtils.validarClientes.mockReturnValue({ 
        nuevos: mockClientesImportados, 
        errores: [], 
        duplicados: [] 
      })
      mockClienteImportUtils.crearClientesEnBD.mockResolvedValue({ creados: 1 })
      
      render(<ClienteImportExport {...defaultProps} />)
      
      const fileInput = screen.getByTestId('import-input')
      fireEvent.change(fileInput, { target: { files: [file] } })
      
      await waitFor(() => {
        expect(defaultProps.onImported).toHaveBeenCalled()
        expect(toast.success).toHaveBeenCalledWith('1 clientes importados exitosamente')
      })
    })

    it('should handle file reading errors', async () => {
      const file = new File(['test content'], 'clientes.xlsx', {
        type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
      })
      const errorMessage = 'File reading failed'

      mockClienteImportUtils.leerClientesDesdeExcel.mockRejectedValue(new Error(errorMessage))
      
      render(<ClienteImportExport {...defaultProps} />)
      
      const fileInput = screen.getByTestId('import-input')
      fireEvent.change(fileInput, { target: { files: [file] } })
      
      await waitFor(() => {
        expect(toast.error).toHaveBeenCalledWith('Error al importar clientes')
      })
    })

    it('should handle database creation errors', async () => {
      const file = new File(['test content'], 'clientes.xlsx', {
        type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
      })
      const errorMessage = 'Database error'

      mockClienteImportUtils.leerClientesDesdeExcel.mockResolvedValue(mockClientesImportados)
      mockClienteImportUtils.validarClientes.mockReturnValue({ 
        nuevos: mockClientesImportados, 
        errores: [], 
        duplicados: [] 
      })
      mockClienteImportUtils.crearClientesEnBD.mockRejectedValue(new Error(errorMessage))
      
      render(<ClienteImportExport {...defaultProps} />)
      
      const fileInput = screen.getByTestId('import-input')
      fireEvent.change(fileInput, { target: { files: [file] } })
      
      await waitFor(() => {
        expect(toast.error).toHaveBeenCalledWith('Error al importar clientes')
      })
    })
  })

  // ✅ Loading states tests
  describe('Loading States', () => {
    it('should show loading state during import', async () => {
      const file = new File(['test content'], 'clientes.xlsx', {
        type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
      })
      
      let resolveImport: () => void
      const importPromise = new Promise<typeof mockClientesImportados>((resolve) => {
        resolveImport = () => resolve(mockClientesImportados)
      })
      mockClienteImportUtils.leerClientesDesdeExcel.mockReturnValue(importPromise)
      mockClienteImportUtils.validarClientes.mockReturnValue({ 
        nuevos: mockClientesImportados, 
        errores: [], 
        duplicados: [] 
      })
      mockClienteImportUtils.crearClientesEnBD.mockResolvedValue({ creados: 1 })
      
      render(<ClienteImportExport {...defaultProps} />)
      
      const fileInput = screen.getByTestId('import-input')
      fireEvent.change(fileInput, { target: { files: [file] } })
      
      // Check that import is in progress
      expect(screen.getByText('Importando...')).toBeInTheDocument()
      
      resolveImport!()
      await waitFor(() => {
        expect(screen.getByText('Importar Excel')).toBeInTheDocument()
      })
    })

  })

  // ✅ Edge cases
  describe('Edge Cases', () => {
    it('should handle empty clientes array for export', async () => {
      mockClienteExcel.exportarClientesAExcel.mockResolvedValue(undefined)
      
      render(<ClienteImportExport {...{ ...defaultProps, clientes: [] }} />)
      
      const exportButton = screen.getByTestId('export-button')
      fireEvent.click(exportButton)
      
      await waitFor(() => {
        expect(mockClienteExcel.exportarClientesAExcel).toHaveBeenCalledWith([])
        expect(toast.success).toHaveBeenCalledWith('0 clientes exportados exitosamente')
      })
    })

    it('should handle no file selected', () => {
      render(<ClienteImportExport {...defaultProps} />)
      
      const fileInput = screen.getByTestId('import-input')
      fireEvent.change(fileInput, { target: { files: [] } })
      
      // Should not call import functions when no file is selected
      expect(mockClienteImportUtils.leerClientesDesdeExcel).not.toHaveBeenCalled()
    })

    it('should handle duplicates warning', async () => {
      const file = new File(['test content'], 'clientes.xlsx', {
        type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
      })
      const duplicados = ['Cliente duplicado 1']

      mockClienteImportUtils.leerClientesDesdeExcel.mockResolvedValue(mockClientesImportados)
      mockClienteImportUtils.validarClientes.mockReturnValue({ 
        nuevos: mockClientesImportados, 
        errores: [], 
        duplicados 
      })
      mockClienteImportUtils.crearClientesEnBD.mockResolvedValue({ creados: 1 })
      
      render(<ClienteImportExport {...defaultProps} />)
      
      const fileInput = screen.getByTestId('import-input')
      fireEvent.change(fileInput, { target: { files: [file] } })
      
      await waitFor(() => {
        expect(toast.warning).toHaveBeenCalledWith('Se omitieron 1 clientes duplicados')
        expect(toast.success).toHaveBeenCalledWith('1 clientes importados exitosamente')
      })
    })

    it('should handle no new clients to import', async () => {
      const file = new File(['test content'], 'clientes.xlsx', {
        type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
      })

      mockClienteImportUtils.leerClientesDesdeExcel.mockResolvedValue(mockClientesImportados)
      mockClienteImportUtils.validarClientes.mockReturnValue({ 
        nuevos: [], 
        errores: [], 
        duplicados: [] 
      })
      
      render(<ClienteImportExport {...defaultProps} />)
      
      const fileInput = screen.getByTestId('import-input')
      fireEvent.change(fileInput, { target: { files: [file] } })
      
      await waitFor(() => {
        expect(toast.info).toHaveBeenCalledWith('No hay clientes nuevos para importar')
      })
    })
  })
})
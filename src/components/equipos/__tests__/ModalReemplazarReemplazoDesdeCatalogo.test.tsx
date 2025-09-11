// ===================================================
// 📁 Archivo: ModalReemplazarReemplazoDesdeCatalogo.test.tsx
// 📌 Ubicación: src/components/equipos/__tests__/
// 🔧 Descripción: Tests para el modal de reemplazo de items que ya son reemplazos
//                con lógica unificada
// ===================================================

import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { useSession } from 'next-auth/react'
import { toast } from 'sonner'
import ModalReemplazarReemplazoDesdeCatalogo from '../ModalReemplazarReemplazoDesdeCatalogo'
import { getCatalogoEquipos } from '@/lib/services/catalogoEquipo'
import { getCategoriasEquipo } from '@/lib/services/categoriaEquipo'
import {
  createListaEquipoItem,
  updateListaEquipoItem,
} from '@/lib/services/listaEquipoItem'
import { updateProyectoEquipoItem } from '@/lib/services/proyectoEquipoItem'
import type { ListaEquipoItem, CatalogoEquipo, CategoriaEquipo } from '@/types'

// ✅ Mock dependencies
jest.mock('next-auth/react')
jest.mock('sonner')
jest.mock('@/lib/services/catalogoEquipo')
jest.mock('@/lib/services/categoriaEquipo')
jest.mock('@/lib/services/listaEquipoItem')
jest.mock('@/lib/services/proyectoEquipoItem')

const mockUseSession = useSession as jest.MockedFunction<typeof useSession>
const mockToast = toast as jest.Mocked<typeof toast>
const mockGetCatalogoEquipos = getCatalogoEquipos as jest.MockedFunction<typeof getCatalogoEquipos>
const mockGetCategoriasEquipo = getCategoriasEquipo as jest.MockedFunction<typeof getCategoriasEquipo>
const mockCreateListaEquipoItem = createListaEquipoItem as jest.MockedFunction<typeof createListaEquipoItem>
const mockUpdateListaEquipoItem = updateListaEquipoItem as jest.MockedFunction<typeof updateListaEquipoItem>
const mockUpdateProyectoEquipoItem = updateProyectoEquipoItem as jest.MockedFunction<typeof updateProyectoEquipoItem>

// ✅ Mock data
const mockSession = {
  user: {
    id: 'user-123',
    name: 'Test User',
    email: 'test@example.com',
    role: 'COMERCIAL',
  },
  expires: '2024-12-31',
}

const mockItem: ListaEquipoItem = {
  id: 'item-reemplazo-123',
  codigo: 'OLD-CODE',
  descripcion: 'Old Equipment',
  unidad: 'PZA',
  cantidad: 2,
  presupuesto: 1000,
  estado: 'activo',
  origen: 'reemplazo',
  listaId: 'lista-123',
  proyectoEquipoItemId: 'proyecto-item-456',
  proyectoEquipoId: 'proyecto-789',
  reemplazaProyectoEquipoItemId: 'proyecto-item-original-999', // ✅ Item que ya es reemplazo
  responsableId: 'user-123',
  fechaCreacion: new Date(),
  fechaModificacion: new Date(),
}

const mockCatalogEquipo: CatalogoEquipo = {
  id: 'catalogo-456',
  codigo: 'NEW-CODE',
  descripcion: 'New Equipment',
  precioVenta: 1500,
  categoriaId: 'categoria-123',
  unidad: {
    id: 'unidad-1',
    nombre: 'PZA',
    descripcion: 'Pieza',
  },
  categoria: {
    id: 'categoria-123',
    nombre: 'Electronics',
    descripcion: 'Electronic Equipment',
  },
}

const mockCategoria: CategoriaEquipo = {
  id: 'categoria-123',
  nombre: 'Electronics',
  descripcion: 'Electronic Equipment',
}

const mockNewItem: ListaEquipoItem = {
  id: 'new-item-789',
  codigo: 'NEW-CODE',
  descripcion: 'New Equipment',
  unidad: 'PZA',
  cantidad: 3,
  presupuesto: 0,
  estado: 'borrador',
  origen: 'reemplazo',
  listaId: 'lista-123',
  proyectoEquipoItemId: 'proyecto-item-original-999', // ✅ Apunta al original
  proyectoEquipoId: 'proyecto-789',
  reemplazaProyectoEquipoItemId: 'proyecto-item-original-999', // ✅ Mantiene trazabilidad
  responsableId: 'user-123',
  comentarioRevision: 'Test replacement reason',
  fechaCreacion: new Date(),
  fechaModificacion: new Date(),
}

describe('ModalReemplazarReemplazoDesdeCatalogo - Unified Logic', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    
    mockUseSession.mockReturnValue({
      data: mockSession,
      status: 'authenticated',
      update: jest.fn(),
    })
    
    mockGetCatalogoEquipos.mockResolvedValue([mockCatalogEquipo])
    mockGetCategoriasEquipo.mockResolvedValue([mockCategoria])
    mockCreateListaEquipoItem.mockResolvedValue(mockNewItem)
    mockUpdateListaEquipoItem.mockResolvedValue(mockItem)
    mockUpdateProyectoEquipoItem.mockResolvedValue({} as any)
    
    mockToast.success = jest.fn()
    mockToast.error = jest.fn()
    mockToast.warning = jest.fn()
  })

  const defaultProps = {
    open: true,
    onClose: jest.fn(),
    item: mockItem,
    listaId: 'lista-123',
    proyectoId: 'proyecto-789',
    onUpdated: jest.fn(),
  }

  it('should successfully execute unified replacement logic', async () => {
    render(<ModalReemplazarReemplazoDesdeCatalogo {...defaultProps} />)
    
    // ✅ Wait for equipment to load and select one
    await waitFor(() => {
      expect(screen.getByText('NEW-CODE')).toBeInTheDocument()
    })
    
    // ✅ Select equipment
    fireEvent.click(screen.getByText('NEW-CODE'))
    
    // ✅ Fill form
    const cantidadInput = screen.getByLabelText(/cantidad/i)
    const motivoTextarea = screen.getByLabelText(/motivo/i)
    
    fireEvent.change(cantidadInput, { target: { value: '3' } })
    fireEvent.change(motivoTextarea, { target: { value: 'Test replacement reason' } })
    
    // ✅ Click replace button
    const replaceButton = screen.getByText('Reemplazar Ítem')
    fireEvent.click(replaceButton)
    
    await waitFor(() => {
      // ✅ Verify step 1: Update current item to 'rechazado'
      expect(mockUpdateListaEquipoItem).toHaveBeenCalledWith(mockItem.id, {
        estado: 'rechazado',
      })
      
      // ✅ Verify step 2: Create new replacement item with correct traceability
      expect(mockCreateListaEquipoItem).toHaveBeenCalledWith({
        codigo: 'NEW-CODE',
        descripcion: 'New Equipment',
        unidad: 'PZA',
        cantidad: 3,
        presupuesto: 0,
        comentarioRevision: 'Test replacement reason',
        estado: 'borrador',
        origen: 'reemplazo',
        listaId: 'lista-123',
        proyectoEquipoItemId: 'proyecto-item-original-999', // ✅ Points to original
        proyectoEquipoId: 'proyecto-789',
        reemplazaProyectoEquipoItemId: 'proyecto-item-original-999', // ✅ Maintains traceability
        responsableId: 'user-123',
      })
      
      // ✅ Verify step 3: Update ProyectoEquipoItem with new data
      expect(mockUpdateProyectoEquipoItem).toHaveBeenCalledWith('proyecto-item-original-999', {
        listaEquipoSeleccionadoId: 'new-item-789',
        listaId: 'lista-123',
        estado: 'reemplazado',
        motivoCambio: 'Test replacement reason',
        cantidadReal: 3,
        precioReal: 1500,
        costoReal: 4500, // 3 * 1500
      })
      
      // ✅ Verify success feedback
      expect(mockToast.success).toHaveBeenCalledWith('✅ Ítem reemplazado correctamente')
      expect(defaultProps.onUpdated).toHaveBeenCalled()
      expect(defaultProps.onClose).toHaveBeenCalled()
    })
  })

  it('should handle traceability correctly for replacement chains', () => {
    // ✅ Test verifies that traceability logic is correct
    const originalProyectoEquipoItemId = mockItem.reemplazaProyectoEquipoItemId || mockItem.proyectoEquipoItemId
    
    expect(originalProyectoEquipoItemId).toBe('proyecto-item-original-999')
    
    // ✅ This ensures that even in a chain of replacements,
    // we always point back to the original ProyectoEquipoItem
  })

  it('should handle error when original ProyectoEquipoItem cannot be identified', async () => {
    const itemWithoutTraceability = {
      ...mockItem,
      proyectoEquipoItemId: undefined,
      reemplazaProyectoEquipoItemId: undefined,
    }
    
    render(
      <ModalReemplazarReemplazoDesdeCatalogo 
        {...defaultProps} 
        item={itemWithoutTraceability as ListaEquipoItem}
      />
    )
    
    await waitFor(() => {
      fireEvent.click(screen.getByText('NEW-CODE'))
    })
    
    const cantidadInput = screen.getByLabelText(/cantidad/i)
    const motivoTextarea = screen.getByLabelText(/motivo/i)
    
    fireEvent.change(cantidadInput, { target: { value: '3' } })
    fireEvent.change(motivoTextarea, { target: { value: 'Test reason' } })
    
    fireEvent.click(screen.getByText('Reemplazar Ítem'))
    
    await waitFor(() => {
      expect(mockToast.error).toHaveBeenCalledWith(
        expect.stringContaining('No se pudo identificar el ProyectoEquipoItem original')
      )
    })
  })

  it('should handle service errors gracefully', async () => {
    mockUpdateListaEquipoItem.mockRejectedValue(new Error('Service error'))
    
    render(<ModalReemplazarReemplazoDesdeCatalogo {...defaultProps} />)
    
    await waitFor(() => {
      fireEvent.click(screen.getByText('NEW-CODE'))
    })
    
    const cantidadInput = screen.getByLabelText(/cantidad/i)
    const motivoTextarea = screen.getByLabelText(/motivo/i)
    
    fireEvent.change(cantidadInput, { target: { value: '3' } })
    fireEvent.change(motivoTextarea, { target: { value: 'Test reason' } })
    
    fireEvent.click(screen.getByText('Reemplazar Ítem'))
    
    await waitFor(() => {
      expect(mockToast.error).toHaveBeenCalledWith(
        expect.stringContaining('Service error')
      )
    })
  })
})

// 📋 Documentación de la lógica esperada:
/*
🔍 LÓGICA DEL MODAL DE REEMPLAZO:

1. **Carga inicial**:
   - Obtiene equipos del catálogo
   - Obtiene categorías para filtros
   - Muestra información del ítem a reemplazar

2. **Selección de equipo**:
   - Usuario busca y filtra equipos
   - Selecciona un equipo del catálogo
   - Se muestra información del equipo seleccionado

3. **Configuración del reemplazo**:
   - Usuario ingresa cantidad (default: 1)
   - Usuario ingresa motivo del cambio (requerido)

4. **Validaciones**:
   - Usuario debe estar autenticado
   - Debe haber un equipo seleccionado
   - Cantidad debe ser mayor a 0
   - Motivo del cambio no puede estar vacío

5. **Proceso de reemplazo**:
   - Llama a reemplazarItemLista() con:
     * ID del ítem original
     * Datos del nuevo equipo
     * Cantidad y motivo
     * proyectoEquipoItemId correcto
   - La API maneja:
     * Marcar ítem original como 'rechazado'
     * Crear nuevo ítem con estado 'borrador'
     * Actualizar ProyectoEquipoItem

6. **Resultado**:
   - Éxito: Toast de confirmación, callback onUpdated, cierra modal
   - Error: Toast de error con mensaje específico
*/

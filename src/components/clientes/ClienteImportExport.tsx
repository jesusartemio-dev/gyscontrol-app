// ===================================================
// 📁 Archivo: ClienteImportExport.tsx
// 📌 Ubicación: src/components/clientes/ClienteImportExport.tsx
// 🔧 Descripción: Componente para importación/exportación de clientes
// 🧠 Uso: Integra utilidades existentes con UI moderna siguiendo patrón de proveedores
// ✍️ Autor: Senior Fullstack Developer
// 📅 Última actualización: 2025-01-15
// ===================================================

'use client'

import { useState } from 'react'
import { BotonesImportExport } from '@/components/catalogo/BotonesImportExport'
import { toast } from 'sonner'
import { 
  leerClientesDesdeExcel, 
  validarClientes, 
  crearClientesEnBD,
  type ClienteImportado 
} from '@/lib/utils/clienteImportUtils'
import { exportarClientesAExcel } from '@/lib/utils/clienteExcel'
import type { Cliente } from '@/types/modelos'

interface Props {
  clientes: Cliente[]
  onImported: () => void
  onImportErrors?: (errores: string[]) => void
}

export default function ClienteImportExport({ clientes, onImported, onImportErrors }: Props) {
  const [importando, setImportando] = useState(false)

  // ✅ Handle export
  const handleExportar = () => {
    try {
      exportarClientesAExcel(clientes)
      toast.success(`${clientes.length} clientes exportados exitosamente`)
    } catch (error) {
      console.error('Error exporting clients:', error)
      toast.error('Error al exportar clientes')
    }
  }

  // ✅ Handle import following proveedores pattern
  const handleImportar = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    
    setImportando(true)
    
    try {
      // 📡 Read Excel file
      const datos = await leerClientesDesdeExcel(file)
      
      // 🔁 Validate data against existing clients
      const codigosExistentes = clientes.map(c => c.codigo)
      const { nuevos, errores, duplicados } = validarClientes(datos, codigosExistentes)
      
      // ✅ Show validation results
      if (errores.length > 0) {
        onImportErrors?.(errores)
        toast.error(`Se encontraron ${errores.length} errores de validación:\n${errores.slice(0, 3).join('\n')}${errores.length > 3 ? '\n...' : ''}`)
        return
      }
      
      if (duplicados.length > 0) {
        toast.warning(`Se omitieron ${duplicados.length} clientes duplicados`)
      }
      
      if (nuevos.length === 0) {
        toast.info('No hay clientes nuevos para importar')
        return
      }
      
      // 📡 Create clients in database
      const resultado = await crearClientesEnBD(nuevos)
      
      // ✅ Success feedback with error details if any
      if (resultado.creados > 0) {
        if (resultado.errores && resultado.errores.length > 0) {
          toast.success(`${resultado.creados} clientes importados exitosamente`)
          toast.error(`Se encontraron ${resultado.errores.length} errores:\n${resultado.errores.slice(0, 3).join('\n')}${resultado.errores.length > 3 ? '\n...' : ''}`)
        } else {
          toast.success(`${resultado.creados} clientes importados exitosamente`)
        }
        onImported()
      } else {
        if (resultado.errores && resultado.errores.length > 0) {
          toast.error(`No se pudo importar ningún cliente:\n${resultado.errores.slice(0, 3).join('\n')}${resultado.errores.length > 3 ? '\n...' : ''}`)
        } else {
          toast.error('No se pudo importar ningún cliente')
        }
      }
      
    } catch (error) {
      console.error('Error importing clients:', error)
      toast.error('Error al procesar el archivo: ' + (error instanceof Error ? error.message : 'Error desconocido'))
    } finally {
      setImportando(false)
      // Reset file input
      e.target.value = ''
    }
  }

  return (
    <BotonesImportExport
      onExportar={handleExportar}
      onImportar={handleImportar}
      importando={importando}
      exportLabel="Exportar Clientes"
      importLabel="Importar Clientes"
      acceptedFileTypes=".xlsx,.xls"
    />
  )
}
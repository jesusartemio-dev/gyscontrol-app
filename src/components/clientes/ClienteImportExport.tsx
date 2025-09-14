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
      const nombresExistentes = clientes.map(c => c.nombre)
      const { nuevos, errores, duplicados } = validarClientes(datos, nombresExistentes)
      
      // ✅ Show validation results
      if (errores.length > 0) {
        onImportErrors?.(errores)
        toast.error(`Se encontraron ${errores.length} errores de validación`)
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
      
      // ✅ Success feedback
      toast.success(`${resultado.creados} clientes importados exitosamente`)
      onImported()
      
    } catch (error) {
      console.error('Error importing clients:', error)
      toast.error('Error al importar clientes')
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
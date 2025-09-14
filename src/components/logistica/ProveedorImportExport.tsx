// ===================================================
// 📁 Archivo: ProveedorImportExport.tsx
// 📌 Ubicación: src/components/logistica/ProveedorImportExport.tsx
// 🔧 Descripción: Componente para importación/exportación de proveedores
// 🧠 Uso: Integra utilidades existentes con UI moderna siguiendo patrón de unidades
// ✍️ Autor: Senior Fullstack Developer
// 📅 Última actualización: 2025-01-15
// ===================================================

'use client'

import { useState } from 'react'
import { BotonesImportExport } from '@/components/catalogo/BotonesImportExport'
import { toast } from 'sonner'
import { 
  exportarProveedoresAExcel,
  leerProveedoresDesdeExcel, 
  validarProveedores, 
  crearProveedoresEnBD,
  type ProveedorImportado 
} from '@/lib/utils/proveedorImportUtils'
import type { Proveedor } from '@/types/modelos'

interface Props {
  proveedores: Proveedor[]
  onImported: () => void
  onErrores?: (errores: string[]) => void
}

export default function ProveedorImportExport({ proveedores, onImported, onErrores }: Props) {
  const [importando, setImportando] = useState(false)

  // ✅ Handle export
  const handleExportar = () => {
    try {
      exportarProveedoresAExcel(proveedores)
      toast.success(`${proveedores.length} proveedores exportados exitosamente`)
    } catch (error) {
      console.error('Error exporting providers:', error)
      toast.error('Error al exportar proveedores')
    }
  }

  // ✅ Handle import following unidades pattern
  const handleImportar = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    
    setImportando(true)
    
    try {
      // 📡 Read Excel file
      const datos = await leerProveedoresDesdeExcel(file)
      
      // 🔁 Validate data against existing providers
      const { nuevos, errores, duplicados } = validarProveedores(datos, proveedores)
      
      if (errores.length > 0) {
        onErrores?.(errores)
      }
      
      if (duplicados.length > 0) {
        toast.warning(`${duplicados.length} proveedores duplicados omitidos`)
      }
      
      // 📡 Create new providers in database only if there are new ones
      if (nuevos.length > 0) {
        await crearProveedoresEnBD(nuevos)
      }
      
      toast.success(`${nuevos.length} proveedores importados exitosamente`)
      onImported()
      
    } catch (error) {
      console.error('Error al importar proveedores:', error)
      toast.error('Error inesperado en la importación')
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
    />
  )
}
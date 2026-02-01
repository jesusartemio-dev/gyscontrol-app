'use client'

import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger
} from '@/components/ui/accordion'
import PlantillaEquipoItemTable from './PlantillaEquipoItemTable'
import PlantillaEquipoMultiAddModal from './PlantillaEquipoMultiAddModal'
import PlantillaEquipoItemImportExcelModal from './PlantillaEquipoItemImportExcelModal'
import type { PlantillaEquipo, PlantillaEquipoItem } from '@/types'
import { useState, useEffect } from 'react'
import { Pencil, Trash2, Briefcase, FileSpreadsheet, Download, Upload } from 'lucide-react'
import { exportarPlantillaEquipoItemsAExcel, generarPlantillaEquiposImportacion } from '@/lib/utils/plantillaEquipoItemExcel'
import { toast } from 'sonner'

interface Props {
  equipo: PlantillaEquipo
  onItemChange: (items: PlantillaEquipoItem[]) => void
  onUpdatedNombre: (nuevoNombre: string) => void
  onDeletedGrupo: () => void
  onChange: (changes: Partial<PlantillaEquipo>) => void
}

export default function PlantillaEquipoAccordion({
  equipo,
  onItemChange,
  onUpdatedNombre,
  onDeletedGrupo,
  onChange
}: Props) {
  const [editando, setEditando] = useState(false)
  const [nuevoNombre, setNuevoNombre] = useState(equipo.nombre)
  const [showMultiAddModal, setShowMultiAddModal] = useState(false)
  const [showImportExcelModal, setShowImportExcelModal] = useState(false)

  useEffect(() => {
    setNuevoNombre(equipo.nombre)
  }, [equipo.nombre])

  const handleBlur = () => {
    if (nuevoNombre.trim() && nuevoNombre !== equipo.nombre) {
      onUpdatedNombre(nuevoNombre.trim())
    }
    setEditando(false)
  }

  const handleMultipleItemsCreated = (items: PlantillaEquipoItem[]) => {
    onItemChange([...equipo.items, ...items])
    setShowMultiAddModal(false)
  }

  const handleExcelImportItems = (items: PlantillaEquipoItem[]) => {
    // Merge with existing items, updating existing ones
    const existingIds = new Set(items.filter(i => equipo.items.some(e => e.id === i.id)).map(i => i.id))
    const updatedItems = equipo.items.map(existing => {
      const imported = items.find(i => i.id === existing.id)
      return imported || existing
    })
    const newItems = items.filter(i => !existingIds.has(i.id) && !equipo.items.some(e => e.id === i.id))
    onItemChange([...updatedItems, ...newItems])
    setShowImportExcelModal(false)
  }

  const handleExportExcel = () => {
    if (equipo.items.length === 0) {
      toast.error('No hay items para exportar')
      return
    }
    exportarPlantillaEquipoItemsAExcel(equipo.items, `Equipos_${equipo.nombre}`)
    toast.success('Excel exportado correctamente')
  }

  const handleDownloadTemplate = () => {
    generarPlantillaEquiposImportacion('PlantillaEquipos')
    toast.success('Plantilla descargada')
  }

  const renta =
    equipo.subtotalInterno > 0
      ? ((equipo.subtotalCliente - equipo.subtotalInterno) / equipo.subtotalInterno) * 100
      : 0

  return (
    <>
      <Accordion type="multiple" className="bg-white shadow-md rounded-2xl border border-gray-200 mb-4">
        <AccordionItem value={equipo.id}>
          <div className="grid grid-cols-[auto_1fr_auto_auto_auto] items-center px-6 py-4 gap-4">
            <AccordionTrigger className="flex items-center justify-start" />
            <div className="flex items-center gap-2">
              <Briefcase size={18} className="text-gray-600" />
              {editando ? (
                <input
                  type="text"
                  value={nuevoNombre}
                  onChange={(e) => setNuevoNombre(e.target.value)}
                  onBlur={handleBlur}
                  autoFocus
                  className="border px-2 py-1 text-sm rounded w-full"
                />
              ) : (
                <span
                  onClick={() => setEditando(true)}
                  className="font-semibold text-base text-gray-800 cursor-pointer hover:underline"
                >
                  {equipo.nombre}
                </span>
              )}
            </div>

            <span className="text-xs text-gray-500 bg-gray-100 px-2 py-1 rounded-full">
              {equipo.items.length} ítem{equipo.items.length !== 1 ? 's' : ''}
            </span>

            <div className="text-right text-sm leading-tight whitespace-nowrap">
              <div className="text-gray-400 text-xs font-medium">Interno / Cliente / % Rent</div>
              <div>
                <span className="text-gray-700 font-medium">
                  $ {equipo.subtotalInterno?.toFixed(2) || '0.00'}
                </span>{' '}
                /{' '}
                <span className="text-green-600 font-medium">
                  $ {equipo.subtotalCliente?.toFixed(2) || '0.00'}
                </span>{' '}
                /{' '}
                <span className="text-blue-600 font-medium">
                  {renta.toFixed(1)}%
                </span>
              </div>
            </div>

            <div className="flex gap-2 items-center">
              <button
                type="button"
                onClick={() => setEditando(true)}
                className="text-blue-600 hover:text-blue-800 transition text-xs"
                title="Editar nombre"
              >
                <Pencil size={16} />
              </button>
              <button
                type="button"
                onClick={onDeletedGrupo}
                className="text-red-500 hover:text-red-700 transition text-xs"
                title="Eliminar grupo"
              >
                <Trash2 size={16} />
              </button>
            </div>
          </div>

          <AccordionContent className="px-6 pb-6 space-y-4">
            <div className="flex justify-between items-center">
              {/* Botones Excel */}
              <div className="flex gap-2">
                <button
                  onClick={() => setShowImportExcelModal(true)}
                  className="flex items-center gap-1 bg-purple-600 hover:bg-purple-700 text-white px-3 py-1.5 rounded text-xs"
                  title="Importar desde Excel"
                >
                  <Upload size={14} />
                  Importar Excel
                </button>
                <button
                  onClick={handleExportExcel}
                  className="flex items-center gap-1 bg-green-600 hover:bg-green-700 text-white px-3 py-1.5 rounded text-xs"
                  title="Exportar a Excel"
                >
                  <Download size={14} />
                  Exportar Excel
                </button>
                <button
                  onClick={handleDownloadTemplate}
                  className="flex items-center gap-1 border border-gray-300 hover:bg-gray-100 text-gray-700 px-3 py-1.5 rounded text-xs"
                  title="Descargar plantilla Excel"
                >
                  <FileSpreadsheet size={14} />
                  Plantilla
                </button>
              </div>
              {/* Botón agregar items */}
              <button
                onClick={() => setShowMultiAddModal(true)}
                className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded text-sm"
              >
                ➕ Agregar Items
              </button>
            </div>

            <PlantillaEquipoItemTable
              items={equipo.items}
              onUpdated={(item) => {
                const updatedItems = equipo.items.map(i => i.id === item.id ? item : i)
                onItemChange(updatedItems)
              }}
              onDeleted={(id) => {
                const updatedItems = equipo.items.filter(i => i.id !== id)
                onItemChange(updatedItems)
              }}
            />
          </AccordionContent>
        </AccordionItem>
      </Accordion>

      {/* Modal para agregar múltiples items */}
      <PlantillaEquipoMultiAddModal
        isOpen={showMultiAddModal}
        onClose={() => setShowMultiAddModal(false)}
        onItemsCreated={handleMultipleItemsCreated}
        plantillaEquipoId={equipo.id}
      />

      {/* Modal para importar desde Excel */}
      <PlantillaEquipoItemImportExcelModal
        isOpen={showImportExcelModal}
        onClose={() => setShowImportExcelModal(false)}
        equipo={equipo}
        onItemsCreated={handleExcelImportItems}
      />
    </>
  )
}

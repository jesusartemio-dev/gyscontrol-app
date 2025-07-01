'use client'

// ===================================================
// 📁 Archivo: src/app/logistica/cotizaciones/crear/page.tsx
// 📌 Descripción: Página para crear cotización logística acumulando ítems de varias listas
// 🧠 Flujo: Seleccionar proyecto → seleccionar lista → marcar ítems → generar cotización
// ✍️ Autor: Jesús Artemio (Master Experto 🧙‍♂️)
// 📅 Última actualización: 2025-05-29
// ===================================================

import { useEffect, useState } from 'react'
import { toast } from 'sonner'

import LogisticaCotizacionProyectoSelector from '@/components/logistica/LogisticaCotizacionProyectoSelector'
import LogisticaCotizacionListaSelector from '@/components/logistica/LogisticaCotizacionListaSelector'
import LogisticaCotizacionItemSelector from '@/components/logistica/LogisticaCotizacionItemSelector'
import LogisticaCotizacionResumen from '@/components/logistica/LogisticaCotizacionResumen'
import LogisticaCotizacionGenerarButton from '@/components/logistica/LogisticaCotizacionGenerarButton'
import LogisticaCotizacionProveedorSelector from '@/components/logistica/LogisticaCotizacionProveedorSelector'

import { getProyectos } from '@/lib/services/proyecto'
import { getLogisticaListas } from '@/lib/services/logisticaLista'
import { getProveedores } from '@/lib/services/proveedor'

import type { Proyecto, ListaEquipo, ListaEquipoItem, Proveedor } from '@/types'

export default function LogisticaCotizacionCrearPage() {
  const [proyectos, setProyectos] = useState<Proyecto[]>([])
  const [proveedores, setProveedores] = useState<Proveedor[]>([])
  const [todasListas, setTodasListas] = useState<ListaEquipo[]>([])
  const [listasFiltradas, setListasFiltradas] = useState<ListaEquipo[]>([])
  const [items, setItems] = useState<ListaEquipoItem[]>([])

  const [proyectoId, setProyectoId] = useState('')
  const [proveedorId, setProveedorId] = useState('')
  const [listaId, setListaId] = useState('')
  const [selectedItems, setSelectedItems] = useState<Record<string, { item: ListaEquipoItem; cantidad: number }>>({})

  useEffect(() => {
    const cargarDatos = async () => {
      try {
        const [proyectosData, listasData, proveedoresData] = await Promise.all([
          getProyectos(),
          getLogisticaListas(),
          getProveedores(),
        ])
        setProyectos(proyectosData)
        setTodasListas(listasData)
        setProveedores(proveedoresData)
      } catch {
        toast.error('Error al cargar datos iniciales')
      }
    }
    cargarDatos()
  }, [])

  useEffect(() => {
    if (!proyectoId) {
      setListasFiltradas([])
      return
    }
    const filtradas = todasListas.filter((l) => l.proyectoId === proyectoId)
    setListasFiltradas(filtradas)
  }, [proyectoId, todasListas])

  useEffect(() => {
    if (!listaId) {
      setItems([])
      return
    }
    const listaSeleccionada = listasFiltradas.find((l) => l.id === listaId)
    setItems(listaSeleccionada?.items || [])
  }, [listaId, listasFiltradas])

  const handleSelectItem = (item: ListaEquipoItem, checked: boolean) => {
    setSelectedItems((prev) => {
      const updated = { ...prev }
      if (checked) {
        updated[item.id] = { item, cantidad: item.cantidad || 1 }
      } else {
        delete updated[item.id]
      }
      return updated
    })
  }

  const handleCantidadChange = (itemId: string, cantidad: number) => {
    setSelectedItems((prev) => ({
      ...prev,
      [itemId]: { ...prev[itemId], cantidad },
    }))
  }

  const handleRemoveItem = (itemId: string) => {
    setSelectedItems((prev) => {
      const updated = { ...prev }
      delete updated[itemId]
      return updated
    })
  }

  const handleClear = () => {
    setSelectedItems({})
  }

  return (
    <div className="p-4 space-y-4">
      <h1 className="text-2xl font-bold">🛠 Crear Cotización Logística</h1>

      <div className="flex flex-col md:flex-row gap-4">
        <div className="flex-1">
          <LogisticaCotizacionProyectoSelector
            proyectos={proyectos}
            selectedProyectoId={proyectoId}
            onSelectProyecto={setProyectoId}
          />
        </div>

        <div className="flex-1">
          <LogisticaCotizacionProveedorSelector
            proveedores={proveedores}
            selectedProveedorId={proveedorId}
            onSelectProveedor={setProveedorId}
          />
        </div>

        <div className="flex-1">
          {proyectoId && (
            <LogisticaCotizacionListaSelector
              listas={listasFiltradas}
              selectedListaId={listaId}
              onSelectLista={setListaId}
            />
          )}
        </div>
      </div>

      {listaId && (
        <LogisticaCotizacionItemSelector
          items={items}
          selectedItems={Object.fromEntries(
            Object.entries(selectedItems).map(([id, entry]) => [id, entry.cantidad])
          )}
          onSelectItem={(itemId, checked) =>
            handleSelectItem(items.find((i) => i.id === itemId)!, checked)
          }
          onChangeCantidad={handleCantidadChange}
        />
      )}

      {Object.keys(selectedItems).length > 0 && (
        <LogisticaCotizacionResumen
          selectedItems={selectedItems}
          onRemoveItem={handleRemoveItem}
          onClear={handleClear}
        />
      )}

      {Object.keys(selectedItems).length > 0 && (
        <LogisticaCotizacionGenerarButton
          proyectoId={proyectoId}
          proveedorId={proveedorId}
          selectedItems={selectedItems}
        />
      )}
    </div>
  )
}

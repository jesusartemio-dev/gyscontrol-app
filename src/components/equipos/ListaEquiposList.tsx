'use client'

import { useEffect, useState } from 'react'
import {
  ListaEquipos,
  ListaEquiposItem,
  ListaEquiposUpdatePayload,
  ListaEquiposPayload,
} from '@/types'
import { Pencil, Trash2, Plus } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { toast } from 'sonner'
import { getListaEquiposItems } from '@/lib/services/listaEquiposItem'
import ListaEquiposItemList from './ListaEquiposItemList'
import ModalAgregarItemDesdeEquipo from './ModalAgregarItemDesdeEquipo'
import ModalAgregarItemDesdeCatalogo from './ModalAgregarItemDesdeCatalogo'

interface Props {
  data: ListaEquipos[]
  onCreate: (payload: ListaEquiposPayload) => void
  onUpdate: (id: string, payload: ListaEquiposUpdatePayload) => void
  onDelete: (id: string) => void
  onAgregarEquipos?: (listaId: string) => void
  onCreatedItem?: () => void
}

export default function ListaEquiposList({
  data,
  onCreate,
  onUpdate,
  onDelete,
  onAgregarEquipos,
  onCreatedItem,
}: Props) {
  const [editModeId, setEditModeId] = useState<string | null>(null)
  const [editValues, setEditValues] = useState<Record<string, Partial<ListaEquipos>>>({})
  const [itemsPorLista, setItemsPorLista] = useState<Record<string, ListaEquiposItem[]>>({})
  const [modalCotizacionListaId, setModalCotizacionListaId] = useState<string | null>(null)
  const [modalCatalogoListaId, setModalCatalogoListaId] = useState<string | null>(null)
  const [proyectoId, setProyectoId] = useState<string>('')

  const cargarItems = async () => {
    const todos = await getListaEquiposItems()
    const agrupados: Record<string, ListaEquiposItem[]> = {}
    todos.forEach((item) => {
      if (!agrupados[item.listaId]) agrupados[item.listaId] = []
      agrupados[item.listaId].push(item)
    })
    setItemsPorLista(agrupados)
  }

  useEffect(() => {
    cargarItems()
  }, [data])

  useEffect(() => {
    if (data.length > 0 && data[0].proyectoId) {
      setProyectoId(data[0].proyectoId)
    }
  }, [data])

  const handleChange = (id: string, key: keyof ListaEquipos, value: string) => {
    setEditValues((prev) => ({
      ...prev,
      [id]: { ...prev[id], [key]: value },
    }))
  }

  const handleSave = (id: string) => {
    if (!editValues[id]?.nombre) {
      toast.error('El nombre no puede estar vacío')
      return
    }
    onUpdate(id, {
      nombre: editValues[id]?.nombre || '',
      descripcion: editValues[id]?.descripcion || '',
    })
    setEditModeId(null)
    setEditValues((prev) => {
      const updated = { ...prev }
      delete updated[id]
      return updated
    })
  }

  const calcularTotal = (listaId: string): number => {
    const items = itemsPorLista[listaId] || []
    return items.reduce((acc, item) => {
      const subtotal = (item.cantidad || 0) * (item.precioReferencial || 0)
      return acc + subtotal
    }, 0)
  }

  return (
    <div className="space-y-4">
      <h2 className="text-xl font-semibold">📋 Listas Técnicas de Equipos</h2>

      <div className="space-y-2">
        {data.map((lista) => {
          const isEdit = editModeId === lista.id
          const edited = editValues[lista.id] || {}

          return (
            <div
              key={lista.id}
              className="border rounded-xl p-4 shadow-md hover:shadow-lg transition space-y-2"
            >
              <div className="grid grid-cols-1 md:grid-cols-5 gap-4 items-center">
                <div className="col-span-1">
                  {isEdit ? (
                    <Input
                      value={edited.nombre || ''}
                      onChange={(e) => handleChange(lista.id, 'nombre', e.target.value)}
                      placeholder="Nombre"
                    />
                  ) : (
                    <div className="font-semibold">{lista.nombre}</div>
                  )}
                </div>

                <div className="col-span-2">
                  {isEdit ? (
                    <Input
                      value={edited.descripcion || ''}
                      onChange={(e) => handleChange(lista.id, 'descripcion', e.target.value)}
                      placeholder="Descripción"
                    />
                  ) : (
                    <div className="text-sm text-gray-500">{lista.descripcion || '—'}</div>
                  )}
                </div>

                <div className="flex gap-2 justify-end">
                  {isEdit ? (
                    <>
                      <Button
                        onClick={() => handleSave(lista.id)}
                        className="bg-blue-600 text-white"
                      >
                        💾 Guardar
                      </Button>
                      <Button onClick={() => setEditModeId(null)} variant="outline">
                        ❌ Cancelar
                      </Button>
                    </>
                  ) : (
                    <>
                      <Button
                        onClick={() => {
                          setEditModeId(lista.id)
                          setEditValues((prev) => ({
                            ...prev,
                            [lista.id]: {
                              nombre: lista.nombre,
                              descripcion: lista.descripcion || '',
                            },
                          }))
                        }}
                        variant="outline"
                      >
                        <Pencil className="w-4 h-4" />
                      </Button>
                      <Button
                        onClick={() => onDelete(lista.id)}
                        variant="ghost"
                        className="text-red-600"
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                      <Button
                        onClick={() => setModalCotizacionListaId(lista.id)}
                        className="bg-indigo-600 text-white"
                      >
                        <Plus className="w-4 h-4" /> Agregar de Cotización
                      </Button>
                      <Button
                        onClick={() => setModalCatalogoListaId(lista.id)}
                        className="bg-green-600 text-white"
                      >
                        <Plus className="w-4 h-4" /> Agregar Nuevo
                      </Button>
                    </>
                  )}
                </div>
              </div>

              <div className="mt-4 space-y-4">
                <ListaEquiposItemList
                  listaId={lista.id}
                  items={itemsPorLista[lista.id] || []}
                  onCreated={cargarItems}
                />
                <div className="text-right text-sm text-gray-600 font-medium mt-2">
                  Total estimado: S/. {calcularTotal(lista.id).toFixed(2)}
                </div>
              </div>
            </div>
          )
        })}
      </div>

      {/* Modales */}
      {modalCotizacionListaId && (
        <ModalAgregarItemDesdeEquipo
          proyectoId={proyectoId}
          listaId={modalCotizacionListaId}
          onClose={() => setModalCotizacionListaId(null)}
          onCreated={cargarItems}
        />
      )}
      {modalCatalogoListaId && (
        <ModalAgregarItemDesdeCatalogo
          proyectoId={proyectoId}
          listaId={modalCatalogoListaId}
          onClose={() => setModalCatalogoListaId(null)}
          onCreated={cargarItems}
        />
      )}
    </div>
  )
}

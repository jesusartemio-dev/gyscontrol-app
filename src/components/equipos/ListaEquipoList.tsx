'use client'

import { useEffect, useState } from 'react'
import { useSession } from 'next-auth/react'
import {
  ListaEquipo,
  ListaEquipoItem,
  ListaEquipoUpdatePayload,
  ListaEquipoPayload,
  EstadoListaEquipo,
} from '@/types'
import { Pencil, Trash2, Plus, Rocket, Save, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { toast } from 'sonner'
import { getListaEquipoItems } from '@/lib/services/listaEquipoItem'
import ListaEquipoItemList from './ListaEquipoItemList'
import ModalAgregarItemDesdeEquipo from './ModalAgregarItemDesdeEquipo'
import ModalAgregarItemDesdeCatalogo from './ModalAgregarItemDesdeCatalogo'
import ListaEstadoFlujo from './ListaEstadoFlujo'
import { enviarListaARevision } from '@/lib/services/listaEquipo'

interface Props {
  data: ListaEquipo[]
  onCreate: (payload: ListaEquipoPayload) => void
  onUpdate: (id: string, payload: ListaEquipoUpdatePayload) => void
  onDelete: (id: string) => void
  onAgregarEquipos?: (listaId: string) => void
  onCreatedItem?: () => void
  onEstadoChange?: (listaId: string, nuevoEstado: EstadoListaEquipo) => void
}

export default function ListaEquipoList({
  data,
  onCreate,
  onUpdate,
  onDelete,
  onAgregarEquipos,
  onCreatedItem,
  onEstadoChange,
}: Props) {
  const { data: session } = useSession()
  const [editModeId, setEditModeId] = useState<string | null>(null)
  const [editValues, setEditValues] = useState<Record<string, Partial<ListaEquipo>>>({})
  const [itemsPorLista, setItemsPorLista] = useState<Record<string, ListaEquipoItem[]>>({})
  const [modalCotizacionListaId, setModalCotizacionListaId] = useState<string | null>(null)
  const [modalCatalogoListaId, setModalCatalogoListaId] = useState<string | null>(null)
  const [proyectoId, setProyectoId] = useState<string>('')

  const cargarItems = async () => {
    const todos = await getListaEquipoItems()
    const agrupados: Record<string, ListaEquipoItem[]> = {}
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

  const handleChange = (id: string, key: keyof ListaEquipo, value: string) => {
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
      if (!item.cotizacionSeleccionadaId || !item.cotizacionSeleccionada?.precioUnitario) return acc
      const precio = item.cotizacionSeleccionada.precioUnitario
      const cantidad = item.cantidad ?? 0
      return acc + precio * cantidad
    }, 0)
  }

  const tieneCotizacionesSeleccionadas = (listaId: string): boolean => {
    const items = itemsPorLista[listaId] || []
    return items.every((item) => item.cotizacionSeleccionadaId)
  }

  return (
    <div className="space-y-4">
      <h2 className="text-xl font-semibold">📋 Listas Técnicas de Equipos</h2>

      <div className="space-y-2">
        {data.map((lista) => {
          const isEdit = editModeId === lista.id
          const edited = editValues[lista.id] || {}
          const items = itemsPorLista[lista.id] || []
          const todosVerificados = items.length > 0 && items.every((item) => item.verificado)
          const todasCotizacionesElegidas = tieneCotizacionesSeleccionadas(lista.id)

          return (
            <div
              key={lista.id}
              className="border rounded-xl p-4 shadow-md hover:shadow-lg transition space-y-2 bg-white"
            >
              <div className="flex flex-col gap-2">
                <div>
                  <div className="font-semibold text-indigo-700 text-base">{lista.codigo}</div>
                  {isEdit ? (
                    <Input
                      value={edited.nombre || ''}
                      onChange={(e) => handleChange(lista.id, 'nombre', e.target.value)}
                      placeholder="Nombre"
                      className="mt-1"
                    />
                  ) : (
                    <div className="text-sm text-gray-700">{lista.nombre}</div>
                  )}
                </div>

                <ListaEstadoFlujo
                  estado={lista.estado || 'borrador'}
                  listaId={lista.id}
                  onUpdated={(nuevoEstado) => {
                    cargarItems()
                    onEstadoChange?.(lista.id, nuevoEstado)
                  }}
                />
              </div>

              <div className="mt-4 space-y-4">
                <ListaEquipoItemList
                  listaId={lista.id}
                  proyectoId={proyectoId}
                  items={items}
                  onCreated={cargarItems}
                  editable={lista.estado === 'borrador'}
                />

                {!todasCotizacionesElegidas && (
                  <div className="text-xs text-red-500 text-right">
                    ⚠️ Algunos ítems no tienen cotización seleccionada y no se incluyen en el total.
                  </div>
                )}

                <div className="text-right text-sm text-gray-600 font-medium mt-2">
                  Total estimado: $ {calcularTotal(lista.id).toFixed(2)}
                </div>
              </div>

              <div className="flex gap-2 justify-end mt-2">
                {isEdit ? (
                  <>
                    <Button onClick={() => handleSave(lista.id)} className="bg-blue-600 text-white">
                      <Save className="w-4 h-4" />
                    </Button>
                    <Button onClick={() => setEditModeId(null)} variant="outline">
                      <X className="w-4 h-4" />
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
                            nombre: lista.nombre || '',
                          },
                        }))
                      }}
                      variant="outline"
                    >
                      <Pencil className="w-4 h-4" />
                    </Button>
                    <Button onClick={() => onDelete(lista.id)} variant="ghost" className="text-red-600">
                      <Trash2 className="w-4 h-4" />
                    </Button>
                    {lista.estado === 'borrador' && (
                      <>
                        <Button
                          onClick={() => setModalCotizacionListaId(lista.id)}
                          className="bg-indigo-600 text-white"
                        >
                          <Plus className="w-4 h-4" /> Cotización
                        </Button>
                        <Button
                          onClick={() => {
                            setModalCatalogoListaId(lista.id)
                            onAgregarEquipos?.(lista.id)
                          }}
                          className="bg-green-600 text-white"
                        >
                          <Plus className="w-4 h-4" /> Nuevo
                        </Button>
                        <Button
                          className="bg-yellow-600 text-white"
                          onClick={async () => {
                            const ok = await enviarListaARevision(lista.id)
                            if (ok) {
                              toast.success('Lista enviada a revisión')
                              await cargarItems()
                              await onCreatedItem?.()
                            } else {
                              toast.error('Error al enviar lista')
                            }
                          }}
                          disabled={items.length === 0 || !todosVerificados}
                        >
                          <Rocket className="w-4 h-4" /> Enviar
                        </Button>
                      </>
                    )}
                  </>
                )}
              </div>
            </div>
          )
        })}
      </div>

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

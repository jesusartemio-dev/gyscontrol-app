'use client'

import { Pencil, Trash2, Plus, Rocket, Save, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import ListaEstadoFlujo from './ListaEstadoFlujo'
import ListaEquipoItemList from './ListaEquipoItemList'
import { ListaEquipo, ListaEquipoItem, ListaEquipoPayload, ListaEquipoUpdatePayload } from '@/types'
import { useState } from 'react'

interface Props {
  lista: ListaEquipo
  items: ListaEquipoItem[]
  proyectoId: string
  onUpdate: (id: string, payload: ListaEquipoUpdatePayload) => void
  onDelete: (id: string) => void
  onAgregarCotizacion: () => void
  onAgregarCatalogo: () => void
  onEnviar: () => void
  onRefreshItems: () => void
}

export default function ListaEquipoCard({
  lista,
  items,
  proyectoId,
  onUpdate,
  onDelete,
  onAgregarCotizacion,
  onAgregarCatalogo,
  onEnviar,
  onRefreshItems,
}: Props) {
  const [isEdit, setIsEdit] = useState(false)
  const [editValues, setEditValues] = useState<Partial<ListaEquipo>>({})

  const handleChange = (key: keyof ListaEquipo, value: string) => {
    setEditValues((prev) => ({ ...prev, [key]: value }))
  }

  const handleSave = () => {
    if (!editValues.nombre) return
    onUpdate(lista.id, {
      nombre: editValues.nombre || '',
      descripcion: editValues.descripcion || '',
    })
    setIsEdit(false)
    setEditValues({})
  }

  const calcularTotal = () => {
    return items.reduce((acc, item) => acc + (item.cantidad ?? 0) * (item.presupuesto ?? 0), 0)
  }

  const todosVerificados = items.length > 0 && items.every((item) => item.verificado)

  return (
    <div className="border rounded-xl p-4 shadow-md hover:shadow-lg transition space-y-2">
      <div className="grid grid-cols-1 md:grid-cols-5 gap-4 items-center">
        <div className="col-span-1">
          {isEdit ? (
            <Input
              value={editValues.nombre || ''}
              onChange={(e) => handleChange('nombre', e.target.value)}
              placeholder="Nombre"
            />
          ) : (
            <div className="font-semibold">{lista.nombre}</div>
          )}
        </div>
        <div className="col-span-4">
          <ListaEstadoFlujo estado={lista.estado || 'borrador'} />
        </div>
      </div>

      <div className="mt-4 space-y-4">
        <ListaEquipoItemList
          listaId={lista.id}
          proyectoId={proyectoId}
          items={items}
          onCreated={onRefreshItems}
        />
        <div className="text-right text-sm text-gray-600 font-medium mt-2">
          Total estimado: S/. {calcularTotal().toFixed(2)}
        </div>
      </div>

      <div className="flex gap-2 justify-end mt-2">
        {isEdit ? (
          <>
            <Button onClick={handleSave} className="bg-blue-600 text-white">
              <Save className="w-4 h-4" />
            </Button>
            <Button onClick={() => setIsEdit(false)} variant="outline">
              <X className="w-4 h-4" />
            </Button>
          </>
        ) : (
          <>
            <Button
              onClick={() => {
                setIsEdit(true)
                setEditValues({ nombre: lista.nombre, descripcion: lista.descripcion || '' })
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
                  onClick={onAgregarCotizacion}
                  className="bg-indigo-600 text-white"
                  disabled={!todosVerificados}
                >
                  <Plus className="w-4 h-4" /> Cotización
                </Button>
                <Button
                  onClick={onAgregarCatalogo}
                  className="bg-green-600 text-white"
                  disabled={!todosVerificados}
                >
                  <Plus className="w-4 h-4" /> Nuevo
                </Button>
                <Button
                  onClick={onEnviar}
                  className="bg-yellow-600 text-white"
                  disabled={!todosVerificados}
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
}

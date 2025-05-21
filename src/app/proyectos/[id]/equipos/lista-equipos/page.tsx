// src/app/proyectos/[id]/equipos/lista-equipos/page.tsx
'use client'

import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import { getProyectoById } from '@/lib/services/proyecto'
import {
  getListaEquipo,
  createListaEquipo,
  updateListaEquipo,
  deleteListaEquipo,
} from '@/lib/services/listaEquipo'
import type {
  Proyecto,
  ListaEquipo,
  ListaEquipoPayload,
  ListaEquipoUpdatePayload,
  EstadoListaEquipo, // ✅ IMPORTANTE
} from '@/types'
import ListaEquipoForm from '@/components/equipos/ListaEquipoForm'
import ListaEquipoList from '@/components/equipos/ListaEquipoList'
import ModalAgregarItemDesdeEquipo from '@/components/equipos/ModalAgregarItemDesdeEquipo'
import { toast } from 'sonner'

export default function ListaEquipoPage() {
  const { id } = useParams<{ id: string }>()
  const [proyecto, setProyecto] = useState<Proyecto | null>(null)
  const [listas, setListas] = useState<ListaEquipo[]>([])
  const [modalListaId, setModalListaId] = useState<string | null>(null)

  useEffect(() => {
    if (!id) return
    const fetchData = async () => {
      const data = await getProyectoById(id)
      setProyecto(data)
      const le = await getListaEquipo(id)
      setListas(le)
    }
    fetchData()
  }, [id])

  const handleCreate = async (payload: ListaEquipoPayload) => {
    try {
      const nueva = await createListaEquipo(payload)
      if (nueva) setListas((prev) => [...prev, nueva])
    } catch (err) {
      toast.error('No se pudo crear la lista')
    }
  }

  const handleUpdate = async (listaId: string, payload: ListaEquipoUpdatePayload) => {
    try {
      const actualizada = await updateListaEquipo(listaId, payload)
      if (actualizada) {
        setListas((prev) => prev.map((l) => (l.id === listaId ? actualizada : l)))
      }
    } catch (err) {
      toast.error('Error al actualizar la lista')
    }
  }

  const handleDelete = async (listaId: string) => {
    try {
      await deleteListaEquipo(listaId)
      setListas((prev) => prev.filter((l) => l.id !== listaId))
    } catch (err) {
      toast.error('Error al eliminar la lista')
    }
  }

  const handleAgregarEquipos = (listaId: string) => {
    setModalListaId(listaId)
  }

  const handleRefreshListas = async () => {
    const nuevasListas = await getListaEquipo(id)
    setListas(nuevasListas)
  }

  // ✅ NUEVO - actualizar estado sin recargar toda la lista
  const handleActualizarEstadoLista = (listaId: string, nuevoEstado: EstadoListaEquipo) => {
    setListas((prev) =>
      prev.map((l) => (l.id === listaId ? { ...l, estado: nuevoEstado } : l))
    )
  }

  if (!proyecto) return <p className="p-4">Cargando...</p>

  return (
    <div className="p-4 space-y-4">
      <h1 className="text-2xl font-bold">📋 Listas Técnicas de Equipos - {proyecto.nombre}</h1>

      <ListaEquipoForm
        proyectoId={id}
        onCreated={(formPayload: ListaEquipoPayload) => handleCreate(formPayload)}
      />

      <ListaEquipoList
        data={listas}
        onCreate={handleCreate}
        onUpdate={handleUpdate}
        onDelete={handleDelete}
        onAgregarEquipos={handleAgregarEquipos}
        onCreatedItem={handleRefreshListas}
        onEstadoChange={handleActualizarEstadoLista} // ✅ ¡NUEVO!
      />

      {modalListaId && (
        <ModalAgregarItemDesdeEquipo
          proyectoId={id}
          listaId={modalListaId}
          onClose={() => {
            setModalListaId(null)
            handleRefreshListas()
          }}
          onCreated={handleRefreshListas}
        />
      )}
    </div>
  )
}

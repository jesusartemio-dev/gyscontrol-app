// ===================================================
// 📁 Archivo: page.tsx
// 📍 Ubicación: src/app/proyectos/[id]/equipos/lista-equipos/page.tsx
// 🔧 Descripción: Página para gestionar Listas Técnicas de Equipos (ListaEquipos)
// ===================================================

'use client'

import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import { getProyectoById } from '@/lib/services/proyecto'
import {
  getListaEquipos,
  createListaEquipos,
  updateListaEquipos,
  deleteListaEquipos,
} from '@/lib/services/listaEquipos'
import type {
  Proyecto,
  ListaEquipos,
  ListaEquiposPayload,
  ListaEquiposUpdatePayload,
} from '@/types'
import ListaEquiposForm from '@/components/equipos/ListaEquiposForm'
import ListaEquiposList from '@/components/equipos/ListaEquiposList'
import ModalAgregarItemDesdeEquipo from '@/components/equipos/ModalAgregarItemDesdeEquipo'
import { toast } from 'sonner'

export default function ListaEquiposPage() {
  const { id } = useParams<{ id: string }>()
  const [proyecto, setProyecto] = useState<Proyecto | null>(null)
  const [listas, setListas] = useState<ListaEquipos[]>([])
  const [modalListaId, setModalListaId] = useState<string | null>(null)

  useEffect(() => {
    if (!id) return
    const fetchData = async () => {
      const data = await getProyectoById(id)
      setProyecto(data)
      const le = await getListaEquipos(id)
      setListas(le)
    }
    fetchData()
  }, [id])

  const handleCreate = async (payload: ListaEquiposPayload) => {
    try {
      const nueva = await createListaEquipos(payload)
      if (nueva) setListas((prev) => [...prev, nueva])
    } catch (err) {
      toast.error('No se pudo crear la lista')
    }
  }

  const handleUpdate = async (listaId: string, payload: ListaEquiposUpdatePayload) => {
    try {
      const actualizada = await updateListaEquipos(listaId, payload)
      if (actualizada) {
        setListas((prev) => prev.map((l) => (l.id === listaId ? actualizada : l)))
      }
    } catch (err) {
      toast.error('Error al actualizar la lista')
    }
  }

  const handleDelete = async (listaId: string) => {
    try {
      await deleteListaEquipos(listaId)
      setListas((prev) => prev.filter((l) => l.id !== listaId))
    } catch (err) {
      toast.error('Error al eliminar la lista')
    }
  }

  const handleAgregarEquipos = (listaId: string) => {
    setModalListaId(listaId)
  }

  const handleRefreshListas = async () => {
    const nuevasListas = await getListaEquipos(id)
    setListas(nuevasListas)
  }

  if (!proyecto) return <p className="p-4">Cargando...</p>

  return (
    <div className="p-4 space-y-4">
      <h1 className="text-2xl font-bold">📋 Listas Técnicas de Equipos - {proyecto.nombre}</h1>

      <ListaEquiposForm
        proyectoId={id}
        onCreated={(formPayload: ListaEquiposPayload) => handleCreate(formPayload)}
      />

      <ListaEquiposList
        data={listas}
        onCreate={(formPayload: ListaEquiposPayload) => handleCreate(formPayload)}
        onUpdate={handleUpdate}
        onDelete={handleDelete}
        onAgregarEquipos={handleAgregarEquipos}
        onCreatedItem={handleRefreshListas}
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

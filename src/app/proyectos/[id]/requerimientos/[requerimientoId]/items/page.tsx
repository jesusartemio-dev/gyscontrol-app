// ===================================================
// 📁 Archivo: page.tsx
// 📌 Ubicación: /proyectos/[id]/requerimientos/[requerimientoId]/items/page.tsx
// 🔧 Descripción: Página para revisar y editar ítems de una lista de requerimientos específica
//
// 🧠 Uso: Vista enfocada en una lista, accede mediante navegación desde el resumen de requerimientos
// ===================================================

'use client'

import { useParams } from 'next/navigation'
import { useEffect, useState } from 'react'
import { getListaRequerimientoById } from '@/lib/services/listaRequerimiento'
import { toast } from 'sonner'
import ListaRequerimientoItemList from '@/components/requerimientos/ListaRequerimientoItemList'

export default function RequerimientoItemPage() {
  const { requerimientoId } = useParams()
  const [nombreLista, setNombreLista] = useState<string>('')

  useEffect(() => {
    const fetchLista = async () => {
      try {
        const data = await getListaRequerimientoById(requerimientoId as string)
        if (!data) {
          toast.error('No se encontró la lista')
          return
        }
        setNombreLista(data.nombre)
      } catch (error) {
        toast.error('Error al cargar la lista')
      }
    }

    if (requerimientoId) fetchLista()
  }, [requerimientoId])

  if (!requerimientoId) return <p className="text-red-500">ID inválido</p>

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">
        🧾 Ítems de Requerimiento: <span className="text-blue-600">{nombreLista}</span>
      </h1>

      <ListaRequerimientoItemList
        listaId={requerimientoId as string}
        editable={true}
        onUpdated={() => toast.success('Ítem actualizado')}
        onAprobar={(id) => toast.success(`Ítem ${id} aprobado`)}
      />
    </div>
  )
}

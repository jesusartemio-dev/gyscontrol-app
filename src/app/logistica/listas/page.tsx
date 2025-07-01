// ===================================================
// 📁 Archivo: src/app/logistica/listas/page.tsx
// 📌 Descripción: Página principal para mostrar todas las listas técnicas relevantes para logística
// 🧠 Uso: Llama al backend separado, muestra resumen y tarjetas usando los nuevos componentes
// ✍️ Autor: Jesús Artemio (Master Experto 🧙‍♂️)
// 📅 Última actualización: 2025-05-25
// ===================================================

'use client'

import { useEffect, useState } from 'react'
import { getLogisticaListas } from '@/lib/services/logisticaLista'
import { getProyectos } from '@/lib/services/proyecto'
import LogisticaListaTecnicaResumen from '@/components/logistica/LogisticaListaTecnicaResumen'
import LogisticaListaTecnicaList from '@/components/logistica/LogisticaListaTecnicaList'
import type { ListaEquipo, Proyecto } from '@/types'
import { toast } from 'sonner'

export default function LogisticaListasPage() {
  const [listas, setListas] = useState<ListaEquipo[]>([])
  const [proyectos, setProyectos] = useState<Proyecto[]>([])
  const [proyectoFiltro, setProyectoFiltro] = useState('')

  useEffect(() => {
    const cargarDatos = async () => {
      try {
        const todasListas = await getLogisticaListas()
        setListas(todasListas)

        const proyectosData = await getProyectos()
        setProyectos(proyectosData)
      } catch {
        toast.error('Error al cargar listas o proyectos')
      }
    }

    cargarDatos()
  }, [])

  const handleFilterChange = (proyectoId: string) => {
    setProyectoFiltro(proyectoId)
  }

  const listasFiltradas = proyectoFiltro
    ? listas.filter((l) => l.proyectoId === proyectoFiltro)
    : listas

  return (
    <div className="p-4 space-y-4">
      <h1 className="text-2xl font-bold">📦 Listas Técnicas para Logística</h1>

      <LogisticaListaTecnicaResumen
        proyectos={proyectos}
        listas={listas}
        onFilterChange={handleFilterChange}
      />

      <LogisticaListaTecnicaList listas={listasFiltradas} />
    </div>
  )
}

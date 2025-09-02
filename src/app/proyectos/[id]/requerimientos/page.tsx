// ===================================================
// 📁 Archivo: page.tsx
// 📌 Ubicación: /app/proyectos/[id]/requerimientos/page.tsx
// 🔧 Descripción: Página para ver y gestionar listas de requerimientos del proyecto
//
// 🧠 Uso: Usada por el equipo técnico y gestión para ver listas aprobadas para compra
// ===================================================

import { getProyectoById } from '@/lib/services/proyecto'
import { getListaRequerimientos } from '@/lib/services/listaRequerimiento'
import ListaRequerimientoList from '@/components/requerimientos/ListaRequerimientoList'

interface Props {
  params: Promise<{ id: string }>
}

export default async function ProyectoRequerimientosPage({ params }: Props) {
  const { id } = await params
  const proyecto = await getProyectoById(id)
  const listas = await getListaRequerimientos()

  if (!proyecto) return <div className="text-red-500 p-4">❌ Proyecto no encontrado</div>

  return (
    <div className="p-4 space-y-6">
      <h1 className="text-2xl font-bold">🧾 Listas de Requerimiento</h1>
      <p className="text-muted-foreground">Proyecto: {proyecto.nombre}</p>

      <ListaRequerimientoList data={listas} />
    </div>
  )
}

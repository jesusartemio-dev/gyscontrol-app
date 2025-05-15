// ===================================================
// 📁 Archivo: layout.tsx
// 📌 Ubicación: src/app/proyectos/[id]/layout.tsx
// 🔧 Descripción: Layout principal para las páginas del proyecto con submenú
//
// 🧠 Uso: Carga el layout por proyecto con ID dinámico (server component)
// ✍️ Autor: Asistente IA GYS
// 📅 Última actualización: 2025-05-14
// ===================================================

import { ReactNode } from 'react'
import ProyectoSubMenu from '@/components/proyectos/ProyectoSubMenu'

interface Props {
  children: ReactNode
  params: { id: string }
}

export default function ProyectoLayout({ children, params }: Props) {
  return (
    <div className="min-h-screen">
      <ProyectoSubMenu proyectoId={params.id} />
      <main className="p-6 bg-white">{children}</main>
    </div>
  )
}

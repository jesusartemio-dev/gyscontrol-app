// ===================================================
// 📁 Archivo: layout.tsx
// 📌 Ubicación: src/app/logistica/layout.tsx
// 🔧 Descripción: Layout general para el área de logística con submenú
//
// 🧠 Uso: Usado en todas las rutas bajo /logistica
// ✍️ Autor: Asistente IA GYS
// 📅 Última actualización: 2025-05-22
// ===================================================

import { ReactNode } from 'react'
import LogisticaSubMenu from '@/components/logistica/LogisticaSubMenu'

interface Props {
  children: ReactNode
}

export default function LogisticaLayout({ children }: Props) {
  return (
    <div className="min-h-screen">
      <LogisticaSubMenu />
      <main className="p-6 bg-white">{children}</main>
    </div>
  )
}

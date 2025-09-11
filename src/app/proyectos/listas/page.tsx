// ===================================================
// 📁 Archivo: page.tsx
// 📌 Ubicación: src/app/proyectos/listas/
// 🔧 Descripción: Página para mostrar todas las listas de equipos de diferentes proyectos
// 🧠 Uso: Vista consolidada de listas técnicas por proyecto
// ✍️ Autor: Asistente IA GYS
// 📅 Última actualización: 2025-01-27
// ===================================================

import { Suspense } from 'react'
import { Metadata } from 'next'
import { ListasEquipoView } from '@/components/proyectos/ListasEquipoView'
import { Breadcrumb, BreadcrumbItem, BreadcrumbLink, BreadcrumbList, BreadcrumbPage, BreadcrumbSeparator } from '@/components/ui/breadcrumb'
import { Skeleton } from '@/components/ui/skeleton'

export const metadata: Metadata = {
  title: 'Listas de Equipos | GYS App',
  description: 'Gestión de listas de equipos por proyecto'
}

// ✅ Loading component for Suspense
function ListasLoading() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-10 w-32" />
      </div>
      <div className="grid gap-4">
        {Array.from({ length: 6 }).map((_, i) => (
          <Skeleton key={i} className="h-24 w-full" />
        ))}
      </div>
    </div>
  )
}

export default function ListasEquipoPage() {
  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* 🧭 Breadcrumb Navigation */}
      <Breadcrumb>
        <BreadcrumbList>
          <BreadcrumbItem>
            <BreadcrumbLink href="/proyectos">Proyectos</BreadcrumbLink>
          </BreadcrumbItem>
          <BreadcrumbSeparator />
          <BreadcrumbItem>
            <BreadcrumbPage>Listas de Equipos</BreadcrumbPage>
          </BreadcrumbItem>
        </BreadcrumbList>
      </Breadcrumb>

      {/* 📋 Header */}
      <div className="flex flex-col gap-2">
        <h1 className="text-3xl font-bold tracking-tight">Listas de Equipos</h1>
        <p className="text-muted-foreground">
          Gestión consolidada de listas técnicas por proyecto
        </p>
      </div>

      {/* 📊 Main Content */}
      <Suspense fallback={<ListasLoading />}>
        <ListasEquipoView />
      </Suspense>
    </div>
  )
}

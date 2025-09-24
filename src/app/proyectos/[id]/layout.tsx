// ===================================================
// 📁 Archivo: layout.tsx
// 📌 Ubicación: src/app/proyectos/[id]/layout.tsx
// 🔧 Descripción: Layout compartido para todas las páginas del proyecto
// 🎨 Proporciona navegación consistente y estructura común
// ✍️ Autor: Sistema de IA
// 📅 Última actualización: 2025-09-20
// ===================================================

'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { getProyectoById } from '@/lib/services/proyecto'
import type { Proyecto } from '@/types'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import {
  ArrowLeft,
  Calendar,
  Building,
  User,
  TrendingUp,
  AlertCircle,
  Eye
} from 'lucide-react'

interface ProjectLayoutProps {
  children: React.ReactNode
}

export default function ProjectLayout({ children }: ProjectLayoutProps) {
  const { id } = useParams()
  const router = useRouter()
  const [proyecto, setProyecto] = useState<Proyecto | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!id) return
    getProyectoById(id as string)
      .then((data) => {
        if (!data) {
          router.push('/proyectos')
          return
        }
        setProyecto(data)
      })
      .catch(() => {
        router.push('/proyectos')
      })
      .finally(() => setLoading(false))
  }, [id, router])


  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2
    }).format(amount)
  }

  const formatDate = (date: string) => {
    return new Intl.DateTimeFormat('es-PE', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    }).format(new Date(date))
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100">
        <div className="max-w-7xl mx-auto p-6">
          <div className="space-y-6">
            <Skeleton className="h-16 w-full rounded-xl" />
            <Skeleton className="h-12 w-full rounded-lg" />
            <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
              {Array.from({ length: 4 }).map((_, i) => (
                <Skeleton key={i} className="h-24 rounded-lg" />
              ))}
            </div>
          </div>
        </div>
      </div>
    )
  }

  if (!proyecto) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 flex items-center justify-center">
        <Card className="border-red-200 bg-red-50 max-w-md">
          <CardContent className="flex flex-col items-center justify-center py-12">
            <AlertCircle className="h-12 w-12 text-red-500 mb-4" />
            <h3 className="text-lg font-semibold text-red-800 mb-2">Proyecto no encontrado</h3>
            <p className="text-red-600 mb-4 text-center">El proyecto que buscas no existe.</p>
            <Button onClick={() => router.push('/proyectos')} className="bg-red-600 hover:bg-red-700">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Volver a Proyectos
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100">
      <div className="max-w-7xl mx-auto p-6 space-y-6">


        {/* Page Content */}
        <div className="space-y-6">
          {children}
        </div>
      </div>
    </div>
  )
}

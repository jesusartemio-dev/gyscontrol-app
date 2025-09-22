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
import { useParams, useRouter, usePathname } from 'next/navigation'
import { getProyectoById } from '@/lib/services/proyecto'
import type { Proyecto } from '@/types'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import {
  ArrowLeft,
  Package,
  Settings,
  Receipt,
  Calendar,
  Building,
  User,
  TrendingUp,
  Eye,
  AlertCircle,
  Target
} from 'lucide-react'
import Link from 'next/link'

interface ProjectLayoutProps {
  children: React.ReactNode
}

export default function ProjectLayout({ children }: ProjectLayoutProps) {
  const { id } = useParams()
  const router = useRouter()
  const pathname = usePathname()
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

  const navigationItems = [
    {
      id: 'overview',
      label: 'Resumen',
      href: `/proyectos/${id}`,
      icon: Eye,
      active: pathname === `/proyectos/${id}`
    },
    {
      id: 'cronograma',
      label: 'Cronograma',
      href: `/proyectos/${id}/cronograma`,
      icon: Target,
      active: pathname.startsWith(`/proyectos/${id}/cronograma`)
    },
    {
      id: 'equipos',
      label: 'Equipos',
      href: `/proyectos/${id}/equipos`,
      icon: Package,
      active: pathname.startsWith(`/proyectos/${id}/equipos`)
    },
    {
      id: 'servicios',
      label: 'Servicios',
      href: `/proyectos/${id}/servicios`,
      icon: Settings,
      active: pathname.startsWith(`/proyectos/${id}/servicios`)
    },
    {
      id: 'gastos',
      label: 'Gastos',
      href: `/proyectos/${id}/gastos`,
      icon: Receipt,
      active: pathname.startsWith(`/proyectos/${id}/gastos`)
    }
  ]

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
        {/* Header Section */}
        <Card className="border-slate-200 shadow-sm">
          <CardContent className="p-6">
            <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6">
              {/* Project Info */}
              <div className="space-y-3">
                <div className="flex items-center gap-3">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => router.push('/proyectos')}
                    className="text-slate-600 hover:text-slate-900"
                  >
                    <ArrowLeft className="h-4 w-4 mr-1" />
                    Proyectos
                  </Button>
                </div>

                <div>
                  <h1 className="text-2xl font-bold text-gray-900">{proyecto.nombre}</h1>
                  <p className="text-slate-600 flex items-center gap-2">
                    <Eye className="h-4 w-4" />
                    Código: <span className="font-mono font-medium">{proyecto.codigo}</span>
                  </p>
                </div>

                {/* Quick Info */}
                <div className="flex flex-wrap gap-4 text-sm text-slate-600">
                  <div className="flex items-center gap-2">
                    <Building className="h-4 w-4" />
                    <span>{proyecto.cliente?.nombre || 'Sin cliente'}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <User className="h-4 w-4" />
                    <span>{proyecto.comercial?.name || 'Sin comercial'}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Calendar className="h-4 w-4" />
                    <span>{formatDate(proyecto.fechaInicio)}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <TrendingUp className="h-4 w-4" />
                    <span>{formatCurrency(proyecto.grandTotal)}</span>
                  </div>
                </div>
              </div>

              {/* Status Badge */}
              <div className="flex flex-col items-end gap-3">
                <Badge
                  variant="outline"
                  className={`px-3 py-1 text-sm font-medium ${
                    proyecto.estado === 'completado'
                      ? 'bg-green-100 text-green-800 border-green-200'
                      : proyecto.estado === 'en_ejecucion'
                      ? 'bg-blue-100 text-blue-800 border-blue-200'
                      : proyecto.estado === 'pausado'
                      ? 'bg-orange-100 text-orange-800 border-orange-200'
                      : 'bg-gray-100 text-gray-800 border-gray-200'
                  }`}
                >
                  {proyecto.estado?.charAt(0).toUpperCase() + proyecto.estado?.slice(1) || 'Sin estado'}
                </Badge>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Navigation Tabs */}
        <Card className="border-slate-200 shadow-sm">
          <CardContent className="p-4">
            <nav className="flex flex-wrap gap-2">
              {navigationItems.map((item) => {
                const Icon = item.icon
                return (
                  <Link key={item.id} href={item.href}>
                    <Button
                      variant={item.active ? "default" : "ghost"}
                      size="sm"
                      className={`flex items-center gap-2 ${
                        item.active
                          ? 'bg-blue-600 hover:bg-blue-700 text-white'
                          : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                      }`}
                    >
                      <Icon className="h-4 w-4" />
                      {item.label}
                    </Button>
                  </Link>
                )
              })}
            </nav>
          </CardContent>
        </Card>

        {/* Page Content */}
        <div className="space-y-6">
          {children}
        </div>
      </div>
    </div>
  )
}

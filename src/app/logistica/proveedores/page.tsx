// ===================================================
// 📁 Archivo: page.tsx
// 📌 Ubicación: src/app/logistica/proveedores/page.tsx
// 🔧 Descripción: Página principal para gestión de proveedores con UX/UI mejorada
// 🧠 Uso: Vista moderna para logística con diseño profesional y animaciones
// ✍️ Autor: Senior Fullstack Developer
// 📅 Última actualización: 2025-01-15
// ===================================================

'use client'

import { useEffect, useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { motion, Variants } from 'framer-motion'
import { ChevronRight, Users, Building2, Plus, RefreshCw, Hash } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { Skeleton } from '@/components/ui/skeleton'
import { toast } from 'sonner'
import { Proveedor, ProveedorPayload, ProveedorUpdatePayload } from '@/types'
import {
  getProveedores,
  createProveedor,
  updateProveedor,
  deleteProveedor,
} from '@/lib/services/proveedor'
import ProveedorForm from '@/components/logistica/ProveedorForm'
import ProveedorList from '@/components/logistica/ProveedorList'

// Animation variants
const containerVariants: Variants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.1,
      delayChildren: 0.1
    }
  }
}

const itemVariants: Variants = {
  hidden: { opacity: 0, y: 20 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.5, ease: [0, 0, 0.2, 1] as const }
  }
}

export default function ProveedoresPage() {
  const router = useRouter()
  const [proveedores, setProveedores] = useState<Proveedor[]>([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)

  const cargarProveedores = useCallback(async (showRefreshing = false) => {
    try {
      if (showRefreshing) setRefreshing(true)
      const data = await getProveedores()
      if (data) {
        setProveedores(data)
      }
    } catch (error) {
      toast.error('Error al cargar proveedores')
    } finally {
      setLoading(false)
      if (showRefreshing) setRefreshing(false)
    }
  }, [])

  useEffect(() => {
    cargarProveedores()
  }, [cargarProveedores])

  const handleCreate = async (payload: ProveedorPayload) => {
    try {
      const nuevo = await createProveedor(payload)
      if (nuevo) {
        toast.success('Proveedor creado exitosamente')
        await cargarProveedores()
      }
    } catch (error) {
      toast.error('Error al crear proveedor')
    }
  }

  const handleUpdate = async (id: string, payload: ProveedorUpdatePayload) => {
    try {
      const actualizado = await updateProveedor(id, payload)
      if (actualizado) {
        toast.success('Proveedor actualizado exitosamente')
        await cargarProveedores()
      }
    } catch (error) {
      toast.error('Error al actualizar proveedor')
    }
  }

  const handleDelete = async (id: string) => {
    try {
      const ok = await deleteProveedor(id)
      if (ok) {
        toast.success('Proveedor eliminado exitosamente')
        await cargarProveedores()
      }
    } catch (error) {
      toast.error('Error al eliminar proveedor')
    }
  }

  const handleRefresh = () => {
    cargarProveedores(true)
  }

  // Format statistics
  const totalProveedores = proveedores.length
  const proveedoresConRuc = proveedores.filter(p => p.ruc && p.ruc.trim()).length
  const proveedoresSinRuc = totalProveedores - proveedoresConRuc

  if (loading) {
    return (
      <div className="container mx-auto px-4 py-6 max-w-7xl">
        <div className="space-y-6">
          {/* Header Skeleton */}
          <div className="space-y-4">
            <Skeleton className="h-6 w-48" />
            <div className="flex items-center justify-between">
              <Skeleton className="h-8 w-64" />
              <Skeleton className="h-10 w-32" />
            </div>
          </div>
          
          {/* Stats Skeleton */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {[1, 2, 3].map((i) => (
              <Card key={i}>
                <CardHeader className="pb-2">
                  <Skeleton className="h-4 w-24" />
                </CardHeader>
                <CardContent>
                  <Skeleton className="h-8 w-16" />
                </CardContent>
              </Card>
            ))}
          </div>
          
          {/* Form Skeleton */}
          <Card>
            <CardHeader>
              <Skeleton className="h-6 w-48" />
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <Skeleton className="h-10 w-full" />
                <Skeleton className="h-10 w-full" />
                <Skeleton className="h-10 w-full" />
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    )
  }

  return (
    <motion.div
      className="container mx-auto px-4 py-6 max-w-7xl"
      variants={containerVariants}
      initial="hidden"
      animate="visible"
    >
      {/* Breadcrumb Navigation */}
      <motion.nav 
        className="flex items-center space-x-2 text-sm text-muted-foreground mb-6"
        variants={itemVariants}
      >
        <Button 
          variant="ghost" 
          size="sm"
          onClick={() => router.push('/logistica')}
          className="hover:bg-gray-100 transition-colors"
        >
          Logística
        </Button>
        <ChevronRight className="h-4 w-4" />
        <span className="font-medium text-foreground">Proveedores</span>
      </motion.nav>

      {/* Header Section */}
      <motion.div 
        className="flex items-center justify-between mb-8"
        variants={itemVariants}
      >
        <div className="space-y-1">
          <h1 className="text-3xl font-bold tracking-tight flex items-center gap-3">
            <div className="p-2 bg-purple-100 rounded-lg">
              <Users className="h-6 w-6 text-purple-600" />
            </div>
            Gestión de Proveedores
          </h1>
          <p className="text-muted-foreground">
            Administra y gestiona la información de tus proveedores
          </p>
        </div>
        
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={handleRefresh}
            disabled={refreshing}
            className="hover:bg-gray-50 transition-colors"
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${refreshing ? 'animate-spin' : ''}`} />
            Actualizar
          </Button>
        </div>
      </motion.div>

      {/* Statistics Cards */}
      <motion.div 
        className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8"
        variants={itemVariants}
      >
        <Card className="hover:shadow-md transition-shadow">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Total Proveedores
            </CardTitle>
            <Building2 className="h-4 w-4 text-blue-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">{totalProveedores}</div>
            <p className="text-xs text-muted-foreground mt-1">
              Proveedores registrados
            </p>
          </CardContent>
        </Card>

        <Card className="hover:shadow-md transition-shadow">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Con RUC
            </CardTitle>
            <Hash className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{proveedoresConRuc}</div>
            <p className="text-xs text-muted-foreground mt-1">
              Proveedores formales
            </p>
          </CardContent>
        </Card>

        <Card className="hover:shadow-md transition-shadow">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Sin RUC
            </CardTitle>
            <Users className="h-4 w-4 text-orange-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-orange-600">{proveedoresSinRuc}</div>
            <p className="text-xs text-muted-foreground mt-1">
              Proveedores informales
            </p>
          </CardContent>
        </Card>
      </motion.div>

      <Separator className="mb-8" />

      {/* Form Section */}
      <motion.div variants={itemVariants}>
        <ProveedorForm onCreated={handleCreate} />
      </motion.div>

      <Separator className="my-8" />

      {/* List Section */}
      <motion.div variants={itemVariants}>
        <ProveedorList
          data={proveedores}
          onUpdate={handleUpdate}
          onDelete={handleDelete}
          loading={refreshing}
        />
      </motion.div>
    </motion.div>
  )
}

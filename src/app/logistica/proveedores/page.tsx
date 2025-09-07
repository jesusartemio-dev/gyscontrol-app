'use client'

import { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import { getProveedores } from '@/lib/services/proveedor'
import ProveedorForm from '@/components/logistica/ProveedorForm'
import ProveedorList from '@/components/logistica/ProveedorList'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { toast } from 'sonner'
import { 
  Users, 
  Home, 
  ChevronRight, 
  Building2, 
  UserPlus,
  TrendingUp,
  Activity
} from 'lucide-react'
import type { Proveedor } from '@/types'

// Animation variants
const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      duration: 0.6,
      staggerChildren: 0.1
    }
  }
}

const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.5 }
  }
}

export default function ProveedoresPage() {
  const [proveedores, setProveedores] = useState<Proveedor[]>([])
  const [editando, setEditando] = useState<Proveedor | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const loadProveedores = async () => {
      try {
        setLoading(true)
        setError(null)
        const data = await getProveedores()
        setProveedores(data)
      } catch (err) {
        setError('Error al cargar los proveedores')
        toast.error('Error al cargar los proveedores')
      } finally {
        setLoading(false)
      }
    }

    loadProveedores()
  }, [])

  const handleSaved = (proveedor: Proveedor) => {
    console.log('🎉 Proveedor guardado:', proveedor)
    if (editando) {
      setProveedores(proveedores.map(p => p.id === proveedor.id ? proveedor : p))
      toast.success('Proveedor actualizado exitosamente')
    } else {
      setProveedores([...proveedores, proveedor])
      // No mostrar toast aquí porque ya se muestra en el formulario
    }
    setEditando(null)
  }

  const handleDelete = (id: string) => {
    setProveedores(proveedores.filter(p => p.id !== id))
    toast.success('Proveedor eliminado exitosamente')
  }

  const handleEdit = (proveedor: Proveedor) => {
    setEditando(proveedor)
  }

  const handleCancelEdit = () => {
    setEditando(null)
  }

  // 📊 Estadísticas rápidas
  const totalProveedores = proveedores.length
  const proveedoresConRuc = proveedores.filter(p => p.ruc).length

  return (
    <motion.div 
      className="min-h-screen bg-gray-50/50 p-4 md:p-6 lg:p-8"
      variants={containerVariants}
      initial="hidden"
      animate="visible"
    >
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Breadcrumb Navigation */}
        <motion.nav 
          className="flex items-center space-x-2 text-sm text-muted-foreground mb-6"
          variants={itemVariants}
        >
          <Button variant="ghost" size="sm" className="p-0 h-auto">
            <Home className="h-4 w-4 mr-2" />
            Inicio
          </Button>
          <ChevronRight className="h-4 w-4" />
          <Button variant="ghost" size="sm" className="p-0 h-auto">
            Logística
          </Button>
          <ChevronRight className="h-4 w-4" />
          <span className="font-medium text-foreground">Proveedores</span>
        </motion.nav>

        {/* Header Section */}
        <motion.div 
          className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8"
          variants={itemVariants}
        >
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-100 rounded-lg">
              <Users className="h-6 w-6 text-blue-600" />
            </div>
            <div>
              <h1 className="text-3xl font-bold text-gray-900">
                {editando ? 'Editar Proveedor' : 'Gestión de Proveedores'}
              </h1>
              <p className="text-gray-600 mt-1">
                {editando ? 'Modifica la información del proveedor' : 'Administra la base de datos de proveedores'}
              </p>
            </div>
          </div>
          
          {/* Quick Stats */}
          <div className="flex gap-4">
            <div className="text-center">
              <div className="text-2xl font-bold text-blue-600">{totalProveedores}</div>
              <div className="text-sm text-gray-500">Total Proveedores</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-green-600">{proveedoresConRuc}</div>
              <div className="text-sm text-gray-500">Con RUC</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-purple-600">{totalProveedores - proveedoresConRuc}</div>
              <div className="text-sm text-gray-500">Sin RUC</div>
            </div>
          </div>
        </motion.div>

        {/* Error Alert */}
        {error && (
          <motion.div variants={itemVariants}>
            <Alert variant="destructive">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          </motion.div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Form Section */}
          <motion.div className="lg:col-span-1" variants={itemVariants}>
            <Card className="shadow-sm border-0 bg-white/80 backdrop-blur-sm">
              <CardHeader className="pb-4">
                <CardTitle className="flex items-center gap-2">
                  <UserPlus className="h-5 w-5 text-blue-600" />
                  {editando ? 'Editar Proveedor' : 'Nuevo Proveedor'}
                </CardTitle>
                <CardDescription>
                  {editando ? 'Modifica los datos del proveedor seleccionado' : 'Completa los datos para registrar un nuevo proveedor'}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <ProveedorForm 
                  onSaved={handleSaved} 
                  initial={editando}
                  onCancel={handleCancelEdit}
                />
              </CardContent>
            </Card>
          </motion.div>

          {/* Providers List Section */}
          <motion.div className="lg:col-span-2" variants={itemVariants}>
            <Card className="shadow-sm border-0 bg-white/80 backdrop-blur-sm">
              <CardHeader className="pb-4">
                <CardTitle className="flex items-center gap-2">
                  <Building2 className="h-5 w-5 text-blue-600" />
                  Lista de Proveedores
                </CardTitle>
                <CardDescription>
                  Gestiona todos los proveedores registrados en el sistema
                </CardDescription>
              </CardHeader>
              <CardContent>
                <ProveedorList 
                  proveedores={proveedores} 
                  onDeleted={handleDelete} 
                  onEdit={handleEdit}
                  loading={loading}
                />
              </CardContent>
            </Card>
          </motion.div>
        </div>
      </div>
    </motion.div>
  )
}

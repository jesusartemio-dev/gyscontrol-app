'use client'

import { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import { getProveedores } from '@/lib/services/proveedor'
import ProveedorForm from '@/components/logistica/ProveedorForm'
import ProveedorTableView from '@/components/logistica/ProveedorTableView'
import ProveedorCardView from '@/components/logistica/ProveedorCardView'
import ProveedorImportExport from '@/components/logistica/ProveedorImportExport'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { toast } from 'sonner'
import {
  Users,
  Home,
  ChevronRight,
  Building2,
  UserPlus,
  TrendingUp,
  Activity,
  AlertCircle,
  Plus,
  Table,
  Grid3X3
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
  const [errores, setErrores] = useState<string[]>([])
  const [editando, setEditando] = useState<Proveedor | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [showEditModal, setShowEditModal] = useState(false)
  const [viewMode, setViewMode] = useState<'table' | 'card'>('table')

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
      setShowCreateModal(false)
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
    setShowEditModal(true)
  }

  const handleCancelEdit = () => {
    setEditando(null)
    setShowEditModal(false)
  }

  const handleImported = async () => {
    // 🔁 Recargar lista de proveedores después de importación
    try {
      setLoading(true)
      setErrores([]) // Clear import errors on successful import
      const data = await getProveedores()
      setProveedores(data)
      toast.success('Lista de proveedores actualizada')
    } catch (err) {
      toast.error('Error al actualizar la lista de proveedores')
    } finally {
      setLoading(false)
    }
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
                Gestión de Proveedores
              </h1>
              <p className="text-gray-600 mt-1">
                Administra la base de datos de proveedores
              </p>
            </div>
          </div>
          
          <div className="flex flex-col sm:flex-row gap-4 sm:items-center">
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
            
            {/* Create Provider Button */}
            <Dialog open={showCreateModal} onOpenChange={setShowCreateModal}>
              <DialogTrigger asChild>
                <Button>
                  <Plus className="h-4 w-4 mr-2" />
                  Crear Proveedor
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                  <DialogTitle>Crear Nuevo Proveedor</DialogTitle>
                  <DialogDescription>
                    Completa los datos para registrar un nuevo proveedor en el sistema
                  </DialogDescription>
                </DialogHeader>
                <ProveedorForm
                  onSaved={handleSaved}
                  onCancel={() => setShowCreateModal(false)}
                />
              </DialogContent>
            </Dialog>

            {/* View Toggle */}
            <div className="flex items-center gap-1 border rounded-lg p-1">
              <Button
                variant={viewMode === 'table' ? 'default' : 'ghost'}
                size="sm"
                onClick={() => setViewMode('table')}
                className="h-8 px-3"
              >
                <Table className="h-4 w-4" />
              </Button>
              <Button
                variant={viewMode === 'card' ? 'default' : 'ghost'}
                size="sm"
                onClick={() => setViewMode('card')}
                className="h-8 px-3"
              >
                <Grid3X3 className="h-4 w-4" />
              </Button>
            </div>

            {/* Import/Export Actions */}
            <ProveedorImportExport
              proveedores={proveedores}
              onImported={handleImported}
              onErrores={setErrores}
            />
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

        {/* Import Errors */}
        {errores.length > 0 && (
          <motion.div variants={itemVariants}>
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertTitle>Errores de importación</AlertTitle>
              <AlertDescription>
                <div className="mt-2 space-y-1">
                  {errores.map((error, index) => (
                    <div key={index} className="text-sm">
                      {error}
                    </div>
                  ))}
                </div>
              </AlertDescription>
            </Alert>
          </motion.div>
        )}

        {/* Providers List Section */}
        <motion.div variants={itemVariants}>
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
              {viewMode === 'table' ? (
                <ProveedorTableView
                  proveedores={proveedores}
                  onDeleted={handleDelete}
                  onEdit={handleEdit}
                  loading={loading}
                />
              ) : (
                <ProveedorCardView
                  proveedores={proveedores}
                  onDeleted={handleDelete}
                  onEdit={handleEdit}
                  loading={loading}
                />
              )}
            </CardContent>
          </Card>
        </motion.div>

        {/* Edit Provider Modal */}
        <Dialog open={showEditModal} onOpenChange={setShowEditModal}>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Editar Proveedor</DialogTitle>
              <DialogDescription>
                Modifica los datos del proveedor seleccionado
              </DialogDescription>
            </DialogHeader>
            <ProveedorForm
              onSaved={handleSaved}
              initial={editando}
              onCancel={handleCancelEdit}
            />
          </DialogContent>
        </Dialog>
      </div>
    </motion.div>
  )
}

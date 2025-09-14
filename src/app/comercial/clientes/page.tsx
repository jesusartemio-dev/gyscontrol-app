'use client'

import { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import { getClientes } from '@/lib/services/cliente'
import ClienteForm from '@/components/clientes/ClienteForm'
import ClienteList from '@/components/clientes/ClienteList'
import ClienteImportExport from '@/components/clientes/ClienteImportExport'
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
import type { Cliente } from '@/types'

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

export default function ClientesPage() {
  const [clientes, setClientes] = useState<Cliente[]>([])
  const [editando, setEditando] = useState<Cliente | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const loadClientes = async () => {
      try {
        setLoading(true)
        setError(null)
        const data = await getClientes()
        setClientes(data)
      } catch (err) {
        setError('Error al cargar los clientes')
        toast.error('Error al cargar los clientes')
      } finally {
        setLoading(false)
      }
    }

    loadClientes()
  }, [])

  const handleSaved = (cliente: Cliente) => {
    if (editando) {
      setClientes(clientes.map(c => c.id === cliente.id ? cliente : c))
      toast.success('Cliente actualizado exitosamente')
    } else {
      setClientes([...clientes, cliente])
      toast.success('Cliente creado exitosamente')
    }
    setEditando(null)
  }

  const handleDelete = (id: string) => {
    setClientes(clientes.filter(c => c.id !== id))
    toast.success('Cliente eliminado exitosamente')
  }

  const handleEdit = (cliente: Cliente) => {
    setEditando(cliente)
  }

  const handleCancelEdit = () => {
    setEditando(null)
  }

  // ✅ Handle import success
  const handleImported = async () => {
    try {
      const data = await getClientes()
      setClientes(data)
      toast.success('Clientes actualizados después de la importación')
    } catch (err) {
      console.error('Error reloading clients after import:', err)
      toast.error('Error al actualizar la lista de clientes')
    }
  }

  // ✅ Handle import errors
  const handleImportErrors = (errores: string[]) => {
    console.error('Import validation errors:', errores)
    // You could show a detailed error modal here if needed
  }

  // Calculate statistics
  const totalClientes = clientes.length
  const clientesConRuc = clientes.filter(c => c.ruc).length
  const clientesConCorreo = clientes.filter(c => c.correo).length

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
            Comercial
          </Button>
          <ChevronRight className="h-4 w-4" />
          <span className="font-medium text-foreground">Clientes</span>
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
                {editando ? 'Editar Cliente' : 'Gestión de Clientes'}
              </h1>
              <p className="text-gray-600 mt-1">
                {editando ? 'Modifica la información del cliente' : 'Administra la base de datos de clientes'}
              </p>
            </div>
          </div>
          
          <div className="flex flex-col sm:flex-row gap-4 items-end">
            {/* Import/Export Actions */}
            <ClienteImportExport 
              clientes={clientes}
              onImported={handleImported}
              onImportErrors={handleImportErrors}
            />
            
            {/* Quick Stats */}
            <div className="flex gap-4">
              <div className="text-center">
                <div className="text-2xl font-bold text-blue-600">{totalClientes}</div>
                <div className="text-sm text-gray-500">Total Clientes</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-green-600">{clientesConRuc}</div>
                <div className="text-sm text-gray-500">Con RUC</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-purple-600">{clientesConCorreo}</div>
                <div className="text-sm text-gray-500">Con Email</div>
              </div>
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
                  {editando ? 'Editar Cliente' : 'Nuevo Cliente'}
                </CardTitle>
                <CardDescription>
                  {editando ? 'Modifica los datos del cliente seleccionado' : 'Completa los datos para registrar un nuevo cliente'}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <ClienteForm 
                  onSaved={handleSaved} 
                  initial={editando}
                  onCancel={handleCancelEdit}
                />
              </CardContent>
            </Card>
          </motion.div>

          {/* Clients List Section */}
          <motion.div className="lg:col-span-2" variants={itemVariants}>
            <Card className="shadow-sm border-0 bg-white/80 backdrop-blur-sm">
              <CardHeader className="pb-4">
                <CardTitle className="flex items-center gap-2">
                  <Building2 className="h-5 w-5 text-blue-600" />
                  Lista de Clientes
                </CardTitle>
                <CardDescription>
                  Gestiona todos los clientes registrados en el sistema
                </CardDescription>
              </CardHeader>
              <CardContent>
                <ClienteList 
                  clientes={clientes} 
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

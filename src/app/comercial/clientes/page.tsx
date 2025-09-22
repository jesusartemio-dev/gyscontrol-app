'use client'

import { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import { useRouter } from 'next/navigation'
import { getClientes } from '@/lib/services/cliente'
import ClienteList from '@/components/clientes/ClienteList'
import ClienteModal from '@/components/clientes/ClienteModal'
import ClienteGridView from '@/components/clientes/ClienteGridView'
import ClienteListView from '@/components/clientes/ClienteListView'
import ClienteImportExport from '@/components/clientes/ClienteImportExport'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { toast } from 'sonner'
import {
  Users,
  Home,
  ChevronRight,
  Building2,
  UserPlus,
  TrendingUp,
  Activity,
  Search,
  Filter,
  Grid3X3,
  List,
  Eye,
  Edit3,
  Trash2,
  BarChart3
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
  const router = useRouter()
  const [clientes, setClientes] = useState<any[]>([])
  const [filteredClientes, setFilteredClientes] = useState<any[]>([])
  const [modalOpen, setModalOpen] = useState(false)
  const [editingCliente, setEditingCliente] = useState<any | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [viewMode, setViewMode] = useState<'list' | 'grid'>('list')

  // Filter states
  const [searchTerm, setSearchTerm] = useState('')
  const [sectorFilter, setSectorFilter] = useState('todos')
  const [estadoFilter, setEstadoFilter] = useState('todos')

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

  const handleSaved = (cliente: any) => {
    if (editingCliente) {
      setClientes(clientes.map(c => c.id === cliente.id ? cliente : c))
      toast.success('Cliente actualizado exitosamente')
    } else {
      setClientes([...clientes, cliente])
      toast.success('Cliente creado exitosamente')
    }
    setEditingCliente(null)
    setModalOpen(false)
  }

  const handleDelete = (id: string) => {
    setClientes(clientes.filter(c => c.id !== id))
    toast.success('Cliente eliminado exitosamente')
  }

  const handleDeleteCliente = (cliente: any) => {
    handleDelete(cliente.id)
  }

  const handleEdit = (cliente: any) => {
    setEditingCliente(cliente)
    setModalOpen(true)
  }

  const handleCreate = () => {
    setEditingCliente(null)
    setModalOpen(true)
  }

  const handleCloseModal = () => {
    setModalOpen(false)
    setEditingCliente(null)
  }

  // Filter and search functionality
  const applyFilters = () => {
    let filtered = [...clientes]

    // Search filter
    if (searchTerm) {
      filtered = filtered.filter(cliente =>
        cliente.nombre?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        cliente.ruc?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        cliente.correo?.toLowerCase().includes(searchTerm.toLowerCase())
      )
    }

    // Sector filter
    if (sectorFilter && sectorFilter !== "todos") {
      filtered = filtered.filter(cliente => cliente.sector === sectorFilter)
    }

    // Estado filter
    if (estadoFilter && estadoFilter !== "todos") {
      filtered = filtered.filter(cliente => cliente.estadoRelacion === estadoFilter)
    }

    setFilteredClientes(filtered)
  }

  // Apply filters when filters change
  useEffect(() => {
    applyFilters()
  }, [clientes, searchTerm, sectorFilter, estadoFilter])

  // Initialize filtered clients
  useEffect(() => {
    setFilteredClientes(clientes)
  }, [clientes])

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
                Gestión de Clientes
              </h1>
              <p className="text-gray-600 mt-1">
                Administra la base de datos de clientes
              </p>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row gap-4 items-end">
            {/* Action Buttons */}
            <div className="flex gap-2">
              <Button onClick={handleCreate} className="flex items-center gap-2">
                <UserPlus className="h-4 w-4" />
                Nuevo Cliente
              </Button>
              <ClienteImportExport
                clientes={clientes}
                onImported={handleImported}
                onImportErrors={handleImportErrors}
              />
            </div>

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

        {/* Filters Section */}
        <motion.div variants={itemVariants}>
          <Card className="shadow-sm border-0 bg-white/80 backdrop-blur-sm">
            <CardHeader className="pb-4">
              <CardTitle className="flex items-center gap-2">
                <Filter className="h-5 w-5 text-blue-600" />
                Filtros y Búsqueda
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                {/* Search */}
                <div className="space-y-2">
                  <label className="text-sm font-medium">Buscar</label>
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                    <Input
                      placeholder="Nombre, RUC o email..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="pl-10"
                    />
                  </div>
                </div>

                {/* Sector Filter */}
                <div className="space-y-2">
                  <label className="text-sm font-medium">Sector</label>
                  <Select value={sectorFilter || "todos"} onValueChange={(value) => setSectorFilter(value === "todos" ? "" : value)}>
                    <SelectTrigger>
                      <SelectValue placeholder="Todos los sectores" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="todos">Todos los sectores</SelectItem>
                      <SelectItem value="Minería">Minería</SelectItem>
                      <SelectItem value="Manufactura">Manufactura</SelectItem>
                      <SelectItem value="Energía">Energía</SelectItem>
                      <SelectItem value="Construcción">Construcción</SelectItem>
                      <SelectItem value="Tecnología">Tecnología</SelectItem>
                      <SelectItem value="Salud">Salud</SelectItem>
                      <SelectItem value="Educación">Educación</SelectItem>
                      <SelectItem value="Comercio">Comercio</SelectItem>
                      <SelectItem value="Transporte">Transporte</SelectItem>
                      <SelectItem value="Otros">Otros</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* Estado Filter */}
                <div className="space-y-2">
                  <label className="text-sm font-medium">Estado Relación</label>
                  <Select value={estadoFilter || "todos"} onValueChange={(value) => setEstadoFilter(value === "todos" ? "" : value)}>
                    <SelectTrigger>
                      <SelectValue placeholder="Todos los estados" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="todos">Todos los estados</SelectItem>
                      <SelectItem value="prospecto">Prospecto</SelectItem>
                      <SelectItem value="cliente_activo">Cliente Activo</SelectItem>
                      <SelectItem value="cliente_inactivo">Cliente Inactivo</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* View Mode Toggle */}
                <div className="space-y-2">
                  <label className="text-sm font-medium">Vista</label>
                  <div className="flex gap-2">
                    <Button
                      variant={viewMode === 'list' ? 'default' : 'outline'}
                      size="sm"
                      onClick={() => setViewMode('list')}
                      className="flex-1"
                    >
                      <List className="h-4 w-4 mr-1" />
                      Lista
                    </Button>
                    <Button
                      variant={viewMode === 'grid' ? 'default' : 'outline'}
                      size="sm"
                      onClick={() => setViewMode('grid')}
                      className="flex-1"
                    >
                      <Grid3X3 className="h-4 w-4 mr-1" />
                      Grid
                    </Button>
                  </div>
                </div>
              </div>

              {/* Results Summary */}
              <div className="mt-4 pt-4 border-t">
                <div className="flex items-center justify-between text-sm text-muted-foreground">
                  <span>
                    Mostrando {filteredClientes.length} de {clientes.length} clientes
                  </span>
                  {(searchTerm || (sectorFilter && sectorFilter !== "todos") || (estadoFilter && estadoFilter !== "todos")) && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        setSearchTerm('')
                        setSectorFilter('todos')
                        setEstadoFilter('todos')
                      }}
                    >
                      Limpiar filtros
                    </Button>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* Clients Display Section */}
        <motion.div variants={itemVariants}>
          <Card className="shadow-sm border-0 bg-white/80 backdrop-blur-sm">
            <CardHeader className="pb-4">
              <CardTitle className="flex items-center gap-2">
                <Building2 className="h-5 w-5 text-blue-600" />
                {viewMode === 'list' ? 'Lista de Clientes' : 'Grid de Clientes'}
              </CardTitle>
              <CardDescription>
                Gestiona todos los clientes registrados en el sistema
              </CardDescription>
            </CardHeader>
            <CardContent>
              {viewMode === 'list' ? (
                <ClienteListView
                  clientes={filteredClientes}
                  onEdit={handleEdit}
                  onViewDetail={(cliente: any) => router.push(`/comercial/clientes/${cliente.id}`)}
                  onDelete={handleDeleteCliente}
                  loading={loading}
                />
              ) : (
                <ClienteGridView
                  clientes={filteredClientes}
                  onEdit={handleEdit}
                  onViewDetail={(cliente: any) => router.push(`/comercial/clientes/${cliente.id}`)}
                  loading={loading}
                />
              )}
            </CardContent>
          </Card>
        </motion.div>

        {/* Cliente Modal */}
        <ClienteModal
          isOpen={modalOpen}
          onClose={handleCloseModal}
          onSaved={handleSaved}
          initial={editingCliente}
          mode={editingCliente ? 'edit' : 'create'}
        />
      </div>
    </motion.div>
  )
}

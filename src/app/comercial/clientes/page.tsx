'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { getClientes } from '@/lib/services/cliente'
import ClienteModal from '@/components/clientes/ClienteModal'
import ClienteGridView from '@/components/clientes/ClienteGridView'
import ClienteListView from '@/components/clientes/ClienteListView'
import ClienteImportExport from '@/components/clientes/ClienteImportExport'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { toast } from 'sonner'
import {
  Users,
  UserPlus,
  Search,
  Grid3X3,
  List,
  X,
  AlertCircle
} from 'lucide-react'

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
  const [sectorFilter, setSectorFilter] = useState('__ALL__')
  const [estadoFilter, setEstadoFilter] = useState('__ALL__')

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
      toast.success('Cliente actualizado')
    } else {
      setClientes([...clientes, cliente])
      toast.success('Cliente creado')
    }
    setEditingCliente(null)
    setModalOpen(false)
  }

  const handleDelete = (id: string) => {
    setClientes(clientes.filter(c => c.id !== id))
    toast.success('Cliente eliminado')
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
  useEffect(() => {
    let filtered = [...clientes]

    if (searchTerm) {
      filtered = filtered.filter(cliente =>
        cliente.nombre?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        cliente.ruc?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        cliente.correo?.toLowerCase().includes(searchTerm.toLowerCase())
      )
    }

    if (sectorFilter !== '__ALL__') {
      filtered = filtered.filter(cliente => cliente.sector === sectorFilter)
    }

    if (estadoFilter !== '__ALL__') {
      filtered = filtered.filter(cliente => cliente.estadoRelacion === estadoFilter)
    }

    setFilteredClientes(filtered)
  }, [clientes, searchTerm, sectorFilter, estadoFilter])

  const handleImported = async () => {
    try {
      const data = await getClientes()
      setClientes(data)
      toast.success('Clientes actualizados')
    } catch (err) {
      toast.error('Error al actualizar la lista')
    }
  }

  const handleImportErrors = (errores: string[]) => {
    console.error('Import validation errors:', errores)
  }

  const hasFilters = searchTerm || sectorFilter !== '__ALL__' || estadoFilter !== '__ALL__'

  const clearFilters = () => {
    setSearchTerm('')
    setSectorFilter('__ALL__')
    setEstadoFilter('__ALL__')
  }

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="flex justify-between items-center">
          <Skeleton className="h-8 w-32" />
          <div className="flex gap-2">
            <Skeleton className="h-9 w-24" />
            <Skeleton className="h-9 w-20" />
          </div>
        </div>
        <div className="flex flex-wrap gap-3">
          <Skeleton className="h-9 w-[250px]" />
          <Skeleton className="h-9 w-[150px]" />
          <Skeleton className="h-9 w-[150px]" />
        </div>
        <Card>
          <CardContent className="p-0">
            <div className="divide-y">
              {[1, 2, 3, 4, 5].map((i) => (
                <div key={i} className="flex items-center gap-4 p-3">
                  <Skeleton className="h-8 w-8 rounded-full" />
                  <Skeleton className="h-4 w-32" />
                  <Skeleton className="h-4 flex-1" />
                  <Skeleton className="h-4 w-20" />
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {/* Header compacto */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <Users className="h-6 w-6 text-primary" />
            <h1 className="text-xl font-semibold">Clientes</h1>
          </div>
          <Badge variant="secondary" className="font-normal">
            {clientes.length}
          </Badge>
        </div>

        <div className="flex items-center gap-2">
          <Button size="sm" onClick={handleCreate}>
            <UserPlus className="h-4 w-4 mr-1" />
            Nuevo
          </Button>
          <ClienteImportExport
            clientes={clientes}
            onImported={handleImported}
            onImportErrors={handleImportErrors}
          />
        </div>
      </div>

      {/* Error */}
      {error && (
        <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
          <div className="flex items-center gap-2 text-sm text-red-700">
            <AlertCircle className="h-4 w-4" />
            {error}
          </div>
        </div>
      )}

      {/* Filtros inline */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-[200px] max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar por nombre, RUC o email..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-9 pr-9 h-9"
          />
          {searchTerm && (
            <Button
              variant="ghost"
              size="sm"
              className="absolute right-1 top-1/2 -translate-y-1/2 h-7 w-7 p-0"
              onClick={() => setSearchTerm('')}
            >
              <X className="h-4 w-4" />
            </Button>
          )}
        </div>

        <Select value={sectorFilter} onValueChange={setSectorFilter}>
          <SelectTrigger className="w-[160px] h-9">
            <SelectValue>
              {sectorFilter === '__ALL__' ? 'Sector: Todos' : sectorFilter}
            </SelectValue>
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="__ALL__">Todos los sectores</SelectItem>
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

        <Select value={estadoFilter} onValueChange={setEstadoFilter}>
          <SelectTrigger className="w-[160px] h-9">
            <SelectValue>
              {estadoFilter === '__ALL__' ? 'Estado: Todos' :
                estadoFilter === 'prospecto' ? 'Prospecto' :
                estadoFilter === 'cliente_activo' ? 'Activo' :
                estadoFilter === 'cliente_inactivo' ? 'Inactivo' : estadoFilter}
            </SelectValue>
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="__ALL__">Todos los estados</SelectItem>
            <SelectItem value="prospecto">Prospecto</SelectItem>
            <SelectItem value="cliente_activo">Cliente Activo</SelectItem>
            <SelectItem value="cliente_inactivo">Cliente Inactivo</SelectItem>
          </SelectContent>
        </Select>

        {/* Toggle vista */}
        <div className="flex border rounded-md">
          <Button
            variant={viewMode === 'list' ? 'secondary' : 'ghost'}
            size="sm"
            className="h-9 px-3 rounded-r-none"
            onClick={() => setViewMode('list')}
          >
            <List className="h-4 w-4" />
          </Button>
          <Button
            variant={viewMode === 'grid' ? 'secondary' : 'ghost'}
            size="sm"
            className="h-9 px-3 rounded-l-none"
            onClick={() => setViewMode('grid')}
          >
            <Grid3X3 className="h-4 w-4" />
          </Button>
        </div>

        {hasFilters && (
          <span className="text-sm text-muted-foreground">
            {filteredClientes.length} de {clientes.length}
          </span>
        )}
      </div>

      {/* Lista/Grid */}
      <Card>
        <CardContent className="p-0">
          {filteredClientes.length === 0 ? (
            <div className="text-center py-12">
              <Users className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-semibold mb-2">
                {clientes.length === 0 ? 'No hay clientes' : 'Sin resultados'}
              </h3>
              <p className="text-sm text-muted-foreground mb-4">
                {clientes.length === 0
                  ? 'Comienza agregando tu primer cliente'
                  : 'Ajusta los filtros para encontrar clientes'}
              </p>
              {clientes.length === 0 ? (
                <Button variant="outline" size="sm" onClick={handleCreate}>
                  <UserPlus className="h-4 w-4 mr-2" />
                  Crear cliente
                </Button>
              ) : (
                <Button variant="outline" size="sm" onClick={clearFilters}>
                  <X className="h-4 w-4 mr-2" />
                  Limpiar filtros
                </Button>
              )}
            </div>
          ) : viewMode === 'list' ? (
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

      {/* Cliente Modal */}
      <ClienteModal
        isOpen={modalOpen}
        onClose={handleCloseModal}
        onSaved={handleSaved}
        initial={editingCliente}
        mode={editingCliente ? 'edit' : 'create'}
      />
    </div>
  )
}

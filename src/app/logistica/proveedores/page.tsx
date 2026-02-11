/**
 * 📦 Proveedores - Logística
 * Diseño minimalista y compacto
 * @author GYS Team
 */

'use client'

import { useEffect, useState } from 'react'
import { toast } from 'sonner'
import {
  Plus,
  Building2,
  RefreshCw,
  Search,
  Filter,
  X,
  Users,
  FileText,
  Upload
} from 'lucide-react'
import { getProveedores } from '@/lib/services/proveedor'
import ProveedorForm from '@/components/logistica/ProveedorForm'
import LogisticaProveedoresTable from '@/components/logistica/LogisticaProveedoresTable'
import ProveedorImportExport from '@/components/logistica/ProveedorImportExport'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Skeleton } from '@/components/ui/skeleton'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Alert, AlertDescription } from '@/components/ui/alert'
import type { Proveedor } from '@/types'

export default function ProveedoresPage() {
  const [proveedores, setProveedores] = useState<Proveedor[]>([])
  const [errores, setErrores] = useState<string[]>([])
  const [editando, setEditando] = useState<Proveedor | null>(null)
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [showEditModal, setShowEditModal] = useState(false)

  // Filters
  const [search, setSearch] = useState('')

  const fetchData = async () => {
    try {
      setRefreshing(true)
      const data = await getProveedores()
      setProveedores(data || [])
    } catch (error) {
      console.error('Error fetching data:', error)
      toast.error('Error al cargar proveedores')
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }

  useEffect(() => {
    fetchData()
  }, [])

  // Filter proveedores
  const proveedoresFiltrados = proveedores.filter((prov) => {
    if (search) {
      const s = search.toLowerCase()
      const match =
        prov.nombre?.toLowerCase().includes(s) ||
        prov.ruc?.toLowerCase().includes(s) ||
        prov.correo?.toLowerCase().includes(s) ||
        prov.telefono?.toLowerCase().includes(s)
      if (!match) return false
    }
    return true
  })

  // Stats
  const stats = {
    total: proveedores.length,
    conRuc: proveedores.filter(p => p.ruc).length,
    sinRuc: proveedores.filter(p => !p.ruc).length,
    conContacto: proveedores.filter(p => p.correo || p.telefono).length,
  }

  const hasFilters = !!search

  const clearFilters = () => {
    setSearch('')
  }

  const handleSaved = (proveedor: Proveedor) => {
    if (editando) {
      setProveedores(proveedores.map(p => p.id === proveedor.id ? proveedor : p))
      toast.success('Proveedor actualizado')
      setShowEditModal(false)
    } else {
      setProveedores([...proveedores, proveedor])
      setShowCreateModal(false)
    }
    setEditando(null)
  }

  const handleDelete = (id: string) => {
    setProveedores(proveedores.filter(p => p.id !== id))
  }

  const handleEdit = (proveedor: Proveedor) => {
    setEditando(proveedor)
    setShowEditModal(true)
  }

  const handleImported = async () => {
    setErrores([])
    await fetchData()
    toast.success('Proveedores importados')
  }

  if (loading) {
    return (
      <div className="p-4 space-y-4">
        <Skeleton className="h-10 w-48" />
        <div className="grid grid-cols-4 gap-3">
          {[1, 2, 3, 4].map((i) => (
            <Skeleton key={i} className="h-16" />
          ))}
        </div>
        <Skeleton className="h-10 w-full" />
        <Skeleton className="h-96 w-full" />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50/50">
      {/* Header sticky */}
      <div className="bg-white border-b sticky top-0 z-10">
        <div className="px-4 py-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="h-8 w-8 rounded-lg bg-blue-100 flex items-center justify-center">
                <Building2 className="h-4 w-4 text-blue-600" />
              </div>
              <div>
                <h1 className="text-base font-semibold">Proveedores</h1>
                <p className="text-[10px] text-muted-foreground">Gestión de proveedores</p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={fetchData}
                disabled={refreshing}
                className="h-7 text-xs"
              >
                <RefreshCw className={`h-3 w-3 mr-1 ${refreshing ? 'animate-spin' : ''}`} />
                Actualizar
              </Button>

              {/* Import/Export */}
              <ProveedorImportExport
                proveedores={proveedores}
                onImported={handleImported}
                onErrores={setErrores}
              />

              <Button
                size="sm"
                onClick={() => setShowCreateModal(true)}
                className="h-7 text-xs bg-blue-600 hover:bg-blue-700"
              >
                <Plus className="h-3 w-3 mr-1" />
                Nuevo
              </Button>
            </div>
          </div>
        </div>
      </div>

      <div className="p-4 space-y-4">
        {/* Import errors */}
        {errores.length > 0 && (
          <Alert variant="destructive">
            <AlertDescription>
              <div className="text-xs space-y-1">
                {errores.slice(0, 3).map((err, i) => (
                  <div key={i}>{err}</div>
                ))}
                {errores.length > 3 && (
                  <div className="text-muted-foreground">...y {errores.length - 3} errores más</div>
                )}
              </div>
            </AlertDescription>
          </Alert>
        )}

        {/* Stats compactos */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <div className="bg-white rounded-lg border p-3">
            <div className="flex items-center justify-between">
              <span className="text-xs text-muted-foreground">Total</span>
              <Users className="h-3.5 w-3.5 text-blue-500" />
            </div>
            <p className="text-xl font-bold mt-1">{stats.total}</p>
          </div>
          <div className="bg-white rounded-lg border p-3">
            <div className="flex items-center justify-between">
              <span className="text-xs text-muted-foreground">Con RUC</span>
              <FileText className="h-3.5 w-3.5 text-green-500" />
            </div>
            <p className="text-xl font-bold mt-1 text-green-600">{stats.conRuc}</p>
          </div>
          <div className="bg-white rounded-lg border p-3">
            <div className="flex items-center justify-between">
              <span className="text-xs text-muted-foreground">Sin RUC</span>
              <FileText className="h-3.5 w-3.5 text-amber-500" />
            </div>
            <p className="text-xl font-bold mt-1 text-amber-600">{stats.sinRuc}</p>
          </div>
          <div className="bg-white rounded-lg border p-3">
            <div className="flex items-center justify-between">
              <span className="text-xs text-muted-foreground">Con Contacto</span>
              <Users className="h-3.5 w-3.5 text-purple-500" />
            </div>
            <p className="text-xl font-bold mt-1 text-purple-600">{stats.conContacto}</p>
          </div>
        </div>

        {/* Filtros en línea */}
        <div className="bg-white rounded-lg border p-3">
          <div className="flex flex-wrap items-center gap-2">
            <div className="relative flex-1 min-w-[200px]">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-gray-400" />
              <Input
                placeholder="Buscar por nombre, RUC, correo, teléfono..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="h-8 pl-8 text-xs"
              />
            </div>

            {hasFilters && (
              <Button variant="ghost" size="sm" onClick={clearFilters} className="h-8 px-2 text-xs text-red-600">
                <X className="h-3 w-3 mr-1" />
                Limpiar
              </Button>
            )}

            <div className="ml-auto text-xs text-muted-foreground">
              {proveedoresFiltrados.length} de {proveedores.length}
            </div>
          </div>
        </div>

        {/* Tabla */}
        <div className="bg-white rounded-lg border overflow-hidden">
          <LogisticaProveedoresTable
            proveedores={proveedoresFiltrados}
            onEdit={handleEdit}
            onDelete={handleDelete}
          />
        </div>
      </div>

      {/* Modal crear */}
      <Dialog open={showCreateModal} onOpenChange={setShowCreateModal}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-base">Nuevo Proveedor</DialogTitle>
            <DialogDescription className="text-xs">
              Registra un nuevo proveedor en el sistema
            </DialogDescription>
          </DialogHeader>
          <ProveedorForm
            onSaved={handleSaved}
            onCancel={() => setShowCreateModal(false)}
          />
        </DialogContent>
      </Dialog>

      {/* Modal editar */}
      <Dialog open={showEditModal} onOpenChange={setShowEditModal}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-base">Editar Proveedor</DialogTitle>
            <DialogDescription className="text-xs">
              Modifica los datos del proveedor
            </DialogDescription>
          </DialogHeader>
          <ProveedorForm
            onSaved={handleSaved}
            initial={editando}
            onCancel={() => {
              setShowEditModal(false)
              setEditando(null)
            }}
          />
        </DialogContent>
      </Dialog>
    </div>
  )
}

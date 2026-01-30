'use client'

import React, { useEffect, useState, useMemo } from 'react'
import { z } from 'zod'
import toast from 'react-hot-toast'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Users,
  UserPlus,
  Edit,
  Trash2,
  Save,
  Loader2,
  Briefcase,
  Mail,
  Phone,
  DollarSign,
  Calendar,
  ChevronRight,
  Home,
  Search,
  Filter,
  X,
  LayoutGrid,
  List,
  FileText,
  MapPin,
  AlertCircle,
  CheckCircle,
  XCircle
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { Textarea } from '@/components/ui/textarea'
import { Switch } from '@/components/ui/switch'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { DeleteAlertDialog } from '@/components/ui/DeleteAlertDialog'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'
import { cn } from '@/lib/utils'
import type { Empleado, User, Cargo } from '@/types/modelos'
import { getEmpleados, createEmpleado, updateEmpleado, deleteEmpleado, EmpleadoPayload } from '@/lib/services/empleado'
import { getCargos } from '@/lib/services/cargo'

// Schema de validación
const empleadoSchema = z.object({
  userId: z.string().min(1, 'Selecciona un usuario'),
  cargoId: z.string().optional(),
  sueldoMensual: z.string().optional(),
  fechaIngreso: z.string().optional(),
  fechaCese: z.string().optional(),
  activo: z.boolean().default(true),
  documentoIdentidad: z.string().optional(),
  telefono: z.string().optional(),
  direccion: z.string().optional(),
  contactoEmergencia: z.string().optional(),
  telefonoEmergencia: z.string().optional(),
  observaciones: z.string().optional(),
})

type EmpleadoForm = z.infer<typeof empleadoSchema>

const defaultForm: EmpleadoForm = {
  userId: '',
  cargoId: '',
  sueldoMensual: '',
  fechaIngreso: '',
  fechaCese: '',
  activo: true,
  documentoIdentidad: '',
  telefono: '',
  direccion: '',
  contactoEmergencia: '',
  telefonoEmergencia: '',
  observaciones: '',
}

// Helper para formatear moneda
const formatCurrency = (amount: number | null | undefined) => {
  if (!amount) return '-'
  return new Intl.NumberFormat('es-PE', {
    style: 'currency',
    currency: 'PEN',
    minimumFractionDigits: 2,
  }).format(amount)
}

// Helper para formatear fecha
const formatDate = (date: string | null | undefined) => {
  if (!date) return '-'
  return new Date(date).toLocaleDateString('es-PE', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  })
}

// Helper para obtener iniciales
const getInitials = (name: string | null | undefined) => {
  if (!name) return '??'
  return name
    .split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2)
}

export default function PersonalClient() {
  const [empleados, setEmpleados] = useState<Empleado[]>([])
  const [usuarios, setUsuarios] = useState<User[]>([])
  const [cargos, setCargos] = useState<Cargo[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [searchTerm, setSearchTerm] = useState('')
  const [filterActivo, setFilterActivo] = useState<'all' | 'activo' | 'inactivo'>('all')
  const [viewMode, setViewMode] = useState<'table' | 'cards'>('table')

  // Modal states
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false)
  const [editingEmpleado, setEditingEmpleado] = useState<Empleado | null>(null)
  const [empleadoToDelete, setEmpleadoToDelete] = useState<Empleado | null>(null)

  // Form state
  const [form, setForm] = useState<EmpleadoForm>(defaultForm)
  const [errors, setErrors] = useState<Record<string, string>>({})

  // Cargar datos iniciales
  useEffect(() => {
    loadData()
  }, [])

  const loadData = async () => {
    setLoading(true)
    try {
      const [empleadosData, usuariosRes, cargosData] = await Promise.all([
        getEmpleados(),
        fetch('/api/admin/usuarios').then(r => r.json()),
        getCargos()
      ])
      setEmpleados(empleadosData)
      setUsuarios(usuariosRes)
      setCargos(cargosData.filter((c: Cargo) => c.activo))
    } catch (error) {
      console.error('Error al cargar datos:', error)
      toast.error('Error al cargar los datos')
    } finally {
      setLoading(false)
    }
  }

  // Usuarios disponibles (sin registro de empleado)
  const usuariosDisponibles = useMemo(() => {
    const empleadoUserIds = new Set(empleados.map(e => e.userId))
    return usuarios.filter(u => !empleadoUserIds.has(u.id) || (editingEmpleado && editingEmpleado.userId === u.id))
  }, [usuarios, empleados, editingEmpleado])

  // Filtrar empleados
  const filteredEmpleados = useMemo(() => {
    return empleados.filter(emp => {
      const matchesSearch = !searchTerm ||
        emp.user?.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        emp.user?.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        emp.cargo?.nombre?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        emp.documentoIdentidad?.toLowerCase().includes(searchTerm.toLowerCase())

      const matchesFilter = filterActivo === 'all' ||
        (filterActivo === 'activo' && emp.activo) ||
        (filterActivo === 'inactivo' && !emp.activo)

      return matchesSearch && matchesFilter
    })
  }, [empleados, searchTerm, filterActivo])

  // Handlers
  const handleOpenCreate = () => {
    setEditingEmpleado(null)
    setForm(defaultForm)
    setErrors({})
    setIsModalOpen(true)
  }

  const handleOpenEdit = (empleado: Empleado) => {
    setEditingEmpleado(empleado)
    setForm({
      userId: empleado.userId,
      cargoId: empleado.cargoId || '',
      sueldoMensual: empleado.sueldoMensual?.toString() || '',
      fechaIngreso: empleado.fechaIngreso ? empleado.fechaIngreso.split('T')[0] : '',
      fechaCese: empleado.fechaCese ? empleado.fechaCese.split('T')[0] : '',
      activo: empleado.activo,
      documentoIdentidad: empleado.documentoIdentidad || '',
      telefono: empleado.telefono || '',
      direccion: empleado.direccion || '',
      contactoEmergencia: empleado.contactoEmergencia || '',
      telefonoEmergencia: empleado.telefonoEmergencia || '',
      observaciones: empleado.observaciones || '',
    })
    setErrors({})
    setIsModalOpen(true)
  }

  const handleOpenDelete = (empleado: Empleado) => {
    setEmpleadoToDelete(empleado)
    setIsDeleteDialogOpen(true)
  }

  const handleCloseModal = () => {
    setIsModalOpen(false)
    setEditingEmpleado(null)
    setForm(defaultForm)
    setErrors({})
  }

  const handleSubmit = async () => {
    const result = empleadoSchema.safeParse(form)

    if (!result.success) {
      const fieldErrors: Record<string, string> = {}
      result.error.errors.forEach(err => {
        if (err.path[0]) {
          fieldErrors[err.path[0] as string] = err.message
        }
      })
      setErrors(fieldErrors)
      return
    }

    setSaving(true)
    try {
      const payload: EmpleadoPayload = {
        userId: form.userId,
        cargoId: form.cargoId || undefined,
        sueldoMensual: form.sueldoMensual ? parseFloat(form.sueldoMensual) : undefined,
        fechaIngreso: form.fechaIngreso || undefined,
        fechaCese: form.fechaCese || undefined,
        activo: form.activo,
        documentoIdentidad: form.documentoIdentidad || undefined,
        telefono: form.telefono || undefined,
        direccion: form.direccion || undefined,
        contactoEmergencia: form.contactoEmergencia || undefined,
        telefonoEmergencia: form.telefonoEmergencia || undefined,
        observaciones: form.observaciones || undefined,
      }

      if (editingEmpleado) {
        await updateEmpleado(editingEmpleado.id, payload)
        toast.success('Empleado actualizado correctamente')
      } else {
        await createEmpleado(payload)
        toast.success('Empleado registrado correctamente')
      }

      await loadData()
      handleCloseModal()
    } catch (error) {
      console.error('Error al guardar:', error)
      toast.error(error instanceof Error ? error.message : 'Error al guardar')
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async () => {
    if (!empleadoToDelete) return

    try {
      await deleteEmpleado(empleadoToDelete.id)
      toast.success('Registro eliminado correctamente')
      await loadData()
    } catch (error) {
      console.error('Error al eliminar:', error)
      toast.error('Error al eliminar el registro')
    } finally {
      setIsDeleteDialogOpen(false)
      setEmpleadoToDelete(null)
    }
  }

  // Stats
  const stats = useMemo(() => ({
    total: empleados.length,
    activos: empleados.filter(e => e.activo).length,
    inactivos: empleados.filter(e => !e.activo).length,
    sueldoPromedio: empleados.filter(e => e.sueldoMensual).length > 0
      ? empleados.reduce((sum, e) => sum + (e.sueldoMensual || 0), 0) / empleados.filter(e => e.sueldoMensual).length
      : 0
  }), [empleados])

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-blue-500" />
      </div>
    )
  }

  return (
    <TooltipProvider>
      <div className="p-6 space-y-6">
        {/* Breadcrumb */}
        <nav className="flex items-center text-sm text-muted-foreground">
          <Home className="h-4 w-4" />
          <ChevronRight className="h-4 w-4 mx-1" />
          <span>Administración</span>
          <ChevronRight className="h-4 w-4 mx-1" />
          <span className="text-foreground font-medium">Personal</span>
        </nav>

        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <Users className="h-6 w-6 text-blue-600" />
              Gestión de Personal
            </h1>
            <p className="text-muted-foreground mt-1">
              Administra la información de empleados, sueldos y datos de contacto
            </p>
          </div>
          <Button onClick={handleOpenCreate} className="gap-2">
            <UserPlus className="h-4 w-4" />
            Registrar Empleado
          </Button>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-blue-100 rounded-lg">
                  <Users className="h-5 w-5 text-blue-600" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{stats.total}</p>
                  <p className="text-xs text-muted-foreground">Total Empleados</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-green-100 rounded-lg">
                  <CheckCircle className="h-5 w-5 text-green-600" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{stats.activos}</p>
                  <p className="text-xs text-muted-foreground">Activos</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-gray-100 rounded-lg">
                  <XCircle className="h-5 w-5 text-gray-600" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{stats.inactivos}</p>
                  <p className="text-xs text-muted-foreground">Inactivos</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-amber-100 rounded-lg">
                  <DollarSign className="h-5 w-5 text-amber-600" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{formatCurrency(stats.sueldoPromedio)}</p>
                  <p className="text-xs text-muted-foreground">Sueldo Promedio</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Filters */}
        <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
          <div className="flex flex-1 gap-3 w-full sm:w-auto">
            <div className="relative flex-1 sm:max-w-xs">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Buscar por nombre, email, cargo..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-9"
              />
            </div>
            <Select value={filterActivo} onValueChange={(v) => setFilterActivo(v as typeof filterActivo)}>
              <SelectTrigger className="w-[140px]">
                <Filter className="h-4 w-4 mr-2" />
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos</SelectItem>
                <SelectItem value="activo">Activos</SelectItem>
                <SelectItem value="inactivo">Inactivos</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="flex gap-1 border rounded-lg p-1">
            <Button
              variant={viewMode === 'table' ? 'secondary' : 'ghost'}
              size="sm"
              onClick={() => setViewMode('table')}
            >
              <List className="h-4 w-4" />
            </Button>
            <Button
              variant={viewMode === 'cards' ? 'secondary' : 'ghost'}
              size="sm"
              onClick={() => setViewMode('cards')}
            >
              <LayoutGrid className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {/* Content */}
        {filteredEmpleados.length === 0 ? (
          <Card className="p-12">
            <div className="text-center text-muted-foreground">
              <Users className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p className="text-lg font-medium">No hay empleados registrados</p>
              <p className="text-sm mt-1">Comienza registrando el primer empleado</p>
              <Button onClick={handleOpenCreate} className="mt-4 gap-2">
                <UserPlus className="h-4 w-4" />
                Registrar Empleado
              </Button>
            </div>
          </Card>
        ) : viewMode === 'table' ? (
          <Card>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Empleado</TableHead>
                  <TableHead>Cargo</TableHead>
                  <TableHead>Documento</TableHead>
                  <TableHead>Teléfono</TableHead>
                  <TableHead className="text-right">Sueldo</TableHead>
                  <TableHead>Ingreso</TableHead>
                  <TableHead>Estado</TableHead>
                  <TableHead className="text-right">Acciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                <AnimatePresence>
                  {filteredEmpleados.map((emp) => (
                    <motion.tr
                      key={emp.id}
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      className="group"
                    >
                      <TableCell>
                        <div className="flex items-center gap-3">
                          <div className={cn(
                            "w-9 h-9 rounded-full flex items-center justify-center text-sm font-medium",
                            emp.activo ? "bg-blue-100 text-blue-700" : "bg-gray-100 text-gray-500"
                          )}>
                            {getInitials(emp.user?.name)}
                          </div>
                          <div>
                            <p className="font-medium">{emp.user?.name || 'Sin nombre'}</p>
                            <p className="text-xs text-muted-foreground">{emp.user?.email}</p>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>{emp.cargo?.nombre || '-'}</TableCell>
                      <TableCell className="font-mono text-sm">{emp.documentoIdentidad || '-'}</TableCell>
                      <TableCell>{emp.telefono || '-'}</TableCell>
                      <TableCell className="text-right font-mono">
                        {formatCurrency(emp.sueldoMensual)}
                      </TableCell>
                      <TableCell>{formatDate(emp.fechaIngreso)}</TableCell>
                      <TableCell>
                        <Badge variant={emp.activo ? 'default' : 'secondary'}>
                          {emp.activo ? 'Activo' : 'Inactivo'}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-1">
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleOpenEdit(emp)}
                                className="h-8 w-8 p-0"
                              >
                                <Edit className="h-4 w-4" />
                              </Button>
                            </TooltipTrigger>
                            <TooltipContent>Editar</TooltipContent>
                          </Tooltip>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleOpenDelete(emp)}
                                className="h-8 w-8 p-0 text-red-600 hover:text-red-700 hover:bg-red-50"
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </TooltipTrigger>
                            <TooltipContent>Eliminar</TooltipContent>
                          </Tooltip>
                        </div>
                      </TableCell>
                    </motion.tr>
                  ))}
                </AnimatePresence>
              </TableBody>
            </Table>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <AnimatePresence>
              {filteredEmpleados.map((emp) => (
                <motion.div
                  key={emp.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -20 }}
                >
                  <Card className={cn(
                    "hover:shadow-md transition-shadow",
                    !emp.activo && "opacity-60"
                  )}>
                    <CardHeader className="pb-3">
                      <div className="flex items-start justify-between">
                        <div className="flex items-center gap-3">
                          <div className={cn(
                            "w-12 h-12 rounded-full flex items-center justify-center text-lg font-semibold",
                            emp.activo ? "bg-blue-100 text-blue-700" : "bg-gray-100 text-gray-500"
                          )}>
                            {getInitials(emp.user?.name)}
                          </div>
                          <div>
                            <p className="font-semibold">{emp.user?.name || 'Sin nombre'}</p>
                            <p className="text-sm text-muted-foreground">{emp.cargo?.nombre || 'Sin cargo'}</p>
                          </div>
                        </div>
                        <Badge variant={emp.activo ? 'default' : 'secondary'} className="text-xs">
                          {emp.activo ? 'Activo' : 'Inactivo'}
                        </Badge>
                      </div>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      <div className="grid grid-cols-2 gap-3 text-sm">
                        <div className="flex items-center gap-2 text-muted-foreground">
                          <Mail className="h-4 w-4" />
                          <span className="truncate">{emp.user?.email}</span>
                        </div>
                        <div className="flex items-center gap-2 text-muted-foreground">
                          <Phone className="h-4 w-4" />
                          <span>{emp.telefono || '-'}</span>
                        </div>
                        <div className="flex items-center gap-2 text-muted-foreground">
                          <FileText className="h-4 w-4" />
                          <span className="font-mono">{emp.documentoIdentidad || '-'}</span>
                        </div>
                        <div className="flex items-center gap-2 text-muted-foreground">
                          <Calendar className="h-4 w-4" />
                          <span>{formatDate(emp.fechaIngreso)}</span>
                        </div>
                      </div>
                      <div className="pt-3 border-t flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <DollarSign className="h-4 w-4 text-amber-600" />
                          <span className="font-semibold">{formatCurrency(emp.sueldoMensual)}</span>
                        </div>
                        <div className="flex gap-1">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleOpenEdit(emp)}
                            className="h-8 w-8 p-0"
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleOpenDelete(emp)}
                            className="h-8 w-8 p-0 text-red-600 hover:text-red-700 hover:bg-red-50"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        )}

        {/* Modal de Crear/Editar */}
        <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                {editingEmpleado ? (
                  <>
                    <Edit className="h-5 w-5" />
                    Editar Empleado
                  </>
                ) : (
                  <>
                    <UserPlus className="h-5 w-5" />
                    Registrar Empleado
                  </>
                )}
              </DialogTitle>
              <DialogDescription>
                {editingEmpleado
                  ? 'Modifica los datos del empleado'
                  : 'Completa los datos para registrar un nuevo empleado'}
              </DialogDescription>
            </DialogHeader>

            <div className="grid gap-6 py-4">
              {/* Usuario */}
              <div className="space-y-2">
                <Label htmlFor="userId">Usuario del Sistema *</Label>
                <Select
                  value={form.userId}
                  onValueChange={(v) => setForm({ ...form, userId: v })}
                  disabled={!!editingEmpleado}
                >
                  <SelectTrigger className={errors.userId ? 'border-red-500' : ''}>
                    <SelectValue placeholder="Selecciona un usuario" />
                  </SelectTrigger>
                  <SelectContent>
                    {usuariosDisponibles.map((u) => (
                      <SelectItem key={u.id} value={u.id}>
                        {u.name || u.email} ({u.email})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {errors.userId && <p className="text-xs text-red-500">{errors.userId}</p>}
              </div>

              {/* Cargo y Sueldo */}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="cargoId">Cargo</Label>
                  <Select
                    value={form.cargoId}
                    onValueChange={(v) => setForm({ ...form, cargoId: v })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Selecciona un cargo" />
                    </SelectTrigger>
                    <SelectContent>
                      {cargos.map((c) => (
                        <SelectItem key={c.id} value={c.id}>
                          {c.nombre}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="sueldoMensual">Sueldo Mensual (PEN)</Label>
                  <Input
                    id="sueldoMensual"
                    type="number"
                    step="0.01"
                    value={form.sueldoMensual}
                    onChange={(e) => setForm({ ...form, sueldoMensual: e.target.value })}
                    placeholder="0.00"
                  />
                </div>
              </div>

              {/* Documento y Teléfono */}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="documentoIdentidad">Documento de Identidad</Label>
                  <Input
                    id="documentoIdentidad"
                    value={form.documentoIdentidad}
                    onChange={(e) => setForm({ ...form, documentoIdentidad: e.target.value })}
                    placeholder="DNI / CE"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="telefono">Teléfono</Label>
                  <Input
                    id="telefono"
                    value={form.telefono}
                    onChange={(e) => setForm({ ...form, telefono: e.target.value })}
                    placeholder="+51 999 999 999"
                  />
                </div>
              </div>

              {/* Fechas */}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="fechaIngreso">Fecha de Ingreso</Label>
                  <Input
                    id="fechaIngreso"
                    type="date"
                    value={form.fechaIngreso}
                    onChange={(e) => setForm({ ...form, fechaIngreso: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="fechaCese">Fecha de Cese</Label>
                  <Input
                    id="fechaCese"
                    type="date"
                    value={form.fechaCese}
                    onChange={(e) => setForm({ ...form, fechaCese: e.target.value })}
                  />
                </div>
              </div>

              {/* Dirección */}
              <div className="space-y-2">
                <Label htmlFor="direccion">Dirección</Label>
                <Input
                  id="direccion"
                  value={form.direccion}
                  onChange={(e) => setForm({ ...form, direccion: e.target.value })}
                  placeholder="Dirección completa"
                />
              </div>

              {/* Contacto de Emergencia */}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="contactoEmergencia">Contacto de Emergencia</Label>
                  <Input
                    id="contactoEmergencia"
                    value={form.contactoEmergencia}
                    onChange={(e) => setForm({ ...form, contactoEmergencia: e.target.value })}
                    placeholder="Nombre del contacto"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="telefonoEmergencia">Teléfono de Emergencia</Label>
                  <Input
                    id="telefonoEmergencia"
                    value={form.telefonoEmergencia}
                    onChange={(e) => setForm({ ...form, telefonoEmergencia: e.target.value })}
                    placeholder="+51 999 999 999"
                  />
                </div>
              </div>

              {/* Observaciones */}
              <div className="space-y-2">
                <Label htmlFor="observaciones">Observaciones</Label>
                <Textarea
                  id="observaciones"
                  value={form.observaciones}
                  onChange={(e) => setForm({ ...form, observaciones: e.target.value })}
                  placeholder="Notas adicionales..."
                  rows={3}
                />
              </div>

              {/* Estado */}
              <div className="flex items-center justify-between p-4 bg-muted/50 rounded-lg">
                <div>
                  <Label htmlFor="activo" className="text-base">Estado del Empleado</Label>
                  <p className="text-sm text-muted-foreground">
                    {form.activo ? 'El empleado está activo en el sistema' : 'El empleado está marcado como inactivo'}
                  </p>
                </div>
                <Switch
                  id="activo"
                  checked={form.activo}
                  onCheckedChange={(checked) => setForm({ ...form, activo: checked })}
                />
              </div>
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={handleCloseModal} disabled={saving}>
                Cancelar
              </Button>
              <Button onClick={handleSubmit} disabled={saving}>
                {saving ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Guardando...
                  </>
                ) : (
                  <>
                    <Save className="h-4 w-4 mr-2" />
                    {editingEmpleado ? 'Guardar Cambios' : 'Registrar'}
                  </>
                )}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Delete Dialog */}
        <DeleteAlertDialog
          open={isDeleteDialogOpen}
          onOpenChange={setIsDeleteDialogOpen}
          onConfirm={handleDelete}
          title="¿Eliminar registro de empleado?"
          description={`Se eliminará el registro de "${empleadoToDelete?.user?.name}". Esta acción no se puede deshacer.`}
        />
      </div>
    </TooltipProvider>
  )
}

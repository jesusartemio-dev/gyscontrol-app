'use client'

import React, { useEffect, useState, useMemo } from 'react'
import { z } from 'zod'
import { toast } from 'sonner'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Users,
  UserPlus,
  Edit,
  Trash2,
  Save,
  Loader2,
  Mail,
  Phone,
  DollarSign,
  Calendar,
  ChevronRight,
  Home,
  Search,
  Filter,
  LayoutGrid,
  List,
  FileText,
  CheckCircle,
  XCircle,
  Download,
  Upload,
  FileDown
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
import type { Empleado, User, Cargo, Departamento } from '@/types/modelos'
import { getEmpleados, createEmpleado, updateEmpleado, deleteEmpleado, EmpleadoPayload } from '@/lib/services/empleado'
import { getCargos } from '@/lib/services/cargo'
import { getDepartamentos } from '@/lib/services/departamento'
import {
  exportarEmpleadosAExcel,
  generarPlantillaEmpleados,
  leerEmpleadosDesdeExcel,
  validarEmpleados,
  crearEmpleadosEnBD
} from '@/lib/utils/empleadoExcel'
import {
  getConfiguracionCostos,
  ConfiguracionCostos,
  DEFAULTS,
  formatUSD,
  penToUSD
} from '@/lib/costos'

// Schema de validación
const empleadoSchema = z.object({
  userId: z.string().min(1, 'Selecciona un usuario'),
  cargoId: z.string().optional(),
  departamentoId: z.string().optional(),
  sueldoPlanilla: z.string().optional(),
  sueldoHonorarios: z.string().optional(),
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
  departamentoId: '',
  sueldoPlanilla: '',
  sueldoHonorarios: '',
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

// Helper para calcular sueldo total
const getSueldoTotal = (planilla?: number | null, honorarios?: number | null): number => {
  return (planilla || 0) + (honorarios || 0)
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
  const [departamentos, setDepartamentos] = useState<Departamento[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [importando, setImportando] = useState(false)
  const [searchTerm, setSearchTerm] = useState('')
  const [filterActivo, setFilterActivo] = useState<'all' | 'activo' | 'inactivo'>('all')
  const [filterDepartamento, setFilterDepartamento] = useState<string>('all')
  const [viewMode, setViewMode] = useState<'table' | 'cards'>('table')
  const [config, setConfig] = useState<ConfiguracionCostos>({
    tipoCambio: DEFAULTS.TIPO_CAMBIO,
    horasSemanales: DEFAULTS.HORAS_SEMANALES,
    diasLaborables: DEFAULTS.DIAS_LABORABLES,
    semanasxMes: DEFAULTS.SEMANAS_X_MES,
    horasMensuales: DEFAULTS.HORAS_MENSUALES,
  })

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
    getConfiguracionCostos().then(setConfig)
  }, [])

  const loadData = async () => {
    setLoading(true)
    try {
      const [empleadosData, usuariosRes, cargosData, departamentosData] = await Promise.all([
        getEmpleados(),
        fetch('/api/admin/usuarios').then(r => r.json()),
        getCargos(),
        getDepartamentos()
      ])
      setEmpleados(empleadosData)
      setUsuarios(usuariosRes)
      setCargos(cargosData.filter((c: Cargo) => c.activo))
      setDepartamentos(departamentosData.filter((d: Departamento) => d.activo))
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
        emp.departamento?.nombre?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        emp.documentoIdentidad?.toLowerCase().includes(searchTerm.toLowerCase())

      const matchesFilter = filterActivo === 'all' ||
        (filterActivo === 'activo' && emp.activo) ||
        (filterActivo === 'inactivo' && !emp.activo)

      const matchesDepartamento = filterDepartamento === 'all' ||
        emp.departamentoId === filterDepartamento

      return matchesSearch && matchesFilter && matchesDepartamento
    })
  }, [empleados, searchTerm, filterActivo, filterDepartamento])

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
      departamentoId: empleado.departamentoId || '',
      sueldoPlanilla: empleado.sueldoPlanilla?.toString() || '',
      sueldoHonorarios: empleado.sueldoHonorarios?.toString() || '',
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
        departamentoId: form.departamentoId || undefined,
        sueldoPlanilla: form.sueldoPlanilla ? parseFloat(form.sueldoPlanilla) : undefined,
        sueldoHonorarios: form.sueldoHonorarios ? parseFloat(form.sueldoHonorarios) : undefined,
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
  const stats = useMemo(() => {
    const empleadosConSueldo = empleados.filter(e => e.sueldoPlanilla || e.sueldoHonorarios)
    return {
      total: empleados.length,
      activos: empleados.filter(e => e.activo).length,
      inactivos: empleados.filter(e => !e.activo).length,
      sueldoPromedio: empleadosConSueldo.length > 0
        ? empleadosConSueldo.reduce((sum, e) => sum + getSueldoTotal(e.sueldoPlanilla, e.sueldoHonorarios), 0) / empleadosConSueldo.length
        : 0
    }
  }, [empleados])

  // Export/Import handlers
  const handleExportar = () => {
    if (filteredEmpleados.length === 0) {
      toast.error('No hay empleados para exportar')
      return
    }
    exportarEmpleadosAExcel(filteredEmpleados)
    toast.success('Archivo exportado correctamente')
  }

  const handleImportar = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    setImportando(true)
    try {
      const datos = await leerEmpleadosDesdeExcel(file)
      const emailsUsuarios = usuarios.map(u => u.email || '')
      const emailsEmpleadosExistentes = empleados.map(e => e.user?.email || '')
      const { nuevos, errores, duplicados, sinUsuario } = validarEmpleados(datos, emailsUsuarios, emailsEmpleadosExistentes)

      if (errores.length > 0) {
        toast.error(`${errores.length} error(es): ${errores.slice(0, 2).join(', ')}`)
      }

      if (duplicados.length > 0) {
        toast.warning(`${duplicados.length} empleado(s) ya existen y fueron omitidos`)
      }

      if (sinUsuario.length > 0) {
        toast.warning(`${sinUsuario.length} usuario(s) no encontrados: ${sinUsuario.slice(0, 2).join(', ')}`)
      }

      if (nuevos.length === 0) {
        toast.error('No hay empleados nuevos para importar')
        return
      }

      const resultado = await crearEmpleadosEnBD(nuevos)
      toast.success(`${resultado.creados} empleado(s) importados correctamente`)
      await loadData()
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Error al procesar archivo')
    } finally {
      setImportando(false)
      e.target.value = ''
    }
  }

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
          <div className="flex flex-1 gap-3 w-full sm:w-auto flex-wrap">
            <div className="relative flex-1 sm:max-w-xs min-w-[200px]">
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
            <Select value={filterDepartamento} onValueChange={setFilterDepartamento}>
              <SelectTrigger className="w-[160px]">
                <SelectValue placeholder="Departamento" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos los Dptos.</SelectItem>
                {departamentos.map((d) => (
                  <SelectItem key={d.id} value={d.id}>{d.nombre}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            {/* Import/Export */}
            <div className="flex items-center gap-1 border rounded-lg p-0.5 bg-muted/50">
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button variant="ghost" size="sm" onClick={handleExportar} className="h-8 px-2">
                    <Download className="h-4 w-4 mr-1" />
                    Exportar
                  </Button>
                </TooltipTrigger>
                <TooltipContent>Exportar a Excel</TooltipContent>
              </Tooltip>
              <Tooltip>
                <TooltipTrigger asChild>
                  <label className={cn(
                    "flex items-center gap-1 h-8 px-2 rounded-md cursor-pointer transition-colors",
                    importando ? "opacity-50 cursor-not-allowed" : "hover:bg-accent"
                  )}>
                    {importando ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Upload className="h-4 w-4" />
                    )}
                    <span className="text-sm">Importar</span>
                    <input
                      type="file"
                      accept=".xlsx,.xls"
                      onChange={handleImportar}
                      className="hidden"
                      disabled={importando}
                    />
                  </label>
                </TooltipTrigger>
                <TooltipContent>Importar desde Excel</TooltipContent>
              </Tooltip>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button variant="ghost" size="sm" onClick={generarPlantillaEmpleados} className="h-8 w-8 p-0">
                    <FileDown className="h-4 w-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>Descargar plantilla</TooltipContent>
              </Tooltip>
            </div>

            {/* View Toggle */}
            <div className="flex items-center border rounded-lg p-0.5 bg-muted/50">
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setViewMode('table')}
                    className={cn(
                      "h-8 w-8 p-0 rounded-md",
                      viewMode === 'table' && "bg-white shadow-sm"
                    )}
                  >
                    <List className="h-4 w-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>Vista tabla</TooltipContent>
              </Tooltip>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setViewMode('cards')}
                    className={cn(
                      "h-8 w-8 p-0 rounded-md",
                      viewMode === 'cards' && "bg-white shadow-sm"
                    )}
                  >
                    <LayoutGrid className="h-4 w-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>Vista tarjetas</TooltipContent>
              </Tooltip>
            </div>
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
                  <TableHead>DNI</TableHead>
                  <TableHead>Cargo</TableHead>
                  <TableHead>Departamento</TableHead>
                  <TableHead className="text-right">Planilla</TableHead>
                  <TableHead className="text-right">Honorarios</TableHead>
                  <TableHead className="text-right">Total</TableHead>
                  <TableHead className="text-right">Costo/Hora</TableHead>
                  <TableHead>Estado</TableHead>
                  <TableHead className="text-right">Acciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                <AnimatePresence>
                  {filteredEmpleados.map((emp) => {
                    const sueldoTotal = getSueldoTotal(emp.sueldoPlanilla, emp.sueldoHonorarios)
                    const costoHora = penToUSD(sueldoTotal, config.tipoCambio) / config.horasMensuales
                    return (
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
                              "w-8 h-8 rounded-full flex items-center justify-center text-xs font-medium",
                              emp.activo ? "bg-blue-100 text-blue-700" : "bg-gray-100 text-gray-500"
                            )}>
                              {getInitials(emp.user?.name)}
                            </div>
                            <div>
                              <p className="font-medium text-sm">{emp.user?.name || 'Sin nombre'}</p>
                              <p className="text-[10px] text-muted-foreground">{emp.user?.email}</p>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell className="text-sm font-mono">{emp.documentoIdentidad || '-'}</TableCell>
                        <TableCell className="text-sm">{emp.cargo?.nombre || '-'}</TableCell>
                        <TableCell className="text-sm">{emp.departamento?.nombre || '-'}</TableCell>
                        <TableCell className="text-right font-mono text-sm">
                          {emp.sueldoPlanilla ? formatCurrency(emp.sueldoPlanilla) : <span className="text-gray-400">-</span>}
                        </TableCell>
                        <TableCell className="text-right font-mono text-sm">
                          {emp.sueldoHonorarios ? formatCurrency(emp.sueldoHonorarios) : <span className="text-gray-400">-</span>}
                        </TableCell>
                        <TableCell className="text-right font-mono text-sm font-semibold">
                          {formatCurrency(sueldoTotal)}
                        </TableCell>
                        <TableCell className="text-right">
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <span className="font-mono text-sm font-bold text-blue-600 cursor-help">
                                {formatUSD(costoHora)}/h
                              </span>
                            </TooltipTrigger>
                            <TooltipContent side="left">
                              <p className="font-mono text-xs">
                                ({formatCurrency(sueldoTotal)} / {config.tipoCambio}) / {config.horasMensuales}h
                              </p>
                            </TooltipContent>
                          </Tooltip>
                        </TableCell>
                        <TableCell>
                          <Badge variant={emp.activo ? 'default' : 'secondary'} className="text-[10px]">
                            {emp.activo ? 'Activo' : 'Inactivo'}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-1">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleOpenEdit(emp)}
                              className="h-7 w-7 p-0 hover:bg-blue-50 hover:text-blue-600"
                            >
                              <Edit className="h-3.5 w-3.5" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleOpenDelete(emp)}
                              className="h-7 w-7 p-0 text-red-600 hover:text-red-700 hover:bg-red-50"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </Button>
                          </div>
                        </TableCell>
                      </motion.tr>
                    )
                  })}
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
                        <div className="flex flex-col gap-0.5">
                          <div className="flex items-center gap-2">
                            <DollarSign className="h-4 w-4 text-amber-600" />
                            <span className="font-semibold">{formatCurrency(getSueldoTotal(emp.sueldoPlanilla, emp.sueldoHonorarios))}</span>
                          </div>
                          <span className="text-xs text-blue-600 font-mono ml-6">
                            {formatUSD(penToUSD(getSueldoTotal(emp.sueldoPlanilla, emp.sueldoHonorarios), config.tipoCambio) / config.horasMensuales)}/h
                          </span>
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
          <DialogContent className="max-w-xl">
            <DialogHeader className="pb-2">
              <DialogTitle className="flex items-center gap-2 text-lg">
                {editingEmpleado ? <Edit className="h-4 w-4" /> : <UserPlus className="h-4 w-4" />}
                {editingEmpleado ? 'Editar Empleado' : 'Registrar Empleado'}
              </DialogTitle>
            </DialogHeader>

            <div className="grid gap-4">
              {/* Usuario + Estado */}
              <div className="flex gap-3 items-end">
                <div className="flex-1 space-y-1">
                  <Label htmlFor="userId" className="text-xs">Usuario del Sistema *</Label>
                  <Select
                    value={form.userId}
                    onValueChange={(v) => setForm({ ...form, userId: v })}
                    disabled={!!editingEmpleado}
                  >
                    <SelectTrigger className={cn("h-9", errors.userId && 'border-red-500')}>
                      <SelectValue placeholder="Selecciona un usuario" />
                    </SelectTrigger>
                    <SelectContent>
                      {usuariosDisponibles.map((u) => (
                        <SelectItem key={u.id} value={u.id}>
                          {u.name || u.email}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex items-center gap-2 pb-0.5">
                  <Switch
                    id="activo"
                    checked={form.activo}
                    onCheckedChange={(checked) => setForm({ ...form, activo: checked })}
                  />
                  <Label htmlFor="activo" className="text-xs cursor-pointer">
                    {form.activo ? 'Activo' : 'Inactivo'}
                  </Label>
                </div>
              </div>

              {/* Cargo y Departamento */}
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label htmlFor="cargoId" className="text-xs">Cargo</Label>
                  <Select value={form.cargoId} onValueChange={(v) => setForm({ ...form, cargoId: v })}>
                    <SelectTrigger className="h-9">
                      <SelectValue placeholder="Seleccionar" />
                    </SelectTrigger>
                    <SelectContent>
                      {cargos.map((c) => (
                        <SelectItem key={c.id} value={c.id}>{c.nombre}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1">
                  <Label htmlFor="departamentoId" className="text-xs">Departamento</Label>
                  <Select value={form.departamentoId} onValueChange={(v) => setForm({ ...form, departamentoId: v })}>
                    <SelectTrigger className="h-9">
                      <SelectValue placeholder="Seleccionar" />
                    </SelectTrigger>
                    <SelectContent>
                      {departamentos.map((d) => (
                        <SelectItem key={d.id} value={d.id}>{d.nombre}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Sueldos + Cálculo */}
              {(() => {
                const sueldoTotal = getSueldoTotal(
                  form.sueldoPlanilla ? parseFloat(form.sueldoPlanilla) : 0,
                  form.sueldoHonorarios ? parseFloat(form.sueldoHonorarios) : 0
                )
                const sueldoUSD = penToUSD(sueldoTotal, config.tipoCambio)
                const costoHora = sueldoTotal > 0 ? sueldoUSD / config.horasMensuales : 0

                return (
                  <div className="p-3 bg-gradient-to-r from-blue-50 to-purple-50 border border-blue-100 rounded-lg">
                    <div className="grid grid-cols-2 gap-3 mb-3">
                      <div className="space-y-1">
                        <Label htmlFor="sueldoPlanilla" className="text-xs">Sueldo Planilla (PEN)</Label>
                        <Input
                          id="sueldoPlanilla"
                          type="number"
                          step="0.01"
                          value={form.sueldoPlanilla}
                          onChange={(e) => setForm({ ...form, sueldoPlanilla: e.target.value })}
                          placeholder="0.00"
                          className="h-9"
                        />
                      </div>
                      <div className="space-y-1">
                        <Label htmlFor="sueldoHonorarios" className="text-xs">Sueldo Honorarios (PEN)</Label>
                        <Input
                          id="sueldoHonorarios"
                          type="number"
                          step="0.01"
                          value={form.sueldoHonorarios}
                          onChange={(e) => setForm({ ...form, sueldoHonorarios: e.target.value })}
                          placeholder="0.00"
                          className="h-9"
                        />
                      </div>
                    </div>
                    <div className="flex items-center justify-between pt-2 border-t border-blue-200">
                      <div className="flex items-center gap-4">
                        <div>
                          <span className="text-[10px] text-muted-foreground">Total: </span>
                          <span className="font-semibold text-sm">{formatCurrency(sueldoTotal)}</span>
                        </div>
                        <div>
                          <span className="text-[10px] text-muted-foreground">USD: </span>
                          <span className="font-semibold text-sm text-green-600">{formatUSD(sueldoUSD)}</span>
                        </div>
                      </div>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <div className="flex items-center gap-1 cursor-help">
                            <span className="text-[10px] text-muted-foreground">Costo/Hora:</span>
                            <span className="font-bold text-blue-600">{formatUSD(costoHora)}/h</span>
                          </div>
                        </TooltipTrigger>
                        <TooltipContent side="left" className="max-w-xs">
                          <p className="font-mono text-xs">
                            ({formatCurrency(sueldoTotal)} / {config.tipoCambio}) / {config.horasMensuales}h
                          </p>
                          <p className="text-[10px] text-muted-foreground mt-1">
                            TC: {config.tipoCambio} · {config.horasSemanales}h/sem × {config.semanasxMes} = {config.horasMensuales}h/mes
                          </p>
                        </TooltipContent>
                      </Tooltip>
                    </div>
                  </div>
                )
              })()}

              {/* Documento, Teléfono, Fechas - todo en una fila */}
              <div className="grid grid-cols-4 gap-3">
                <div className="space-y-1">
                  <Label htmlFor="documentoIdentidad" className="text-xs">DNI / CE</Label>
                  <Input
                    id="documentoIdentidad"
                    value={form.documentoIdentidad}
                    onChange={(e) => setForm({ ...form, documentoIdentidad: e.target.value })}
                    placeholder="12345678"
                    className="h-9"
                  />
                </div>
                <div className="space-y-1">
                  <Label htmlFor="telefono" className="text-xs">Teléfono</Label>
                  <Input
                    id="telefono"
                    value={form.telefono}
                    onChange={(e) => setForm({ ...form, telefono: e.target.value })}
                    placeholder="999999999"
                    className="h-9"
                  />
                </div>
                <div className="space-y-1">
                  <Label htmlFor="fechaIngreso" className="text-xs">Ingreso</Label>
                  <Input
                    id="fechaIngreso"
                    type="date"
                    value={form.fechaIngreso}
                    onChange={(e) => setForm({ ...form, fechaIngreso: e.target.value })}
                    className="h-9"
                  />
                </div>
                <div className="space-y-1">
                  <Label htmlFor="fechaCese" className="text-xs">Cese</Label>
                  <Input
                    id="fechaCese"
                    type="date"
                    value={form.fechaCese}
                    onChange={(e) => setForm({ ...form, fechaCese: e.target.value })}
                    className="h-9"
                  />
                </div>
              </div>
            </div>

            <DialogFooter className="pt-2">
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

'use client'

import React, { useEffect, useState, useMemo } from 'react'
import { z } from 'zod'
import { toast } from 'sonner'
import {
  Users,
  UserPlus,
  Pencil,
  Trash2,
  Save,
  Loader2,
  Search,
  X,
  Download,
  Upload,
  FileSpreadsheet,
  Eye,
  EyeOff,
  ArrowUpDown
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { Switch } from '@/components/ui/switch'
import { Skeleton } from '@/components/ui/skeleton'
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { DeleteAlertDialog } from '@/components/ui/DeleteAlertDialog'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'
import { cn } from '@/lib/utils'
import type { Empleado, User, Cargo, Departamento } from '@/types/modelos'
import { getEmpleados, createEmpleado, updateEmpleado, deleteEmpleado, EmpleadoPayload } from '@/lib/services/empleado'
import { getCargos } from '@/lib/services/cargo'
import { getDepartamentos } from '@/lib/services/departamento'
import {
  exportarEmpleadosAExcel,
  generarPlantillaEmpleados
} from '@/lib/utils/empleadoExcel'
import { EmpleadoImportModal } from '@/components/admin/EmpleadoImportModal'
import {
  getConfiguracionCostos,
  ConfiguracionCostos,
  DEFAULTS,
  formatUSD,
  penToUSD
} from '@/lib/costos'
import { calcularCostosLaborales } from '@/lib/utils/costosLaborales'

// Schema de validación
const empleadoSchema = z.object({
  userId: z.string().min(1, 'Selecciona un usuario'),
  cargoId: z.string().optional(),
  departamentoId: z.string().optional(),
  sueldoPlanilla: z.string().optional(),
  sueldoHonorarios: z.string().optional(),
  asignacionFamiliar: z.string().optional(),
  emo: z.string().optional(),
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
  asignacionFamiliar: '0',
  emo: '25',
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
  const [searchTerm, setSearchTerm] = useState('')
  const [filterActivo, setFilterActivo] = useState<'__ALL__' | 'activo' | 'inactivo'>('__ALL__')
  const [filterDepartamento, setFilterDepartamento] = useState<string>('__ALL__')
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

  // Import modal state
  const [isImportModalOpen, setIsImportModalOpen] = useState(false)

  // Toggle para mostrar/ocultar columnas de beneficios y seguros
  const [showBeneficios, setShowBeneficios] = useState(false)
  const [showSeguros, setShowSeguros] = useState(false)

  // Ordenamiento
  const [sortBy, setSortBy] = useState<string>('nombre')

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

  // Filtrar y ordenar empleados
  const filteredEmpleados = useMemo(() => {
    const filtered = empleados.filter(emp => {
      const matchesSearch = !searchTerm ||
        emp.user?.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        emp.user?.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        emp.cargo?.nombre?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        emp.departamento?.nombre?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        emp.documentoIdentidad?.toLowerCase().includes(searchTerm.toLowerCase())

      const matchesFilter = filterActivo === '__ALL__' ||
        (filterActivo === 'activo' && emp.activo) ||
        (filterActivo === 'inactivo' && !emp.activo)

      const matchesDepartamento = filterDepartamento === '__ALL__' ||
        emp.departamentoId === filterDepartamento

      return matchesSearch && matchesFilter && matchesDepartamento
    })

    // Ordenar
    return filtered.sort((a, b) => {
      const costosA = calcularCostosLaborales(a, { tipoCambio: config.tipoCambio, horasMensuales: config.horasMensuales })
      const costosB = calcularCostosLaborales(b, { tipoCambio: config.tipoCambio, horasMensuales: config.horasMensuales })

      switch (sortBy) {
        case 'nombre':
          return (a.user?.name || '').localeCompare(b.user?.name || '')
        case 'nombre-desc':
          return (b.user?.name || '').localeCompare(a.user?.name || '')
        case 'remuneracion-desc':
          return costosB.remuneracion - costosA.remuneracion
        case 'remuneracion-asc':
          return costosA.remuneracion - costosB.remuneracion
        case 'total-desc':
          return costosB.totalMensual - costosA.totalMensual
        case 'total-asc':
          return costosA.totalMensual - costosB.totalMensual
        case 'costo-hora-desc':
          return (costosB.costoHoraUSD ?? 0) - (costosA.costoHoraUSD ?? 0)
        case 'costo-hora-asc':
          return (costosA.costoHoraUSD ?? 0) - (costosB.costoHoraUSD ?? 0)
        case 'fecha-ingreso':
          return new Date(b.fechaIngreso || 0).getTime() - new Date(a.fechaIngreso || 0).getTime()
        case 'fecha-ingreso-asc':
          return new Date(a.fechaIngreso || 0).getTime() - new Date(b.fechaIngreso || 0).getTime()
        default:
          return 0
      }
    })
  }, [empleados, searchTerm, filterActivo, filterDepartamento, sortBy, config])

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
      asignacionFamiliar: empleado.asignacionFamiliar?.toString() || '0',
      emo: empleado.emo?.toString() || '25',
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
        asignacionFamiliar: form.asignacionFamiliar ? parseFloat(form.asignacionFamiliar) : 0,
        emo: form.emo ? parseFloat(form.emo) : 25,
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

  // Export handler
  const handleExportar = () => {
    if (filteredEmpleados.length === 0) {
      toast.error('No hay empleados para exportar')
      return
    }
    exportarEmpleadosAExcel(filteredEmpleados)
    toast.success('Archivo exportado correctamente')
  }

  // Datos para el modal de importación
  const emailsUsuarios = useMemo(() => usuarios.map(u => u.email || ''), [usuarios])
  const emailsEmpleadosExistentes = useMemo(() => empleados.map(emp => emp.user?.email || ''), [empleados])

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="flex justify-between items-center">
          <Skeleton className="h-8 w-32" />
          <Skeleton className="h-9 w-36" />
        </div>
        <div className="flex gap-3">
          <Skeleton className="h-9 flex-1 max-w-xs" />
          <Skeleton className="h-9 w-[140px]" />
          <Skeleton className="h-9 w-[180px]" />
        </div>
        <Card>
          <CardContent className="p-0">
            <div className="divide-y">
              {[1, 2, 3, 4, 5].map((i) => (
                <div key={i} className="flex items-center gap-4 p-3">
                  <Skeleton className="h-8 w-8 rounded-full" />
                  <Skeleton className="h-4 w-32" />
                  <Skeleton className="h-4 w-20" />
                  <Skeleton className="h-4 w-24" />
                  <Skeleton className="h-4 w-20" />
                  <Skeleton className="h-7 w-16 ml-auto" />
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  const hasActiveFilters = searchTerm || filterActivo !== '__ALL__' || filterDepartamento !== '__ALL__'

  return (
    <TooltipProvider>
      <div className="space-y-4">
        {/* Header compacto */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2">
              <Users className="h-6 w-6 text-primary" />
              <h1 className="text-xl font-semibold">Personal</h1>
            </div>
            <Badge variant="secondary" className="font-normal">
              {empleados.length}
            </Badge>
          </div>

          <div className="flex items-center gap-2">
            <Button size="sm" onClick={handleOpenCreate}>
              <UserPlus className="h-4 w-4 mr-1" />
              Nuevo
            </Button>

            {/* Import/Export/Plantilla */}
            <div className="flex items-center gap-1 border rounded-lg p-0.5 bg-muted/50">
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button variant="ghost" size="sm" onClick={handleExportar} className="h-8 px-2">
                    <Download className="h-4 w-4 mr-1" />
                    Exportar
                  </Button>
                </TooltipTrigger>
                <TooltipContent>Exportar tabla completa con costos calculados</TooltipContent>
              </Tooltip>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setIsImportModalOpen(true)}
                    className="h-8 px-2"
                  >
                    <Upload className="h-4 w-4 mr-1" />
                    Importar
                  </Button>
                </TooltipTrigger>
                <TooltipContent>Importar empleados desde Excel</TooltipContent>
              </Tooltip>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      generarPlantillaEmpleados()
                      toast.success('Plantilla descargada')
                    }}
                    className="h-8 px-2"
                  >
                    <FileSpreadsheet className="h-4 w-4 mr-1" />
                    Plantilla
                  </Button>
                </TooltipTrigger>
                <TooltipContent>Descargar plantilla de ejemplo para importar</TooltipContent>
              </Tooltip>
            </div>
          </div>
        </div>

        {/* Filtros inline */}
        <div className="flex items-center gap-3 flex-wrap">
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Buscar por nombre, email, cargo..."
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

          <Select value={filterActivo} onValueChange={(v) => setFilterActivo(v as typeof filterActivo)}>
            <SelectTrigger className="w-[150px] h-9">
              <SelectValue>
                {filterActivo === '__ALL__' ? 'Estado: Todos' : `Estado: ${filterActivo.charAt(0).toUpperCase() + filterActivo.slice(1)}s`}
              </SelectValue>
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="__ALL__">Todos los estados</SelectItem>
              <SelectItem value="activo">Activos</SelectItem>
              <SelectItem value="inactivo">Inactivos</SelectItem>
            </SelectContent>
          </Select>

          <Select value={filterDepartamento} onValueChange={setFilterDepartamento}>
            <SelectTrigger className="w-[180px] h-9">
              <SelectValue>
                {filterDepartamento === '__ALL__'
                  ? 'Dpto: Todos'
                  : `Dpto: ${departamentos.find(d => d.id === filterDepartamento)?.nombre || 'Todos'}`}
              </SelectValue>
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="__ALL__">Todos los departamentos</SelectItem>
              {departamentos.map((d) => (
                <SelectItem key={d.id} value={d.id}>{d.nombre}</SelectItem>
              ))}
            </SelectContent>
          </Select>

          {/* Toggle Beneficios (verde como las columnas) */}
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="outline"
                size="sm"
                className={cn(
                  "h-9 border-green-300",
                  showBeneficios
                    ? "bg-green-100 text-green-800 hover:bg-green-200"
                    : "bg-green-50 text-green-700 hover:bg-green-100"
                )}
                onClick={() => setShowBeneficios(!showBeneficios)}
              >
                {showBeneficios ? <EyeOff className="h-4 w-4 mr-1" /> : <Eye className="h-4 w-4 mr-1" />}
                Beneficios
              </Button>
            </TooltipTrigger>
            <TooltipContent>
              {showBeneficios ? 'Ocultar' : 'Mostrar'} columnas: Essalud, CTS, Gratif., Bonif. Ext.
            </TooltipContent>
          </Tooltip>

          {/* Toggle Seguros (naranja como las columnas) */}
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="outline"
                size="sm"
                className={cn(
                  "h-9 border-orange-300",
                  showSeguros
                    ? "bg-orange-100 text-orange-800 hover:bg-orange-200"
                    : "bg-orange-50 text-orange-700 hover:bg-orange-100"
                )}
                onClick={() => setShowSeguros(!showSeguros)}
              >
                {showSeguros ? <EyeOff className="h-4 w-4 mr-1" /> : <Eye className="h-4 w-4 mr-1" />}
                Seguros
              </Button>
            </TooltipTrigger>
            <TooltipContent>
              {showSeguros ? 'Ocultar' : 'Mostrar'} columnas: SCTR, Vida Ley, EMO
            </TooltipContent>
          </Tooltip>

          {/* Ordenamiento */}
          <Select value={sortBy} onValueChange={setSortBy}>
            <SelectTrigger className="h-9 w-[180px]">
              <ArrowUpDown className="h-4 w-4 mr-2 text-muted-foreground" />
              <SelectValue placeholder="Ordenar por..." />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="nombre">Nombre A-Z</SelectItem>
              <SelectItem value="nombre-desc">Nombre Z-A</SelectItem>
              <SelectItem value="remuneracion-desc">Mayor sueldo</SelectItem>
              <SelectItem value="remuneracion-asc">Menor sueldo</SelectItem>
              <SelectItem value="total-desc">Mayor costo total</SelectItem>
              <SelectItem value="total-asc">Menor costo total</SelectItem>
              <SelectItem value="costo-hora-desc">Mayor $/hora</SelectItem>
              <SelectItem value="costo-hora-asc">Menor $/hora</SelectItem>
              <SelectItem value="fecha-ingreso">Más reciente</SelectItem>
              <SelectItem value="fecha-ingreso-asc">Más antiguo</SelectItem>
            </SelectContent>
          </Select>

          {hasActiveFilters && (
            <Button
              variant="ghost"
              size="sm"
              className="h-9 text-muted-foreground"
              onClick={() => {
                setSearchTerm('')
                setFilterActivo('__ALL__')
                setFilterDepartamento('__ALL__')
              }}
            >
              <X className="h-4 w-4 mr-1" />
              Limpiar
            </Button>
          )}

          {hasActiveFilters && (
            <span className="text-sm text-muted-foreground">
              {filteredEmpleados.length} de {empleados.length}
            </span>
          )}
        </div>

        {/* Tabla de Costos Laborales (estilo Excel) */}
        <Card>
          <CardContent className="p-0">
            {filteredEmpleados.length === 0 ? (
              <div className="text-center py-12">
                <Users className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-lg font-semibold mb-2">
                  {empleados.length === 0 ? 'No hay empleados' : 'Sin resultados'}
                </h3>
                <p className="text-sm text-muted-foreground mb-4">
                  {empleados.length === 0
                    ? 'Comienza registrando el primer empleado'
                    : 'No hay empleados que coincidan con los filtros'}
                </p>
                {empleados.length === 0 ? (
                  <Button variant="outline" size="sm" onClick={handleOpenCreate}>
                    <UserPlus className="h-4 w-4 mr-2" />
                    Registrar empleado
                  </Button>
                ) : (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setSearchTerm('')
                      setFilterActivo('__ALL__')
                      setFilterDepartamento('__ALL__')
                    }}
                  >
                    <X className="h-4 w-4 mr-2" />
                    Limpiar filtros
                  </Button>
                )}
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="border-b bg-slate-100">
                      {/* Columnas fijas de información */}
                      <th className="sticky left-0 z-10 bg-slate-100 text-center py-2 px-2 font-semibold text-slate-700 border-r w-8">N°</th>
                      <th className="sticky left-8 z-10 bg-slate-100 text-left py-2 px-2 font-semibold text-slate-700 border-r min-w-[180px]">Apellidos y Nombres</th>
                      <th className="text-center py-2 px-2 font-semibold text-slate-700 whitespace-nowrap">DNI</th>
                      <th className="text-center py-2 px-2 font-semibold text-slate-700 whitespace-nowrap">F. Ingreso</th>
                      <th className="text-left py-2 px-2 font-semibold text-slate-700 min-w-[180px] max-w-[220px]">Cargo</th>
                      <th className="text-left py-2 px-2 font-semibold text-slate-700 whitespace-nowrap min-w-[100px]">Area</th>
                      {/* Columnas de costos laborales */}
                      <th className="text-right py-2 px-2 font-semibold text-slate-700 whitespace-nowrap bg-blue-50">Remuneracion</th>
                      <th className="text-right py-2 px-2 font-semibold text-slate-700 whitespace-nowrap bg-blue-50">Asig. Fam.</th>
                      <th className="text-right py-2 px-2 font-semibold text-slate-700 whitespace-nowrap bg-blue-100">Total Rem.</th>
                      {showBeneficios && (
                        <>
                          <th className="text-right py-2 px-2 font-semibold text-slate-700 whitespace-nowrap bg-green-50">Essalud</th>
                          <th className="text-right py-2 px-2 font-semibold text-slate-700 whitespace-nowrap bg-green-50">CTS</th>
                          <th className="text-right py-2 px-2 font-semibold text-slate-700 whitespace-nowrap bg-green-50">Gratif.</th>
                          <th className="text-right py-2 px-2 font-semibold text-slate-700 whitespace-nowrap bg-green-50">Bonif. Ext.</th>
                        </>
                      )}
                      <th className="text-right py-2 px-2 font-semibold text-slate-700 whitespace-nowrap bg-yellow-100">Costo Planilla</th>
                      {showSeguros && (
                        <>
                          <th className="text-right py-2 px-2 font-semibold text-slate-700 whitespace-nowrap bg-orange-50">SCTR</th>
                          <th className="text-right py-2 px-2 font-semibold text-slate-700 whitespace-nowrap bg-orange-50">Vida Ley</th>
                          <th className="text-right py-2 px-2 font-semibold text-slate-700 whitespace-nowrap bg-orange-50">EMO</th>
                        </>
                      )}
                      <th className="text-right py-2 px-2 font-semibold text-slate-700 whitespace-nowrap bg-purple-50">Honorarios</th>
                      <th className="text-right py-2 px-2 font-semibold text-slate-700 whitespace-nowrap bg-orange-200">Total Mensual</th>
                      <th className="text-right py-2 px-2 font-semibold text-slate-700 whitespace-nowrap bg-blue-200">$/Hora</th>
                      <th className="text-center py-2 px-2 font-semibold text-slate-700 whitespace-nowrap">Estado</th>
                      <th className="w-16 py-2 px-2 text-center font-semibold text-slate-700">Acc.</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {filteredEmpleados.map((emp, index) => {
                      const costos = calcularCostosLaborales(emp, { tipoCambio: config.tipoCambio, horasMensuales: config.horasMensuales })
                      return (
                        <tr key={emp.id} className="hover:bg-muted/30 transition-colors">
                          {/* N° */}
                          <td className="sticky left-0 z-10 bg-white text-center py-1.5 px-2 font-mono text-slate-500 border-r">
                            {index + 1}
                          </td>
                          {/* Nombre */}
                          <td className="sticky left-8 z-10 bg-white py-1.5 px-2 border-r">
                            <div className="flex items-center gap-2">
                              <div className={cn(
                                "w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-medium shrink-0",
                                emp.activo ? "bg-primary/10 text-primary" : "bg-gray-100 text-gray-500"
                              )}>
                                {getInitials(emp.user?.name)}
                              </div>
                              <span className="font-medium truncate" title={emp.user?.name || 'Sin nombre'}>
                                {emp.user?.name || 'Sin nombre'}
                              </span>
                            </div>
                          </td>
                          {/* DNI */}
                          <td className="py-1.5 px-2 text-center font-mono">{emp.documentoIdentidad || '—'}</td>
                          {/* Fecha Ingreso */}
                          <td className="py-1.5 px-2 text-center font-mono text-slate-600">
                            {emp.fechaIngreso ? new Date(emp.fechaIngreso).toLocaleDateString('es-PE', { day: '2-digit', month: '2-digit', year: '2-digit' }) : '—'}
                          </td>
                          {/* Cargo */}
                          <td className="py-1.5 px-2 text-sm leading-tight max-w-[220px]">
                            <span className="line-clamp-2" title={emp.cargo?.nombre}>{emp.cargo?.nombre || '—'}</span>
                          </td>
                          {/* Area/Departamento */}
                          <td className="py-1.5 px-2 truncate" title={emp.departamento?.nombre}>{emp.departamento?.nombre || '—'}</td>
                          {/* Remuneración */}
                          <td className="py-1.5 px-2 text-right font-mono bg-blue-50/50">
                            {costos.remuneracion > 0 ? costos.remuneracion.toLocaleString('es-PE', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : '—'}
                          </td>
                          {/* Asignación Familiar */}
                          <td className="py-1.5 px-2 text-right font-mono bg-blue-50/50">
                            {costos.asignacionFamiliar > 0 ? costos.asignacionFamiliar.toLocaleString('es-PE', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : '—'}
                          </td>
                          {/* Total Remuneración */}
                          <td className="py-1.5 px-2 text-right font-mono font-semibold bg-blue-100/50">
                            {costos.totalRemuneracion > 0 ? costos.totalRemuneracion.toLocaleString('es-PE', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : '—'}
                          </td>
                          {/* Beneficios (condicional) */}
                          {showBeneficios && (
                            <>
                              {/* Essalud */}
                              <td className="py-1.5 px-2 text-right font-mono bg-green-50/50">
                                {costos.essalud > 0 ? costos.essalud.toLocaleString('es-PE', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : '—'}
                              </td>
                              {/* CTS mensual */}
                              <td className="py-1.5 px-2 text-right font-mono bg-green-50/50">
                                {costos.ctsMensual > 0 ? costos.ctsMensual.toLocaleString('es-PE', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : '—'}
                              </td>
                              {/* Gratificación mensual */}
                              <td className="py-1.5 px-2 text-right font-mono bg-green-50/50">
                                {costos.gratificacionMensual > 0 ? costos.gratificacionMensual.toLocaleString('es-PE', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : '—'}
                              </td>
                              {/* Bonificación Extraordinaria mensual */}
                              <td className="py-1.5 px-2 text-right font-mono bg-green-50/50">
                                {costos.bonifExtraordinariaMensual > 0 ? costos.bonifExtraordinariaMensual.toLocaleString('es-PE', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : '—'}
                              </td>
                            </>
                          )}
                          {/* Costo Mensual Planilla */}
                          <td className="py-1.5 px-2 text-right font-mono font-semibold bg-yellow-100/50">
                            {costos.costoMensualPlanilla > 0 ? costos.costoMensualPlanilla.toLocaleString('es-PE', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : '—'}
                          </td>
                          {/* Seguros (condicional) */}
                          {showSeguros && (
                            <>
                              {/* SCTR */}
                              <td className="py-1.5 px-2 text-right font-mono bg-orange-50/50">
                                {costos.sctr > 0 ? costos.sctr.toLocaleString('es-PE', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : '—'}
                              </td>
                              {/* Vida Ley */}
                              <td className="py-1.5 px-2 text-right font-mono bg-orange-50/50">
                                {costos.vidaLey > 0 ? costos.vidaLey.toLocaleString('es-PE', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : '—'}
                              </td>
                              {/* EMO */}
                              <td className="py-1.5 px-2 text-right font-mono bg-orange-50/50">
                                {costos.emo > 0 ? costos.emo.toLocaleString('es-PE', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : '—'}
                              </td>
                            </>
                          )}
                          {/* Honorarios */}
                          <td className="py-1.5 px-2 text-right font-mono bg-purple-50/50">
                            {costos.honorarios > 0 ? costos.honorarios.toLocaleString('es-PE', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : '—'}
                          </td>
                          {/* Total Mensual */}
                          <td className="py-1.5 px-2 text-right font-mono font-bold text-orange-700 bg-orange-100/70">
                            {costos.totalMensual > 0 ? costos.totalMensual.toLocaleString('es-PE', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : '—'}
                          </td>
                          {/* $/Hora */}
                          <td className="py-1.5 px-2 text-right font-mono font-bold text-blue-700 bg-blue-100/50">
                            {formatUSD(costos.costoHoraUSD || 0)}
                          </td>
                          {/* Estado */}
                          <td className="py-1.5 px-2 text-center">
                            <Badge variant={emp.activo ? 'default' : 'secondary'} className="text-[10px] px-1.5 py-0">
                              {emp.activo ? 'Activo' : 'Inact.'}
                            </Badge>
                          </td>
                          {/* Acciones */}
                          <td className="py-1.5 px-2">
                            <div className="flex justify-center gap-0.5">
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <Button
                                    size="sm"
                                    variant="ghost"
                                    className="h-6 w-6 p-0"
                                    onClick={() => handleOpenEdit(emp)}
                                  >
                                    <Pencil className="h-3 w-3" />
                                  </Button>
                                </TooltipTrigger>
                                <TooltipContent>Editar</TooltipContent>
                              </Tooltip>
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <Button
                                    size="sm"
                                    variant="ghost"
                                    className="h-6 w-6 p-0 text-destructive hover:text-destructive hover:bg-destructive/10"
                                    onClick={() => handleOpenDelete(emp)}
                                  >
                                    <Trash2 className="h-3 w-3" />
                                  </Button>
                                </TooltipTrigger>
                                <TooltipContent>Eliminar</TooltipContent>
                              </Tooltip>
                            </div>
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                  {/* Fila de totales */}
                  <tfoot>
                    <tr className="border-t-2 bg-slate-50 font-semibold">
                      <td colSpan={6} className="sticky left-0 z-10 bg-slate-50 py-2 px-2 text-right border-r">
                        TOTALES ({filteredEmpleados.length} empleados)
                      </td>
                      {(() => {
                        const totales = filteredEmpleados.reduce((acc, emp) => {
                          const c = calcularCostosLaborales(emp, { tipoCambio: config.tipoCambio, horasMensuales: config.horasMensuales })
                          return {
                            remuneracion: acc.remuneracion + c.remuneracion,
                            asignacionFamiliar: acc.asignacionFamiliar + c.asignacionFamiliar,
                            totalRemuneracion: acc.totalRemuneracion + c.totalRemuneracion,
                            essalud: acc.essalud + c.essalud,
                            ctsMensual: acc.ctsMensual + c.ctsMensual,
                            gratificacionMensual: acc.gratificacionMensual + c.gratificacionMensual,
                            bonifExtraordinariaMensual: acc.bonifExtraordinariaMensual + c.bonifExtraordinariaMensual,
                            costoMensualPlanilla: acc.costoMensualPlanilla + c.costoMensualPlanilla,
                            sctr: acc.sctr + c.sctr,
                            vidaLey: acc.vidaLey + c.vidaLey,
                            emo: acc.emo + c.emo,
                            honorarios: acc.honorarios + c.honorarios,
                            totalMensual: acc.totalMensual + c.totalMensual,
                          }
                        }, {
                          remuneracion: 0, asignacionFamiliar: 0, totalRemuneracion: 0, essalud: 0,
                          ctsMensual: 0, gratificacionMensual: 0, bonifExtraordinariaMensual: 0,
                          costoMensualPlanilla: 0, sctr: 0, vidaLey: 0, emo: 0, honorarios: 0, totalMensual: 0
                        })
                        return (
                          <>
                            <td className="py-2 px-2 text-right font-mono bg-blue-50">{totales.remuneracion.toLocaleString('es-PE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                            <td className="py-2 px-2 text-right font-mono bg-blue-50">{totales.asignacionFamiliar.toLocaleString('es-PE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                            <td className="py-2 px-2 text-right font-mono font-bold bg-blue-100">{totales.totalRemuneracion.toLocaleString('es-PE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                            {showBeneficios && (
                              <>
                                <td className="py-2 px-2 text-right font-mono bg-green-50">{totales.essalud.toLocaleString('es-PE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                                <td className="py-2 px-2 text-right font-mono bg-green-50">{totales.ctsMensual.toLocaleString('es-PE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                                <td className="py-2 px-2 text-right font-mono bg-green-50">{totales.gratificacionMensual.toLocaleString('es-PE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                                <td className="py-2 px-2 text-right font-mono bg-green-50">{totales.bonifExtraordinariaMensual.toLocaleString('es-PE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                              </>
                            )}
                            <td className="py-2 px-2 text-right font-mono font-bold bg-yellow-100">{totales.costoMensualPlanilla.toLocaleString('es-PE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                            {showSeguros && (
                              <>
                                <td className="py-2 px-2 text-right font-mono bg-orange-50">{totales.sctr.toLocaleString('es-PE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                                <td className="py-2 px-2 text-right font-mono bg-orange-50">{totales.vidaLey.toLocaleString('es-PE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                                <td className="py-2 px-2 text-right font-mono bg-orange-50">{totales.emo.toLocaleString('es-PE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                              </>
                            )}
                            <td className="py-2 px-2 text-right font-mono bg-purple-50">{totales.honorarios.toLocaleString('es-PE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                            <td className="py-2 px-2 text-right font-mono font-bold text-orange-700 bg-orange-200">{totales.totalMensual.toLocaleString('es-PE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                            <td className="py-2 px-2 text-right font-mono text-blue-700 bg-blue-200">—</td>
                            <td colSpan={2} className="py-2 px-2"></td>
                          </>
                        )
                      })()}
                    </tr>
                  </tfoot>
                </table>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Modal de Crear/Editar */}
        <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
          <DialogContent className="max-w-xl">
            <DialogHeader className="pb-2">
              <DialogTitle className="flex items-center gap-2 text-lg">
                {editingEmpleado ? <Pencil className="h-4 w-4" /> : <UserPlus className="h-4 w-4" />}
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

              {/* Sueldos + Costos Laborales */}
              {(() => {
                const costos = calcularCostosLaborales({
                  sueldoPlanilla: form.sueldoPlanilla ? parseFloat(form.sueldoPlanilla) : 0,
                  sueldoHonorarios: form.sueldoHonorarios ? parseFloat(form.sueldoHonorarios) : 0,
                  asignacionFamiliar: form.asignacionFamiliar ? parseFloat(form.asignacionFamiliar) : 0,
                  emo: form.emo ? parseFloat(form.emo) : 25,
                }, { tipoCambio: config.tipoCambio, horasMensuales: config.horasMensuales })

                return (
                  <div className="p-3 bg-gradient-to-r from-blue-50 to-orange-50 border border-blue-100 rounded-lg">
                    <div className="grid grid-cols-4 gap-3 mb-3">
                      <div className="space-y-1">
                        <Label htmlFor="sueldoPlanilla" className="text-xs">Remuneración (PEN)</Label>
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
                        <Label htmlFor="asignacionFamiliar" className="text-xs">Asig. Familiar</Label>
                        <Input
                          id="asignacionFamiliar"
                          type="number"
                          step="0.01"
                          value={form.asignacionFamiliar}
                          onChange={(e) => setForm({ ...form, asignacionFamiliar: e.target.value })}
                          placeholder="0.00"
                          className="h-9"
                        />
                      </div>
                      <div className="space-y-1">
                        <Label htmlFor="sueldoHonorarios" className="text-xs">Honorarios</Label>
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
                      <div className="space-y-1">
                        <Label htmlFor="emo" className="text-xs">EMO mensual</Label>
                        <Input
                          id="emo"
                          type="number"
                          step="0.01"
                          value={form.emo}
                          onChange={(e) => setForm({ ...form, emo: e.target.value })}
                          placeholder="25.00"
                          className="h-9"
                        />
                      </div>
                    </div>
                    <div className="flex items-center justify-between pt-2 border-t border-blue-200">
                      <div className="flex items-center gap-4">
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <div className="cursor-help">
                              <span className="text-[10px] text-muted-foreground">Costo Total: </span>
                              <span className="font-semibold text-sm text-orange-600">{formatCurrency(costos.totalMensual)}</span>
                            </div>
                          </TooltipTrigger>
                          <TooltipContent side="bottom" className="max-w-xs">
                            <div className="text-xs space-y-0.5">
                              <p>Remuneración: {formatCurrency(costos.totalRemuneracion)}</p>
                              <p>Essalud (9%): {formatCurrency(costos.essalud)}</p>
                              <p>CTS mensual: {formatCurrency(costos.ctsMensual)}</p>
                              <p>Gratif. mensual: {formatCurrency(costos.gratificacionMensual)}</p>
                              <p>SCTR + Vida Ley: {formatCurrency(costos.sctr + costos.vidaLey)}</p>
                              <p>EMO: {formatCurrency(costos.emo)}</p>
                              <p>Honorarios: {formatCurrency(costos.honorarios)}</p>
                            </div>
                          </TooltipContent>
                        </Tooltip>
                        <div>
                          <span className="text-[10px] text-muted-foreground">USD: </span>
                          <span className="font-semibold text-sm text-green-600">{formatUSD(penToUSD(costos.totalMensual, config.tipoCambio))}</span>
                        </div>
                      </div>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <div className="flex items-center gap-1 cursor-help">
                            <span className="text-[10px] text-muted-foreground">Costo/Hora:</span>
                            <span className="font-bold text-blue-600">{formatUSD(costos.costoHoraUSD || 0)}/h</span>
                          </div>
                        </TooltipTrigger>
                        <TooltipContent side="left" className="max-w-xs">
                          <p className="font-mono text-xs">
                            ({formatCurrency(costos.totalMensual)} / {config.tipoCambio}) / {config.horasMensuales}h
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

        {/* Import Modal */}
        <EmpleadoImportModal
          open={isImportModalOpen}
          onOpenChange={setIsImportModalOpen}
          onSuccess={loadData}
          emailsUsuarios={emailsUsuarios}
          emailsEmpleadosExistentes={emailsEmpleadosExistentes}
        />
      </div>
    </TooltipProvider>
  )
}

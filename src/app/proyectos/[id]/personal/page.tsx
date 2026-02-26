/**
 * 🎯 Project Personnel Page - Minimalist Version
 * Focuses on showing team members clearly
 */

'use client'

import { useEffect, useState, useMemo, memo } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { Input } from '@/components/ui/input'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import {
  Users,
  UserPlus,
  UserCog,
  Briefcase,
  HardHat,
  Code,
  Pencil,
  Settings,
  ArrowLeft,
  Loader2,
  Mail,
  Search,
  Trash2,
  Check,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  Info
} from 'lucide-react'
import { toast } from 'sonner'
import Link from 'next/link'
import { useProyectoContext } from '../ProyectoContext'

interface User {
  id: string
  name: string
  email: string
  role: string
}

interface PersonalProyecto {
  id: string
  proyectoId: string
  userId: string
  rol: string
  fechaAsignacion: string
  fechaFin?: string
  activo: boolean
  notas?: string
  user: User
}

interface PersonalData {
  proyectoId: string
  proyectoNombre: string
  rolesFijos: {
    comercial: User | null
    gestor: User | null
    supervisor: User | null
    lider: User | null
  }
  personalDinamico: PersonalProyecto[]
}

const rolesConfig: Record<string, { icon: any; className: string; label: string }> = {
  programador: { icon: Code, className: 'bg-purple-100 text-purple-700', label: 'Programador' },
  cadista: { icon: Pencil, className: 'bg-blue-100 text-blue-700', label: 'Cadista' },
  ingeniero: { icon: Settings, className: 'bg-green-100 text-green-700', label: 'Ingeniero' },
  lider: { icon: UserCog, className: 'bg-amber-100 text-amber-700', label: 'Líder' },
  tecnico: { icon: HardHat, className: 'bg-orange-100 text-orange-700', label: 'Técnico' },
  coordinador: { icon: Briefcase, className: 'bg-cyan-100 text-cyan-700', label: 'Coordinador' },
  asistente: { icon: Users, className: 'bg-slate-100 text-slate-700', label: 'Asistente' }
}

const rolesFijosConfig: Record<string, { icon: any; className: string; label: string }> = {
  comercial: { icon: Briefcase, className: 'bg-emerald-100 text-emerald-700', label: 'Comercial' },
  gestor: { icon: UserCog, className: 'bg-blue-100 text-blue-700', label: 'Gestor' },
  supervisor: { icon: HardHat, className: 'bg-orange-100 text-orange-700', label: 'Supervisor' },
  lider: { icon: Settings, className: 'bg-purple-100 text-purple-700', label: 'Líder Técnico' }
}

const roleDescriptions: Record<string, string> = {
  gestor: 'El gestor administra el proyecto, coordina recursos y supervisa el avance general.',
  supervisor: 'El supervisor verifica la calidad del trabajo y valida los entregables del proyecto.',
  lider: 'El líder técnico dirige la ejecución técnica y toma decisiones de ingeniería.'
}

// Skeleton minimalista
function LoadingSkeleton() {
  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <Skeleton className="h-5 w-5" />
        <Skeleton className="h-6 w-48" />
        <Skeleton className="h-5 w-32 ml-auto" />
      </div>
      <div className="flex gap-2">
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="h-8 w-32" />
        ))}
      </div>
      <div className="border rounded-lg">
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="flex gap-4 p-3 border-b last:border-0">
            <Skeleton className="h-4 w-32" />
            <Skeleton className="h-4 flex-1" />
            <Skeleton className="h-4 w-24" />
            <Skeleton className="h-5 w-20" />
          </div>
        ))}
      </div>
    </div>
  )
}

// Componente de Roles Fijos compacto
const RolesFijosCompact = memo(function RolesFijosCompact({
  rolesFijos,
  onEdit
}: {
  rolesFijos: PersonalData['rolesFijos']
  onEdit: (rolKey: string, currentUserId: string | null) => void
}) {
  return (
    <div className="flex flex-wrap items-center gap-2 p-3 bg-muted/30 rounded-lg">
      <span className="text-xs font-medium text-muted-foreground mr-2">Roles Principales:</span>
      {Object.entries(rolesFijosConfig).map(([key, config]) => {
        const user = rolesFijos[key as keyof typeof rolesFijos]
        const Icon = config.icon
        const canEdit = key !== 'comercial'

        return (
          <button
            key={key}
            onClick={() => canEdit && onEdit(key, user?.id || null)}
            className={`inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-md text-xs transition-colors ${
              canEdit ? 'hover:bg-muted cursor-pointer' : 'cursor-default'
            } ${user ? config.className : 'bg-gray-100 text-gray-500'}`}
            title={canEdit ? `Editar ${config.label}` : 'El comercial se asigna desde la cotización'}
          >
            <Icon className="h-3 w-3" />
            <span className="font-medium">{config.label}:</span>
            <span className={user ? '' : 'italic'}>{user?.name || 'Sin asignar'}</span>
            {canEdit && <Pencil className="h-2.5 w-2.5 opacity-50" />}
          </button>
        )
      })}
    </div>
  )
})

// Componente de tabla de personal
const PersonalTable = memo(function PersonalTable({
  personal,
  onRemove
}: {
  personal: PersonalProyecto[]
  onRemove: (id: string) => void
}) {
  const [search, setSearch] = useState('')
  const [filterRol, setFilterRol] = useState('all')
  const [sortField, setSortField] = useState<string>('fechaAsignacion')
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc')

  const filteredPersonal = useMemo(() => {
    let result = personal

    if (search) {
      const term = search.toLowerCase()
      result = result.filter(p =>
        p.user.name.toLowerCase().includes(term) ||
        p.user.email.toLowerCase().includes(term) ||
        p.notas?.toLowerCase().includes(term)
      )
    }

    if (filterRol !== 'all') {
      result = result.filter(p => p.rol === filterRol)
    }

    return result
  }, [personal, search, filterRol])

  const sortedPersonal = useMemo(() => {
    return [...filteredPersonal].sort((a, b) => {
      let aVal: any
      let bVal: any

      if (sortField === 'name') {
        aVal = a.user.name.toLowerCase()
        bVal = b.user.name.toLowerCase()
      } else if (sortField === 'rol') {
        aVal = a.rol
        bVal = b.rol
      } else {
        aVal = new Date(a.fechaAsignacion).getTime()
        bVal = new Date(b.fechaAsignacion).getTime()
      }

      if (aVal < bVal) return sortDir === 'asc' ? -1 : 1
      if (aVal > bVal) return sortDir === 'asc' ? 1 : -1
      return 0
    })
  }, [filteredPersonal, sortField, sortDir])

  const handleSort = (field: string) => {
    if (sortField === field) {
      setSortDir(d => d === 'asc' ? 'desc' : 'asc')
    } else {
      setSortField(field)
      setSortDir('asc')
    }
  }

  const SortIcon = ({ field }: { field: string }) => {
    if (sortField !== field) return <ArrowUpDown className="h-3 w-3 ml-1 opacity-40" />
    return sortDir === 'asc'
      ? <ArrowUp className="h-3 w-3 ml-1" />
      : <ArrowDown className="h-3 w-3 ml-1" />
  }

  const getRolBadge = (rol: string) => {
    const config = rolesConfig[rol] || rolesConfig.asistente
    const Icon = config.icon

    return (
      <Badge className={`${config.className} text-xs font-normal`}>
        <Icon className="h-3 w-3 mr-1" />
        {config.label}
      </Badge>
    )
  }

  const formatDate = (date: string) => {
    return new Date(date).toLocaleDateString('es-PE', { day: '2-digit', month: 'short', year: '2-digit' })
  }

  return (
    <div className="space-y-3">
      {/* Filtros compactos */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative flex-1 max-w-xs">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar miembro..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-8 h-9 text-sm"
          />
        </div>

        <Select value={filterRol} onValueChange={setFilterRol}>
          <SelectTrigger className="w-36 h-9 text-sm">
            <SelectValue placeholder="Rol" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos los roles</SelectItem>
            {Object.entries(rolesConfig).map(([key, config]) => (
              <SelectItem key={key} value={key}>{config.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>

        <span className="text-xs text-muted-foreground ml-auto">
          {sortedPersonal.length} de {personal.length} miembros
        </span>
      </div>

      {/* Tabla */}
      <div className="border rounded-lg overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow className="bg-muted/50 hover:bg-muted/50">
              <TableHead>
                <button
                  onClick={() => handleSort('name')}
                  className="flex items-center text-xs font-medium"
                >
                  Nombre<SortIcon field="name" />
                </button>
              </TableHead>
              <TableHead className="w-[200px] text-xs font-medium">Email</TableHead>
              <TableHead className="w-[120px]">
                <button
                  onClick={() => handleSort('rol')}
                  className="flex items-center text-xs font-medium"
                >
                  Rol<SortIcon field="rol" />
                </button>
              </TableHead>
              <TableHead className="w-[100px]">
                <button
                  onClick={() => handleSort('fechaAsignacion')}
                  className="flex items-center text-xs font-medium"
                >
                  Desde<SortIcon field="fechaAsignacion" />
                </button>
              </TableHead>
              <TableHead className="w-[60px]"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {sortedPersonal.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} className="text-center py-8 text-muted-foreground text-sm">
                  {search || filterRol !== 'all' ? 'No se encontraron miembros' : 'Sin personal asignado'}
                </TableCell>
              </TableRow>
            ) : (
              sortedPersonal.map((p) => (
                <TableRow key={p.id} className="group">
                  <TableCell className="py-2">
                    <div>
                      <span className="text-sm font-medium">{p.user.name}</span>
                      {p.notas && (
                        <span className="text-xs text-muted-foreground line-clamp-1 block">
                          {p.notas}
                        </span>
                      )}
                    </div>
                  </TableCell>
                  <TableCell className="py-2">
                    <span className="text-xs text-muted-foreground flex items-center gap-1">
                      <Mail className="h-3 w-3" />
                      {p.user.email}
                    </span>
                  </TableCell>
                  <TableCell className="py-2">
                    {getRolBadge(p.rol)}
                  </TableCell>
                  <TableCell className="text-xs text-muted-foreground py-2">
                    {formatDate(p.fechaAsignacion)}
                  </TableCell>
                  <TableCell className="py-2">
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-7 w-7 p-0 opacity-0 group-hover:opacity-100 transition-opacity text-red-600 hover:text-red-700 hover:bg-red-50"
                      onClick={() => onRemove(p.id)}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  )
})

interface PageProps {
  params: Promise<{ id: string }>
}

export default function PersonalPage({ params: _params }: PageProps) {
  const router = useRouter()
  const { proyecto, refreshProyecto } = useProyectoContext()
  const [personalData, setPersonalData] = useState<PersonalData | null>(null)
  const [loading, setLoading] = useState(true)
  const [usuarios, setUsuarios] = useState<User[]>([])
  const [showAddModal, setShowAddModal] = useState(false)
  const [addingPersonal, setAddingPersonal] = useState(false)
  const [selectedUserId, setSelectedUserId] = useState('')
  const [selectedRol, setSelectedRol] = useState('')

  // Estado para editar roles principales
  const [editingRolFijo, setEditingRolFijo] = useState<string | null>(null)
  const [selectedRolFijoUserId, setSelectedRolFijoUserId] = useState('')
  const [savingRolFijo, setSavingRolFijo] = useState(false)

  useEffect(() => {
    if (proyecto?.id) {
      loadPersonal()
      loadUsuarios()
    }
  }, [proyecto?.id])

  const loadPersonal = async () => {
    if (!proyecto?.id) return

    try {
      setLoading(true)
      const response = await fetch(`/api/proyecto/${proyecto.id}/personal`)
      if (!response.ok) throw new Error('Error al cargar personal')
      const data = await response.json()
      setPersonalData(data.data)
    } catch (error) {
      console.error('Error:', error)
      toast.error('Error al cargar el personal del proyecto')
    } finally {
      setLoading(false)
    }
  }

  const loadUsuarios = async () => {
    try {
      const response = await fetch('/api/admin/usuarios')
      if (response.ok) {
        const data = await response.json()
        setUsuarios(Array.isArray(data) ? data : data.data || [])
      }
    } catch (error) {
      console.error('Error cargando usuarios:', error)
    }
  }

  const handleAddPersonal = async () => {
    if (!selectedUserId || !selectedRol || !proyecto?.id) return

    try {
      setAddingPersonal(true)
      const response = await fetch(`/api/proyecto/${proyecto.id}/personal`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: selectedUserId,
          rol: selectedRol
        })
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Error al asignar personal')
      }

      toast.success('Personal asignado')
      setShowAddModal(false)
      setSelectedUserId('')
      setSelectedRol('')
      loadPersonal()
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Error al asignar personal')
    } finally {
      setAddingPersonal(false)
    }
  }

  const handleRemovePersonal = async (personalId: string) => {
    if (!proyecto?.id || !confirm('¿Remover este miembro del equipo?')) return

    try {
      const response = await fetch(`/api/proyecto/${proyecto.id}/personal?personalId=${personalId}`, {
        method: 'DELETE'
      })

      if (!response.ok) throw new Error('Error al remover personal')

      toast.success('Personal removido')
      loadPersonal()
    } catch (error) {
      toast.error('Error al remover personal')
    }
  }

  const handleUpdateRolFijo = async () => {
    if (!editingRolFijo || !proyecto?.id) return

    try {
      setSavingRolFijo(true)

      const fieldMap: Record<string, string> = {
        gestor: 'gestorId',
        supervisor: 'supervisorId',
        lider: 'liderId'
      }

      const field = fieldMap[editingRolFijo]
      if (!field) {
        toast.error('No se puede editar el rol de Comercial')
        return
      }

      const userId = selectedRolFijoUserId === '__none__' ? null : selectedRolFijoUserId

      const response = await fetch(`/api/proyecto/${proyecto.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          [field]: userId
        })
      })

      if (!response.ok) throw new Error('Error al actualizar rol')

      toast.success('Rol actualizado')
      setEditingRolFijo(null)
      setSelectedRolFijoUserId('')
      loadPersonal()
      await refreshProyecto()
    } catch (error) {
      toast.error('Error al actualizar el rol')
    } finally {
      setSavingRolFijo(false)
    }
  }

  const openEditRolFijo = (rolKey: string, currentUserId: string | null) => {
    if (rolKey === 'comercial') {
      toast.info('El comercial se asigna desde la cotización')
      return
    }
    setEditingRolFijo(rolKey)
    setSelectedRolFijoUserId(currentUserId || '')
  }

  if (loading) return <LoadingSkeleton />

  if (!personalData) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-center">
        <Users className="h-12 w-12 text-muted-foreground mb-4" />
        <h3 className="text-lg font-semibold mb-2">Error al cargar datos</h3>
        <Button variant="outline" onClick={() => router.back()}>
          Volver
        </Button>
      </div>
    )
  }

  const { rolesFijos, personalDinamico } = personalData

  // Stats
  const totalMiembros = personalDinamico.length
  const rolesFijosAsignados = Object.values(rolesFijos).filter(Boolean).length
  const rolesUnicos = new Set(personalDinamico.map(p => p.rol)).size

  return (
    <div className="space-y-4">
      {/* Header compacto */}
      <div className="flex items-start justify-between gap-4">
        <div className="space-y-1">
          {/* Navegación mínima */}
          <Link
            href={`/proyectos/${proyecto?.id}`}
            className="inline-flex items-center text-xs text-muted-foreground hover:text-foreground transition-colors"
          >
            <ArrowLeft className="h-3 w-3 mr-1" />
            Proyecto
          </Link>

          {/* Título con icono */}
          <div className="flex items-center gap-2">
            <Users className="h-5 w-5 text-blue-600" />
            <h1 className="text-lg font-semibold">Personal del Proyecto</h1>
          </div>

          {/* Stats inline */}
          <div className="flex items-center gap-4 text-xs text-muted-foreground">
            <span>{totalMiembros} miembros</span>
            <span>{rolesFijosAsignados}/4 roles principales</span>
            <span>{rolesUnicos} roles en equipo</span>
          </div>
        </div>

        {/* Acción principal */}
        <Dialog open={showAddModal} onOpenChange={setShowAddModal}>
          <DialogTrigger asChild>
            <Button size="sm" className="h-8">
              <UserPlus className="h-3.5 w-3.5 mr-1.5" />
              Asignar
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Asignar Personal</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 pt-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">Usuario</label>
                <Select value={selectedUserId} onValueChange={setSelectedUserId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Seleccionar usuario..." />
                  </SelectTrigger>
                  <SelectContent>
                    {usuarios.map((user) => (
                      <SelectItem key={user.id} value={user.id}>
                        {user.name} ({user.role})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">Rol en el Proyecto</label>
                <Select value={selectedRol} onValueChange={setSelectedRol}>
                  <SelectTrigger>
                    <SelectValue placeholder="Seleccionar rol..." />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.entries(rolesConfig).map(([key, config]) => {
                      const Icon = config.icon
                      return (
                        <SelectItem key={key} value={key}>
                          <div className="flex items-center gap-2">
                            <Icon className="h-4 w-4" />
                            {config.label}
                          </div>
                        </SelectItem>
                      )
                    })}
                  </SelectContent>
                </Select>
              </div>

              <div className="flex justify-end gap-2 pt-4">
                <Button variant="outline" onClick={() => setShowAddModal(false)}>
                  Cancelar
                </Button>
                <Button
                  onClick={handleAddPersonal}
                  disabled={!selectedUserId || !selectedRol || addingPersonal}
                >
                  {addingPersonal ? (
                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  ) : (
                    <Check className="h-4 w-4 mr-2" />
                  )}
                  Asignar
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Roles Fijos compactos */}
      <RolesFijosCompact
        rolesFijos={rolesFijos}
        onEdit={openEditRolFijo}
      />

      {/* Modal para editar Rol Fijo */}
      <Dialog open={!!editingRolFijo} onOpenChange={(open) => !open && setEditingRolFijo(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              {editingRolFijo && rolesFijosConfig[editingRolFijo] && (() => {
                const config = rolesFijosConfig[editingRolFijo]
                const Icon = config.icon
                return (
                  <span className={`inline-flex items-center justify-center h-7 w-7 rounded-lg ${config.className}`}>
                    <Icon className="h-4 w-4" />
                  </span>
                )
              })()}
              {editingRolFijo && rolesFijosConfig[editingRolFijo]
                ? `Asignar ${rolesFijosConfig[editingRolFijo].label}`
                : 'Asignar Rol'}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 pt-2">
            {/* Descripción del rol */}
            {editingRolFijo && roleDescriptions[editingRolFijo] && (
              <div className="flex gap-2 rounded-lg bg-muted/50 p-3">
                <Info className="h-4 w-4 text-muted-foreground mt-0.5 shrink-0" />
                <p className="text-sm text-muted-foreground leading-relaxed">
                  {roleDescriptions[editingRolFijo]}
                </p>
              </div>
            )}

            {/* Responsable actual */}
            {editingRolFijo && rolesFijos[editingRolFijo as keyof typeof rolesFijos] && (
              <div className="rounded-lg border border-blue-200 bg-blue-50 p-3">
                <p className="text-xs font-medium text-blue-600 mb-1">Responsable actual</p>
                <p className="text-sm font-semibold text-blue-900">
                  {rolesFijos[editingRolFijo as keyof typeof rolesFijos]!.name}
                </p>
                <p className="text-xs text-blue-600">
                  {rolesFijos[editingRolFijo as keyof typeof rolesFijos]!.email}
                </p>
              </div>
            )}

            {/* Select de usuario */}
            <div className="space-y-2">
              <label className="text-sm font-medium">Nuevo responsable</label>
              <Select value={selectedRolFijoUserId || '__none__'} onValueChange={setSelectedRolFijoUserId}>
                <SelectTrigger>
                  <SelectValue placeholder="Seleccionar usuario..." />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__none__">
                    <span className="text-muted-foreground">Sin asignar</span>
                  </SelectItem>
                  {usuarios.map((user) => (
                    <SelectItem key={user.id} value={user.id}>
                      <div className="flex flex-col">
                        <span>{user.name}</span>
                        <span className="text-xs text-muted-foreground">{user.email}</span>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <Button variant="outline" onClick={() => setEditingRolFijo(null)}>
                Cancelar
              </Button>
              <Button onClick={handleUpdateRolFijo} disabled={savingRolFijo}>
                {savingRolFijo ? (
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                ) : (
                  <Check className="h-4 w-4 mr-2" />
                )}
                {(() => {
                  const currentUser = editingRolFijo ? rolesFijos[editingRolFijo as keyof typeof rolesFijos] : null
                  const isRemoving = selectedRolFijoUserId === '__none__' || !selectedRolFijoUserId
                  if (isRemoving && currentUser) return 'Remover'
                  if (currentUser) return 'Cambiar'
                  return 'Asignar'
                })()}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Tabla de personal - El foco principal */}
      <PersonalTable
        personal={personalDinamico}
        onRemove={handleRemovePersonal}
      />
    </div>
  )
}

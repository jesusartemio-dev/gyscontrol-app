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
  Shield,
  Mail,
  User,
  Key,
  ChevronRight,
  Home,
  Search,
  Filter,
  MoreHorizontal,
  X,
  LayoutGrid,
  List
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { Alert, AlertDescription } from '@/components/ui/alert'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
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
import type { RolUsuario, User as UsuarioModel } from '@/types/modelos'
import { buildApiUrl } from '@/lib/utils'

// Lista centralizada de roles
const roles: RolUsuario[] = [
  'admin',
  'comercial',
  'presupuestos',
  'proyectos',
  'coordinador',
  'logistico',
  'gestor',
  'gerente',
  'seguridad',
  'colaborador',
]

// Zod Schema
export const schema = z.object({
  id: z.string().optional(),
  email: z.string().email({ message: 'Correo inválido' }),
  name: z.string().min(2, { message: 'Nombre debe tener al menos 2 caracteres' }),
  password: z.string().min(4, { message: 'La contraseña debe tener al menos 4 caracteres' }).optional(),
  role: z.enum(roles as [RolUsuario, ...RolUsuario[]], { required_error: 'Elige un rol' }),
}).refine(data => {
  if (!data.id && !data.password) return false
  if (data.id && data.password && data.password.length < 4) return false
  return true
}, {
  path: ['password'],
  message: 'La contraseña es obligatoria (mín. 4 caracteres)',
})

// Role display mapping con descripciones
const roleDisplayMap: Record<RolUsuario, { label: string; color: string; bgColor: string; description: string }> = {
  admin: {
    label: 'Administrador',
    color: 'text-red-700',
    bgColor: 'bg-red-50 border-red-200',
    description: 'Acceso total al sistema'
  },
  comercial: {
    label: 'Comercial',
    color: 'text-blue-700',
    bgColor: 'bg-blue-50 border-blue-200',
    description: 'Gestión de cotizaciones y clientes'
  },
  presupuestos: {
    label: 'Presupuestos',
    color: 'text-green-700',
    bgColor: 'bg-green-50 border-green-200',
    description: 'Creación y revisión de presupuestos'
  },
  proyectos: {
    label: 'Proyectos',
    color: 'text-purple-700',
    bgColor: 'bg-purple-50 border-purple-200',
    description: 'Gestión de proyectos'
  },
  coordinador: {
    label: 'Coordinador',
    color: 'text-orange-700',
    bgColor: 'bg-orange-50 border-orange-200',
    description: 'Coordinación de equipos'
  },
  logistico: {
    label: 'Logístico',
    color: 'text-yellow-700',
    bgColor: 'bg-yellow-50 border-yellow-200',
    description: 'Gestión de inventario y entregas'
  },
  gestor: {
    label: 'Gestor',
    color: 'text-indigo-700',
    bgColor: 'bg-indigo-50 border-indigo-200',
    description: 'Gestión operativa'
  },
  gerente: {
    label: 'Gerente',
    color: 'text-pink-700',
    bgColor: 'bg-pink-50 border-pink-200',
    description: 'Supervisión y reportes'
  },
  seguridad: {
    label: 'Seguridad',
    color: 'text-teal-700',
    bgColor: 'bg-teal-50 border-teal-200',
    description: 'Control de seguridad y accesos'
  },
  colaborador: {
    label: 'Colaborador',
    color: 'text-gray-700',
    bgColor: 'bg-gray-50 border-gray-200',
    description: 'Acceso básico de consulta'
  },
}

// Helper para obtener iniciales
function getInitials(name: string): string {
  return name
    .split(' ')
    .map(word => word[0])
    .join('')
    .toUpperCase()
    .slice(0, 2)
}

// Helper para color de avatar basado en rol
function getAvatarColor(role: RolUsuario): string {
  const colors: Record<RolUsuario, string> = {
    admin: 'bg-red-500',
    comercial: 'bg-blue-500',
    presupuestos: 'bg-green-500',
    proyectos: 'bg-purple-500',
    coordinador: 'bg-orange-500',
    logistico: 'bg-yellow-500',
    gestor: 'bg-indigo-500',
    gerente: 'bg-pink-500',
    seguridad: 'bg-teal-500',
    colaborador: 'bg-gray-500',
  }
  return colors[role] || 'bg-gray-500'
}

type ViewMode = 'table' | 'cards'

// Componente Modal de Usuario
interface UserFormModalProps {
  isOpen: boolean
  onClose: () => void
  user: UsuarioModel | null
  onSuccess: (user: UsuarioModel, isNew: boolean) => void
}

function UserFormModal({ isOpen, onClose, user, onSuccess }: UserFormModalProps) {
  const [form, setForm] = useState({
    id: '',
    email: '',
    name: '',
    password: '',
    role: 'comercial' as RolUsuario,
  })
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [formErrors, setFormErrors] = useState<Record<string, string>>({})

  // Reset form when modal opens/closes or user changes
  useEffect(() => {
    if (isOpen) {
      if (user) {
        setForm({
          id: user.id,
          email: user.email || '',
          name: user.name || '',
          password: '',
          role: user.role || 'comercial',
        })
      } else {
        setForm({ id: '', email: '', name: '', password: '', role: 'comercial' })
      }
      setError('')
      setFormErrors({})
    }
  }, [isOpen, user])

  const handleChange = (name: string, value: string) => {
    setForm({ ...form, [name]: value })
    if (formErrors[name]) {
      setFormErrors({ ...formErrors, [name]: '' })
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    const dataToSend: Record<string, unknown> = { ...form }
    if (form.id && !form.password) delete dataToSend.password

    const valid = schema.safeParse(dataToSend)
    if (!valid.success) {
      const errors: Record<string, string> = {}
      valid.error.issues.forEach(issue => {
        if (issue.path[0]) {
          errors[issue.path[0] as string] = issue.message
        }
      })
      setFormErrors(errors)
      setError(valid.error.issues[0].message)
      return
    }

    setError('')
    setFormErrors({})
    setLoading(true)

    try {
      const method = form.id ? 'PUT' : 'POST'
      const res = await fetch(buildApiUrl('/api/admin/usuarios'), {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(dataToSend),
      })

      if (!res.ok) {
        const err = await res.json()
        setError(err.message || 'Error al guardar')
        toast.error(err.message || 'Error al guardar')
        return
      }

      const data = await res.json()
      toast.success(method === 'POST' ? 'Usuario creado exitosamente' : 'Usuario actualizado exitosamente')
      onSuccess(data, method === 'POST')
      onClose()
    } catch {
      setError('Error de conexión')
      toast.error('Error de conexión')
    } finally {
      setLoading(false)
    }
  }

  const isEditing = !!form.id

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {isEditing ? (
              <>
                <Edit className="h-5 w-5 text-blue-600" />
                Editar Usuario
              </>
            ) : (
              <>
                <UserPlus className="h-5 w-5 text-green-600" />
                Nuevo Usuario
              </>
            )}
          </DialogTitle>
          <DialogDescription>
            {isEditing
              ? 'Modifica los datos del usuario seleccionado'
              : 'Completa los datos para crear un nuevo usuario en el sistema'}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 py-4">
          {/* Email Field */}
          <div className="space-y-2">
            <Label htmlFor="email" className="flex items-center gap-2 text-sm font-medium">
              <Mail className="h-4 w-4 text-muted-foreground" />
              Correo Electrónico
            </Label>
            <Input
              id="email"
              type="email"
              placeholder="usuario@empresa.com"
              value={form.email}
              onChange={(e) => handleChange('email', e.target.value)}
              className={formErrors.email ? 'border-red-500 focus-visible:ring-red-500' : ''}
              autoComplete="email"
            />
            {formErrors.email && (
              <p className="text-xs text-red-500">{formErrors.email}</p>
            )}
          </div>

          {/* Name Field */}
          <div className="space-y-2">
            <Label htmlFor="name" className="flex items-center gap-2 text-sm font-medium">
              <User className="h-4 w-4 text-muted-foreground" />
              Nombre Completo
            </Label>
            <Input
              id="name"
              placeholder="Juan Pérez García"
              value={form.name}
              onChange={(e) => handleChange('name', e.target.value)}
              className={formErrors.name ? 'border-red-500 focus-visible:ring-red-500' : ''}
              autoComplete="name"
            />
            {formErrors.name && (
              <p className="text-xs text-red-500">{formErrors.name}</p>
            )}
          </div>

          {/* Password Field */}
          <div className="space-y-2">
            <Label htmlFor="password" className="flex items-center gap-2 text-sm font-medium">
              <Key className="h-4 w-4 text-muted-foreground" />
              Contraseña
              {isEditing && <span className="text-xs text-muted-foreground font-normal">(opcional)</span>}
            </Label>
            <Input
              id="password"
              type="password"
              placeholder={isEditing ? '••••••••' : 'Mínimo 4 caracteres'}
              value={form.password}
              onChange={(e) => handleChange('password', e.target.value)}
              className={formErrors.password ? 'border-red-500 focus-visible:ring-red-500' : ''}
              autoComplete="new-password"
            />
            {formErrors.password && (
              <p className="text-xs text-red-500">{formErrors.password}</p>
            )}
            {isEditing && (
              <p className="text-xs text-muted-foreground">
                Deja vacío para mantener la contraseña actual
              </p>
            )}
          </div>

          {/* Role Field */}
          <div className="space-y-2">
            <Label htmlFor="role" className="flex items-center gap-2 text-sm font-medium">
              <Shield className="h-4 w-4 text-muted-foreground" />
              Rol del Usuario
            </Label>
            <Select value={form.role} onValueChange={(value) => handleChange('role', value)}>
              <SelectTrigger className={formErrors.role ? 'border-red-500' : ''}>
                <SelectValue placeholder="Selecciona un rol" />
              </SelectTrigger>
              <SelectContent>
                {roles.map((role) => (
                  <SelectItem key={role} value={role}>
                    <div className="flex items-center gap-2">
                      <div className={`w-2 h-2 rounded-full ${getAvatarColor(role)}`} />
                      <span>{roleDisplayMap[role]?.label || role}</span>
                      <span className="text-xs text-muted-foreground ml-1">
                        - {roleDisplayMap[role]?.description}
                      </span>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {formErrors.role && (
              <p className="text-xs text-red-500">{formErrors.role}</p>
            )}
          </div>

          {/* Error Alert */}
          {error && (
            <Alert variant="destructive" className="py-2">
              <AlertDescription className="text-sm">{error}</AlertDescription>
            </Alert>
          )}
        </form>

        <DialogFooter className="gap-2 sm:gap-0">
          <Button type="button" variant="outline" onClick={onClose} disabled={loading}>
            Cancelar
          </Button>
          <Button onClick={handleSubmit} disabled={loading}>
            {loading ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Guardando...
              </>
            ) : (
              <>
                <Save className="w-4 h-4 mr-2" />
                {isEditing ? 'Actualizar' : 'Crear Usuario'}
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

// Componente principal
export default function UsuariosClient() {
  const [usuarios, setUsuarios] = useState<UsuarioModel[]>([])
  const [loadingUsers, setLoadingUsers] = useState(true)

  // View mode - table by default
  const [viewMode, setViewMode] = useState<ViewMode>('table')

  // Modal state
  const [modalOpen, setModalOpen] = useState(false)
  const [editingUser, setEditingUser] = useState<UsuarioModel | null>(null)

  // Delete state
  const [userToDelete, setUserToDelete] = useState<UsuarioModel | null>(null)

  // Filters
  const [searchQuery, setSearchQuery] = useState('')
  const [roleFilter, setRoleFilter] = useState<RolUsuario | 'all'>('all')

  useEffect(() => {
    const fetchUsuarios = async () => {
      try {
        setLoadingUsers(true)
        const res = await fetch(buildApiUrl('/api/admin/usuarios'))
        const data = await res.json()
        setUsuarios(data)
      } catch {
        toast.error('Error al cargar usuarios')
      } finally {
        setLoadingUsers(false)
      }
    }
    fetchUsuarios()
  }, [])

  // Filtered users
  const filteredUsuarios = useMemo(() => {
    return usuarios.filter(user => {
      const matchesSearch = searchQuery === '' ||
        user.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        user.email?.toLowerCase().includes(searchQuery.toLowerCase())

      const matchesRole = roleFilter === 'all' || user.role === roleFilter

      return matchesSearch && matchesRole
    })
  }, [usuarios, searchQuery, roleFilter])

  // Stats
  const stats = useMemo(() => ({
    total: usuarios.length,
    admins: usuarios.filter(u => u.role === 'admin').length,
    byRole: roles.reduce((acc, role) => {
      acc[role] = usuarios.filter(u => u.role === role).length
      return acc
    }, {} as Record<RolUsuario, number>)
  }), [usuarios])

  const handleOpenCreate = () => {
    setEditingUser(null)
    setModalOpen(true)
  }

  const handleOpenEdit = (user: UsuarioModel) => {
    setEditingUser(user)
    setModalOpen(true)
  }

  const handleModalClose = () => {
    setModalOpen(false)
    setEditingUser(null)
  }

  const handleUserSaved = (user: UsuarioModel, isNew: boolean) => {
    if (isNew) {
      setUsuarios([...usuarios, user])
    } else {
      setUsuarios(usuarios.map(u => u.id === user.id ? user : u))
    }
  }

  const handleDelete = async () => {
    if (!userToDelete) return

    try {
      const res = await fetch(buildApiUrl('/api/admin/usuarios'), {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: userToDelete.id }),
      })

      if (res.ok) {
        setUsuarios(usuarios.filter(u => u.id !== userToDelete.id))
        toast.success('Usuario eliminado exitosamente')
      } else {
        const err = await res.json()
        toast.error(err.message || 'Error al eliminar usuario')
      }
    } catch {
      toast.error('Error de conexión al eliminar usuario')
    } finally {
      setUserToDelete(null)
    }
  }

  const clearFilters = () => {
    setSearchQuery('')
    setRoleFilter('all')
  }

  const hasActiveFilters = searchQuery !== '' || roleFilter !== 'all'

  // Render Table View
  const renderTableView = () => (
    <div className="border rounded-lg overflow-hidden">
      <Table>
        <TableHeader>
          <TableRow className="bg-muted/50">
            <TableHead className="w-[300px]">Usuario</TableHead>
            <TableHead>Email</TableHead>
            <TableHead className="w-[150px]">Rol</TableHead>
            <TableHead className="w-[100px] text-right">Acciones</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {filteredUsuarios.map((usuario) => (
            <TableRow key={usuario.id} className="group">
              <TableCell>
                <div className="flex items-center gap-3">
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center text-white font-medium text-xs ${getAvatarColor(usuario.role)}`}>
                    {getInitials(usuario.name || usuario.email || '?')}
                  </div>
                  <span className="font-medium">{usuario.name || 'Sin nombre'}</span>
                </div>
              </TableCell>
              <TableCell className="text-muted-foreground">
                {usuario.email}
              </TableCell>
              <TableCell>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Badge
                      variant="outline"
                      className={`${roleDisplayMap[usuario.role]?.bgColor} ${roleDisplayMap[usuario.role]?.color} border cursor-help`}
                    >
                      {roleDisplayMap[usuario.role]?.label || usuario.role}
                    </Badge>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>{roleDisplayMap[usuario.role]?.description}</p>
                  </TooltipContent>
                </Tooltip>
              </TableCell>
              <TableCell className="text-right">
                <div className="flex justify-end gap-1">
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleOpenEdit(usuario)}
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
                        onClick={() => setUserToDelete(usuario)}
                        className="h-8 w-8 p-0 text-red-500 hover:text-red-700 hover:bg-red-50"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>Eliminar</TooltipContent>
                  </Tooltip>
                </div>
                {/* Mobile dropdown - always visible on mobile */}
                <DropdownMenu>
                  <DropdownMenuTrigger asChild className="sm:hidden">
                    <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                      <MoreHorizontal className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem onClick={() => handleOpenEdit(usuario)}>
                      <Edit className="h-4 w-4 mr-2" />
                      Editar
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem
                      onClick={() => setUserToDelete(usuario)}
                      className="text-red-600"
                    >
                      <Trash2 className="h-4 w-4 mr-2" />
                      Eliminar
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  )

  // Render Cards View
  const renderCardsView = () => (
    <div className="space-y-2">
      <AnimatePresence mode="popLayout">
        {filteredUsuarios.map((usuario) => (
          <motion.div
            key={usuario.id}
            layout
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="flex items-center justify-between p-4 rounded-lg border bg-white hover:border-blue-200 hover:shadow-sm transition-all group"
          >
            <div className="flex items-center gap-4">
              {/* Avatar */}
              <div className={`w-10 h-10 rounded-full flex items-center justify-center text-white font-medium text-sm ${getAvatarColor(usuario.role)}`}>
                {getInitials(usuario.name || usuario.email || '?')}
              </div>

              {/* User Info */}
              <div className="min-w-0">
                <div className="font-medium text-gray-900 truncate">
                  {usuario.name || 'Sin nombre'}
                </div>
                <div className="text-sm text-muted-foreground truncate">
                  {usuario.email}
                </div>
              </div>
            </div>

            <div className="flex items-center gap-3">
              {/* Role Badge with Tooltip */}
              <Tooltip>
                <TooltipTrigger asChild>
                  <Badge
                    variant="outline"
                    className={`${roleDisplayMap[usuario.role]?.bgColor} ${roleDisplayMap[usuario.role]?.color} border cursor-help`}
                  >
                    {roleDisplayMap[usuario.role]?.label || usuario.role}
                  </Badge>
                </TooltipTrigger>
                <TooltipContent>
                  <p>{roleDisplayMap[usuario.role]?.description}</p>
                </TooltipContent>
              </Tooltip>

              {/* Actions */}
              <div className="flex gap-1">
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleOpenEdit(usuario)}
                      className="h-8 w-8 p-0"
                    >
                      <Edit className="h-4 w-4" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>Editar usuario</TooltipContent>
                </Tooltip>

                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setUserToDelete(usuario)}
                      className="h-8 w-8 p-0 text-red-500 hover:text-red-700 hover:bg-red-50"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>Eliminar usuario</TooltipContent>
                </Tooltip>
              </div>

              {/* Mobile menu */}
              <DropdownMenu>
                <DropdownMenuTrigger asChild className="sm:hidden">
                  <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                    <MoreHorizontal className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem onClick={() => handleOpenEdit(usuario)}>
                    <Edit className="h-4 w-4 mr-2" />
                    Editar
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem
                    onClick={() => setUserToDelete(usuario)}
                    className="text-red-600"
                  >
                    <Trash2 className="h-4 w-4 mr-2" />
                    Eliminar
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  )

  return (
    <TooltipProvider>
      <div className="min-h-screen bg-gray-50/50 p-4 md:p-6 lg:p-8">
        <div className="max-w-6xl mx-auto space-y-6">
          {/* Breadcrumb Navigation */}
          <nav className="flex items-center space-x-2 text-sm text-muted-foreground">
            <Button variant="ghost" size="sm" className="p-0 h-auto hover:text-foreground">
              <Home className="h-4 w-4 mr-1" />
              Inicio
            </Button>
            <ChevronRight className="h-4 w-4" />
            <span className="text-muted-foreground">Administración</span>
            <ChevronRight className="h-4 w-4" />
            <span className="font-medium text-foreground">Usuarios</span>
          </nav>

          {/* Header Section */}
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="p-2.5 bg-blue-100 rounded-xl">
                <Users className="h-6 w-6 text-blue-600" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-gray-900">Gestión de Usuarios</h1>
                <p className="text-sm text-muted-foreground">
                  Administra los usuarios y sus roles en el sistema
                </p>
              </div>
            </div>

            {/* Quick Stats */}
            <div className="flex gap-6">
              <div className="text-center">
                <div className="text-2xl font-bold text-blue-600">{stats.total}</div>
                <div className="text-xs text-muted-foreground">Total</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-red-600">{stats.admins}</div>
                <div className="text-xs text-muted-foreground">Admins</div>
              </div>
            </div>
          </div>

          {/* Main Content Card */}
          <Card className="shadow-sm">
            {/* Toolbar */}
            <CardHeader className="pb-4">
              <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
                {/* Search and Filters */}
                <div className="flex flex-1 gap-2 w-full sm:w-auto flex-wrap">
                  <div className="relative flex-1 sm:max-w-xs min-w-[200px]">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder="Buscar por nombre o email..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="pl-9 h-9"
                    />
                    {searchQuery && (
                      <Button
                        variant="ghost"
                        size="sm"
                        className="absolute right-1 top-1/2 -translate-y-1/2 h-7 w-7 p-0"
                        onClick={() => setSearchQuery('')}
                      >
                        <X className="h-3 w-3" />
                      </Button>
                    )}
                  </div>

                  <Select value={roleFilter} onValueChange={(v) => setRoleFilter(v as RolUsuario | 'all')}>
                    <SelectTrigger className="w-[160px] h-9">
                      <Filter className="h-4 w-4 mr-2 text-muted-foreground" />
                      <SelectValue placeholder="Filtrar rol" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Todos los roles</SelectItem>
                      {roles.map((role) => (
                        <SelectItem key={role} value={role}>
                          <div className="flex items-center gap-2">
                            <div className={`w-2 h-2 rounded-full ${getAvatarColor(role)}`} />
                            {roleDisplayMap[role]?.label}
                            <span className="text-xs text-muted-foreground">({stats.byRole[role]})</span>
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>

                  {hasActiveFilters && (
                    <Button variant="ghost" size="sm" onClick={clearFilters} className="h-9">
                      <X className="h-4 w-4 mr-1" />
                      Limpiar
                    </Button>
                  )}
                </div>

                {/* View Toggle + Add Button */}
                <div className="flex items-center gap-2">
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

                  {/* Add Button */}
                  <Button onClick={handleOpenCreate} className="h-9">
                    <UserPlus className="h-4 w-4 mr-2" />
                    Nuevo Usuario
                  </Button>
                </div>
              </div>
            </CardHeader>

            <CardContent>
              {loadingUsers ? (
                // Loading skeleton
                <div className="space-y-3">
                  {[...Array(5)].map((_, i) => (
                    <div key={i} className="animate-pulse flex items-center gap-4 p-4 rounded-lg border">
                      <div className="rounded-full bg-gray-200 h-10 w-10" />
                      <div className="flex-1 space-y-2">
                        <div className="h-4 bg-gray-200 rounded w-1/3" />
                        <div className="h-3 bg-gray-200 rounded w-1/4" />
                      </div>
                      <div className="h-6 bg-gray-200 rounded w-20" />
                    </div>
                  ))}
                </div>
              ) : filteredUsuarios.length === 0 ? (
                // Empty state
                <div className="text-center py-16">
                  <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-gray-100 mb-4">
                    <Users className="h-8 w-8 text-gray-400" />
                  </div>
                  {hasActiveFilters ? (
                    <>
                      <h3 className="text-lg font-medium text-gray-900 mb-2">
                        No se encontraron usuarios
                      </h3>
                      <p className="text-muted-foreground mb-4">
                        Intenta con otros criterios de búsqueda
                      </p>
                      <Button variant="outline" onClick={clearFilters}>
                        Limpiar filtros
                      </Button>
                    </>
                  ) : (
                    <>
                      <h3 className="text-lg font-medium text-gray-900 mb-2">
                        No hay usuarios registrados
                      </h3>
                      <p className="text-muted-foreground mb-4">
                        Crea el primer usuario para comenzar
                      </p>
                      <Button onClick={handleOpenCreate}>
                        <UserPlus className="h-4 w-4 mr-2" />
                        Crear primer usuario
                      </Button>
                    </>
                  )}
                </div>
              ) : (
                // Render view based on mode
                viewMode === 'table' ? renderTableView() : renderCardsView()
              )}

              {/* Results count */}
              {!loadingUsers && filteredUsuarios.length > 0 && (
                <div className="mt-4 pt-4 border-t text-sm text-muted-foreground text-center">
                  Mostrando {filteredUsuarios.length} de {usuarios.length} usuarios
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* User Form Modal */}
        <UserFormModal
          isOpen={modalOpen}
          onClose={handleModalClose}
          user={editingUser}
          onSuccess={handleUserSaved}
        />

        {/* Delete Confirmation Dialog */}
        <DeleteAlertDialog
          open={!!userToDelete}
          onOpenChange={(open) => !open && setUserToDelete(null)}
          onConfirm={handleDelete}
          title="¿Eliminar usuario?"
          description={userToDelete ? `¿Estás seguro de eliminar a "${userToDelete.name}"? Esta acción no se puede deshacer.` : ''}
        />
      </div>
    </TooltipProvider>
  )
}

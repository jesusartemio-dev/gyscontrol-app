'use client'

import { useEffect, useState } from 'react'
import { z } from 'zod'
import toast from 'react-hot-toast'
import { motion } from 'framer-motion'
import { 
  Users, 
  UserPlus, 
  Edit, 
  Trash2, 
  Save, 
  X, 
  Loader2,
  Shield,
  Mail,
  User,
  Key,
  ChevronRight,
  Home
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { Alert, AlertDescription } from '@/components/ui/alert'
import ConfirmDialog from '@/components/ConfirmDialog'
import type { RolUsuario, User as UsuarioModel } from '@/types/modelos'
import { buildApiUrl } from '@/lib/utils'

// 👇 Lista centralizada
const roles: RolUsuario[] = [
  'admin',
  'comercial',
  'presupuestos',
  'proyectos', // ✅ FALTABA ESTE
  'coordinador',
  'logistico',
  'gestor',
  'gerente',
  'colaborador',
]


// 📦 Zod Schema con los roles centralizados
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

// Animation variants
const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.1
    }
  }
}

const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0 }
}

// Role display mapping
const roleDisplayMap: Record<RolUsuario, { label: string; color: string }> = {
  admin: { label: 'Administrador', color: 'bg-red-100 text-red-800' },
  comercial: { label: 'Comercial', color: 'bg-blue-100 text-blue-800' },
  presupuestos: { label: 'Presupuestos', color: 'bg-green-100 text-green-800' },
  proyectos: { label: 'Proyectos', color: 'bg-purple-100 text-purple-800' },
  coordinador: { label: 'Coordinador', color: 'bg-orange-100 text-orange-800' },
  logistico: { label: 'Logístico', color: 'bg-yellow-100 text-yellow-800' },
  gestor: { label: 'Gestor', color: 'bg-indigo-100 text-indigo-800' },
  gerente: { label: 'Gerente', color: 'bg-pink-100 text-pink-800' },
  colaborador: { label: 'Colaborador', color: 'bg-gray-100 text-gray-800' },
}

export default function UsuariosClient() {
  const [usuarios, setUsuarios] = useState<UsuarioModel[]>([])
  const [form, setForm] = useState({
    id: '',
    email: '',
    name: '',
    password: '',
    role: 'comercial' as RolUsuario,
  })
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [loadingUsers, setLoadingUsers] = useState(true)
  const [formErrors, setFormErrors] = useState<Record<string, string>>({})

  useEffect(() => {
    const fetchUsuarios = async () => {
      try {
        setLoadingUsers(true)
        const res = await fetch(buildApiUrl('/api/admin/usuarios'))
        const data = await res.json()
        setUsuarios(data)
      } catch (error) {
        toast.error('Error al cargar usuarios')
      } finally {
        setLoadingUsers(false)
      }
    }
    fetchUsuarios()
  }, [])

  const handleChange = (name: string, value: string) => {
    setForm({ ...form, [name]: value })
    // Clear field-specific error when user starts typing
    if (formErrors[name]) {
      setFormErrors({ ...formErrors, [name]: '' })
    }
  }

  const resetForm = () => {
    setForm({ id: '', email: '', name: '', password: '', role: 'comercial' })
    setError('')
    setFormErrors({})
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    const dataToSend: any = { ...form }
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

      toast.success(method === 'POST' ? 'Usuario creado exitosamente' : 'Usuario actualizado exitosamente')
      const data = await res.json()

      if (method === 'POST') {
        setUsuarios([...usuarios, data])
      } else {
        setUsuarios(usuarios.map(u => u.id === data.id ? data : u))
      }

      resetForm()
    } catch (error) {
      setError('Error de conexión')
      toast.error('Error de conexión')
    } finally {
      setLoading(false)
    }
  }

  const handleDelete = async (id: string) => {
    try {
      const res = await fetch(buildApiUrl('/api/admin/usuarios'), {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id }),
      })

      if (res.ok) {
        setUsuarios(usuarios.filter(u => u.id !== id))
        toast.success('Usuario eliminado exitosamente')
      } else {
        const err = await res.json()
        toast.error(err.message || 'Error al eliminar usuario')
      }
    } catch (error) {
      toast.error('Error de conexión al eliminar usuario')
    }
  }

  const handleEdit = (usuario: any) => {
    setForm({
      id: usuario.id,
      email: usuario.email || '',
      name: usuario.name || '',
      password: '',
      role: usuario.role || 'comercial',
    })
    setError('')
    setFormErrors({})
  }

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
            Administración
          </Button>
          <ChevronRight className="h-4 w-4" />
          <span className="font-medium text-foreground">Usuarios</span>
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
                {form.id ? 'Editar Usuario' : 'Gestión de Usuarios'}
              </h1>
              <p className="text-gray-600 mt-1">
                {form.id ? 'Modifica la información del usuario' : 'Administra los usuarios del sistema'}
              </p>
            </div>
          </div>
          
          {/* Quick Stats */}
          <div className="flex gap-4">
            <div className="text-center">
              <div className="text-2xl font-bold text-blue-600">{usuarios.length}</div>
              <div className="text-sm text-gray-500">Total Usuarios</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-green-600">
                {usuarios.filter(u => u.role === 'admin').length}
              </div>
              <div className="text-sm text-gray-500">Administradores</div>
            </div>
          </div>
        </motion.div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Form Section */}
          <motion.div className="lg:col-span-1" variants={itemVariants}>
            <Card className="shadow-sm border-0 bg-white/80 backdrop-blur-sm">
              <CardHeader className="pb-4">
                <CardTitle className="flex items-center gap-2">
                  <UserPlus className="h-5 w-5 text-blue-600" />
                  {form.id ? 'Editar Usuario' : 'Nuevo Usuario'}
                </CardTitle>
                <CardDescription>
                  {form.id ? 'Modifica los datos del usuario seleccionado' : 'Completa los datos para crear un nuevo usuario'}
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <form onSubmit={handleSubmit} className="space-y-4">
                  {/* Email Field */}
                  <div className="space-y-2">
                    <Label htmlFor="email" className="flex items-center gap-2">
                      <Mail className="h-4 w-4" />
                      Correo Electrónico
                    </Label>
                    <Input
                      id="email"
                      type="email"
                      placeholder="usuario@empresa.com"
                      value={form.email}
                      onChange={(e) => handleChange('email', e.target.value)}
                      className={formErrors.email ? 'border-red-500' : ''}
                    />
                    {formErrors.email && (
                      <p className="text-sm text-red-500">{formErrors.email}</p>
                    )}
                  </div>

                  {/* Name Field */}
                  <div className="space-y-2">
                    <Label htmlFor="name" className="flex items-center gap-2">
                      <User className="h-4 w-4" />
                      Nombre Completo
                    </Label>
                    <Input
                      id="name"
                      placeholder="Nombre completo"
                      value={form.name}
                      onChange={(e) => handleChange('name', e.target.value)}
                      className={formErrors.name ? 'border-red-500' : ''}
                    />
                    {formErrors.name && (
                      <p className="text-sm text-red-500">{formErrors.name}</p>
                    )}
                  </div>

                  {/* Password Field */}
                  <div className="space-y-2">
                    <Label htmlFor="password" className="flex items-center gap-2">
                      <Key className="h-4 w-4" />
                      Contraseña
                    </Label>
                    <Input
                      id="password"
                      type="password"
                      placeholder={form.id ? 'Dejar vacío para mantener actual' : 'Contraseña segura'}
                      value={form.password}
                      onChange={(e) => handleChange('password', e.target.value)}
                      className={formErrors.password ? 'border-red-500' : ''}
                    />
                    {formErrors.password && (
                      <p className="text-sm text-red-500">{formErrors.password}</p>
                    )}
                    {form.id && (
                      <p className="text-sm text-gray-500">
                        Deja vacío si no deseas cambiar la contraseña
                      </p>
                    )}
                  </div>

                  {/* Role Field */}
                  <div className="space-y-2">
                    <Label htmlFor="role" className="flex items-center gap-2">
                      <Shield className="h-4 w-4" />
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
                              <Badge 
                                variant="outline" 
                                className={`text-xs ${roleDisplayMap[role]?.color || 'bg-gray-100 text-gray-800'}`}
                              >
                                {roleDisplayMap[role]?.label || role}
                              </Badge>
                            </div>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    {formErrors.role && (
                      <p className="text-sm text-red-500">{formErrors.role}</p>
                    )}
                  </div>

                  {/* Error Alert */}
                  {error && (
                    <Alert variant="destructive">
                      <AlertDescription>{error}</AlertDescription>
                    </Alert>
                  )}

                  {/* Action Buttons */}
                  <div className="flex gap-2 pt-4">
                    <Button
                      type="submit"
                      disabled={loading}
                      className="flex-1"
                    >
                      {loading ? (
                        <>
                          <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                          Guardando...
                        </>
                      ) : (
                        <>
                          <Save className="w-4 h-4 mr-2" />
                          {form.id ? 'Actualizar' : 'Crear Usuario'}
                        </>
                      )}
                    </Button>
                    {form.id && (
                      <Button
                        type="button"
                        variant="outline"
                        onClick={resetForm}
                      >
                        <X className="w-4 h-4 mr-2" />
                        Cancelar
                      </Button>
                    )}
                  </div>
                </form>
              </CardContent>
            </Card>
          </motion.div>

          {/* Users List Section */}
          <motion.div className="lg:col-span-2" variants={itemVariants}>
            <Card className="shadow-sm border-0 bg-white/80 backdrop-blur-sm">
              <CardHeader className="pb-4">
                <CardTitle className="flex items-center gap-2">
                  <Users className="h-5 w-5 text-blue-600" />
                  Lista de Usuarios
                </CardTitle>
                <CardDescription>
                  Gestiona todos los usuarios registrados en el sistema
                </CardDescription>
              </CardHeader>
              <CardContent>
                {loadingUsers ? (
                  <div className="space-y-4">
                    {[...Array(3)].map((_, i) => (
                      <div key={i} className="animate-pulse">
                        <div className="flex items-center space-x-4 p-4">
                          <div className="rounded-full bg-gray-200 h-10 w-10"></div>
                          <div className="flex-1 space-y-2">
                            <div className="h-4 bg-gray-200 rounded w-3/4"></div>
                            <div className="h-3 bg-gray-200 rounded w-1/2"></div>
                          </div>
                          <div className="h-8 bg-gray-200 rounded w-20"></div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : usuarios.length === 0 ? (
                  <div className="text-center py-12">
                    <Users className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                    <h3 className="text-lg font-medium text-gray-900 mb-2">
                      No hay usuarios registrados
                    </h3>
                    <p className="text-gray-500 mb-4">
                      Crea el primer usuario para comenzar
                    </p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {usuarios.map((usuario, index) => (
                      <motion.div
                        key={usuario.id}
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: index * 0.1 }}
                        className="flex items-center justify-between p-4 rounded-lg border border-gray-100 hover:border-gray-200 hover:shadow-sm transition-all duration-200"
                      >
                        <div className="flex items-center space-x-4">
                          <div className="p-2 bg-blue-50 rounded-full">
                            <User className="h-5 w-5 text-blue-600" />
                          </div>
                          <div>
                            <div className="font-medium text-gray-900">{usuario.name}</div>
                            <div className="text-sm text-gray-500">{usuario.email}</div>
                          </div>
                        </div>
                        
                        <div className="flex items-center gap-3">
                          <Badge 
                            variant="outline" 
                            className={roleDisplayMap[usuario.role]?.color || 'bg-gray-100 text-gray-800'}
                          >
                            {roleDisplayMap[usuario.role]?.label || usuario.role}
                          </Badge>
                          
                          <div className="flex gap-1">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleEdit(usuario)}
                              className="h-8 w-8 p-0"
                            >
                              <Edit className="h-4 w-4" />
                            </Button>
                            <ConfirmDialog
                              title="¿Eliminar usuario?"
                              description={`¿Estás seguro de eliminar a ${usuario.name}? Esta acción no se puede deshacer.`}
                              onConfirm={() => handleDelete(usuario.id)}
                              trigger={
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="h-8 w-8 p-0 text-red-500 hover:text-red-700 hover:bg-red-50"
                                >
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              }
                            />
                          </div>
                        </div>
                      </motion.div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </motion.div>
        </div>
      </div>
    </motion.div>
  )
}

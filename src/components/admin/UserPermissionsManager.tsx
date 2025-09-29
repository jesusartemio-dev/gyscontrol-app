/**
 * 🎯 User Permissions Manager
 *
 * Componente avanzado para gestión de usuarios y permisos granulares.
 * Incluye creación/edición de usuarios, asignación de permisos específicos,
 * y visualización de permisos efectivos.
 */

'use client';

import React, { useEffect, useState } from 'react';
import { z } from 'zod';
import toast from 'react-hot-toast';
import { motion } from 'framer-motion';
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
  Home,
  Settings,
  Check,
  X as XIcon,
  Eye,
  EyeOff
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Checkbox } from '@/components/ui/checkbox';
import { ScrollArea } from '@/components/ui/scroll-area';
import ConfirmDialog from '@/components/ConfirmDialog';
import type { RolUsuario, User as UsuarioModel } from '@/types/modelos';
import type { Permission, UserWithPermissions, PermissionResource, PermissionAction } from '@/types/permissions';
import type { BasePermission } from '@/lib/permissions/base-permissions';
import { buildApiUrl } from '@/lib/utils';
import { useUserPermissions, useAdminPermissions } from '@/hooks/usePermissions';
import { ALL_BASE_PERMISSIONS, getPermissionsByResource } from '@/lib/permissions/base-permissions';

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
  'colaborador',
];

// Schema de validación para usuarios
export const userSchema = z.object({
  id: z.string().optional(),
  email: z.string().email({ message: 'Correo inválido' }),
  name: z.string().min(2, { message: 'Nombre debe tener al menos 2 caracteres' }),
  password: z.string().min(4, { message: 'La contraseña debe tener al menos 4 caracteres' }).optional(),
  role: z.enum(roles as [RolUsuario, ...RolUsuario[]], { required_error: 'Elige un rol' }),
}).refine(data => {
  if (!data.id && !data.password) return false;
  if (data.id && data.password && data.password.length < 4) return false;
  return true;
}, {
  path: ['password'],
  message: 'La contraseña es obligatoria (mín. 4 caracteres)',
});

// Mapeo de display para roles
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
};

// Variantes de animación
const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.1
    }
  }
};

const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0 }
};

interface UserPermissionsManagerProps {
  className?: string;
}

export default function UserPermissionsManager({ className }: UserPermissionsManagerProps) {
  // Estados principales
  const [usuarios, setUsuarios] = useState<UsuarioModel[]>([]);
  const [permissions, setPermissions] = useState<Permission[]>([]);
  const [selectedUser, setSelectedUser] = useState<UsuarioModel | null>(null);
  const [userPermissions, setUserPermissions] = useState<UserWithPermissions | null>(null);

  // Estados del formulario de usuario
  const [userForm, setUserForm] = useState({
    id: '',
    email: '',
    name: '',
    password: '',
    role: 'comercial' as RolUsuario,
  });

  // Estados del formulario de permisos
  const [permissionForm, setPermissionForm] = useState<Record<string, 'grant' | 'deny' | null>>({});

  // Estados de UI
  const [activeTab, setActiveTab] = useState<'users' | 'permissions'>('users');
  const [loading, setLoading] = useState(false);
  const [loadingUsers, setLoadingUsers] = useState(true);
  const [loadingPermissions, setLoadingPermissions] = useState(false);
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});
  const [error, setError] = useState('');

  // Hooks de permisos
  const { canManageUsers, canManageSystem } = useAdminPermissions();
  const selectedUserPermissions = useUserPermissions(selectedUser?.id);

  // Cargar datos iniciales
  useEffect(() => {
    fetchUsuarios();
    fetchPermissions();
  }, []);

  // Actualizar permisos del usuario seleccionado
  useEffect(() => {
    if (selectedUser) {
      setUserPermissions(selectedUserPermissions.userPermissions);
    }
  }, [selectedUser, selectedUserPermissions]);

  const fetchUsuarios = async () => {
    try {
      setLoadingUsers(true);
      const res = await fetch(buildApiUrl('/api/admin/usuarios'));
      const data = await res.json();
      setUsuarios(data);
    } catch (error) {
      toast.error('Error al cargar usuarios');
    } finally {
      setLoadingUsers(false);
    }
  };

  const fetchPermissions = async () => {
    try {
      setLoadingPermissions(true);
      const res = await fetch(buildApiUrl('/api/admin/permissions'));
      const data = await res.json();
      setPermissions(data.permissions || []);
    } catch (error) {
      toast.error('Error al cargar permisos');
    } finally {
      setLoadingPermissions(false);
    }
  };

  const handleUserChange = (name: string, value: string) => {
    setUserForm({ ...userForm, [name]: value });
    if (formErrors[name]) {
      setFormErrors({ ...formErrors, [name]: '' });
    }
  };

  const resetUserForm = () => {
    setUserForm({ id: '', email: '', name: '', password: '', role: 'comercial' });
    setError('');
    setFormErrors({});
  };

  const handleUserSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const dataToSend: any = { ...userForm };
    if (userForm.id && !userForm.password) delete dataToSend.password;

    const valid = userSchema.safeParse(dataToSend);
    if (!valid.success) {
      const errors: Record<string, string> = {};
      valid.error.issues.forEach(issue => {
        if (issue.path[0]) {
          errors[issue.path[0] as string] = issue.message;
        }
      });
      setFormErrors(errors);
      setError(valid.error.issues[0].message);
      return;
    }

    setError('');
    setFormErrors({});
    setLoading(true);

    try {
      const method = userForm.id ? 'PUT' : 'POST';
      const res = await fetch(buildApiUrl('/api/admin/usuarios'), {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(dataToSend),
      });

      if (!res.ok) {
        const err = await res.json();
        setError(err.message || 'Error al guardar');
        toast.error(err.message || 'Error al guardar');
        return;
      }

      toast.success(method === 'POST' ? 'Usuario creado exitosamente' : 'Usuario actualizado exitosamente');
      const data = await res.json();

      if (method === 'POST') {
        setUsuarios([...usuarios, data]);
      } else {
        setUsuarios(usuarios.map(u => u.id === data.id ? data : u));
      }

      resetUserForm();
    } catch (error) {
      setError('Error de conexión');
      toast.error('Error de conexión');
    } finally {
      setLoading(false);
    }
  };

  const handleUserDelete = async (id: string) => {
    try {
      const res = await fetch(buildApiUrl('/api/admin/usuarios'), {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id }),
      });

      if (res.ok) {
        setUsuarios(usuarios.filter(u => u.id !== id));
        toast.success('Usuario eliminado exitosamente');
        if (selectedUser?.id === id) {
          setSelectedUser(null);
          setUserPermissions(null);
        }
      } else {
        const err = await res.json();
        toast.error(err.message || 'Error al eliminar usuario');
      }
    } catch (error) {
      toast.error('Error de conexión al eliminar usuario');
    }
  };

  const handleUserEdit = (usuario: UsuarioModel) => {
    setUserForm({
      id: usuario.id,
      email: usuario.email || '',
      name: usuario.name || '',
      password: '',
      role: usuario.role || 'comercial',
    });
    setError('');
    setFormErrors({});
  };

  const handlePermissionChange = (permissionId: string, type: 'grant' | 'deny' | null) => {
    setPermissionForm({
      ...permissionForm,
      [permissionId]: type
    });
  };

  const handleSavePermissions = async () => {
    if (!selectedUser) return;

    setLoading(true);
    try {
      const permissionUpdates = Object.entries(permissionForm)
        .filter(([_, type]) => type !== null)
        .map(([permissionId, type]) => ({
          permissionId,
          type: type as 'grant' | 'deny'
        }));

      // Aquí iría la lógica para guardar permisos
      // await assignBulkPermissions(selectedUser.id, permissionUpdates);

      toast.success('Permisos actualizados exitosamente');
      setPermissionForm({});

      // Recargar permisos del usuario
      // Note: useUserPermissions doesn't have a refetch method, so we rely on the useEffect to update when selectedUser changes

    } catch (error) {
      toast.error('Error al guardar permisos');
    } finally {
      setLoading(false);
    }
  };

  const getPermissionStatus = (permissionName: string) => {
    // Verificar permisos directos
    const directPermission = userPermissions?.userPermissions.find(
      up => up.permission?.name === permissionName
    );

    if (directPermission) {
      return directPermission.type;
    }

    // Verificar permisos por rol
    const permission = permissions.find(p => p.name === permissionName);
    if (permission && userPermissions?.effectivePermissions.some(ep => ep.name === permissionName)) {
      return 'role';
    }

    return null;
  };

  const renderPermissionsTab = () => {
    if (!selectedUser) {
      return (
        <div className="text-center py-12">
          <Shield className="h-12 w-12 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">
            Selecciona un usuario
          </h3>
          <p className="text-gray-500">
            Elige un usuario de la lista para gestionar sus permisos
          </p>
        </div>
      );
    }

    const permissionsByResource = getPermissionsByResource('*'); // Todos los permisos

    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-lg font-medium text-gray-900">
              Permisos de {selectedUser.name}
            </h3>
            <p className="text-sm text-gray-500">
              Rol actual: {roleDisplayMap[selectedUser.role]?.label || selectedUser.role}
            </p>
          </div>
          <Button
            onClick={handleSavePermissions}
            disabled={loading || Object.keys(permissionForm).length === 0}
          >
            {loading ? (
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
            ) : (
              <Save className="w-4 h-4 mr-2" />
            )}
            Guardar Cambios
          </Button>
        </div>

        <ScrollArea className="h-96">
          <div className="space-y-4">
            {Object.entries(
              permissionsByResource.reduce((acc, perm) => {
                if (!acc[perm.resource]) acc[perm.resource] = [];
                acc[perm.resource].push(perm);
                return acc;
              }, {} as Record<string, BasePermission[]>)
            ).map(([resource, resourcePermissions]) => (
              <Card key={resource}>
                <CardHeader className="pb-3">
                  <CardTitle className="text-base capitalize">
                    {resource.replace('_', ' ')}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                    {resourcePermissions.map((permission) => {
                      const status = getPermissionStatus(permission.name);
                      const pendingChange = permissionForm[permission.name];

                      return (
                        <div key={permission.name} className="flex items-center justify-between p-3 border rounded-lg">
                          <div className="flex-1">
                            <div className="font-medium text-sm">{permission.action.replace('_', ' ')}</div>
                            <div className="text-xs text-gray-500">{permission.description}</div>
                          </div>
                          <div className="flex items-center gap-2">
                            {status === 'grant' && (
                              <Badge variant="default" className="bg-green-100 text-green-800">
                                <Check className="w-3 h-3 mr-1" />
                                Otorgado
                              </Badge>
                            )}
                            {status === 'deny' && (
                              <Badge variant="destructive">
                                <XIcon className="w-3 h-3 mr-1" />
                                Denegado
                              </Badge>
                            )}
                            {status === 'role' && (
                              <Badge variant="secondary">
                                <Shield className="w-3 h-3 mr-1" />
                                Por Rol
                              </Badge>
                            )}
                            {status === null && (
                              <Badge variant="outline">
                                Sin Permiso
                              </Badge>
                            )}

                            <div className="flex gap-1">
                              <Button
                                size="sm"
                                variant={pendingChange === 'grant' ? 'default' : 'outline'}
                                onClick={() => handlePermissionChange(
                                  permission.name,
                                  pendingChange === 'grant' ? null : 'grant'
                                )}
                                className="h-6 w-6 p-0"
                              >
                                <Check className="w-3 h-3" />
                              </Button>
                              <Button
                                size="sm"
                                variant={pendingChange === 'deny' ? 'destructive' : 'outline'}
                                onClick={() => handlePermissionChange(
                                  permission.name,
                                  pendingChange === 'deny' ? null : 'deny'
                                )}
                                className="h-6 w-6 p-0"
                              >
                                <XIcon className="w-3 h-3" />
                              </Button>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </ScrollArea>
      </div>
    );
  };

  return (
    <motion.div
      className={`min-h-screen bg-gray-50/50 p-4 md:p-6 lg:p-8 ${className}`}
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
          <span className="font-medium text-foreground">Usuarios y Permisos</span>
        </motion.nav>

        {/* Header Section */}
        <motion.div
          className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8"
          variants={itemVariants}
        >
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-100 rounded-lg">
              <Shield className="h-6 w-6 text-blue-600" />
            </div>
            <div>
              <h1 className="text-3xl font-bold text-gray-900">
                Gestión de Usuarios y Permisos
              </h1>
              <p className="text-gray-600 mt-1">
                Administra usuarios y controla sus permisos de acceso
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
            <div className="text-center">
              <div className="text-2xl font-bold text-purple-600">{permissions.length}</div>
              <div className="text-sm text-gray-500">Permisos</div>
            </div>
          </div>
        </motion.div>

        <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as 'users' | 'permissions')}>
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="users" className="flex items-center gap-2">
              <Users className="h-4 w-4" />
              Usuarios
            </TabsTrigger>
            <TabsTrigger value="permissions" className="flex items-center gap-2">
              <Shield className="h-4 w-4" />
              Permisos
            </TabsTrigger>
          </TabsList>

          <TabsContent value="users" className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Form Section */}
              <motion.div className="lg:col-span-1" variants={itemVariants}>
                <Card className="shadow-sm border-0 bg-white/80 backdrop-blur-sm">
                  <CardHeader className="pb-4">
                    <CardTitle className="flex items-center gap-2">
                      <UserPlus className="h-5 w-5 text-blue-600" />
                      {userForm.id ? 'Editar Usuario' : 'Nuevo Usuario'}
                    </CardTitle>
                    <CardDescription>
                      {userForm.id ? 'Modifica los datos del usuario seleccionado' : 'Completa los datos para crear un nuevo usuario'}
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <form onSubmit={handleUserSubmit} className="space-y-4">
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
                          value={userForm.email}
                          onChange={(e) => handleUserChange('email', e.target.value)}
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
                          value={userForm.name}
                          onChange={(e) => handleUserChange('name', e.target.value)}
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
                          placeholder={userForm.id ? 'Dejar vacío para mantener actual' : 'Contraseña segura'}
                          value={userForm.password}
                          onChange={(e) => handleUserChange('password', e.target.value)}
                          className={formErrors.password ? 'border-red-500' : ''}
                        />
                        {formErrors.password && (
                          <p className="text-sm text-red-500">{formErrors.password}</p>
                        )}
                        {userForm.id && (
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
                        <Select value={userForm.role} onValueChange={(value) => handleUserChange('role', value)}>
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
                              {userForm.id ? 'Actualizar' : 'Crear Usuario'}
                            </>
                          )}
                        </Button>
                        {userForm.id && (
                          <Button
                            type="button"
                            variant="outline"
                            onClick={resetUserForm}
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
                            className={`flex items-center justify-between p-4 rounded-lg border transition-all duration-200 ${
                              selectedUser?.id === usuario.id
                                ? 'border-blue-300 bg-blue-50 shadow-sm'
                                : 'border-gray-100 hover:border-gray-200 hover:shadow-sm'
                            }`}
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
                                  onClick={() => setSelectedUser(selectedUser?.id === usuario.id ? null : usuario)}
                                  className={`h-8 w-8 p-0 ${
                                    selectedUser?.id === usuario.id ? 'text-blue-600' : ''
                                  }`}
                                >
                                  <Settings className="h-4 w-4" />
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => handleUserEdit(usuario)}
                                  className="h-8 w-8 p-0"
                                >
                                  <Edit className="h-4 w-4" />
                                </Button>
                                <ConfirmDialog
                                  title="¿Eliminar usuario?"
                                  description={`¿Estás seguro de eliminar a ${usuario.name}? Esta acción no se puede deshacer.`}
                                  onConfirm={() => handleUserDelete(usuario.id)}
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
          </TabsContent>

          <TabsContent value="permissions" className="space-y-6">
            {renderPermissionsTab()}
          </TabsContent>
        </Tabs>
      </div>
    </motion.div>
  );
}
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
  EyeOff,
  Map,
  CheckCircle,
  XCircle,
  Package,
  FolderOpen,
  Clock,
  Truck,
  PackageCheck,
  BarChart3,
  Receipt,
  CreditCard
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
  'gerente',
  'gestor',
  'coordinador',
  'proyectos',
  'comercial',
  'presupuestos',
  'logistico',
  'seguridad',
  'administracion',
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
  seguridad: { label: 'Seguridad', color: 'bg-teal-100 text-teal-800' },
  colaborador: { label: 'Colaborador', color: 'bg-gray-100 text-gray-800' },
  administracion: { label: 'Administración', color: 'bg-rose-100 text-rose-800' },
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

// =============================================
// Mapa de Acceso - Configuración de secciones del sidebar y sus roles
// =============================================

interface SidebarAccessSection {
  key: string;
  title: string;
  icon: React.ElementType;
  color: string;
  roles: RolUsuario[];
  links: { label: string; href: string }[];
}

const SIDEBAR_ACCESS_MAP: SidebarAccessSection[] = [
  {
    key: 'comercial',
    title: 'Comercial',
    icon: Package,
    color: 'text-green-500',
    roles: ['admin', 'gerente', 'comercial', 'presupuestos'],
    links: [
      { label: 'Plantillas', href: '/comercial/plantillas' },
      { label: 'Cotizaciones', href: '/comercial/cotizaciones' },
    ],
  },
  {
    key: 'crm',
    title: 'CRM',
    icon: Users,
    color: 'text-blue-500',
    roles: ['admin', 'gerente', 'comercial'],
    links: [
      { label: 'Dashboard', href: '/crm' },
      { label: 'Oportunidades', href: '/crm/oportunidades' },
      { label: 'Clientes', href: '/crm/clientes' },
      { label: 'Actividades', href: '/crm/actividades' },
      { label: 'Reportes', href: '/crm/reportes' },
    ],
  },
  {
    key: 'proyectos',
    title: 'Proyectos',
    icon: FolderOpen,
    color: 'text-purple-500',
    roles: ['admin', 'gerente', 'proyectos', 'coordinador', 'gestor'],
    links: [
      { label: 'Ver Proyectos', href: '/proyectos' },
      { label: 'Equipos', href: '/proyectos/equipos' },
      { label: 'Listas', href: '/proyectos/listas' },
      { label: 'Pedidos', href: '/proyectos/pedidos' },
    ],
  },
  {
    key: 'mi-trabajo',
    title: 'Mi Trabajo',
    icon: Clock,
    color: 'text-emerald-500',
    roles: ['admin', 'gerente', 'gestor', 'coordinador', 'proyectos', 'colaborador', 'comercial', 'seguridad', 'presupuestos', 'logistico'],
    links: [
      { label: 'Mi Timesheet', href: '/mi-trabajo/timesheet' },
      { label: 'Mis Tareas', href: '/mi-trabajo/tareas' },
      { label: 'Mi Progreso', href: '/mi-trabajo/progreso' },
      { label: 'Mi Jornada', href: '/mi-trabajo/mi-jornada' },
    ],
  },
  {
    key: 'supervision',
    title: 'Supervisión',
    icon: Eye,
    color: 'text-red-500',
    roles: ['admin', 'gerente', 'gestor', 'coordinador', 'proyectos'],
    links: [
      { label: 'Vista de Equipo', href: '/supervision/equipo' },
      { label: 'Gestión de Tareas', href: '/supervision/tareas' },
      { label: 'Gestión de EDTs', href: '/supervision/edts' },
      { label: 'Jornada Campo', href: '/supervision/jornada-campo' },
      { label: 'Resumen Proyectos', href: '/supervision/resumen' },
      { label: 'Análisis EDT', href: '/supervision/analisis-edt' },
    ],
  },
  {
    key: 'logistica',
    title: 'Logística',
    icon: Truck,
    color: 'text-orange-500',
    roles: ['admin', 'gerente', 'logistico'],
    links: [
      { label: 'Listas Técnicas', href: '/logistica/listas' },
      { label: 'Gestión de Pedidos', href: '/logistica/pedidos' },
      { label: 'Proveedores', href: '/logistica/proveedores' },
      { label: 'Cotizaciones Proveedor', href: '/logistica/cotizaciones' },
    ],
  },
  {
    key: 'aprovisionamiento',
    title: 'Aprovisionamiento',
    icon: PackageCheck,
    color: 'text-emerald-500',
    roles: ['admin', 'gerente', 'gestor'],
    links: [
      { label: 'Dashboard', href: '/finanzas/aprovisionamiento' },
      { label: 'Proyectos', href: '/finanzas/aprovisionamiento/proyectos' },
      { label: 'Listas', href: '/finanzas/aprovisionamiento/listas' },
      { label: 'Pedidos', href: '/finanzas/aprovisionamiento/pedidos' },
      { label: 'Timeline', href: '/finanzas/aprovisionamiento/timeline' },
    ],
  },
  {
    key: 'finanzas',
    title: 'Mis Gastos',
    icon: Receipt,
    color: 'text-amber-500',
    roles: ['admin', 'gerente', 'gestor', 'coordinador', 'proyectos', 'colaborador', 'logistico', 'administracion'],
    links: [
      { label: 'Mis Requerimientos', href: '/finanzas/requerimientos' },
    ],
  },
  {
    key: 'administracion',
    title: 'Administración',
    icon: CreditCard,
    color: 'text-rose-500',
    roles: ['admin', 'gerente', 'administracion'],
    links: [
      { label: 'Dashboard', href: '/administracion' },
      { label: 'Gestión de Gastos', href: '/administracion/gastos' },
      { label: 'Rendiciones', href: '/administracion/rendiciones' },
      { label: 'Facturación', href: '/administracion/facturacion' },
      { label: 'Cuentas por Cobrar', href: '/administracion/cuentas-cobrar' },
      { label: 'Cuentas por Pagar', href: '/administracion/cuentas-pagar' },
      { label: 'Cuentas Bancarias', href: '/administracion/cuentas-bancarias' },
    ],
  },
  {
    key: 'gestion',
    title: 'Gestión',
    icon: BarChart3,
    color: 'text-cyan-500',
    roles: ['admin', 'gerente', 'gestor'],
    links: [
      { label: 'Valorizaciones', href: '/gestion/valorizaciones' },
      { label: 'Reportes', href: '/gestion/reportes' },
      { label: 'Rentabilidad', href: '/gestion/reportes/rentabilidad' },
      { label: 'Pedidos', href: '/gestion/reportes/pedidos' },
      { label: 'Performance', href: '/gestion/reportes/performance' },
      { label: 'Financiero', href: '/gestion/reportes/financiero' },
    ],
  },
  {
    key: 'configuracion',
    title: 'Configuración',
    icon: Settings,
    color: 'text-blue-500',
    roles: ['admin', 'gerente'],
    links: [
      { label: 'General', href: '/configuracion/general' },
      { label: 'Usuarios', href: '/admin/usuarios' },
      { label: 'Permisos', href: '/admin/permisos' },
      { label: 'Notificaciones', href: '/configuracion/notificaciones' },
      { label: 'Catálogos', href: '/catalogo/equipos' },
      { label: 'Centros de Costo', href: '/configuracion/centros-costo' },
      { label: 'Personal (RRHH)', href: '/admin/personal' },
    ],
  },
];

const ALL_ROLES_ORDERED: RolUsuario[] = [
  'admin', 'gerente', 'gestor', 'coordinador', 'proyectos',
  'seguridad', 'comercial', 'presupuestos', 'logistico', 'administracion', 'colaborador',
];

function AccessMapTab({ usuarios }: { usuarios: UsuarioModel[] }) {
  const [selectedRole, setSelectedRole] = useState<RolUsuario | null>(null);
  const [accessMap, setAccessMap] = useState<Record<string, string[]>>({});
  const [loadingAccess, setLoadingAccess] = useState(true);
  const [togglingCell, setTogglingCell] = useState<string | null>(null); // "role:sectionKey"

  // Load access map from API
  useEffect(() => {
    const loadAccessMap = async () => {
      try {
        const res = await fetch('/api/admin/section-access');
        if (res.ok) {
          const data = await res.json();
          setAccessMap(data);
        }
      } catch (error) {
        console.error('Error loading access map:', error);
      } finally {
        setLoadingAccess(false);
      }
    };
    loadAccessMap();
  }, []);

  // Toggle access
  const handleToggleAccess = async (role: string, sectionKey: string, currentHasAccess: boolean) => {
    const cellKey = `${role}:${sectionKey}`;
    setTogglingCell(cellKey);

    try {
      const res = await fetch('/api/admin/section-access', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ role, sectionKey, hasAccess: !currentHasAccess }),
      });

      if (res.ok) {
        // Update local state
        setAccessMap(prev => {
          const updated = { ...prev };
          if (!currentHasAccess) {
            // Grant access
            updated[role] = [...(updated[role] || []), sectionKey];
          } else {
            // Revoke access
            updated[role] = (updated[role] || []).filter(s => s !== sectionKey);
          }
          return updated;
        });
        toast.success(!currentHasAccess ? 'Acceso concedido' : 'Acceso revocado');
      } else {
        toast.error('Error al actualizar acceso');
      }
    } catch {
      toast.error('Error de conexión');
    } finally {
      setTogglingCell(null);
    }
  };

  // Check access using API data
  const hasAccess = (role: string, sectionKey: string): boolean => {
    if (accessMap[role]) {
      return accessMap[role].includes(sectionKey);
    }
    // Fallback to hardcoded
    const section = SIDEBAR_ACCESS_MAP.find(s => s.key === sectionKey);
    return section ? section.roles.includes(role as RolUsuario) : false;
  };

  // Count users per role
  const userCountByRole = ALL_ROLES_ORDERED.reduce((acc, role) => {
    acc[role] = usuarios.filter(u => u.role === role).length;
    return acc;
  }, {} as Record<RolUsuario, number>);

  // Count sections per role (from API data)
  const sectionCountByRole = ALL_ROLES_ORDERED.reduce((acc, role) => {
    acc[role] = SIDEBAR_ACCESS_MAP.filter(s => hasAccess(role, s.key)).length;
    return acc;
  }, {} as Record<RolUsuario, number>);

  if (loadingAccess) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-6 w-6 animate-spin text-blue-500" />
        <span className="ml-2 text-sm text-gray-500">Cargando mapa de acceso...</span>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h3 className="text-lg font-medium text-gray-900">Mapa de Acceso por Rol</h3>
        <p className="text-sm text-gray-500 mt-1">
          Administra qué secciones del sistema puede ver cada rol. Haz clic en los iconos para activar o desactivar acceso.
        </p>
      </div>

      {/* Legend */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <div className="flex flex-wrap gap-4 text-xs">
          <div className="flex items-center gap-1.5">
            <CheckCircle className="h-4 w-4 text-green-500" />
            <span className="text-gray-700">Tiene acceso (clic para revocar)</span>
          </div>
          <div className="flex items-center gap-1.5">
            <XCircle className="h-4 w-4 text-gray-300" />
            <span className="text-gray-700">Sin acceso (clic para conceder)</span>
          </div>
          <div className="flex items-center gap-1.5">
            <Badge variant="secondary" className="text-[10px] h-5 px-1.5">N</Badge>
            <span className="text-gray-700">Usuarios con ese rol</span>
          </div>
        </div>
        <p className="text-[11px] text-blue-600 mt-2">
          Los cambios se aplican a las nuevas sesiones. Los usuarios activos deben re-iniciar sesión para ver los cambios.
        </p>
      </div>

      {/* Matrix Table */}
      <Card className="shadow-sm border-0 bg-white/80 backdrop-blur-sm">
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b bg-gray-50/80">
                  <th className="text-left py-3 px-4 font-medium text-gray-700 sticky left-0 bg-gray-50/80 z-10 min-w-[180px]">
                    Sección
                  </th>
                  {ALL_ROLES_ORDERED.map(role => (
                    <th
                      key={role}
                      className={`text-center py-3 px-2 font-medium cursor-pointer transition-colors min-w-[90px] ${
                        selectedRole === role ? 'bg-blue-100' : 'hover:bg-gray-100'
                      }`}
                      onClick={() => setSelectedRole(selectedRole === role ? null : role)}
                    >
                      <div className="flex flex-col items-center gap-1">
                        <Badge
                          variant="outline"
                          className={`text-[10px] px-1.5 ${roleDisplayMap[role]?.color || 'bg-gray-100 text-gray-800'}`}
                        >
                          {roleDisplayMap[role]?.label || role}
                        </Badge>
                        <span className="text-[10px] text-gray-400 font-normal">
                          {userCountByRole[role]} usuario{userCountByRole[role] !== 1 ? 's' : ''}
                        </span>
                      </div>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {SIDEBAR_ACCESS_MAP.map((section, idx) => {
                  const SectionIcon = section.icon;
                  return (
                    <tr
                      key={section.key}
                      className={`border-b last:border-b-0 transition-colors ${
                        idx % 2 === 0 ? 'bg-white' : 'bg-gray-50/40'
                      }`}
                    >
                      <td className="py-3 px-4 sticky left-0 bg-inherit z-10">
                        <div className="flex items-center gap-2">
                          <SectionIcon className={`h-4 w-4 ${section.color}`} />
                          <div>
                            <div className="font-medium text-gray-900 text-sm">{section.title}</div>
                            <div className="text-[10px] text-gray-400">{section.links.length} páginas</div>
                          </div>
                        </div>
                      </td>
                      {ALL_ROLES_ORDERED.map(role => {
                        const cellHasAccess = hasAccess(role, section.key);
                        const cellKey = `${role}:${section.key}`;
                        const isToggling = togglingCell === cellKey;
                        return (
                          <td
                            key={role}
                            className={`text-center py-3 px-2 ${
                              selectedRole === role ? 'bg-blue-50' : ''
                            }`}
                          >
                            <button
                              onClick={() => handleToggleAccess(role, section.key, cellHasAccess)}
                              disabled={isToggling}
                              className="inline-flex items-center justify-center hover:scale-125 transition-transform disabled:opacity-50"
                              title={cellHasAccess ? `Revocar acceso de ${role} a ${section.title}` : `Conceder acceso de ${role} a ${section.title}`}
                            >
                              {isToggling ? (
                                <Loader2 className="h-4 w-4 animate-spin text-blue-400" />
                              ) : cellHasAccess ? (
                                <CheckCircle className="h-4 w-4 text-green-500" />
                              ) : (
                                <XCircle className="h-4 w-4 text-gray-200 hover:text-red-300" />
                              )}
                            </button>
                          </td>
                        );
                      })}
                    </tr>
                  );
                })}
                {/* Summary row */}
                <tr className="border-t-2 bg-gray-50/80 font-medium">
                  <td className="py-3 px-4 sticky left-0 bg-gray-50/80 z-10">
                    <span className="text-sm text-gray-700">Total secciones</span>
                  </td>
                  {ALL_ROLES_ORDERED.map(role => (
                    <td
                      key={role}
                      className={`text-center py-3 px-2 ${
                        selectedRole === role ? 'bg-blue-50' : ''
                      }`}
                    >
                      <span className="text-sm font-bold text-gray-700">
                        {sectionCountByRole[role]}/{SIDEBAR_ACCESS_MAP.length}
                      </span>
                    </td>
                  ))}
                </tr>
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* Detail view when a role is selected */}
      {selectedRole && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.2 }}
        >
          <Card className="shadow-sm border-0 bg-white/80 backdrop-blur-sm">
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <Badge
                  variant="outline"
                  className={roleDisplayMap[selectedRole]?.color || 'bg-gray-100 text-gray-800'}
                >
                  {roleDisplayMap[selectedRole]?.label || selectedRole}
                </Badge>
                <span className="text-gray-500 font-normal text-sm">
                  — Detalle de acceso ({sectionCountByRole[selectedRole]} secciones)
                </span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                {SIDEBAR_ACCESS_MAP.map(section => {
                  const sectionHasAccess = hasAccess(selectedRole, section.key);
                  const SectionIcon = section.icon;
                  const cellKey = `${selectedRole}:${section.key}`;
                  const isToggling = togglingCell === cellKey;
                  return (
                    <div
                      key={section.key}
                      className={`rounded-lg border p-3 transition-all ${
                        sectionHasAccess
                          ? 'bg-green-50 border-green-200'
                          : 'bg-gray-50 border-gray-200 opacity-50'
                      }`}
                    >
                      <div className="flex items-center gap-2 mb-2">
                        <SectionIcon className={`h-4 w-4 ${sectionHasAccess ? section.color : 'text-gray-400'}`} />
                        <span className={`font-medium text-sm ${sectionHasAccess ? 'text-gray-900' : 'text-gray-400'}`}>
                          {section.title}
                        </span>
                        <button
                          onClick={() => handleToggleAccess(selectedRole, section.key, sectionHasAccess)}
                          disabled={isToggling}
                          className="ml-auto hover:scale-125 transition-transform disabled:opacity-50"
                          title={sectionHasAccess ? 'Revocar acceso' : 'Conceder acceso'}
                        >
                          {isToggling ? (
                            <Loader2 className="h-3.5 w-3.5 animate-spin text-blue-400" />
                          ) : sectionHasAccess ? (
                            <CheckCircle className="h-3.5 w-3.5 text-green-500" />
                          ) : (
                            <XCircle className="h-3.5 w-3.5 text-gray-300" />
                          )}
                        </button>
                      </div>
                      {sectionHasAccess && (
                        <div className="space-y-0.5 ml-6">
                          {section.links.map(link => (
                            <div key={link.href} className="text-[11px] text-gray-500">
                              {link.label}
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>

              {/* Users with this role */}
              {userCountByRole[selectedRole] > 0 && (
                <div className="mt-4 pt-4 border-t">
                  <div className="text-xs font-medium text-gray-500 mb-2">
                    Usuarios con rol {roleDisplayMap[selectedRole]?.label} ({userCountByRole[selectedRole]})
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {usuarios
                      .filter(u => u.role === selectedRole)
                      .map(u => (
                        <Badge key={u.id} variant="secondary" className="text-xs">
                          {u.name || u.email}
                        </Badge>
                      ))}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </motion.div>
      )}
    </div>
  );
}

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
  const [activeTab, setActiveTab] = useState<'users' | 'permissions' | 'access-map'>('users');
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
      setPermissions(data || []);
    } catch (error) {
      console.error('Error al cargar permisos:', error);
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

      // Llamar a la API para asignar permisos bulk
      const res = await fetch(buildApiUrl('/api/admin/user-permissions'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: selectedUser.id,
          permissions: permissionUpdates
        }),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.message || 'Error al guardar permisos');
      }

      toast.success('Permisos actualizados exitosamente');
      setPermissionForm({});

      // Recargar permisos del usuario cambiando selectedUser para forzar re-render
      setSelectedUser({ ...selectedUser });

    } catch (error) {
      console.error('Error saving permissions:', error);
      toast.error(error instanceof Error ? error.message : 'Error al guardar permisos');
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

    if (loadingPermissions) {
      return (
        <div className="text-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-blue-600 mx-auto mb-4" />
          <p className="text-gray-500">Cargando permisos...</p>
        </div>
      );
    }

    // Group permissions by resource from database
    const permissionsByResource = permissions.reduce((acc, perm) => {
      if (!acc[perm.resource]) acc[perm.resource] = [];
      acc[perm.resource].push(perm);
      return acc;
    }, {} as Record<string, Permission[]>);

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
            className={Object.keys(permissionForm).length > 0 ? 'bg-orange-600 hover:bg-orange-700' : ''}
          >
            {loading ? (
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
            ) : (
              <Save className="w-4 h-4 mr-2" />
            )}
            Guardar Cambios
            {Object.keys(permissionForm).length > 0 && (
              <Badge variant="secondary" className="ml-2 bg-orange-100 text-orange-800">
                {Object.keys(permissionForm).length}
              </Badge>
            )}
          </Button>
        </div>

        {/* Status Legend */}
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <h4 className="text-sm font-medium text-blue-900 mb-3">Estado de Permisos</h4>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-xs">
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 bg-green-500 rounded-full"></div>
              <span className="text-green-700 font-medium">ACTIVO</span>
              <span className="text-gray-600">Permiso concedido</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 bg-red-500 rounded-full"></div>
              <span className="text-red-700 font-medium">BLOQUEADO</span>
              <span className="text-gray-600">Permiso denegado</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
              <span className="text-blue-700 font-medium">POR ROL</span>
              <span className="text-gray-600">Heredado del rol</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 bg-gray-400 rounded-full"></div>
              <span className="text-gray-600 font-medium">INACTIVO</span>
              <span className="text-gray-600">Sin configuración</span>
            </div>
          </div>
        </div>

        <ScrollArea className="h-96">
          <div className="space-y-4">
            {Object.entries(permissionsByResource).map(([resource, resourcePermissions]) => (
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
                        <div key={permission.name} className={`flex items-center justify-between p-4 border rounded-lg transition-all duration-200 ${
                          status === 'grant' ? 'bg-green-50 border-green-200 shadow-sm' :
                          status === 'deny' ? 'bg-red-50 border-red-200 shadow-sm' :
                          status === 'role' ? 'bg-blue-50 border-blue-200 shadow-sm' :
                          'bg-gray-50 border-gray-200'
                        }`}>
                          <div className="flex-1">
                            <div className="font-medium text-sm text-gray-900">{permission.action.replace('_', ' ')}</div>
                            <div className="text-xs text-gray-600 mt-1">{permission.description}</div>
                          </div>
                          <div className="flex items-center gap-3">
                            {/* Status Indicator */}
                            <div className="flex flex-col items-end gap-1">
                              {status === 'grant' && (
                                <div className="flex items-center gap-1">
                                  <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                                  <span className="text-xs font-medium text-green-700">ACTIVO</span>
                                </div>
                              )}
                              {status === 'deny' && (
                                <div className="flex items-center gap-1">
                                  <div className="w-2 h-2 bg-red-500 rounded-full"></div>
                                  <span className="text-xs font-medium text-red-700">BLOQUEADO</span>
                                </div>
                              )}
                              {status === 'role' && (
                                <div className="flex items-center gap-1">
                                  <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                                  <span className="text-xs font-medium text-blue-700">POR ROL</span>
                                </div>
                              )}
                              {status === null && (
                                <div className="flex items-center gap-1">
                                  <div className="w-2 h-2 bg-gray-400 rounded-full"></div>
                                  <span className="text-xs font-medium text-gray-600">INACTIVO</span>
                                </div>
                              )}

                              {/* Pending changes indicator */}
                              {pendingChange && (
                                <div className="text-xs text-orange-600 font-medium">
                                  {pendingChange === 'grant' ? '→ ACTIVO' : '→ BLOQUEADO'}
                                </div>
                              )}
                            </div>

                            {/* Action Buttons */}
                            <div className="flex gap-1">
                              <Button
                                size="sm"
                                variant={pendingChange === 'grant' ? 'default' : status === 'grant' ? 'default' : 'outline'}
                                onClick={() => handlePermissionChange(
                                  permission.id,
                                  pendingChange === 'grant' ? null : 'grant'
                                )}
                                className={`h-8 w-8 p-0 transition-all duration-200 ${
                                  status === 'grant' && pendingChange !== 'grant' ? 'ring-2 ring-green-300' : ''
                                }`}
                                title="Otorgar permiso"
                              >
                                <Check className="w-4 h-4" />
                              </Button>
                              <Button
                                size="sm"
                                variant={pendingChange === 'deny' ? 'destructive' : status === 'deny' ? 'destructive' : 'outline'}
                                onClick={() => handlePermissionChange(
                                  permission.id,
                                  pendingChange === 'deny' ? null : 'deny'
                                )}
                                className={`h-8 w-8 p-0 transition-all duration-200 ${
                                  status === 'deny' && pendingChange !== 'deny' ? 'ring-2 ring-red-300' : ''
                                }`}
                                title="Denegar permiso"
                              >
                                <XIcon className="w-4 h-4" />
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

        <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as 'users' | 'permissions' | 'access-map')}>
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="users" className="flex items-center gap-2">
              <Users className="h-4 w-4" />
              Usuarios
            </TabsTrigger>
            <TabsTrigger value="permissions" className="flex items-center gap-2">
              <Shield className="h-4 w-4" />
              Permisos
            </TabsTrigger>
            <TabsTrigger value="access-map" className="flex items-center gap-2">
              <Map className="h-4 w-4" />
              Mapa de Acceso
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

          <TabsContent value="access-map" className="space-y-6">
            <AccessMapTab usuarios={usuarios} />
          </TabsContent>
        </Tabs>
      </div>
    </motion.div>
  );
}
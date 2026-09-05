'use client';

import React, { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import { motion } from 'framer-motion';
import {
  Users,
  Loader2,
  Map as MapIcon,
  CheckCircle,
  XCircle,
  Package,
  FolderOpen,
  Clock,
  Eye,
  UserCheck,
  Truck,
  PackageCheck,
  BarChart3,
  Receipt,
  CreditCard,
  Settings,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import type { RolUsuario } from '@/types/modelos';
import { roles, roleDisplayMap } from '@/components/UsuariosClient';

// Forma mínima que necesita esta pestaña — desacoplada a propósito del tipo
// `User` de @/types/modelos (que trae relaciones obligatorias que la lista
// liviana de /admin/usuarios no tiene).
interface UsuarioBasico {
  id: string;
  name?: string | null;
  email: string;
  role: RolUsuario;
}

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
    roles: ['admin', 'gerente', 'gestor', 'coordinador', 'coordinador_logistico', 'proyectos', 'colaborador', 'comercial', 'seguridad', 'presupuestos', 'logistico'],
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
    key: 'rrhh',
    title: 'RRHH',
    icon: UserCheck,
    color: 'text-pink-500',
    roles: ['admin', 'gerente', 'administracion', 'rrhh'],
    links: [
      { label: 'Dashboard Asistencia', href: '/rrhh/asistencia/dashboard' },
      { label: 'Reporte de Asistencia', href: '/rrhh/asistencia' },
      { label: 'Personal', href: '/rrhh/personal' },
      { label: 'Cargos', href: '/rrhh/cargos' },
      { label: 'Departamentos', href: '/rrhh/departamentos' },
      { label: 'Saldos de Ausencia', href: '/rrhh/saldos-ausencia' },
      { label: 'Tipos de Ausencia', href: '/rrhh/tipos-ausencia' },
    ],
  },
  {
    key: 'logistica',
    title: 'Logística',
    icon: Truck,
    color: 'text-orange-500',
    roles: ['admin', 'gerente', 'logistico', 'coordinador_logistico'],
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
    key: 'gastos',
    title: 'Gastos',
    icon: Receipt,
    color: 'text-amber-500',
    roles: ['admin', 'gerente', 'gestor', 'coordinador', 'coordinador_logistico', 'proyectos', 'colaborador', 'logistico', 'administracion'],
    links: [
      { label: 'Mis Requerimientos', href: '/gastos/mis-requerimientos' },
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
      { label: 'Notificaciones', href: '/configuracion/notificaciones' },
      { label: 'Catálogos', href: '/catalogo/equipos' },
      { label: 'Centros de Costo', href: '/configuracion/centros-costo' },
    ],
  },
];

// Badge de rol: roleDisplayMap separa el texto (.color) del fondo (.bgColor).
function rolBadgeClass(rol: RolUsuario): string {
  const d = roleDisplayMap[rol];
  return d ? `${d.color} ${d.bgColor}` : 'text-gray-800 bg-gray-100';
}

export default function AccessMapTab({ usuarios }: { usuarios: UsuarioBasico[] }) {
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
  const userCountByRole = roles.reduce((acc, role) => {
    acc[role] = usuarios.filter(u => u.role === role).length;
    return acc;
  }, {} as Record<RolUsuario, number>);

  // Count sections per role (from API data)
  const sectionCountByRole = roles.reduce((acc, role) => {
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
        <h3 className="text-lg font-medium text-gray-900 flex items-center gap-2">
          <MapIcon className="h-5 w-5 text-gray-400" />
          Mapa de Acceso por Rol
        </h3>
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
                  {roles.map(role => (
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
                          className={`text-[10px] px-1.5 ${rolBadgeClass(role)}`}
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
                      {roles.map(role => {
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
                  {roles.map(role => (
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
                  className={rolBadgeClass(selectedRole)}
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

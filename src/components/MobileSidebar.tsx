'use client'

import React from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useSession } from 'next-auth/react'
import Image from 'next/image'
import clsx from 'clsx'
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Separator } from '@/components/ui/separator'
import { useSidebar } from '@/lib/context/SidebarContext'
import { useNotifications } from '@/lib/hooks/useNotifications'
import LogoutButton from './LogoutButton'
import {
  ChevronDown,
  Settings,
  Package,
  FolderOpen,
  Truck,
  BarChart3,
  Users,
  Building2,
  Wrench,
  FileText,
  Calculator,
  User,
  LogOut,
  CreditCard,
  DollarSign,
  TrendingUp,
  PackageCheck,
  Receipt,
  AlertCircle,
  Clock,
  Activity,
  CheckSquare,
  GitBranch,
  Calendar,
  FileCheck,
  Target,
  Shield,
  UserCheck,
  MapPin,
  ClipboardList,
  HardDrive,
  HardHat,
  LayoutDashboard,
  FileSpreadsheet,
  ArrowDownCircle,
  ArrowUpCircle,
  Landmark,
} from 'lucide-react'
import type { RolUsuario, SidebarSection, NotificationBadgeType } from '@/types/modelos'

/**
 * MobileSidebar - Drawer/Sheet que contiene la navegación en móvil
 */
export default function MobileSidebar() {
  const { data: session } = useSession()
  const pathname = usePathname()
  const { isMobileOpen, setMobileOpen } = useSidebar()
  const { getBadgeCount } = useNotifications()

  const [openSections, setOpenSections] = React.useState<Record<string, boolean>>({
    configuracion: false,
    comercial: true,
    crm: false,
    proyectos: false,
    documentos: false,
    'mi-trabajo': false,
    supervision: false,
    logistica: false,
    aprovisionamiento: false,
    finanzas: false,
    administracion: false,
    gestion: false,
  })

  const toggleSection = (key: string) =>
    setOpenSections((prev) => ({ ...prev, [key]: !prev[key] }))

  // Cerrar el drawer al navegar
  const handleLinkClick = () => {
    setMobileOpen(false)
  }

  const allSections: SidebarSection[] = [
    {
      key: 'comercial',
      title: 'Comercial',
      icon: Package,
      color: 'text-green-400',
      roles: ['admin', 'gerente', 'comercial', 'presupuestos'],
      links: [
        { href: '/comercial/plantillas', label: 'Plantillas', icon: FileText },
        { href: '/comercial/cotizaciones', label: 'Cotizaciones', icon: Calculator, badge: 'cotizaciones-pendientes' as NotificationBadgeType },
        { href: '/comercial/catalogo', label: 'Catálogo Equipos', icon: Wrench },
      ],
    },
    {
      key: 'crm',
      title: 'CRM',
      icon: Users,
      color: 'text-blue-400',
      roles: ['admin', 'gerente', 'comercial'],
      links: [
        { href: '/crm', label: 'Dashboard', icon: Target },
        { href: '/crm/oportunidades', label: 'Oportunidades', icon: Target },
        { href: '/crm/clientes', label: 'Clientes', icon: Building2 },
        { href: '/crm/actividades', label: 'Actividades', icon: Activity },
        { href: '/crm/reportes', label: 'Reportes', icon: BarChart3 },
      ],
    },
    {
      key: 'proyectos',
      title: 'Proyectos',
      icon: FolderOpen,
      color: 'text-purple-400',
      roles: ['admin', 'gerente', 'proyectos', 'coordinador', 'gestor'],
      links: [
        { href: '/proyectos', label: 'Ver Proyectos', icon: FolderOpen, badge: 'proyectos-activos' as NotificationBadgeType },
        { href: '/proyectos/equipos', label: 'Equipos', icon: Wrench },
        { href: '/proyectos/listas', label: 'Listas', icon: FileText },
        { href: '/proyectos/pedidos', label: 'Pedidos', icon: Package, badge: 'pedidos-pendientes' as NotificationBadgeType },
        { href: '/proyectos/catalogo', label: 'Catálogo', icon: Wrench },
      ],
    },
    {
      key: 'documentos',
      title: 'Documentos',
      icon: HardDrive,
      color: 'text-indigo-400',
      roles: ['admin', 'gerente', 'proyectos', 'coordinador', 'gestor', 'logistico', 'comercial', 'administracion'],
      links: [
        { href: '/documentos', label: 'GYS.PROYECTOS', icon: FolderOpen },
        { href: '/documentos/administracion', label: 'GYS.ADMINISTRACION', icon: Building2 },
      ],
    },
    {
      key: 'mi-trabajo',
      title: 'Mi Trabajo',
      icon: Clock,
      color: 'text-emerald-400',
      roles: ['admin', 'gerente', 'gestor', 'coordinador', 'proyectos', 'colaborador', 'comercial', 'seguridad', 'presupuestos', 'logistico'],
      links: [
        { href: '/mi-trabajo/timesheet', label: 'Mi Timesheet', icon: Calendar },
        { href: '/mi-trabajo/mi-jornada', label: 'Mi Jornada', icon: HardHat },
        { href: '/mi-trabajo/tareas', label: 'Mis Tareas', icon: CheckSquare },
        { href: '/mi-trabajo/progreso', label: 'Mi Progreso', icon: TrendingUp },
      ]
    },
    {
      key: 'supervision',
      title: 'Supervisión',
      icon: Users,
      color: 'text-red-400',
      roles: ['admin', 'gerente', 'gestor', 'coordinador', 'proyectos'],
      links: [
        { href: '/supervision/timesheet', label: 'Timesheet', icon: ClipboardList },
        { href: '/supervision/jornada-campo', label: 'Jornada Campo', icon: MapPin },
        { href: '/supervision/tareas', label: 'Gestión de Tareas', icon: CheckSquare },
        { href: '/supervision/equipo', label: 'Vista de Equipo', icon: Users },
        { href: '/supervision/edts', label: 'Gestión de EDTs', icon: GitBranch },
        { href: '/supervision/listas-equipo', label: 'Listas Equipo', icon: ClipboardList },
        { href: '/supervision/resumen', label: 'Resumen Proyectos', icon: BarChart3 },
        { href: '/supervision/analisis-edt', label: 'Análisis EDT', icon: Target },
      ]
    },
    {
      key: 'logistica',
      title: 'Logística',
      icon: Truck,
      color: 'text-orange-400',
      roles: ['admin', 'gerente', 'logistico'],
      links: [
        { href: '/logistica/listas', label: 'Listas Técnicas', icon: FileText },
        { href: '/logistica/pedidos', label: 'Gestión de Pedidos', icon: Package, badge: 'pedidos-pendientes' as NotificationBadgeType },
        { href: '/logistica/ordenes-compra', label: 'Órdenes de Compra', icon: FileText },
        { href: '/logistica/proveedores', label: 'Proveedores', icon: Building2 },
        { href: '/logistica/cotizaciones', label: 'Cotizaciones Proveedor', icon: Calculator },
        { href: '/logistica/catalogo', label: 'Catálogo Equipos', icon: Wrench },
      ],
    },
    {
      key: 'aprovisionamiento',
      title: 'Aprovisionamiento',
      icon: PackageCheck,
      color: 'text-emerald-400',
      roles: ['admin', 'gerente', 'gestor'],
      links: [
        { href: '/finanzas/aprovisionamiento', label: 'Dashboard', icon: BarChart3 },
        { href: '/finanzas/aprovisionamiento/proyectos', label: 'Proyectos', icon: FolderOpen },
        { href: '/finanzas/aprovisionamiento/listas', label: 'Listas', icon: FileText },
        { href: '/finanzas/aprovisionamiento/pedidos', label: 'Pedidos', icon: Package },
        { href: '/finanzas/aprovisionamiento/timeline', label: 'Timeline', icon: Clock },
      ],
    },
    {
      key: 'finanzas',
      title: 'Mis Gastos',
      icon: Receipt,
      color: 'text-amber-400',
      roles: ['admin', 'gerente', 'gestor', 'coordinador', 'proyectos', 'colaborador', 'logistico', 'administracion'],
      links: [
        { href: '/finanzas/requerimientos', label: 'Mis Requerimientos', icon: CreditCard },
      ],
    },
    {
      key: 'administracion',
      title: 'Administración',
      icon: Building2,
      color: 'text-rose-400',
      roles: ['admin', 'gerente', 'administracion'],
      links: [
        { href: '/administracion', label: 'Dashboard', icon: LayoutDashboard },
        { href: '/administracion/gastos', label: 'Gestión de Gastos', icon: Receipt },
        { href: '/administracion/rendiciones', label: 'Rendiciones', icon: FileCheck },
        { href: '/administracion/facturacion', label: 'Facturación', icon: FileSpreadsheet },
        { href: '/administracion/cuentas-cobrar', label: 'Cuentas por Cobrar', icon: ArrowDownCircle },
        { href: '/administracion/cuentas-pagar', label: 'Cuentas por Pagar', icon: ArrowUpCircle },
        { href: '/administracion/cuentas-bancarias', label: 'Cuentas Bancarias', icon: Landmark },
      ],
    },
    {
      key: 'gestion',
      title: 'Gestión',
      icon: BarChart3,
      color: 'text-cyan-400',
      roles: ['admin', 'gerente', 'gestor'],
      links: [
        { href: '/gestion/valorizaciones', label: 'Valorizaciones', icon: FileSpreadsheet },
        { href: '/gestion/reportes', label: 'Reportes', icon: BarChart3 },
        { href: '/gestion/reportes/rentabilidad', label: 'Rentabilidad', icon: TrendingUp },
        { href: '/gestion/reportes/pedidos', label: 'Pedidos', icon: Package },
        { href: '/gestion/reportes/performance', label: 'Performance', icon: TrendingUp },
        { href: '/gestion/reportes/financiero', label: 'Financiero', icon: DollarSign },
      ],
    },
    {
      key: 'configuracion',
      title: 'Configuración',
      icon: Settings,
      color: 'text-blue-400',
      roles: ['admin', 'gerente'],
      links: [
        { href: '/admin/usuarios', label: 'Usuarios', icon: Users },
        { href: '/admin/personal', label: 'Personal (RRHH)', icon: UserCheck },
        { href: '/admin/permisos', label: 'Permisos', icon: Shield },
        { href: '/admin/actividad', label: 'Actividad Sistema', icon: Activity },
        { href: '/configuracion/notificaciones', label: 'Notificaciones', icon: AlertCircle },
        { href: '/comercial/clientes', label: 'Clientes', icon: Building2 },
        { href: '/catalogo/equipos', label: 'Catálogo Equipos', icon: Wrench },
        { href: '/catalogo/servicios', label: 'Catálogo Servicios', icon: FileText },
        { href: '/catalogo/gastos', label: 'Catálogo Gastos', icon: Receipt },
        { href: '/catalogo/categorias-equipo', label: 'Categorías Equipo', icon: FolderOpen },
        { href: '/catalogo/categorias-gasto', label: 'Categorías Gasto', icon: FolderOpen },
        { href: '/catalogo/edts', label: 'EDTs', icon: FolderOpen },
        { href: '/catalogo/unidades', label: 'Unidades Equipos', icon: Calculator },
        { href: '/catalogo/unidades-servicio', label: 'Unidades Servicio', icon: Calculator },
        { href: '/catalogo/recursos', label: 'Recursos', icon: Wrench },
        { href: '/catalogo/exclusiones', label: 'Exclusiones', icon: FileText },
        { href: '/catalogo/condiciones', label: 'Condiciones', icon: FileCheck },
        { href: '/catalogo/categorias-exclusion', label: 'Categorías Exclusión', icon: FolderOpen },
        { href: '/catalogo/categorias-condicion', label: 'Categorías Condición', icon: FolderOpen },
        { href: '/configuracion/fases', label: 'Fases por Defecto', icon: GitBranch },
        { href: '/configuracion/duraciones-cronograma', label: 'Duraciones Cronograma', icon: Calendar },
        { href: '/configuracion/calendario-laboral', label: 'Calendarios Laborales', icon: Calendar },
        { href: '/configuracion/centros-costo', label: 'Centros de Costo', icon: CreditCard },
        { href: '/configuracion/catalogo-columnas', label: 'Vistas Catálogo', icon: Wrench },
      ],
    },
  ]

  const role = session?.user.role as RolUsuario | undefined
  const sectionAccess = session?.user?.sectionAccess as string[] | undefined

  const visibleSections = React.useMemo(() => allSections
    .filter((section) => {
      if (sectionAccess && sectionAccess.length > 0) {
        return sectionAccess.includes(section.key)
      }
      return role ? section.roles.includes(role) : false
    })
    .map(section => ({
      ...section,
      links: section.links.filter(link => {
        if (link.href === '/admin/actividad' && role !== 'admin') {
          return false
        }
        return true
      })
    }))
    .filter(section => section.links.length > 0),
    [role, sectionAccess]
  )

  // Auto-expand active section on mount
  React.useEffect(() => {
    const currentSection = allSections.find(section =>
      section.links.some(link =>
        pathname === link.href ||
        pathname.startsWith(link.href + '/')
      )
    )
    if (currentSection) {
      setOpenSections(prev => ({ ...prev, [currentSection.key]: true }))
    }
  }, [pathname])

  return (
    <Sheet open={isMobileOpen} onOpenChange={setMobileOpen}>
      <SheetContent
        side="left"
        className="w-[280px] p-0 bg-gradient-to-b from-gray-900 via-gray-900 to-gray-800 border-r border-gray-700/50 flex flex-col h-full"
      >
        {/* Header */}
        <SheetHeader className="p-4 border-b border-gray-700/60 bg-gray-800/50 flex-shrink-0">
          <SheetTitle className="sr-only">Menú de navegación</SheetTitle>
          <div className="flex items-center gap-3">
            <Link href="/" onClick={handleLinkClick} className="relative w-[120px] h-8">
              <Image
                src="/logo.png"
                alt="Logo GyS"
                fill
                priority
                sizes="120px"
                className="object-contain"
              />
            </Link>
            <Badge variant="outline" className="text-xs bg-blue-500/20 text-blue-300 border-blue-400/30">
              v2.0
            </Badge>
          </div>
        </SheetHeader>

        {/* User Section */}
        {session?.user && (
          <div className="px-4 py-3 bg-gray-800/30 border-b border-gray-700/40 flex-shrink-0">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center">
                <User size={16} className="text-white" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs text-gray-400 mb-0.5">Bienvenido,</p>
                <p className="text-sm font-semibold text-white truncate">{session.user.name}</p>
                <Badge variant="secondary" className="text-xs mt-1 bg-gray-700/50 text-gray-300">
                  {session.user.role}
                </Badge>
              </div>
            </div>
          </div>
        )}

        {/* Navigation */}
        <nav className="flex-1 min-h-0 overflow-y-auto px-2 py-4 custom-scrollbar overscroll-contain touch-pan-y">
          <div className="space-y-2">
            {visibleSections.map((section) => {
              const SectionIcon = section.icon
              const isOpen = openSections[section.key]

              return (
                <div key={section.key} className="mb-4">
                  {/* Section Header */}
                  <Button
                    variant="ghost"
                    onClick={() => toggleSection(section.key)}
                    className={clsx(
                      'w-full justify-between text-xs uppercase font-bold mb-2 px-3 py-2.5 rounded-lg transition-all duration-200',
                      'bg-gray-800/60 border border-gray-700/40 hover:bg-gray-700/60 text-gray-300 hover:text-white'
                    )}
                  >
                    <div className="flex items-center gap-2">
                      <SectionIcon size={16} className={clsx('transition-colors', section.color)} />
                      <span className="tracking-wide">{section.title}</span>
                    </div>
                    <ChevronDown
                      size={14}
                      className={clsx(
                        'text-gray-400 transition-transform duration-200',
                        isOpen && 'rotate-180'
                      )}
                    />
                  </Button>

                  {/* Section Links */}
                  {isOpen && (
                    <div className="space-y-1">
                      {section.links.map((link) => {
                        const LinkIcon = link.icon
                        const isActive = pathname === link.href
                        const badgeCount = link.badge ? getBadgeCount(link.badge) : 0

                        return (
                          <Link
                            key={link.href}
                            href={link.href}
                            onClick={handleLinkClick}
                            className={clsx(
                              'group flex items-center gap-3 px-4 py-2.5 ml-2 rounded-lg text-sm transition-all duration-200 relative border-l-2',
                              isActive
                                ? 'bg-gradient-to-r from-blue-600/20 to-purple-600/20 text-white font-medium border-l-blue-400'
                                : 'text-gray-400 hover:text-white hover:bg-gray-700/40 border-l-gray-600/50 hover:border-l-gray-400'
                            )}
                          >
                            <LinkIcon
                              size={16}
                              className={clsx(
                                'transition-colors flex-shrink-0',
                                isActive ? 'text-blue-400' : 'text-gray-400 group-hover:text-white'
                              )}
                            />
                            <span className="truncate flex-1">{link.label}</span>

                            {badgeCount > 0 && (
                              <Badge
                                variant={badgeCount > 5 ? "destructive" : "secondary"}
                                className={clsx(
                                  'text-xs px-1.5 py-0.5 min-w-[18px] h-5 flex items-center justify-center',
                                  badgeCount > 5
                                    ? 'bg-red-500/90 text-white'
                                    : 'bg-orange-500/90 text-white'
                                )}
                              >
                                {badgeCount > 99 ? '99+' : badgeCount}
                              </Badge>
                            )}
                          </Link>
                        )
                      })}
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        </nav>

        <Separator className="bg-gray-700/60 flex-shrink-0" />

        {/* Footer */}
        <div className="p-4 bg-gray-800/30 flex-shrink-0">
          {session?.user && (
            <div className="space-y-3">
              <div className="flex items-center justify-between text-xs text-gray-400">
                <span>Sistema activo</span>
                <div className="flex items-center gap-1">
                  <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
                  <span>Online</span>
                </div>
              </div>

              <LogoutButton
                showIcon={true}
                className={clsx(
                  'w-full py-2.5 rounded-lg text-sm font-medium transition-all duration-200',
                  'bg-gradient-to-r from-rose-500/80 to-red-500/80 hover:from-rose-600/90 hover:to-red-600/90',
                  'text-white shadow-md hover:shadow-lg border border-rose-400/20',
                  'flex justify-center items-center gap-2'
                )}
              >
                Cerrar Sesión
              </LogoutButton>
            </div>
          )}
        </div>
      </SheetContent>
    </Sheet>
  )
}

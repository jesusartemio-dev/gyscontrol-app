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
  CheckCircle2,
  Home,
} from 'lucide-react'
import type { RolUsuario, SidebarSection, NotificationBadgeType } from '@/types/modelos'

/**
 * MobileSidebar - Drawer/Sheet que contiene la navegación en móvil
 */
export default function MobileSidebar() {
  const { data: session, update: updateSession } = useSession()
  const pathname = usePathname()
  const { isMobileOpen, setMobileOpen } = useSidebar()
  const { getBadgeCount } = useNotifications()

  // Refresh sectionAccess from DB when sidebar opens
  const hasRefreshed = React.useRef(false)
  React.useEffect(() => {
    if (isMobileOpen && !hasRefreshed.current) {
      hasRefreshed.current = true
      updateSession()
    }
    if (!isMobileOpen) {
      hasRefreshed.current = false
    }
  }, [isMobileOpen, updateSession])

  const [openSections, setOpenSections] = React.useState<Record<string, boolean>>({
    configuracion: false,
    comercial: false,
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
  const [openSubmenus, setOpenSubmenus] = React.useState<Record<string, boolean>>({})
  const toggleSubmenu = (href: string) =>
    setOpenSubmenus(prev => ({ ...prev, [href]: !prev[href] }))

  // Accordion: only one section open at a time
  const toggleSection = (key: string) =>
    setOpenSections((prev) => {
      const isCurrentlyOpen = prev[key]
      // Close all sections, then toggle the clicked one
      const allClosed = Object.keys(prev).reduce((acc, k) => ({ ...acc, [k]: false }), {} as Record<string, boolean>)
      return { ...allClosed, [key]: !isCurrentlyOpen }
    })

  // Track if nav is scrollable for fade indicator
  const navRef = React.useRef<HTMLElement>(null)
  const [showScrollIndicator, setShowScrollIndicator] = React.useState(false)

  React.useEffect(() => {
    const nav = navRef.current
    if (!nav) return
    const checkScroll = () => {
      setShowScrollIndicator(nav.scrollHeight - nav.scrollTop - nav.clientHeight > 20)
    }
    checkScroll()
    nav.addEventListener('scroll', checkScroll, { passive: true })
    const observer = new ResizeObserver(checkScroll)
    observer.observe(nav)
    return () => {
      nav.removeEventListener('scroll', checkScroll)
      observer.disconnect()
    }
  }, [openSections])

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
      roles: ['admin', 'gerente', 'proyectos', 'coordinador', 'gestor', 'logistico', 'coordinador_logistico', 'comercial', 'administracion'],
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
      roles: ['admin', 'gerente', 'gestor', 'coordinador', 'proyectos', 'colaborador', 'comercial', 'seguridad', 'presupuestos', 'logistico', 'coordinador_logistico'],
      links: [
        {
          href: '#asistencia-mi-trabajo',
          label: 'Asistencia',
          icon: ClipboardList,
          submenu: [
            { href: '/mi-trabajo/marcar', label: 'Marcar Asistencia', icon: MapPin },
            { href: '/mi-trabajo/mi-asistencia', label: 'Mi Asistencia', icon: Clock },
            { href: '/mi-trabajo/solicitudes-remoto', label: 'Solicitudes Remoto', icon: Home },
          ],
        },
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
        {
          href: '#asistencia-supervision',
          label: 'Asistencia',
          icon: ClipboardList,
          submenu: [
            { href: '/asistencia-supervisor', label: 'QR del Día', icon: MapPin },
            { href: '/supervision/asistencia', label: 'Asistencia del Equipo', icon: ClipboardList },
            { href: '/supervision/asistencia/dispositivos', label: 'Aprobar Dispositivos', icon: ClipboardList },
            { href: '/supervision/solicitudes-remoto', label: 'Solicitudes Remoto', icon: Home },
          ],
        },
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
      roles: ['admin', 'gerente', 'logistico', 'coordinador_logistico'],
      links: [
        { href: '/logistica/listas', label: 'Listas Técnicas', icon: FileText },
        { href: '/logistica/pedidos', label: 'Gestión de Pedidos', icon: Package, badge: 'pedidos-pendientes' as NotificationBadgeType },
        { href: '/logistica/ordenes-compra', label: 'Órdenes de Compra', icon: FileText },
        { href: '/logistica/recepciones', label: 'Recepciones', icon: Package },
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
      key: 'gastos',
      title: 'Gastos',
      icon: Receipt,
      color: 'text-amber-400',
      roles: ['admin', 'gerente', 'gestor', 'coordinador', 'coordinador_logistico', 'proyectos', 'colaborador', 'logistico', 'administracion'],
      links: [
        { href: '/gastos/mis-requerimientos', label: 'Mis Requerimientos', icon: CreditCard },
        { href: '/gastos/requerimientos', label: 'Aprobar Requerimientos', icon: CheckCircle2, roles: ['admin', 'gerente', 'gestor', 'coordinador', 'coordinador_logistico', 'administracion'] as any },
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
        { href: '/administracion/proyectos-internos', label: 'Proyectos Internos', icon: Building2 },
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
        { href: '/gestion/reportes/costos-reales', label: 'Costos Reales', icon: DollarSign },
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
        {
          href: '#asistencia-configuracion',
          label: 'Asistencia',
          icon: ClipboardList,
          submenu: [
            { href: '/admin/asistencia/ubicaciones', label: 'Ubicaciones', icon: MapPin },
            { href: '/admin/asistencia/modalidades', label: 'Modalidades de Trabajo', icon: Home },
            { href: '/admin/asistencia/dashboard', label: 'Dashboard', icon: BarChart3 },
          ],
        },
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
        if (link.roles && role && !(link.roles as string[]).includes(role)) {
          return false
        }
        return true
      })
    }))
    .filter(section => section.links.length > 0),
    [role, sectionAccess]
  )

  // Auto-expand only the active section (accordion style)
  React.useEffect(() => {
    const currentSection = allSections.find(section =>
      section.links.some(link =>
        pathname === link.href ||
        pathname.startsWith(link.href + '/') ||
        link.submenu?.some(s => pathname === s.href || pathname.startsWith(s.href + '/'))
      )
    )
    if (currentSection) {
      setOpenSections(prev => {
        const allClosed = Object.keys(prev).reduce((acc, k) => ({ ...acc, [k]: false }), {} as Record<string, boolean>)
        return { ...allClosed, [currentSection.key]: true }
      })
    }
    for (const section of allSections) {
      for (const link of section.links) {
        if (link.submenu?.some(s => pathname === s.href || pathname.startsWith(s.href + '/'))) {
          setOpenSubmenus(prev => (prev[link.href] ? prev : { ...prev, [link.href]: true }))
        }
      }
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
        <nav ref={navRef} className="flex-1 min-h-0 overflow-y-auto px-2 py-4 custom-scrollbar overscroll-contain touch-pan-y relative">
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
                        const hasSubmenu = link.submenu && link.submenu.length > 0
                        const hasActiveChild = hasSubmenu && link.submenu!.some(
                          s => pathname === s.href || pathname.startsWith(s.href + '/')
                        )
                        const isActive = pathname === link.href || hasActiveChild
                        const badgeCount = link.badge ? getBadgeCount(link.badge) : 0
                        const submenuOpen = openSubmenus[link.href] || false

                        if (hasSubmenu) {
                          return (
                            <div key={link.href}>
                              <Button
                                variant="ghost"
                                onClick={() => toggleSubmenu(link.href)}
                                className={clsx(
                                  'group w-full justify-start gap-3 px-4 py-2.5 ml-2 rounded-lg text-sm transition-all duration-200 border-l-2',
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
                                <span className="truncate flex-1 text-left">{link.label}</span>
                                <ChevronDown
                                  size={14}
                                  className={clsx(
                                    'transition-transform duration-200',
                                    submenuOpen && 'rotate-180'
                                  )}
                                />
                              </Button>
                              {submenuOpen && (
                                <div className="ml-6 mt-1 space-y-1">
                                  {link.submenu!.map((sublink) => {
                                    const SubIcon = sublink.icon
                                    const isSubActive = pathname === sublink.href
                                    const subBadge = sublink.badge ? getBadgeCount(sublink.badge) : 0
                                    return (
                                      <Link
                                        key={sublink.href}
                                        href={sublink.href}
                                        onClick={handleLinkClick}
                                        className={clsx(
                                          'group flex items-center gap-3 px-4 py-2 ml-2 rounded-lg text-xs transition-all duration-200 border-l-2',
                                          isSubActive
                                            ? 'bg-gradient-to-r from-purple-600/20 to-blue-600/20 text-white font-medium border-l-purple-400'
                                            : 'text-gray-500 hover:text-white hover:bg-gray-700/30 border-l-gray-700/50 hover:border-l-gray-500'
                                        )}
                                      >
                                        <SubIcon
                                          size={14}
                                          className={clsx(
                                            'transition-colors flex-shrink-0',
                                            isSubActive ? 'text-purple-400' : 'text-gray-500 group-hover:text-white'
                                          )}
                                        />
                                        <span className="truncate flex-1">{sublink.label}</span>
                                        {subBadge > 0 && (
                                          <Badge
                                            variant={subBadge > 5 ? 'destructive' : 'secondary'}
                                            className="text-xs px-1.5 py-0.5 min-w-[16px] h-4 flex items-center justify-center bg-orange-500/90 text-white"
                                          >
                                            {subBadge > 99 ? '99+' : subBadge}
                                          </Badge>
                                        )}
                                      </Link>
                                    )
                                  })}
                                </div>
                              )}
                            </div>
                          )
                        }

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

        {/* Scroll indicator - shows when more sections below */}
        {showScrollIndicator && (
          <div className="flex-shrink-0 flex items-center justify-center py-1.5 bg-gradient-to-t from-gray-900 to-transparent pointer-events-none">
            <ChevronDown size={14} className="text-gray-400 animate-bounce" />
          </div>
        )}

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

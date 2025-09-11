'use client'

import React from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useSession } from 'next-auth/react'
import clsx from 'clsx'
import { useState } from 'react'
import Image from 'next/image'
import { motion, AnimatePresence } from 'framer-motion'
import { 
  ChevronLeft, 
  ChevronRight, 
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
  ChevronDown,
  ChevronUp,
  DollarSign,
  TrendingUp,
  CreditCard,
  PieChart,
  ShoppingCart,
  PackageCheck,
  Receipt,
  AlertCircle,
  Clock,
  Activity
} from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { Button } from '@/components/ui/button'
import LogoutButton from './LogoutButton'
import { useNotifications } from '@/lib/hooks/useNotifications'
import type { RolUsuario, SidebarSection, NotificationBadgeType } from '@/types/modelos'

export default function Sidebar() {
  const { data: session } = useSession()
  const pathname = usePathname()
  const { getBadgeCount, hasNotifications } = useNotifications()

  const [collapsed, setCollapsed] = useState(false)
  const [openSubmenus, setOpenSubmenus] = useState<Record<string, boolean>>({})
  const [openSections, setOpenSections] = useState<Record<string, boolean>>({
    configuracion: true,
    comercial: true,
    proyectos: true,
    logistica: true,
    finanzas: true,
    gestion: true,
  })

  const toggleSection = (key: string) =>
    setOpenSections((prev) => ({ ...prev, [key]: !prev[key] }))

  const toggleSubmenu = (linkHref: string) => {
    setOpenSubmenus(prev => ({
      ...prev,
      [linkHref]: !prev[linkHref]
    }))
  }

  const toggleSidebar = () => setCollapsed((prev) => !prev)

  const allSections: SidebarSection[] = [
    // 1. Comercial - Inicio del flujo de negocio
    {
      key: 'comercial',
      title: 'Comercial',
      icon: Package,
      color: 'text-green-400',
      roles: ['admin', 'gerente', 'comercial', 'presupuestos'],
      links: [
        { href: '/comercial/plantillas', label: 'Plantillas', icon: FileText },
        { href: '/comercial/cotizaciones', label: 'Cotizaciones', icon: Calculator },
      ],
    },
    // 2. Proyectos - Ejecución del negocio
    {
      key: 'proyectos',
      title: 'Proyectos',
      icon: FolderOpen,
      color: 'text-purple-400',
      roles: ['admin', 'gerente', 'proyectos', 'coordinador', 'gestor'],
      links: [
        { href: '/proyectos', label: 'Ver Proyectos', icon: FolderOpen },
        { href: '/proyectos/equipos', label: 'Equipos', icon: Wrench },
        { href: '/proyectos/listas', label: 'Listas', icon: FileText },
        { href: '/proyectos/pedidos', label: 'Pedidos', icon: ShoppingCart },
      ],
    },
    // 3. Logística - Listas, pedidos y cotizaciones
    {
      key: 'logistica',
      title: 'Logística',
      icon: Truck,
      color: 'text-orange-400',
      roles: ['admin', 'gerente', 'logistico'],
      links: [
        { href: '/logistica/listas', label: 'Listas', icon: FileText },
        { 
          href: '/logistica/pedidos', 
          label: 'Pedidos', 
          icon: Package,
          submenu: [
            { href: '/logistica/pedidos', label: 'Ver Pedidos', icon: Package },
            { href: '/gestion/reportes/pedidos', label: 'Reportes Pedidos', icon: BarChart3 },
            { href: '/gestion/reportes/trazabilidad', label: 'Trazabilidad', icon: Activity }
          ]
        },
        { href: '/logistica/cotizaciones', label: 'Cotizaciones', icon: Calculator },
      ],
    },
    // 4. Finanzas - Control financiero y flujo de caja
    {
      key: 'finanzas',
      title: 'Finanzas',
      icon: DollarSign,
      color: 'text-emerald-400',
      roles: ['admin', 'gerente', 'gestor'],
      links: [
        { href: '/finanzas/dashboard', label: 'Dashboard', icon: BarChart3 },
        { 
          href: '/finanzas/aprovisionamiento', 
          label: 'Aprovisionamiento', 
          icon: Clock,
          submenu: [
            { href: '/finanzas/aprovisionamiento', label: 'Dashboard', icon: BarChart3 },
            { href: '/finanzas/aprovisionamiento/proyectos', label: 'Proyectos', icon: FolderOpen },
            { href: '/finanzas/aprovisionamiento/listas', label: 'Listas de Equipo', icon: FileText },
            { href: '/finanzas/aprovisionamiento/pedidos', label: 'Pedidos', icon: Package },
            { href: '/finanzas/aprovisionamiento/timeline', label: 'Timeline Gantt', icon: Clock }
          ]
        },
        { href: '/finanzas/flujo-caja', label: 'Flujo de Caja', icon: TrendingUp },
        { href: '/finanzas/cuentas-cobrar', label: 'Cuentas por Cobrar', icon: DollarSign },
        { href: '/finanzas/cuentas-pagar', label: 'Cuentas por Pagar', icon: CreditCard },
        { href: '/finanzas/presupuestos', label: 'Presupuestos', icon: PieChart },
        { href: '/finanzas/rentabilidad', label: 'Análisis Rentabilidad', icon: BarChart3 },
      ],
    },
    // 5. Gestión - Análisis y control
    {
      key: 'gestion',
      title: 'Gestión',
      icon: BarChart3,
      color: 'text-cyan-400',
      roles: ['admin', 'gerente', 'gestor'],
      links: [
        { href: '/gestion/valorizaciones', label: 'Valorizaciones', icon: Calculator },
        { 
          href: '/gestion/reportes', 
          label: 'Reportes', 
          icon: BarChart3,
          submenu: [
            { href: '/gestion/reportes', label: 'Dashboard Reportes', icon: BarChart3 },
            { href: '/gestion/reportes/pedidos', label: 'Reportes Pedidos', icon: Package },
            { href: '/gestion/reportes/trazabilidad', label: 'Trazabilidad', icon: Activity },
            { href: '/gestion/reportes/performance', label: 'Performance', icon: TrendingUp },
            { href: '/gestion/reportes/financiero', label: 'Financiero', icon: DollarSign }
          ]
        },
        { href: '/gestion/indicadores', label: 'Indicadores', icon: BarChart3 },
      ],
    },
    // 6. Configuración - Administración del sistema y catálogos
    {
      key: 'configuracion',
      title: 'Configuración',
      icon: Settings,
      color: 'text-blue-400',
      roles: ['admin', 'gerente', 'comercial', 'logistico', 'proyectos'],
      links: [
        { href: '/admin/usuarios', label: 'Usuarios', icon: Users },
        { href: '/configuracion/notificaciones', label: 'Notificaciones', icon: AlertCircle },
        // 🏢 Entidades maestras del negocio
        { href: '/comercial/clientes', label: 'Clientes', icon: Building2 },
        { href: '/logistica/proveedores', label: 'Proveedores', icon: Building2 },
        // 📦 Catálogos de productos y servicios
        { href: '/catalogo/equipos', label: 'Catálogo Equipos', icon: Wrench },
        { href: '/catalogo/servicios', label: 'Catálogo Servicios', icon: FileText },
        { href: '/catalogo/categorias-equipo', label: 'Categorías Equipo', icon: FolderOpen },
        { href: '/catalogo/categorias-servicio', label: 'Categorías Servicio', icon: FolderOpen },
        { href: '/catalogo/unidades', label: 'Unidades Equipos', icon: Calculator },
        { href: '/catalogo/unidades-servicio', label: 'Unidades Servicio', icon: Calculator },
        { href: '/catalogo/recursos', label: 'Recursos', icon: Wrench },
      ],
    },
  ]

  const role = session?.user.role as RolUsuario | undefined

  const visibleSections = allSections.filter((section) =>
    role ? section.roles.includes(role) : false
  )

  return (
    <motion.aside 
      initial={{ x: -20, opacity: 0 }}
      animate={{ x: 0, opacity: 1 }}
      transition={{ duration: 0.3 }}
      className={clsx(
        'bg-gradient-to-b from-gray-900 via-gray-900 to-gray-800 text-white h-full flex flex-col transition-all duration-300 shadow-xl border-r border-gray-700/50',
        collapsed ? 'w-16' : 'w-64'
      )}
    >
      {/* Header */}
      <motion.div 
        className="p-4 border-b border-gray-700/60 flex justify-between items-center bg-gray-800/50 backdrop-blur-sm"
        layout
      >
        <AnimatePresence mode="wait">
          {!collapsed && (
            <motion.div
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.8 }}
              transition={{ duration: 0.2 }}
              className="flex items-center gap-3"
            >
              <Image
                src="/logo.png"
                alt="Logo GyS"
                width={140}
                height={40}
                className="object-contain"
              />
              <Badge variant="outline" className="text-xs bg-blue-500/20 text-blue-300 border-blue-400/30">
                v2.0
              </Badge>
            </motion.div>
          )}
        </AnimatePresence>
        
        <Button
          variant="ghost"
          size="sm"
          onClick={toggleSidebar}
          className="text-gray-400 hover:text-white hover:bg-gray-700/50 p-2 rounded-lg transition-all duration-200"
        >
          <motion.div
            animate={{ rotate: collapsed ? 0 : 180 }}
            transition={{ duration: 0.2 }}
          >
            {collapsed ? <ChevronRight size={18} /> : <ChevronLeft size={18} />}
          </motion.div>
        </Button>
      </motion.div>

      {/* User Section */}
      <AnimatePresence>
        {!collapsed && session?.user && (
          <motion.div 
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.2, delay: 0.1 }}
            className="px-4 py-3 bg-gray-800/30 border-b border-gray-700/40"
          >
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
          </motion.div>
        )}
      </AnimatePresence>

      {/* Navigation Menu */}
      <nav className="flex-1 overflow-y-auto px-2 py-4 min-h-0 custom-scrollbar scroll-smooth">
        <motion.div 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.3, delay: 0.2 }}
          className="space-y-2"
        >
          {visibleSections.map((section, sectionIndex) => {
            const SectionIcon = section.icon
            const isOpen = openSections[section.key]
            
            return (
              <motion.div 
                key={section.key} 
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.3, delay: sectionIndex * 0.1 }}
                className="mb-4"
              >
                {/* Section Header */}
                {!collapsed && (
                  <div className="mb-3">
                    <Button
                      variant="ghost"
                      onClick={() => toggleSection(section.key)}
                      className={clsx(
                        'w-full justify-between text-xs uppercase font-bold mb-2 px-3 py-2.5 rounded-lg transition-all duration-200',
                        'bg-gray-800/60 border border-gray-700/40 hover:bg-gray-700/60 text-gray-300 hover:text-white group',
                        'shadow-sm hover:shadow-md'
                      )}
                    >
                      <div className="flex items-center gap-2">
                        <SectionIcon size={16} className={clsx('transition-colors font-medium', section.color)} />
                        <span className="tracking-wide">{section.title}</span>
                      </div>
                      <motion.div
                        animate={{ rotate: isOpen ? 180 : 0 }}
                        transition={{ duration: 0.2 }}
                      >
                        <ChevronDown size={14} className="text-gray-400" />
                      </motion.div>
                    </Button>
                    {/* Section divider */}
                    <div className="h-px bg-gradient-to-r from-transparent via-gray-600/30 to-transparent" />
                  </div>
                )}

                {/* Section Links */}
                <AnimatePresence>
                  {(isOpen || collapsed) && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                      exit={{ opacity: 0, height: 0 }}
                      transition={{ duration: 0.2 }}
                      className="space-y-1 overflow-hidden"
                    >
                      {section.links.map((link, linkIndex) => {
                        const LinkIcon = link.icon
                        const isActive = pathname.startsWith(link.href)
                        const badgeCount = link.badge ? getBadgeCount(link.badge) : 0
                        const hasSubmenu = link.submenu && link.submenu.length > 0
                        const submenuOpen = openSubmenus[link.href] || false
                        
                        return (
                          <motion.div
                            key={link.href}
                            initial={{ opacity: 0, x: -10 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ duration: 0.2, delay: linkIndex * 0.05 }}
                          >
                            {/* Main Link */}
                            {hasSubmenu ? (
                              <Button
                                variant="ghost"
                                onClick={() => toggleSubmenu(link.href)}
                                className={clsx(
                                  'group flex items-center gap-3 px-4 py-2.5 ml-2 rounded-lg text-sm transition-all duration-200 relative overflow-hidden border-l-2 w-full justify-start',
                                  isActive
                                    ? 'bg-gradient-to-r from-blue-600/20 to-purple-600/20 text-white font-medium border-l-blue-400 shadow-lg border border-blue-500/20'
                                    : 'text-gray-400 hover:text-white hover:bg-gray-700/40 border-l-gray-600/50 hover:border-l-gray-400',
                                  collapsed && 'justify-center px-2 ml-0'
                                )}
                                title={collapsed ? link.label : undefined}
                              >
                                {/* Active indicator */}
                                {isActive && (
                                  <motion.div
                                    key={`activeIndicator-${link.href}`}
                                    initial={{ scaleY: 0 }}
                                    animate={{ scaleY: 1 }}
                                    exit={{ scaleY: 0 }}
                                    className="absolute left-0 top-0 bottom-0 w-1 bg-gradient-to-b from-blue-500 to-purple-600 rounded-r origin-top"
                                    transition={{ type: "spring", bounce: 0.2, duration: 0.6 }}
                                  />
                                )}
                                
                                <LinkIcon 
                                  size={16} 
                                  className={clsx(
                                    'transition-colors flex-shrink-0',
                                    isActive ? 'text-blue-400' : 'text-gray-400 group-hover:text-white'
                                  )} 
                                />
                                
                                {!collapsed && (
                                  <>
                                    <span className="truncate flex-1">{link.label}</span>
                                    <ChevronDown 
                                      size={14} 
                                      className={clsx(
                                        'transition-transform duration-200',
                                        submenuOpen && 'rotate-180'
                                      )}
                                    />
                                  </>
                                )}
                                
                                {/* 📡 Badge de notificaciones */}
                                {badgeCount > 0 && (
                                  <motion.div
                                    initial={{ scale: 0 }}
                                    animate={{ scale: 1 }}
                                    transition={{ type: "spring", bounce: 0.4 }}
                                    className="flex-shrink-0"
                                  >
                                    <Badge 
                                      variant={badgeCount > 5 ? "destructive" : "secondary"}
                                      className={clsx(
                                        'text-xs px-1.5 py-0.5 min-w-[18px] h-5 flex items-center justify-center',
                                        badgeCount > 5 
                                          ? 'bg-red-500/90 text-white animate-pulse' 
                                          : 'bg-orange-500/90 text-white',
                                        collapsed && 'absolute -top-1 -right-1 z-10'
                                      )}
                                    >
                                      {badgeCount > 99 ? '99+' : badgeCount}
                                    </Badge>
                                  </motion.div>
                                )}
                              </Button>
                            ) : (
                              <Link
                                href={link.href}
                                className={clsx(
                                  'group flex items-center gap-3 px-4 py-2.5 ml-2 rounded-lg text-sm transition-all duration-200 relative overflow-hidden border-l-2',
                                  isActive
                                    ? 'bg-gradient-to-r from-blue-600/20 to-purple-600/20 text-white font-medium border-l-blue-400 shadow-lg border border-blue-500/20'
                                    : 'text-gray-400 hover:text-white hover:bg-gray-700/40 border-l-gray-600/50 hover:border-l-gray-400',
                                  collapsed && 'justify-center px-2 ml-0'
                                )}
                                title={collapsed ? link.label : undefined}
                              >
                                {/* Active indicator */}
                                {isActive && (
                                  <motion.div
                                    key={`activeIndicator-${link.href}-main`}
                                    initial={{ scaleY: 0 }}
                                    animate={{ scaleY: 1 }}
                                    exit={{ scaleY: 0 }}
                                    className="absolute left-0 top-0 bottom-0 w-1 bg-gradient-to-b from-blue-500 to-purple-600 rounded-r origin-top"
                                    transition={{ type: "spring", bounce: 0.2, duration: 0.6 }}
                                  />
                                )}
                                
                                <LinkIcon 
                                  size={16} 
                                  className={clsx(
                                    'transition-colors flex-shrink-0',
                                    isActive ? 'text-blue-400' : 'text-gray-400 group-hover:text-white'
                                  )} 
                                />
                                
                                {!collapsed && (
                                  <span className="truncate flex-1">{link.label}</span>
                                )}
                                
                                {/* 📡 Badge de notificaciones */}
                                {badgeCount > 0 && (
                                  <motion.div
                                    initial={{ scale: 0 }}
                                    animate={{ scale: 1 }}
                                    transition={{ type: "spring", bounce: 0.4 }}
                                    className="flex-shrink-0"
                                  >
                                    <Badge 
                                      variant={badgeCount > 5 ? "destructive" : "secondary"}
                                      className={clsx(
                                        'text-xs px-1.5 py-0.5 min-w-[18px] h-5 flex items-center justify-center',
                                        badgeCount > 5 
                                          ? 'bg-red-500/90 text-white animate-pulse' 
                                          : 'bg-orange-500/90 text-white',
                                        collapsed && 'absolute -top-1 -right-1 z-10'
                                      )}
                                    >
                                      {badgeCount > 99 ? '99+' : badgeCount}
                                    </Badge>
                                  </motion.div>
                                )}
                                
                                {/* Hover effect */}
                                <motion.div
                                  className="absolute inset-0 bg-gradient-to-r from-transparent via-white/5 to-transparent opacity-0 group-hover:opacity-100"
                                  transition={{ duration: 0.3 }}
                                />
                              </Link>
                            )}
                            
                            {/* Submenu */}
                            {hasSubmenu && !collapsed && (
                              <AnimatePresence>
                                {submenuOpen && (
                                  <motion.div
                                    initial={{ opacity: 0, height: 0 }}
                                    animate={{ opacity: 1, height: 'auto' }}
                                    exit={{ opacity: 0, height: 0 }}
                                    transition={{ duration: 0.2 }}
                                    className="ml-6 mt-1 space-y-1 overflow-hidden"
                                  >
                                    {link.submenu!.map((sublink, sublinkIndex) => {
                                      const SubLinkIcon = sublink.icon
                                      const isSubActive = pathname === sublink.href
                                      const subBadgeCount = sublink.badge ? getBadgeCount(sublink.badge) : 0
                                      
                                      return (
                                        <motion.div
                                          key={sublink.href}
                                          initial={{ opacity: 0, x: -10 }}
                                          animate={{ opacity: 1, x: 0 }}
                                          transition={{ duration: 0.2, delay: sublinkIndex * 0.05 }}
                                        >
                                          <Link
                                            href={sublink.href}
                                            className={clsx(
                                              'group flex items-center gap-3 px-4 py-2 ml-4 rounded-lg text-sm transition-all duration-200 relative overflow-hidden border-l-2',
                                              isSubActive
                                                ? 'bg-gradient-to-r from-purple-600/20 to-blue-600/20 text-white font-medium border-l-purple-400 shadow-lg border border-purple-500/20'
                                                : 'text-gray-500 hover:text-white hover:bg-gray-700/30 border-l-gray-700/50 hover:border-l-gray-500'
                                            )}
                                          >
                                            {/* Active indicator for submenu */}
                                            {isSubActive && (
                                              <motion.div
                                                key={`activeSubIndicator-${sublink.href}`}
                                                initial={{ scaleY: 0 }}
                                                animate={{ scaleY: 1 }}
                                                exit={{ scaleY: 0 }}
                                                className="absolute left-0 top-0 bottom-0 w-1 bg-gradient-to-b from-purple-500 to-blue-600 rounded-r origin-top"
                                                transition={{ type: "spring", bounce: 0.2, duration: 0.6 }}
                                              />
                                            )}
                                            
                                            <SubLinkIcon 
                                              size={14} 
                                              className={clsx(
                                                'transition-colors flex-shrink-0',
                                                isSubActive ? 'text-purple-400' : 'text-gray-500 group-hover:text-white'
                                              )} 
                                            />
                                            
                                            <span className="truncate flex-1 text-xs">{sublink.label}</span>
                                            
                                            {/* Badge for submenu */}
                                            {subBadgeCount > 0 && (
                                              <motion.div
                                                initial={{ scale: 0 }}
                                                animate={{ scale: 1 }}
                                                transition={{ type: "spring", bounce: 0.4 }}
                                                className="flex-shrink-0"
                                              >
                                                <Badge 
                                                  variant={subBadgeCount > 5 ? "destructive" : "secondary"}
                                                  className={clsx(
                                                    'text-xs px-1.5 py-0.5 min-w-[16px] h-4 flex items-center justify-center',
                                                    subBadgeCount > 5 
                                                      ? 'bg-red-500/90 text-white animate-pulse' 
                                                      : 'bg-orange-500/90 text-white'
                                                  )}
                                                >
                                                  {subBadgeCount > 99 ? '99+' : subBadgeCount}
                                                </Badge>
                                              </motion.div>
                                            )}
                                          </Link>
                                        </motion.div>
                                      )
                                    })}
                                  </motion.div>
                                )}
                              </AnimatePresence>
                            )}
                          </motion.div>
                        )
                      })}
                    </motion.div>
                  )}
                </AnimatePresence>
              </motion.div>
            )
          })}
        </motion.div>
      </nav>

      <Separator className="bg-gray-700/60" />

      {/* Footer */}
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3, delay: 0.4 }}
        className="p-4 bg-gray-800/30"
      >
        {session?.user && (
          <div className="space-y-3">
            {!collapsed && (
              <div className="flex items-center justify-between text-xs text-gray-400">
                <span>Sistema activo</span>
                <div className="flex items-center gap-1">
                  <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
                  <span>Online</span>
                </div>
              </div>
            )}
            
            <LogoutButton 
              showIcon={!collapsed}
              className={clsx(
                'w-full py-2.5 rounded-lg text-sm font-medium transition-all duration-200',
                'bg-gradient-to-r from-rose-500/80 to-red-500/80 hover:from-rose-600/90 hover:to-red-600/90',
                'text-white shadow-md hover:shadow-lg border border-rose-400/20',
                'flex justify-center items-center gap-2',
                collapsed && 'px-2'
              )}
            >
              {collapsed ? <LogOut size={16} /> : 'Cerrar Sesión'}
            </LogoutButton>
          </div>
        )}
      </motion.div>
    </motion.aside>
  )
}

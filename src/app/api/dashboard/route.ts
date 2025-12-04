import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const userRole = session.user.role as string
    const userId = session.user.id as string

    // Fetch dashboard data based on role
    const dashboardData = await getDashboardData(userRole, userId)

    return NextResponse.json(dashboardData)
  } catch (error) {
    console.error('Dashboard API error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

async function getDashboardData(role: string, userId: string) {
  const baseData = {
    user: { role },
    timestamp: new Date().toISOString()
  }

  switch (role) {
    case 'admin':
      return {
        ...baseData,
        widgets: await getAdminWidgets()
      }

    case 'gerente':
      return {
        ...baseData,
        widgets: await getGerenteWidgets()
      }

    case 'comercial':
      return {
        ...baseData,
        widgets: await getComercialWidgets(userId)
      }

    case 'presupuestos':
      return {
        ...baseData,
        widgets: await getPresupuestosWidgets()
      }

    case 'proyectos':
      return {
        ...baseData,
        widgets: await getProyectosWidgets(userId)
      }

    case 'coordinador':
      return {
        ...baseData,
        widgets: await getCoordinadorWidgets(userId)
      }

    case 'logistico':
      return {
        ...baseData,
        widgets: await getLogisticoWidgets()
      }

    case 'gestor':
      return {
        ...baseData,
        widgets: await getGestorWidgets()
      }

    case 'colaborador':
      return {
        ...baseData,
        widgets: await getColaboradorWidgets()
      }

    default:
      return {
        ...baseData,
        widgets: []
      }
  }
}

// Widget data functions for each role
async function getAdminWidgets() {
  const [
    totalUsers,
    totalProjects,
    totalQuotes,
    recentActivities
  ] = await Promise.all([
    prisma.user.count(),
    prisma.proyecto.count(),
    prisma.cotizacion.count(),
    prisma.auditLog.findMany({
      take: 5,
      orderBy: { createdAt: 'desc' },
      include: { usuario: { select: { name: true } } }
    })
  ])

  return [
    {
      type: 'kpi',
      title: 'Usuarios del Sistema',
      value: totalUsers,
      icon: 'Users',
      color: 'blue'
    },
    {
      type: 'kpi',
      title: 'Proyectos Activos',
      value: totalProjects,
      icon: 'FolderOpen',
      color: 'green'
    },
    {
      type: 'kpi',
      title: 'Cotizaciones',
      value: totalQuotes,
      icon: 'FileText',
      color: 'orange'
    },
    {
      type: 'activity_feed',
      title: 'Actividad Reciente',
      activities: recentActivities.map(activity => ({
        id: activity.id,
        description: activity.descripcion,
        user: activity.usuario.name,
        timestamp: activity.createdAt
      }))
    },
    {
      type: 'quick_actions',
      title: 'Acciones Rápidas',
      actions: [
        { label: 'Gestionar Usuarios', href: '/admin/usuarios', icon: 'UserPlus' },
        { label: 'Ver Reportes', href: '/gestion/reportes', icon: 'BarChart3' },
        { label: 'Configurar Sistema', href: '/configuracion', icon: 'Settings' }
      ]
    }
  ]
}

async function getGerenteWidgets() {
  const [
    activeProjects,
    pendingQuotes,
    monthlyRevenue,
    alerts
  ] = await Promise.all([
    prisma.proyecto.count({ where: { estado: { in: ['en_planificacion', 'en_ejecucion'] } } }),
    prisma.cotizacion.count({ where: { estado: 'enviada' } }),
    prisma.valorizacion.aggregate({
      _sum: { montoTotal: true },
      where: {
        periodoFin: {
          gte: new Date(new Date().getFullYear(), new Date().getMonth(), 1),
          lt: new Date(new Date().getFullYear(), new Date().getMonth() + 1, 1)
        }
      }
    }),
    // Mock alerts - in real implementation, this would be a proper alerts system
    Promise.resolve([
      { type: 'warning', message: 'Proyecto XYZ retrasado', priority: 'high' },
      { type: 'info', message: 'Nueva cotización pendiente de aprobación', priority: 'medium' }
    ])
  ])

  return [
    {
      type: 'kpi',
      title: 'Proyectos Activos',
      value: activeProjects,
      icon: 'FolderOpen',
      color: 'green'
    },
    {
      type: 'kpi',
      title: 'Cotizaciones Pendientes',
      value: pendingQuotes,
      icon: 'Clock',
      color: 'yellow'
    },
    {
      type: 'kpi',
      title: 'Ingresos del Mes',
      value: `$${monthlyRevenue._sum.montoTotal || 0}`,
      icon: 'DollarSign',
      color: 'green'
    },
    {
      type: 'alerts',
      title: 'Alertas',
      alerts: alerts
    },
    {
      type: 'quick_actions',
      title: 'Acciones Rápidas',
      actions: [
        { label: 'Ver Todos los Proyectos', href: '/proyectos', icon: 'FolderOpen' },
        { label: 'Aprobar Cotizaciones', href: '/comercial/cotizaciones', icon: 'CheckCircle' },
        { label: 'Reportes Ejecutivos', href: '/gestion/reportes', icon: 'BarChart3' }
      ]
    }
  ]
}

async function getComercialWidgets(userId: string) {
  const [
    myOpportunities,
    myQuotes,
    conversionRate,
    recentActivities
  ] = await Promise.all([
    prisma.crmOportunidad.count({ where: { comercialId: userId } }),
    prisma.cotizacion.count({ where: { comercialId: userId } }),
    // Mock conversion rate calculation
    Promise.resolve(75),
    prisma.crmActividad.findMany({
      take: 5,
      orderBy: { fecha: 'desc' }
    })
  ])

  return [
    {
      type: 'kpi',
      title: 'Mis Oportunidades',
      value: myOpportunities,
      icon: 'Target',
      color: 'blue'
    },
    {
      type: 'kpi',
      title: 'Cotizaciones Enviadas',
      value: myQuotes,
      icon: 'Send',
      color: 'orange'
    },
    {
      type: 'kpi',
      title: 'Tasa de Conversión',
      value: `${conversionRate}%`,
      icon: 'TrendingUp',
      color: 'green'
    },
    {
      type: 'activity_feed',
      title: 'Actividad Reciente',
      activities: recentActivities.map((activity: any) => ({
        id: activity.id,
        description: activity.descripcion,
        opportunity: 'Actividad general',
        timestamp: activity.fecha
      }))
    },
    {
      type: 'quick_actions',
      title: 'Acciones Rápidas',
      actions: [
        { label: 'Nueva Oportunidad', href: '/crm', icon: 'Plus' },
        { label: 'Crear Cotización', href: '/comercial/cotizaciones', icon: 'FileText' },
        { label: 'Ver Plantillas', href: '/comercial/plantillas', icon: 'Template' }
      ]
    }
  ]
}

async function getPresupuestosWidgets() {
  const [
    pendingApprovals,
    quotesThisMonth,
    averageMargin
  ] = await Promise.all([
    prisma.cotizacion.count({ where: { estado: 'enviada' } }),
    prisma.cotizacion.count({
      where: {
        createdAt: {
          gte: new Date(new Date().getFullYear(), new Date().getMonth(), 1)
        }
      }
    }),
    // Mock average margin
    Promise.resolve(25)
  ])

  return [
    {
      type: 'kpi',
      title: 'Aprobaciones Pendientes',
      value: pendingApprovals,
      icon: 'Clock',
      color: 'yellow'
    },
    {
      type: 'kpi',
      title: 'Cotizaciones del Mes',
      value: quotesThisMonth,
      icon: 'Calendar',
      color: 'blue'
    },
    {
      type: 'kpi',
      title: 'Margen Promedio',
      value: `${averageMargin}%`,
      icon: 'Percent',
      color: 'green'
    },
    {
      type: 'quick_actions',
      title: 'Acciones Rápidas',
      actions: [
        { label: 'Revisar Cotizaciones', href: '/comercial/cotizaciones', icon: 'Eye' },
        { label: 'Ver Plantillas', href: '/comercial/plantillas', icon: 'Template' }
      ]
    }
  ]
}

async function getProyectosWidgets(userId: string) {
  const [
    myProjects,
    tasksThisWeek,
    overdueTasks,
    recentUpdates
  ] = await Promise.all([
    prisma.proyecto.count({ where: { /* assigned projects */ } }),
    // Mock data for tasks
    Promise.resolve(12),
    Promise.resolve(3),
    prisma.auditLog.findMany({
      where: { entidadTipo: 'PROYECTO' },
      take: 5,
      orderBy: { createdAt: 'desc' },
      include: { usuario: { select: { name: true } } }
    })
  ])

  return [
    {
      type: 'kpi',
      title: 'Mis Proyectos',
      value: myProjects,
      icon: 'FolderOpen',
      color: 'blue'
    },
    {
      type: 'kpi',
      title: 'Tareas Esta Semana',
      value: tasksThisWeek,
      icon: 'CheckSquare',
      color: 'green'
    },
    {
      type: 'kpi',
      title: 'Tareas Vencidas',
      value: overdueTasks,
      icon: 'AlertTriangle',
      color: 'red'
    },
    {
      type: 'activity_feed',
      title: 'Actualizaciones Recientes',
      activities: recentUpdates.map((update: any) => ({
        id: update.id,
        description: update.descripcion,
        user: update.usuario.name,
        timestamp: update.createdAt
      }))
    },
    {
      type: 'quick_actions',
      title: 'Acciones Rápidas',
      actions: [
        { label: 'Ver Mis Proyectos', href: '/proyectos', icon: 'FolderOpen' },
        { label: 'Registrar Horas', href: '/registro-horas', icon: 'Clock' },
        { label: 'Actualizar Cronograma', href: '/proyectos/cronograma', icon: 'Calendar' }
      ]
    }
  ]
}

async function getCoordinadorWidgets(userId: string) {
  const [
    coordinatedProjects,
    pendingApprovals,
    teamTasks,
    alerts
  ] = await Promise.all([
    prisma.proyecto.count({ where: { /* coordinated by this user */ } }),
    // Mock pending approvals
    Promise.resolve(5),
    Promise.resolve(28),
    Promise.resolve([
      { type: 'warning', message: 'Proyecto ABC necesita aprobación de cambios', priority: 'high' },
      { type: 'info', message: 'Equipo solicita materiales adicionales', priority: 'medium' }
    ])
  ])

  return [
    {
      type: 'kpi',
      title: 'Proyectos Coordinados',
      value: coordinatedProjects,
      icon: 'Users',
      color: 'blue'
    },
    {
      type: 'kpi',
      title: 'Aprobaciones Pendientes',
      value: pendingApprovals,
      icon: 'CheckCircle',
      color: 'yellow'
    },
    {
      type: 'kpi',
      title: 'Tareas del Equipo',
      value: teamTasks,
      icon: 'UserCheck',
      color: 'green'
    },
    {
      type: 'alerts',
      title: 'Alertas de Coordinación',
      alerts: alerts
    },
    {
      type: 'quick_actions',
      title: 'Acciones Rápidas',
      actions: [
        { label: 'Aprobar Cambios', href: '/proyectos/aprobaciones', icon: 'Check' },
        { label: 'Ver Equipos', href: '/proyectos/equipos', icon: 'Users' },
        { label: 'Reportes de Avance', href: '/proyectos/reportes', icon: 'BarChart3' }
      ]
    }
  ]
}

async function getLogisticoWidgets() {
  const [
    pendingOrders,
    ordersThisMonth,
    supplierResponses,
    urgentItems
  ] = await Promise.all([
    prisma.pedidoEquipo.count({ where: { estado: 'borrador' } }),
    prisma.pedidoEquipo.count({
      where: {
        createdAt: {
          gte: new Date(new Date().getFullYear(), new Date().getMonth(), 1)
        }
      }
    }),
    // Mock supplier responses
    Promise.resolve(8),
    Promise.resolve(3)
  ])

  return [
    {
      type: 'kpi',
      title: 'Pedidos Pendientes',
      value: pendingOrders,
      icon: 'Package',
      color: 'yellow'
    },
    {
      type: 'kpi',
      title: 'Pedidos del Mes',
      value: ordersThisMonth,
      icon: 'ShoppingCart',
      color: 'blue'
    },
    {
      type: 'kpi',
      title: 'Respuestas Proveedores',
      value: supplierResponses,
      icon: 'MessageSquare',
      color: 'green'
    },
    {
      type: 'kpi',
      title: 'Items Urgentes',
      value: urgentItems,
      icon: 'AlertTriangle',
      color: 'red'
    },
    {
      type: 'quick_actions',
      title: 'Acciones Rápidas',
      actions: [
        { label: 'Crear Pedido', href: '/logistica/pedidos', icon: 'Plus' },
        { label: 'Ver Listas Técnicas', href: '/logistica/listas', icon: 'List' },
        { label: 'Cotizar con Proveedores', href: '/logistica/cotizaciones', icon: 'DollarSign' }
      ]
    }
  ]
}

async function getGestorWidgets() {
  const [
    pendingValorizations,
    reportsThisMonth,
    overdueReports,
    alerts
  ] = await Promise.all([
    prisma.valorizacion.count({ where: { estado: 'pendiente' } }),
    // Mock reports count
    Promise.resolve(15),
    Promise.resolve(2),
    Promise.resolve([
      { type: 'warning', message: 'Valorización del proyecto XYZ vence mañana', priority: 'high' },
      { type: 'info', message: 'Nuevo reporte de rendimiento disponible', priority: 'low' }
    ])
  ])

  return [
    {
      type: 'kpi',
      title: 'Valorizaciones Pendientes',
      value: pendingValorizations,
      icon: 'Calculator',
      color: 'yellow'
    },
    {
      type: 'kpi',
      title: 'Reportes del Mes',
      value: reportsThisMonth,
      icon: 'FileBarChart',
      color: 'blue'
    },
    {
      type: 'kpi',
      title: 'Reportes Vencidos',
      value: overdueReports,
      icon: 'AlertTriangle',
      color: 'red'
    },
    {
      type: 'alerts',
      title: 'Alertas de Gestión',
      alerts: alerts
    },
    {
      type: 'quick_actions',
      title: 'Acciones Rápidas',
      actions: [
        { label: 'Generar Valorización', href: '/gestion/valorizaciones', icon: 'Calculator' },
        { label: 'Ver Reportes', href: '/gestion/reportes', icon: 'BarChart3' },
        { label: 'Análisis Financiero', href: '/gestion/analisis', icon: 'TrendingUp' }
      ]
    }
  ]
}

async function getColaboradorWidgets() {
  const [
    myTasks,
    completedTasks,
    upcomingDeadlines,
    recentActivities
  ] = await Promise.all([
    // Mock data for basic user
    Promise.resolve(8),
    Promise.resolve(23),
    Promise.resolve(3),
    prisma.auditLog.findMany({
      take: 5,
      orderBy: { createdAt: 'desc' },
      include: { usuario: { select: { name: true } } }
    })
  ])

  return [
    {
      type: 'kpi',
      title: 'Mis Tareas',
      value: myTasks,
      icon: 'CheckSquare',
      color: 'blue'
    },
    {
      type: 'kpi',
      title: 'Tareas Completadas',
      value: completedTasks,
      icon: 'CheckCircle',
      color: 'green'
    },
    {
      type: 'kpi',
      title: 'Vencimientos Próximos',
      value: upcomingDeadlines,
      icon: 'Calendar',
      color: 'orange'
    },
    {
      type: 'activity_feed',
      title: 'Actividad del Sistema',
      activities: recentActivities.map((activity: any) => ({
        id: activity.id,
        description: activity.descripcion,
        user: activity.usuario.name,
        timestamp: activity.createdAt
      }))
    },
    {
      type: 'quick_actions',
      title: 'Acciones Disponibles',
      actions: [
        { label: 'Ver Mis Tareas', href: '/tareas', icon: 'CheckSquare' },
        { label: 'Registrar Horas', href: '/registro-horas', icon: 'Clock' },
        { label: 'Ver Proyectos', href: '/proyectos', icon: 'FolderOpen' }
      ]
    }
  ]
}

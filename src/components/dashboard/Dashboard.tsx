'use client'

import { useEffect, useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Alert, AlertDescription } from '@/components/ui/alert'
import {
  Users,
  FolderOpen,
  FileText,
  Target,
  Send,
  TrendingUp,
  CheckSquare,
  AlertTriangle,
  Calculator,
  BarChart3,
  Package,
  ShoppingCart,
  MessageSquare,
  CheckCircle,
  Calendar,
  Plus,
  Clock,
  Eye,
  File,
  DollarSign,
  UserCheck,
  Settings,
  UserPlus
} from 'lucide-react'
import Link from 'next/link'

interface Widget {
  type: 'kpi' | 'activity_feed' | 'quick_actions' | 'alerts'
  title: string
  value?: any
  icon?: string
  color?: string
  activities?: any[]
  actions?: any[]
  alerts?: any[]
}

interface DashboardData {
  user: { role: string }
  widgets: Widget[]
}

const iconMap = {
  Users,
  FolderOpen,
  FileText,
  Target,
  Send,
  TrendingUp,
  CheckSquare,
  AlertTriangle,
  Calculator,
  BarChart3,
  Package,
  ShoppingCart,
  MessageSquare,
  CheckCircle,
  Calendar,
  Plus,
  Clock,
  Eye,
  File,
  DollarSign,
  UserCheck,
  Settings,
  UserPlus
}

export default function Dashboard() {
  const [dashboardData, setDashboardData] = useState<DashboardData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    fetchDashboardData()
  }, [])

  const fetchDashboardData = async () => {
    try {
      const response = await fetch('/api/dashboard')
      if (!response.ok) {
        throw new Error('Failed to fetch dashboard data')
      }
      const data = await response.json()
      setDashboardData(data)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred')
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Alert className="max-w-md">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>
            Error loading dashboard: {error}
          </AlertDescription>
        </Alert>
      </div>
    )
  }

  if (!dashboardData) {
    return null
  }

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">
            Dashboard - {dashboardData.user.role.charAt(0).toUpperCase() + dashboardData.user.role.slice(1)}
          </h1>
          <p className="text-gray-600 mt-2">
            Bienvenido al sistema GYS. Aquí tienes un resumen de tu actividad.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {dashboardData.widgets.map((widget, index) => (
            <DashboardWidget key={index} widget={widget} />
          ))}
        </div>
      </div>
    </div>
  )
}

function DashboardWidget({ widget }: { widget: Widget }) {
  const renderWidget = () => {
    switch (widget.type) {
      case 'kpi':
        return <KPIWidget widget={widget} />
      case 'activity_feed':
        return <ActivityFeedWidget widget={widget} />
      case 'quick_actions':
        return <QuickActionsWidget widget={widget} />
      case 'alerts':
        return <AlertsWidget widget={widget} />
      default:
        return null
    }
  }

  return (
    <Card className="h-fit">
      <CardHeader className="pb-3">
        <CardTitle className="text-lg">{widget.title}</CardTitle>
      </CardHeader>
      <CardContent>
        {renderWidget()}
      </CardContent>
    </Card>
  )
}

function KPIWidget({ widget }: { widget: Widget }) {
  const IconComponent = widget.icon ? iconMap[widget.icon as keyof typeof iconMap] : null

  const getColorClasses = (color?: string) => {
    switch (color) {
      case 'blue': return 'text-blue-600 bg-blue-100'
      case 'green': return 'text-green-600 bg-green-100'
      case 'orange': return 'text-orange-600 bg-orange-100'
      case 'red': return 'text-red-600 bg-red-100'
      case 'yellow': return 'text-yellow-600 bg-yellow-100'
      default: return 'text-gray-600 bg-gray-100'
    }
  }

  return (
    <div className="flex items-center space-x-4">
      {IconComponent && (
        <div className={`p-3 rounded-full ${getColorClasses(widget.color)}`}>
          <IconComponent className="h-6 w-6" />
        </div>
      )}
      <div>
        <div className="text-2xl font-bold text-gray-900">{widget.value}</div>
      </div>
    </div>
  )
}

function ActivityFeedWidget({ widget }: { widget: Widget }) {
  return (
    <div className="space-y-3">
      {widget.activities?.slice(0, 3).map((activity: any) => (
        <div key={activity.id} className="flex items-start space-x-3">
          <div className="w-2 h-2 bg-blue-500 rounded-full mt-2 flex-shrink-0"></div>
          <div className="flex-1 min-w-0">
            <p className="text-sm text-gray-900 truncate">{activity.description}</p>
            <div className="flex items-center space-x-2 mt-1">
              <span className="text-xs text-gray-500">{activity.user}</span>
              <span className="text-xs text-gray-400">•</span>
              <span className="text-xs text-gray-400">
                {new Date(activity.timestamp).toLocaleDateString()}
              </span>
            </div>
          </div>
        </div>
      ))}
      {(!widget.activities || widget.activities.length === 0) && (
        <p className="text-sm text-gray-500">No hay actividad reciente</p>
      )}
    </div>
  )
}

function QuickActionsWidget({ widget }: { widget: Widget }) {
  return (
    <div className="space-y-2">
      {widget.actions?.map((action: any, index: number) => {
        const IconComponent = action.icon ? iconMap[action.icon as keyof typeof iconMap] : null

        return (
          <Link key={index} href={action.href}>
            <Button variant="outline" className="w-full justify-start" size="sm">
              {IconComponent && <IconComponent className="h-4 w-4 mr-2" />}
              {action.label}
            </Button>
          </Link>
        )
      })}
    </div>
  )
}

function AlertsWidget({ widget }: { widget: Widget }) {
  return (
    <div className="space-y-3">
      {widget.alerts?.map((alert: any, index: number) => (
        <Alert key={index} className={`${
          alert.priority === 'high' ? 'border-red-200 bg-red-50' :
          alert.priority === 'medium' ? 'border-yellow-200 bg-yellow-50' :
          'border-blue-200 bg-blue-50'
        }`}>
          <AlertTriangle className={`h-4 w-4 ${
            alert.priority === 'high' ? 'text-red-600' :
            alert.priority === 'medium' ? 'text-yellow-600' :
            'text-blue-600'
          }`} />
          <AlertDescription className="text-sm">
            {alert.message}
          </AlertDescription>
        </Alert>
      ))}
      {(!widget.alerts || widget.alerts.length === 0) && (
        <p className="text-sm text-gray-500">No hay alertas</p>
      )}
    </div>
  )
}
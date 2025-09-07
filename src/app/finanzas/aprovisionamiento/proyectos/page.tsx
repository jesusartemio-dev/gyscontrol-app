// ✅ Vista Consolidada de Proyectos - Aprovisionamiento Financiero
// 📡 Next.js 14 App Router - Server Component con filtros avanzados
// 🎯 Tabla con listas y pedidos por proyecto + resumen financiero

import { Suspense } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Skeleton } from '@/components/ui/skeleton'
import { 
  Search, 
  Filter, 
  Download, 
  Eye,
  Calendar,
  DollarSign,
  Package,
  ShoppingCart,
  AlertTriangle,
  TrendingUp
} from 'lucide-react'
import Link from 'next/link'

// 🔁 Tipos para la vista consolidada
interface ProyectoConsolidado {
  id: string
  nombre: string
  codigo: string
  estado: 'activo' | 'pausado' | 'completado'
  responsable: string
  fechaInicio: string
  fechaFin: string
  listas: {
    total: number
    enviadas: number
    pendientes: number
    montoTotal: number
  }
  pedidos: {
    total: number
    aprobados: number
    pendientes: number
    montoTotal: number
  }
  alertas: number
  progreso: number
}

// 🔁 Componente de Filtros Avanzados
function FiltrosAvanzados() {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Filter className="h-5 w-5" />
          Filtros Avanzados
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid gap-4 md:grid-cols-4">
          <div className="space-y-2">
            <label className="text-sm font-medium">Buscar Proyecto</label>
            <div className="relative">
              <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input placeholder="Nombre o código..." className="pl-8" />
            </div>
          </div>
          
          <div className="space-y-2">
            <label className="text-sm font-medium">Estado</label>
            <Select>
              <SelectTrigger>
                <SelectValue placeholder="Todos los estados" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="todos">Todos</SelectItem>
                <SelectItem value="activo">Activo</SelectItem>
                <SelectItem value="pausado">Pausado</SelectItem>
                <SelectItem value="completado">Completado</SelectItem>
              </SelectContent>
            </Select>
          </div>
          
          <div className="space-y-2">
            <label className="text-sm font-medium">Responsable</label>
            <Select>
              <SelectTrigger>
                <SelectValue placeholder="Todos" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="todos">Todos</SelectItem>
                <SelectItem value="juan.perez">Juan Pérez</SelectItem>
                <SelectItem value="maria.garcia">María García</SelectItem>
                <SelectItem value="carlos.lopez">Carlos López</SelectItem>
              </SelectContent>
            </Select>
          </div>
          
          <div className="space-y-2">
            <label className="text-sm font-medium">Período</label>
            <Select>
              <SelectTrigger>
                <SelectValue placeholder="Último mes" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="semana">Última semana</SelectItem>
                <SelectItem value="mes">Último mes</SelectItem>
                <SelectItem value="trimestre">Último trimestre</SelectItem>
                <SelectItem value="año">Último año</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
        
        <div className="flex gap-2 mt-4">
          <Button variant="outline" size="sm">
            Limpiar Filtros
          </Button>
          <Button size="sm">
            Aplicar Filtros
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}

// 🔁 Componente de KPIs Consolidados
function KPIsConsolidados() {
  const kpis = {
    proyectosActivos: 12,
    montoTotalListas: 1850000,
    montoTotalPedidos: 2100000,
    alertasActivas: 8
  }

  return (
    <div className="grid gap-4 md:grid-cols-4">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Proyectos Activos</CardTitle>
          <Package className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{kpis.proyectosActivos}</div>
          <p className="text-xs text-muted-foreground">
            Con aprovisionamiento activo
          </p>
        </CardContent>
      </Card>
      
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Total Listas</CardTitle>
          <DollarSign className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">
            ${kpis.montoTotalListas.toLocaleString()}
          </div>
          <p className="text-xs text-muted-foreground">
            Monto total en listas
          </p>
        </CardContent>
      </Card>
      
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Total Pedidos</CardTitle>
          <ShoppingCart className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">
            ${kpis.montoTotalPedidos.toLocaleString()}
          </div>
          <p className="text-xs text-muted-foreground">
            Monto total en pedidos
          </p>
        </CardContent>
      </Card>
      
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Alertas Activas</CardTitle>
          <AlertTriangle className="h-4 w-4 text-destructive" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold text-destructive">{kpis.alertasActivas}</div>
          <p className="text-xs text-muted-foreground">
            Requieren atención
          </p>
        </CardContent>
      </Card>
    </div>
  )
}

// 🔁 Componente de Tabla de Proyectos
function TablaProyectos() {
  // 📡 Datos simulados - en implementación real vendrían de la API
  const proyectos: ProyectoConsolidado[] = [
    {
      id: '1',
      nombre: 'Proyecto Alpha',
      codigo: 'PRY-2024-001',
      estado: 'activo',
      responsable: 'Juan Pérez',
      fechaInicio: '2024-01-15',
      fechaFin: '2024-06-30',
      listas: {
        total: 3,
        enviadas: 2,
        pendientes: 1,
        montoTotal: 450000
      },
      pedidos: {
        total: 5,
        aprobados: 3,
        pendientes: 2,
        montoTotal: 520000
      },
      alertas: 2,
      progreso: 65
    },
    {
      id: '2',
      nombre: 'Proyecto Beta',
      codigo: 'PRY-2024-002',
      estado: 'activo',
      responsable: 'María García',
      fechaInicio: '2024-02-01',
      fechaFin: '2024-08-15',
      listas: {
        total: 2,
        enviadas: 1,
        pendientes: 1,
        montoTotal: 320000
      },
      pedidos: {
        total: 3,
        aprobados: 2,
        pendientes: 1,
        montoTotal: 380000
      },
      alertas: 1,
      progreso: 45
    },
    {
      id: '3',
      nombre: 'Proyecto Gamma',
      codigo: 'PRY-2024-003',
      estado: 'pausado',
      responsable: 'Carlos López',
      fechaInicio: '2024-03-01',
      fechaFin: '2024-09-30',
      listas: {
        total: 4,
        enviadas: 1,
        pendientes: 3,
        montoTotal: 680000
      },
      pedidos: {
        total: 2,
        aprobados: 1,
        pendientes: 1,
        montoTotal: 240000
      },
      alertas: 3,
      progreso: 25
    }
  ]

  const getEstadoBadge = (estado: string) => {
    switch (estado) {
      case 'activo':
        return <Badge variant="default">Activo</Badge>
      case 'pausado':
        return <Badge variant="secondary">Pausado</Badge>
      case 'completado':
        return <Badge variant="outline">Completado</Badge>
      default:
        return <Badge variant="secondary">{estado}</Badge>
    }
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>Proyectos Consolidados</CardTitle>
            <CardDescription>
              Vista integral de listas y pedidos por proyecto
            </CardDescription>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" size="sm">
              <Download className="mr-2 h-4 w-4" />
              Exportar
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Proyecto</TableHead>
                <TableHead>Estado</TableHead>
                <TableHead>Responsable</TableHead>
                <TableHead>Listas</TableHead>
                <TableHead>Pedidos</TableHead>
                <TableHead>Monto Total</TableHead>
                <TableHead>Alertas</TableHead>
                <TableHead>Progreso</TableHead>
                <TableHead>Acciones</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {proyectos.map((proyecto) => (
                <TableRow key={proyecto.id}>
                  <TableCell>
                    <div>
                      <div className="font-medium">{proyecto.nombre}</div>
                      <div className="text-sm text-muted-foreground">{proyecto.codigo}</div>
                    </div>
                  </TableCell>
                  <TableCell>{getEstadoBadge(proyecto.estado)}</TableCell>
                  <TableCell>{proyecto.responsable}</TableCell>
                  <TableCell>
                    <div className="text-sm">
                      <div>{proyecto.listas.total} total</div>
                      <div className="text-muted-foreground">
                        {proyecto.listas.enviadas} enviadas, {proyecto.listas.pendientes} pendientes
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="text-sm">
                      <div>{proyecto.pedidos.total} total</div>
                      <div className="text-muted-foreground">
                        {proyecto.pedidos.aprobados} aprobados, {proyecto.pedidos.pendientes} pendientes
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="text-sm">
                      <div className="font-medium">
                        ${(proyecto.listas.montoTotal + proyecto.pedidos.montoTotal).toLocaleString()}
                      </div>
                      <div className="text-muted-foreground">
                        L: ${proyecto.listas.montoTotal.toLocaleString()}<br/>
                        P: ${proyecto.pedidos.montoTotal.toLocaleString()}
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    {proyecto.alertas > 0 ? (
                      <Badge variant="destructive">{proyecto.alertas}</Badge>
                    ) : (
                      <Badge variant="outline">0</Badge>
                    )}
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <div className="w-16 bg-muted rounded-full h-2">
                        <div 
                          className="bg-primary h-2 rounded-full" 
                          style={{ width: `${proyecto.progreso}%` }}
                        />
                      </div>
                      <span className="text-sm">{proyecto.progreso}%</span>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex gap-1">
                      <Button variant="ghost" size="sm">
                        <Eye className="h-4 w-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  )
}

// 🔁 Skeleton para estados de carga
function ProyectosSkeleton() {
  return (
    <div className="space-y-6">
      <div className="grid gap-4 md:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <Card key={i}>
            <CardHeader className="space-y-0 pb-2">
              <Skeleton className="h-4 w-24" />
            </CardHeader>
            <CardContent>
              <Skeleton className="h-8 w-16 mb-2" />
              <Skeleton className="h-3 w-32" />
            </CardContent>
          </Card>
        ))}
      </div>
      
      <Card>
        <CardHeader>
          <Skeleton className="h-6 w-48" />
          <Skeleton className="h-4 w-64" />
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {Array.from({ length: 5 }).map((_, i) => (
              <Skeleton key={i} className="h-16 w-full" />
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

// ✅ Componente principal - Server Component
export default function ProyectosConsolidados() {
  return (
    <div className="space-y-6">
      {/* 📡 Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Vista Consolidada de Proyectos</h1>
          <p className="text-muted-foreground">
            Seguimiento integral de listas y pedidos por proyecto con análisis financiero
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline">
            <Calendar className="mr-2 h-4 w-4" />
            Timeline
          </Button>
          <Button>
            <TrendingUp className="mr-2 h-4 w-4" />
            Análisis
          </Button>
        </div>
      </div>

      {/* 📡 KPIs con Suspense */}
      <Suspense fallback={<ProyectosSkeleton />}>
        <KPIsConsolidados />
      </Suspense>

      {/* 📡 Filtros */}
      <FiltrosAvanzados />

      {/* 📡 Tabla principal */}
      <Suspense fallback={<Skeleton className="h-96 w-full" />}>
        <TablaProyectos />
      </Suspense>
    </div>
  )
}

// 📡 Metadata para SEO y navegación
export const metadata = {
  title: 'Proyectos Consolidados | Aprovisionamiento Financiero | GYS',
  description: 'Vista consolidada de proyectos con seguimiento de listas y pedidos'
}
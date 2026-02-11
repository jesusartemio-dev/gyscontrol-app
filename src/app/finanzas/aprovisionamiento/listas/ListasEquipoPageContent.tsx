/**
 * Contenido de Listas de Equipo - Vista minimalista
 */

'use client'

import { useState, useMemo } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import { useSession } from 'next-auth/react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Skeleton } from '@/components/ui/skeleton'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  Package,
  Plus,
  Download,
  AlertTriangle,
  CheckCircle,
  Clock,
  DollarSign,
  FileText,
  Search,
  Eye,
  ArrowLeft
} from 'lucide-react'
import Link from 'next/link'

import { useListasEquipo } from '@/lib/services/aprovisionamientoQuery'
import type { ListasEquipoPaginationParams } from '@/types/payloads'

export default function ListasEquipoPageContent() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const { status } = useSession()

  const [busqueda, setBusqueda] = useState(searchParams.get('busqueda') || '')

  // URL params
  const page = parseInt(searchParams.get('page') || '1')
  const limit = parseInt(searchParams.get('limit') || '15')
  const proyecto = searchParams.get('proyecto') || undefined
  const estado = searchParams.get('estado') || undefined

  // Query params
  const queryParams: ListasEquipoPaginationParams = useMemo(() => ({
    page,
    limit,
    ...(proyecto && { proyectoId: proyecto }),
    ...(estado && { estado }),
    ...(busqueda && { busqueda }),
  }), [page, limit, proyecto, estado, busqueda])

  const {
    data: listasResponse,
    isLoading: loading,
    isError
  } = useListasEquipo(queryParams, {
    enabled: status !== 'loading'
  })

  // Transform data
  const listasData = useMemo(() => {
    if (!listasResponse) {
      return { items: [], total: 0, pagination: { page: 1, limit: 15, total: 0, totalPages: 0 } }
    }
    return {
      items: listasResponse.data || [],
      total: listasResponse.meta?.total || 0,
      pagination: listasResponse.meta || { page: 1, limit: 15, total: 0, totalPages: 0 }
    }
  }, [listasResponse])

  // Stats
  const stats = useMemo(() => {
    const items = listasData.items || []
    return {
      total: listasData.pagination.total || items.length,
      pendientes: items.filter((item: any) => item.estado === 'pendiente').length,
      aprobadas: items.filter((item: any) => item.estado === 'aprobada').length,
      rechazadas: items.filter((item: any) => item.estado === 'rechazada').length,
      montoTotal: items.reduce((sum: number, item: any) => {
        const itemTotal = (item.listaEquipoItem || []).reduce((s: number, i: any) => {
          return s + ((i.precioElegido || i.presupuesto || 0) * (i.cantidad || 0))
        }, 0)
        return sum + itemTotal
      }, 0)
    }
  }, [listasData])

  const handleSearch = () => {
    const params = new URLSearchParams(searchParams.toString())
    params.set('page', '1')
    if (busqueda) {
      params.set('busqueda', busqueda)
    } else {
      params.delete('busqueda')
    }
    router.push(`/finanzas/aprovisionamiento/listas?${params.toString()}`)
  }

  const handleEstadoChange = (value: string) => {
    const params = new URLSearchParams(searchParams.toString())
    params.set('page', '1')
    if (value && value !== 'todos') {
      params.set('estado', value)
    } else {
      params.delete('estado')
    }
    router.push(`/finanzas/aprovisionamiento/listas?${params.toString()}`)
  }

  const getEstadoBadge = (estado: string) => {
    switch (estado) {
      case 'borrador':
        return <Badge className="bg-gray-100 text-gray-700 text-[10px] h-5">Borrador</Badge>
      case 'por_revisar':
        return <Badge className="bg-yellow-100 text-yellow-700 text-[10px] h-5">Por Revisar</Badge>
      case 'por_cotizar':
        return <Badge className="bg-orange-100 text-orange-700 text-[10px] h-5">Por Cotizar</Badge>
      case 'por_validar':
        return <Badge className="bg-amber-100 text-amber-700 text-[10px] h-5">Por Validar</Badge>
      case 'por_aprobar':
        return <Badge className="bg-blue-100 text-blue-700 text-[10px] h-5">Por Aprobar</Badge>
      case 'aprobado': case 'aprobada':
        return <Badge className="bg-green-100 text-green-700 text-[10px] h-5">Aprobado</Badge>
      case 'rechazado': case 'rechazada':
        return <Badge className="bg-red-100 text-red-700 text-[10px] h-5">Rechazado</Badge>
      default:
        return <Badge variant="secondary" className="text-[10px] h-5">{estado}</Badge>
    }
  }

  if (loading) {
    return (
      <div className="p-4 space-y-4">
        <div className="flex justify-between items-center">
          <Skeleton className="h-6 w-40" />
          <Skeleton className="h-7 w-24" />
        </div>
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className="h-20" />
          ))}
        </div>
        <Skeleton className="h-10 w-full" />
        <div className="space-y-2">
          {Array.from({ length: 8 }).map((_, i) => (
            <Skeleton key={i} className="h-10 w-full" />
          ))}
        </div>
      </div>
    )
  }

  if (isError) {
    return (
      <div className="p-4">
        <div className="flex flex-col items-center justify-center py-12 text-center border rounded-lg bg-white">
          <AlertTriangle className="h-10 w-10 text-red-300 mb-3" />
          <p className="text-sm text-muted-foreground">Error al cargar listas</p>
          <Button variant="outline" size="sm" className="mt-3 h-7 text-xs" onClick={() => window.location.reload()}>
            Reintentar
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div className="p-4 space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="sm" className="h-7 px-2 text-xs" asChild>
            <Link href="/finanzas/aprovisionamiento">
              <ArrowLeft className="h-3.5 w-3.5 mr-1" />
              Dashboard
            </Link>
          </Button>
          <FileText className="h-5 w-5 text-emerald-600" />
          <h1 className="text-lg font-semibold">Listas de Equipo</h1>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        <div className="bg-white border rounded-lg p-3">
          <div className="flex items-center justify-between mb-1">
            <span className="text-[10px] text-muted-foreground font-medium">Total</span>
            <Package className="h-4 w-4 text-blue-500" />
          </div>
          <p className="text-lg font-bold">{stats.total}</p>
        </div>

        <div className="bg-white border rounded-lg p-3">
          <div className="flex items-center justify-between mb-1">
            <span className="text-[10px] text-muted-foreground font-medium">Pendientes</span>
            <Clock className="h-4 w-4 text-yellow-500" />
          </div>
          <p className="text-lg font-bold text-yellow-600">{stats.pendientes}</p>
        </div>

        <div className="bg-white border rounded-lg p-3">
          <div className="flex items-center justify-between mb-1">
            <span className="text-[10px] text-muted-foreground font-medium">Aprobadas</span>
            <CheckCircle className="h-4 w-4 text-green-500" />
          </div>
          <p className="text-lg font-bold text-green-600">{stats.aprobadas}</p>
        </div>

        <div className="bg-white border rounded-lg p-3">
          <div className="flex items-center justify-between mb-1">
            <span className="text-[10px] text-muted-foreground font-medium">Rechazadas</span>
            <AlertTriangle className="h-4 w-4 text-red-500" />
          </div>
          <p className="text-lg font-bold text-red-600">{stats.rechazadas}</p>
        </div>

        <div className="bg-white border rounded-lg p-3">
          <div className="flex items-center justify-between mb-1">
            <span className="text-[10px] text-muted-foreground font-medium">Monto Total</span>
            <DollarSign className="h-4 w-4 text-emerald-500" />
          </div>
          <p className="text-base font-bold">
            ${stats.montoTotal.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
          </p>
        </div>
      </div>

      {/* Filtros inline */}
      <div className="flex items-center gap-2 bg-white border rounded-lg p-2">
        <div className="relative flex-1 max-w-xs">
          <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
          <Input
            placeholder="Buscar lista..."
            value={busqueda}
            onChange={(e) => setBusqueda(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
            className="h-7 pl-7 text-xs"
          />
        </div>
        <Select value={estado || 'todos'} onValueChange={handleEstadoChange}>
          <SelectTrigger className="h-7 w-32 text-xs">
            <SelectValue placeholder="Estado" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="todos">Todos</SelectItem>
            <SelectItem value="borrador">Borrador</SelectItem>
            <SelectItem value="por_revisar">Por Revisar</SelectItem>
            <SelectItem value="por_cotizar">Por Cotizar</SelectItem>
            <SelectItem value="por_validar">Por Validar</SelectItem>
            <SelectItem value="por_aprobar">Por Aprobar</SelectItem>
            <SelectItem value="aprobado">Aprobado</SelectItem>
            <SelectItem value="rechazado">Rechazado</SelectItem>
          </SelectContent>
        </Select>
        <Button variant="outline" size="sm" className="h-7 text-xs" onClick={handleSearch}>
          Filtrar
        </Button>
      </div>

      {/* Tabla */}
      {listasData.items.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-12 text-center border rounded-lg bg-white">
          <Package className="h-10 w-10 text-gray-300 mb-3" />
          <p className="text-sm text-muted-foreground">No hay listas</p>
        </div>
      ) : (
        <div className="border rounded-lg bg-white overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow className="hover:bg-transparent">
                <TableHead className="text-xs font-medium">Lista</TableHead>
                <TableHead className="text-xs font-medium">Proyecto</TableHead>
                <TableHead className="text-xs font-medium w-20">Estado</TableHead>
                <TableHead className="text-xs font-medium text-center w-16">Items</TableHead>
                <TableHead className="text-xs font-medium text-right">Monto</TableHead>
                <TableHead className="text-xs font-medium w-24">Fecha</TableHead>
                <TableHead className="text-xs font-medium w-12"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {listasData.items.map((lista: any) => {
                const montoLista = (lista.listaEquipoItem || []).reduce((s: number, i: any) => {
                  return s + ((i.precioElegido || i.presupuesto || 0) * (i.cantidad || 0))
                }, 0)

                return (
                  <TableRow key={lista.id} className="hover:bg-gray-50/50">
                    <TableCell className="py-2">
                      <div>
                        <p className="text-xs font-medium truncate max-w-[180px]" title={lista.nombre}>
                          {lista.nombre}
                        </p>
                        <p className="text-[10px] text-muted-foreground font-mono">{lista.codigo || lista.id.slice(0, 8)}</p>
                      </div>
                    </TableCell>
                    <TableCell className="py-2">
                      <span className="text-xs truncate max-w-[150px] block" title={lista.proyecto?.nombre}>
                        {lista.proyecto?.nombre || '-'}
                      </span>
                    </TableCell>
                    <TableCell className="py-2">{getEstadoBadge(lista.estado)}</TableCell>
                    <TableCell className="py-2 text-center">
                      <Badge variant="outline" className="text-[10px] h-5 px-1.5">
                        {lista._count?.listaEquipoItem || lista.listaEquipoItem?.length || 0}
                      </Badge>
                    </TableCell>
                    <TableCell className="py-2 text-right">
                      <span className="text-xs font-medium">
                        ${montoLista.toLocaleString('en-US', { minimumFractionDigits: 0 })}
                      </span>
                    </TableCell>
                    <TableCell className="py-2">
                      <span className="text-[10px] text-muted-foreground">
                        {lista.createdAt ? new Date(lista.createdAt).toLocaleDateString('es-PE') : '-'}
                      </span>
                    </TableCell>
                    <TableCell className="py-2">
                      <Button variant="ghost" size="sm" className="h-7 w-7 p-0" asChild>
                        <Link href={`/finanzas/aprovisionamiento/listas/${lista.id}`}>
                          <Eye className="h-3.5 w-3.5 text-blue-600" />
                        </Link>
                      </Button>
                    </TableCell>
                  </TableRow>
                )
              })}
            </TableBody>
          </Table>

          {listasData.pagination && (
            <div className="flex items-center justify-between px-4 py-2 border-t text-xs text-muted-foreground">
              <span>
                {((listasData.pagination.page - 1) * listasData.pagination.limit) + 1}-
                {Math.min(listasData.pagination.page * listasData.pagination.limit, listasData.pagination.total)} de {listasData.pagination.total}
              </span>
              <span>Página {listasData.pagination.page} de {listasData.pagination.totalPages || 1}</span>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

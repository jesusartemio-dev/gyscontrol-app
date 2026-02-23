'use client'

import React, { useState, useEffect, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog'
import { Plus, Search, X, Loader2, CreditCard, ChevronRight, Edit, Trash2 } from 'lucide-react'
import { toast } from 'sonner'
import { getHojasDeGastos, deleteHojaDeGastos } from '@/lib/services/hojaDeGastos'
import type { HojaDeGastos } from '@/types'

const ESTADOS = [
  { value: 'all', label: 'Todos' },
  { value: 'borrador', label: 'Borrador' },
  { value: 'enviado', label: 'Enviado' },
  { value: 'aprobado', label: 'Aprobado' },
  { value: 'depositado', label: 'Depositado' },
  { value: 'rendido', label: 'Rendido' },
  { value: 'validado', label: 'Validado' },
  { value: 'cerrado', label: 'Cerrado' },
  { value: 'rechazado', label: 'Rechazado' },
]

const CATEGORIAS = [
  { value: 'all', label: 'Todas' },
  { value: 'gastos', label: 'Gastos' },
  { value: 'equipos', label: 'Equipos' },
  { value: 'servicios', label: 'Servicios' },
]

const formatCurrency = (amount: number) =>
  new Intl.NumberFormat('es-PE', { style: 'currency', currency: 'PEN' }).format(amount)

const formatDate = (date: string) =>
  new Date(date).toLocaleDateString('es-PE', { day: '2-digit', month: 'short', year: 'numeric' })

const estadoColor: Record<string, string> = {
  borrador: 'bg-gray-100 text-gray-700',
  enviado: 'bg-blue-100 text-blue-700',
  aprobado: 'bg-emerald-100 text-emerald-700',
  depositado: 'bg-purple-100 text-purple-700',
  rendido: 'bg-orange-100 text-orange-700',
  validado: 'bg-teal-100 text-teal-700',
  cerrado: 'bg-green-100 text-green-800',
  rechazado: 'bg-red-100 text-red-700',
}

const categoriaLabel: Record<string, string> = {
  gastos: 'Gastos',
  equipos: 'Equipos',
  servicios: 'Servicios',
}

function getAsignadoA(hoja: HojaDeGastos): string {
  if (hoja.proyecto) return `${hoja.proyecto.codigo} - ${hoja.proyecto.nombre}`
  if (hoja.centroCosto) return hoja.centroCosto.nombre
  return '-'
}

export default function MisRequerimientosPage() {
  const router = useRouter()
  const [hojas, setHojas] = useState<HojaDeGastos[]>([])
  const [loading, setLoading] = useState(true)
  const [filterEstado, setFilterEstado] = useState('all')
  const [filterCategoria, setFilterCategoria] = useState('all')
  const [searchTerm, setSearchTerm] = useState('')
  const [deleteTarget, setDeleteTarget] = useState<HojaDeGastos | null>(null)

  useEffect(() => { loadData() }, [])

  const loadData = async () => {
    try {
      setLoading(true)
      const data = await getHojasDeGastos({ scope: 'propios' })
      setHojas(data)
    } catch {
      toast.error('Error al cargar requerimientos')
    } finally {
      setLoading(false)
    }
  }

  const handleDelete = async () => {
    if (!deleteTarget) return
    try {
      await deleteHojaDeGastos(deleteTarget.id)
      toast.success(`Requerimiento ${deleteTarget.numero} eliminado`)
      setDeleteTarget(null)
      loadData()
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Error al eliminar')
    }
  }

  const filtered = useMemo(() => {
    let result = hojas
    if (filterEstado !== 'all') result = result.filter(h => h.estado === filterEstado)
    if (filterCategoria !== 'all') result = result.filter(h => h.categoriaCosto === filterCategoria)
    if (searchTerm) {
      const term = searchTerm.toLowerCase()
      result = result.filter(h =>
        h.numero.toLowerCase().includes(term) ||
        h.motivo.toLowerCase().includes(term) ||
        h.proyecto?.codigo?.toLowerCase().includes(term) ||
        h.proyecto?.nombre?.toLowerCase().includes(term) ||
        h.centroCosto?.nombre?.toLowerCase().includes(term) ||
        h.empleado?.name?.toLowerCase().includes(term)
      )
    }
    return result
  }, [hojas, filterEstado, filterCategoria, searchTerm])

  return (
    <div className="container mx-auto p-4 sm:p-6 space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold flex items-center gap-2">
            <CreditCard className="h-5 w-5 text-amber-600" />
            Mis Requerimientos
          </h1>
          <p className="text-sm text-muted-foreground">
            {hojas.length} requerimientos de dinero
          </p>
        </div>
        <Button onClick={() => router.push('/gastos/mis-requerimientos/nuevo')} className="bg-amber-600 hover:bg-amber-700">
          <Plus className="h-4 w-4 mr-1" />
          Nuevo Requerimiento
        </Button>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-2 flex-wrap">
        <div className="relative flex-1 max-w-xs">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar por número, motivo, proyecto..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-8 h-9"
          />
          {searchTerm && (
            <button onClick={() => setSearchTerm('')} className="absolute right-2 top-2.5">
              <X className="h-4 w-4 text-muted-foreground" />
            </button>
          )}
        </div>
        <Select value={filterEstado} onValueChange={setFilterEstado}>
          <SelectTrigger className="w-[160px] h-9">
            <SelectValue placeholder="Estado" />
          </SelectTrigger>
          <SelectContent>
            {ESTADOS.map(e => (
              <SelectItem key={e.value} value={e.value}>{e.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={filterCategoria} onValueChange={setFilterCategoria}>
          <SelectTrigger className="w-[140px] h-9">
            <SelectValue placeholder="Categoría" />
          </SelectTrigger>
          <SelectContent>
            {CATEGORIAS.map(c => (
              <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Table */}
      <Card>
        <CardContent className="p-0">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : filtered.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              {hojas.length === 0 ? 'No hay requerimientos aún. Crea el primero.' : 'No se encontraron resultados.'}
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Número</TableHead>
                  <TableHead>Motivo</TableHead>
                  <TableHead>Asignado a</TableHead>
                  <TableHead>Categoría</TableHead>
                  <TableHead>Estado</TableHead>
                  <TableHead className="text-right">Solicitado</TableHead>
                  <TableHead className="text-right">Gastado</TableHead>
                  <TableHead className="text-right">Saldo</TableHead>
                  <TableHead>Fecha</TableHead>
                  <TableHead className="w-[80px]"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map(hoja => (
                  <TableRow
                    key={hoja.id}
                    className="cursor-pointer hover:bg-muted/50"
                    onClick={() => router.push(`/gastos/mis-requerimientos/${hoja.id}`)}
                  >
                    <TableCell className="font-mono text-sm font-medium">{hoja.numero}</TableCell>
                    <TableCell className="max-w-[180px] truncate">{hoja.motivo}</TableCell>
                    <TableCell className="text-sm text-muted-foreground max-w-[200px] truncate">
                      {getAsignadoA(hoja)}
                    </TableCell>
                    <TableCell>
                      <span className="text-xs text-muted-foreground capitalize">
                        {categoriaLabel[hoja.categoriaCosto] || hoja.categoriaCosto}
                      </span>
                    </TableCell>
                    <TableCell>
                      <Badge className={`text-xs ${estadoColor[hoja.estado] || ''}`}>
                        {hoja.estado}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right font-mono text-sm">
                      {hoja.requiereAnticipo ? formatCurrency(hoja.montoAnticipo) : '-'}
                    </TableCell>
                    <TableCell className="text-right font-mono text-sm">
                      {formatCurrency(hoja.montoGastado)}
                    </TableCell>
                    <TableCell className={`text-right font-mono text-sm ${hoja.saldo < 0 ? 'text-red-600' : ''}`}>
                      {formatCurrency(hoja.saldo)}
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground whitespace-nowrap">
                      {formatDate(hoja.createdAt)}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1">
                        {['borrador', 'rechazado'].includes(hoja.estado) && (
                          <button
                            onClick={(e) => { e.stopPropagation(); router.push(`/gastos/mis-requerimientos/${hoja.id}`) }}
                            className="p-1 rounded hover:bg-muted"
                            title="Editar"
                          >
                            <Edit className="h-3.5 w-3.5 text-muted-foreground" />
                          </button>
                        )}
                        {hoja.estado === 'borrador' && (
                          <button
                            onClick={(e) => { e.stopPropagation(); setDeleteTarget(hoja) }}
                            className="p-1 rounded hover:bg-red-50"
                            title="Eliminar"
                          >
                            <Trash2 className="h-3.5 w-3.5 text-red-500" />
                          </button>
                        )}
                        <ChevronRight className="h-4 w-4 text-muted-foreground" />
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Delete confirmation */}
      <AlertDialog open={!!deleteTarget} onOpenChange={(open) => !open && setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Eliminar Requerimiento</AlertDialogTitle>
            <AlertDialogDescription>
              ¿Eliminar el requerimiento &quot;{deleteTarget?.numero}&quot;? Esta acción no se puede deshacer.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-red-600 hover:bg-red-700 text-white">
              Eliminar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}

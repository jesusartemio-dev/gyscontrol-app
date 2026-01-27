/**
 * 📦 Catálogo de Equipos - Minimalist Version
 * Clean, professional design focused on data
 */

'use client'

import { useEffect, useState, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import CatalogoEquipoForm from '@/components/catalogo/CatalogoEquipoForm'
import { BotonesImportExport } from '@/components/catalogo/BotonesImportExport'
import { exportarEquiposAExcel, importarEquiposDesdeExcel } from '@/lib/utils/equiposExcel'
import { importarEquiposDesdeExcelValidado } from '@/lib/utils/equiposImportUtils'
import { recalcularCatalogoEquipo } from '@/lib/utils/recalculoCatalogoEquipo'
import { getCategoriasEquipo } from '@/lib/services/categoriaEquipo'
import { getUnidades } from '@/lib/services/unidad'
import { createCatalogoEquipo, updateCatalogoEquipo, deleteCatalogoEquipo, getCatalogoEquipos } from '@/lib/services/catalogoEquipo'
import type { CatalogoEquipo, CatalogoEquipoPayload } from '@/types'

import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Skeleton } from '@/components/ui/skeleton'
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem
} from '@/components/ui/select'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger
} from '@/components/ui/dialog'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import {
  ArrowLeft,
  Plus,
  Search,
  Package,
  Pencil,
  Save,
  Trash2,
  X,
  Loader2,
  AlertCircle
} from 'lucide-react'

type CatalogoEquipoConId = CatalogoEquipoPayload & { id: string }

const formatCurrency = (amount: number): string => {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2
  }).format(amount)
}

export default function CatalogoEquipoPage() {
  const router = useRouter()
  const [equipos, setEquipos] = useState<CatalogoEquipo[]>([])
  const [loading, setLoading] = useState(true)
  const [importando, setImportando] = useState(false)
  const [errores, setErrores] = useState<string[]>([])
  const [equiposNuevos, setEquiposNuevos] = useState<CatalogoEquipoPayload[]>([])
  const [equiposDuplicados, setEquiposDuplicados] = useState<CatalogoEquipoConId[]>([])
  const [mostrarModal, setMostrarModal] = useState(false)
  const [showCreateModal, setShowCreateModal] = useState(false)

  // Filters
  const [searchTerm, setSearchTerm] = useState('')
  const [categoriaFiltro, setCategoriaFiltro] = useState('__ALL__')
  const [estadoFiltro, setEstadoFiltro] = useState('__ALL__')

  // Edit state
  const [editandoId, setEditandoId] = useState<string | null>(null)
  const [nuevoPrecio, setNuevoPrecio] = useState<number | null>(null)
  const [nuevoMargen, setNuevoMargen] = useState<number | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<string | null>(null)

  const cargarEquipos = async () => {
    try {
      setLoading(true)
      const data = await getCatalogoEquipos()
      setEquipos(data)
    } catch (err) {
      console.error('Error al cargar equipos:', err)
      toast.error('Error al cargar equipos')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    cargarEquipos()
  }, [])

  // Memoized values
  const categorias = useMemo(() =>
    [...new Set(equipos.map(eq => eq.categoriaEquipo?.nombre).filter(Boolean))] as string[],
    [equipos]
  )

  const stats = useMemo(() => ({
    total: equipos.length,
    activos: equipos.filter(e => e.estado === 'activo' || e.estado === 'aprobado').length,
    categorias: new Set(equipos.map(e => e.categoriaId)).size
  }), [equipos])

  const equiposFiltrados = useMemo(() => {
    return equipos.filter(eq =>
      (categoriaFiltro === '__ALL__' || eq.categoriaEquipo?.nombre === categoriaFiltro) &&
      (estadoFiltro === '__ALL__' || eq.estado === estadoFiltro) &&
      (searchTerm === '' ||
        `${eq.codigo} ${eq.descripcion} ${eq.marca}`.toLowerCase().includes(searchTerm.toLowerCase()))
    )
  }, [equipos, categoriaFiltro, estadoFiltro, searchTerm])

  const handleCreated = () => {
    cargarEquipos()
    setShowCreateModal(false)
  }

  const handleExportar = async () => {
    try {
      await exportarEquiposAExcel(equipos)
      toast.success('Equipos exportados')
    } catch (err) {
      toast.error('Error al exportar')
    }
  }

  const handleImportar = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    setImportando(true)
    setErrores([])

    try {
      const datos = await importarEquiposDesdeExcel(file)
      const [categorias, unidades, equiposExistentes] = await Promise.all([
        getCategoriasEquipo(),
        getUnidades(),
        getCatalogoEquipos()
      ])

      const codigosExistentes = equiposExistentes.map(eq => eq.codigo)
      const idPorCodigo: Record<string, string> = equiposExistentes.reduce((acc, eq) => {
        acc[eq.codigo] = eq.id
        return acc
      }, {} as Record<string, string>)

      const { equiposValidos, errores } = await importarEquiposDesdeExcelValidado(
        datos, categorias, unidades, codigosExistentes
      )

      if (errores.length > 0) {
        setErrores(errores)
        toast.error('Errores en la importación')
        return
      }

      const nuevos: CatalogoEquipoPayload[] = []
      const duplicados: CatalogoEquipoConId[] = []

      for (const eq of equiposValidos) {
        const payload: CatalogoEquipoPayload = {
          codigo: eq.codigo,
          descripcion: eq.descripcion,
          marca: eq.marca,
          precioInterno: eq.precioInterno,
          margen: eq.margen,
          precioVenta: eq.precioVenta,
          categoriaId: eq.categoriaId,
          unidadId: eq.unidadId,
          estado: eq.estado,
        }

        if (codigosExistentes.includes(eq.codigo)) {
          duplicados.push({ ...payload, id: idPorCodigo[eq.codigo] })
        } else {
          nuevos.push(payload)
        }
      }

      setEquiposNuevos(nuevos)
      setEquiposDuplicados(duplicados)

      if (duplicados.length > 0) {
        setMostrarModal(true)
      } else if (nuevos.length > 0) {
        await crearEquiposNuevos(nuevos)
      } else {
        toast('No hay equipos nuevos para importar')
      }
    } catch (err) {
      toast.error('Error en la importación')
    } finally {
      setImportando(false)
      e.target.value = ''
    }
  }

  const sobrescribirDuplicados = async () => {
    try {
      if (equiposNuevos.length > 0) {
        await crearEquiposNuevos(equiposNuevos)
      }
      if (equiposDuplicados.length > 0) {
        const actualizados = await Promise.all(
          equiposDuplicados.map(eq => {
            const { id, ...data } = eq
            return updateCatalogoEquipo(id, recalcularCatalogoEquipo(data))
          })
        )
        setEquipos(prev => {
          const actualizadosIds = new Set(actualizados.map(e => e.id))
          return [...prev.filter(e => !actualizadosIds.has(e.id)), ...actualizados]
        })
      }
      toast.success('Equipos procesados')
      setMostrarModal(false)
      setEquiposNuevos([])
      setEquiposDuplicados([])
    } catch (err) {
      toast.error('Error al procesar')
    }
  }

  const crearEquiposNuevos = async (nuevos: CatalogoEquipoPayload[]) => {
    const equiposParaCrear = nuevos.map(eq => recalcularCatalogoEquipo(eq))
    const creados = await Promise.all(equiposParaCrear.map(eq => createCatalogoEquipo(eq)))
    setEquipos(prev => [...prev, ...creados])
    toast.success(`${creados.length} equipos importados`)
  }

  const guardarEdicion = async (equipo: CatalogoEquipo) => {
    if (nuevoPrecio === null || nuevoMargen === null) return
    if (nuevoPrecio === equipo.precioInterno && nuevoMargen === equipo.margen) {
      cancelarEdicion()
      return
    }
    const precioVenta = parseFloat((nuevoPrecio * (1 + nuevoMargen)).toFixed(2))
    try {
      const actualizado = await updateCatalogoEquipo(equipo.id, {
        precioInterno: nuevoPrecio,
        margen: nuevoMargen,
        precioVenta,
      })
      setEquipos(prev => prev.map(eq => eq.id === equipo.id ? actualizado : eq))
      toast.success('Equipo actualizado')
      cancelarEdicion()
    } catch (err) {
      toast.error('Error al guardar')
    }
  }

  const cancelarEdicion = () => {
    setEditandoId(null)
    setNuevoPrecio(null)
    setNuevoMargen(null)
  }

  const handleEditField = async (id: string, field: keyof CatalogoEquipo, value: string | number) => {
    try {
      const updated = await updateCatalogoEquipo(id, { [field]: value })
      setEquipos(prev => prev.map(eq => eq.id === id ? updated : eq))
    } catch (err) {
      toast.error('Error al actualizar')
    }
  }

  const confirmDelete = async () => {
    if (!deleteTarget) return
    try {
      await deleteCatalogoEquipo(deleteTarget)
      setEquipos(prev => prev.filter(eq => eq.id !== deleteTarget))
      toast.success('Equipo eliminado')
    } catch (err) {
      toast.error('Error al eliminar')
    } finally {
      setDeleteTarget(null)
    }
  }

  if (loading) {
    return (
      <div className="p-6 space-y-4">
        <div className="flex items-center gap-3">
          <Skeleton className="h-5 w-24" />
          <Skeleton className="h-6 w-48" />
        </div>
        <Skeleton className="h-10 w-full" />
        <div className="border rounded-lg">
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="flex gap-4 p-3 border-b last:border-0">
              <Skeleton className="h-4 w-20" />
              <Skeleton className="h-4 flex-1" />
              <Skeleton className="h-4 w-24" />
              <Skeleton className="h-4 w-20" />
            </div>
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className="p-6 space-y-4">
      {/* Header compacto */}
      <div className="flex items-start justify-between gap-4">
        <div className="space-y-1">
          {/* Breadcrumb */}
          <button
            onClick={() => router.push('/catalogo')}
            className="inline-flex items-center text-xs text-muted-foreground hover:text-foreground transition-colors"
          >
            <ArrowLeft className="h-3 w-3 mr-1" />
            Catálogo
          </button>

          {/* Título con stats inline */}
          <div className="flex items-center gap-3">
            <Package className="h-5 w-5 text-blue-600" />
            <h1 className="text-lg font-semibold">Equipos</h1>
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <span>{stats.total} equipos</span>
              <span>•</span>
              <span className="text-green-600">{stats.activos} activos</span>
              <span>•</span>
              <span>{stats.categorias} categorías</span>
            </div>
          </div>
        </div>

        {/* Acciones */}
        <div className="flex items-center gap-2">
          <Dialog open={showCreateModal} onOpenChange={setShowCreateModal}>
            <DialogTrigger asChild>
              <Button size="sm" className="h-8">
                <Plus className="h-3.5 w-3.5 mr-1.5" />
                Nuevo
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>Nuevo Equipo</DialogTitle>
                <DialogDescription>
                  Agrega un equipo al catálogo
                </DialogDescription>
              </DialogHeader>
              <CatalogoEquipoForm onCreated={handleCreated} />
            </DialogContent>
          </Dialog>
          <BotonesImportExport onExportar={handleExportar} onImportar={handleImportar} />
        </div>
      </div>

      {/* Filtros inline */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-[200px] max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar por código, descripción o marca..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-9 h-9"
          />
        </div>

        <Select value={categoriaFiltro} onValueChange={setCategoriaFiltro}>
          <SelectTrigger className="w-[160px] h-9">
            <SelectValue placeholder="Categoría" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="__ALL__">Todas</SelectItem>
            {categorias.map(cat => (
              <SelectItem key={cat} value={cat}>{cat}</SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select value={estadoFiltro} onValueChange={setEstadoFiltro}>
          <SelectTrigger className="w-[130px] h-9">
            <SelectValue placeholder="Estado" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="__ALL__">Todos</SelectItem>
            <SelectItem value="activo">Activo</SelectItem>
            <SelectItem value="aprobado">Aprobado</SelectItem>
            <SelectItem value="pendiente">Pendiente</SelectItem>
            <SelectItem value="rechazado">Rechazado</SelectItem>
          </SelectContent>
        </Select>

        {(searchTerm || categoriaFiltro !== '__ALL__' || estadoFiltro !== '__ALL__') && (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              setSearchTerm('')
              setCategoriaFiltro('__ALL__')
              setEstadoFiltro('__ALL__')
            }}
            className="h-9 px-2 text-muted-foreground"
          >
            <X className="h-4 w-4" />
          </Button>
        )}

        <Badge variant="secondary" className="ml-auto">
          {equiposFiltrados.length} resultados
        </Badge>
      </div>

      {/* Loading de importación */}
      {importando && (
        <div className="flex items-center gap-2 p-3 bg-blue-50 border border-blue-200 rounded-lg text-sm text-blue-700">
          <Loader2 className="h-4 w-4 animate-spin" />
          Importando equipos...
        </div>
      )}

      {/* Errores */}
      {errores.length > 0 && (
        <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
          <div className="flex items-center gap-2 text-sm font-medium text-red-700 mb-2">
            <AlertCircle className="h-4 w-4" />
            Errores de importación:
          </div>
          <ul className="text-xs text-red-600 space-y-1 ml-6 list-disc">
            {errores.slice(0, 5).map((err, i) => <li key={i}>{err}</li>)}
            {errores.length > 5 && <li>... y {errores.length - 5} más</li>}
          </ul>
        </div>
      )}

      {/* Tabla */}
      {equiposFiltrados.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-12 text-center">
          <Package className="h-12 w-12 text-muted-foreground mb-4" />
          <h3 className="text-lg font-semibold mb-2">
            {equipos.length === 0 ? 'No hay equipos' : 'Sin resultados'}
          </h3>
          <p className="text-sm text-muted-foreground mb-4">
            {equipos.length === 0
              ? 'Comienza agregando equipos al catálogo'
              : 'Ajusta los filtros para encontrar equipos'}
          </p>
        </div>
      ) : (
        <div className="border rounded-lg overflow-hidden">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="bg-gray-50/80">
                  <TableHead className="w-[100px] font-semibold">Código</TableHead>
                  <TableHead className="min-w-[200px] font-semibold">Descripción</TableHead>
                  <TableHead className="font-semibold">Categoría</TableHead>
                  <TableHead className="font-semibold">Marca</TableHead>
                  <TableHead className="text-right font-semibold">P. Interno</TableHead>
                  <TableHead className="text-center font-semibold">Margen</TableHead>
                  <TableHead className="text-right font-semibold">P. Venta</TableHead>
                  <TableHead className="font-semibold">Estado</TableHead>
                  <TableHead className="w-[80px]"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {equiposFiltrados.map((eq) => (
                  <TableRow key={eq.id} className="group hover:bg-gray-50/50">
                    <TableCell className="font-mono text-xs">
                      {eq.codigo}
                    </TableCell>
                    <TableCell>
                      <div className="max-w-[250px] truncate text-sm" title={eq.descripcion}>
                        {eq.descripcion}
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant="secondary" className="text-xs font-normal">
                        {eq.categoriaEquipo?.nombre || '—'}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {eq.marca || '—'}
                    </TableCell>
                    <TableCell className="text-right font-mono text-sm">
                      {editandoId === eq.id ? (
                        <Input
                          type="number"
                          value={nuevoPrecio ?? ''}
                          onChange={e => setNuevoPrecio(parseFloat(e.target.value))}
                          className="w-24 h-7 text-right text-xs"
                          step="0.01"
                        />
                      ) : (
                        <span className="text-muted-foreground">
                          {formatCurrency(eq.precioInterno)}
                        </span>
                      )}
                    </TableCell>
                    <TableCell className="text-center">
                      {editandoId === eq.id ? (
                        <Input
                          type="number"
                          step="0.01"
                          value={nuevoMargen ?? ''}
                          onChange={e => setNuevoMargen(parseFloat(e.target.value))}
                          className="w-16 h-7 text-center text-xs"
                        />
                      ) : (
                        <span className="text-xs text-muted-foreground">
                          {(eq.margen * 100).toFixed(0)}%
                        </span>
                      )}
                    </TableCell>
                    <TableCell className="text-right font-mono text-sm font-medium text-emerald-600">
                      {formatCurrency(eq.precioVenta)}
                    </TableCell>
                    <TableCell>
                      <Select
                        value={eq.estado}
                        onValueChange={(value) => handleEditField(eq.id, 'estado', value)}
                      >
                        <SelectTrigger className="h-7 w-[100px] text-xs">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="activo">Activo</SelectItem>
                          <SelectItem value="aprobado">Aprobado</SelectItem>
                          <SelectItem value="pendiente">Pendiente</SelectItem>
                          <SelectItem value="rechazado">Rechazado</SelectItem>
                        </SelectContent>
                      </Select>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center justify-end gap-1">
                        {editandoId === eq.id ? (
                          <>
                            <Button
                              size="sm"
                              onClick={() => guardarEdicion(eq)}
                              className="h-7 w-7 p-0"
                            >
                              <Save className="h-3 w-3" />
                            </Button>
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={cancelarEdicion}
                              className="h-7 w-7 p-0"
                            >
                              <X className="h-3 w-3" />
                            </Button>
                          </>
                        ) : (
                          <>
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => {
                                setEditandoId(eq.id)
                                setNuevoPrecio(eq.precioInterno)
                                setNuevoMargen(eq.margen)
                              }}
                              className="h-7 w-7 p-0 opacity-0 group-hover:opacity-100"
                            >
                              <Pencil className="h-3 w-3" />
                            </Button>
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => setDeleteTarget(eq.id)}
                              className="h-7 w-7 p-0 opacity-0 group-hover:opacity-100 text-destructive hover:text-destructive"
                            >
                              <Trash2 className="h-3 w-3" />
                            </Button>
                          </>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </div>
      )}

      {/* Delete confirmation */}
      <AlertDialog open={!!deleteTarget} onOpenChange={() => setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Eliminar equipo?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta acción no se puede deshacer.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDelete} className="bg-red-600 hover:bg-red-700">
              Eliminar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Duplicate modal */}
      <Dialog open={mostrarModal} onOpenChange={setMostrarModal}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <AlertCircle className="h-5 w-5 text-amber-500" />
              Equipos duplicados
            </DialogTitle>
            <DialogDescription>
              Se encontraron {equiposDuplicados.length} códigos existentes. ¿Sobrescribir?
            </DialogDescription>
          </DialogHeader>
          <div className="bg-gray-50 p-3 rounded-lg max-h-40 overflow-y-auto">
            <div className="flex flex-wrap gap-1">
              {equiposDuplicados.map((eq, i) => (
                <Badge key={i} variant="outline" className="text-xs font-mono">
                  {eq.codigo}
                </Badge>
              ))}
            </div>
          </div>
          <div className="flex gap-2">
            <Button onClick={sobrescribirDuplicados} className="flex-1">
              Sobrescribir
            </Button>
            <Button
              variant="outline"
              onClick={() => {
                setMostrarModal(false)
                setEquiposNuevos([])
                setEquiposDuplicados([])
              }}
              className="flex-1"
            >
              Cancelar
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}

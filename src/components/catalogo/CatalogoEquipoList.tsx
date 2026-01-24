'use client'

import { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import { toast } from 'sonner'
import { updateCatalogoEquipo, deleteCatalogoEquipo } from '@/lib/services/catalogoEquipo'
import { CatalogoEquipo } from '@/types'
import { 
  Select, 
  SelectTrigger, 
  SelectValue, 
  SelectContent, 
  SelectItem 
} from '@/components/ui/select'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { 
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { 
  Pencil, 
  Save, 
  Trash2, 
  X, 
  Filter,
  Search,
  Package,
  DollarSign,
  Tag,
  AlertCircle,
  CheckCircle,
  Clock,
  XCircle
} from 'lucide-react'

interface Props {
  data: CatalogoEquipo[]
  onUpdate?: () => void
  onDelete?: () => void
}

// Animation variants
const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.1
    }
  }
}

const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0 }
}

// Utility functions
const formatCurrency = (amount: number): string => {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2
  }).format(amount)
}

const getStatusVariant = (estado: string): "default" | "secondary" | "destructive" | "outline" => {
  switch (estado?.toLowerCase()) {
    case 'aprobado': return 'default'
    case 'pendiente': return 'secondary' 
    case 'rechazado': return 'destructive'
    default: return 'outline'
  }
}

const getStatusIcon = (estado: string) => {
  switch (estado?.toLowerCase()) {
    case 'aprobado': return <CheckCircle className="h-3 w-3" />
    case 'pendiente': return <Clock className="h-3 w-3" />
    case 'rechazado': return <XCircle className="h-3 w-3" />
    default: return <AlertCircle className="h-3 w-3" />
  }
}

export default function CatalogoEquipoList({ data, onUpdate, onDelete }: Props) {
  const [equipos, setEquipos] = useState<CatalogoEquipo[]>(data)
  const [categorias, setCategorias] = useState<string[]>([])
  const [unidades, setUnidades] = useState<string[]>([])
  const [categoriaFiltro, setCategoriaFiltro] = useState('__ALL__')
  const [unidadFiltro, setUnidadFiltro] = useState('__ALL__')
  const [textoFiltro, setTextoFiltro] = useState('')
  const [editandoId, setEditandoId] = useState<string | null>(null)
  const [nuevoPrecio, setNuevoPrecio] = useState<number | null>(null)
  const [nuevoMargen, setNuevoMargen] = useState<number | null>(null)

  useEffect(() => {
    setEquipos(data)
    setCategorias([...new Set(data.map(eq => eq.categoriaEquipo?.nombre).filter(Boolean))])
    setUnidades([...new Set(data.map(eq => eq.unidad?.nombre).filter(Boolean))])
  }, [data])

  const handleEditField = async (id: string, field: keyof CatalogoEquipo, value: string | number) => {
    try {
      const updated = await updateCatalogoEquipo(id, { [field]: value })
      setEquipos(prev => prev.map(eq => (eq.id === id ? updated : eq)))
      toast.success('Campo actualizado.')
      onUpdate?.()
    } catch (err) {
      console.error('❌ Error al editar:', err)
      toast.error('Error al editar campo.')
    }
  }

  const guardarEdicion = async (equipo: CatalogoEquipo) => {
    if (nuevoPrecio === null || nuevoMargen === null) return

    if (nuevoPrecio === equipo.precioInterno && nuevoMargen === equipo.margen) {
      toast('No se detectaron cambios.')
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
      setEquipos(prev => prev.map(eq => (eq.id === equipo.id ? actualizado : eq)))
      toast.success('Equipo actualizado.')
      cancelarEdicion()
      onUpdate?.()
    } catch (err) {
      console.error('❌ Error al guardar edición:', err)
      toast.error('Error al guardar cambios.')
    }
  }

  const cancelarEdicion = () => {
    setEditandoId(null)
    setNuevoPrecio(null)
    setNuevoMargen(null)
  }

  const handleDelete = async (id: string) => {
    try {
      await deleteCatalogoEquipo(id)
      setEquipos(prev => prev.filter(eq => eq.id !== id))
      toast.success('Equipo eliminado.')
      onDelete?.()
    } catch (err) {
      console.error('❌ Error al eliminar equipo:', err)
      toast.error('Error al eliminar equipo.')
    }
  }

  const equiposFiltrados = equipos.filter(eq =>
    (categoriaFiltro !== '__ALL__' ? eq.categoriaEquipo?.nombre === categoriaFiltro : true) &&
    (unidadFiltro !== '__ALL__' ? eq.unidad?.nombre === unidadFiltro : true) &&
    (`${eq.codigo} ${eq.descripcion}`.toLowerCase().includes(textoFiltro.toLowerCase()))
  )

  // Empty state check
  if (equipos.length === 0) {
    return (
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="text-center py-12"
      >
        <div className="p-4 bg-muted rounded-full w-fit mx-auto mb-4">
          <Package className="h-8 w-8 text-muted-foreground" />
        </div>
        <h3 className="text-lg font-semibold mb-2">No hay equipos registrados</h3>
        <p className="text-muted-foreground">
          Los equipos aparecerán aquí una vez que sean agregados al catálogo.
        </p>
      </motion.div>
    )
  }

  return (
    <motion.div 
      className="space-y-6"
      variants={containerVariants}
      initial="hidden"
      animate="visible"
    >
      {/* Filters Section */}
      <motion.div variants={itemVariants}>
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Filter className="h-5 w-5" />
              Filtros de Búsqueda
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="space-y-2">
                <label className="text-sm font-medium flex items-center gap-2">
                  <Tag className="h-4 w-4" />
                  Categoría
                </label>
                <Select value={categoriaFiltro} onValueChange={setCategoriaFiltro}>
                  <SelectTrigger>
                    <SelectValue placeholder="Seleccionar categoría" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__ALL__">Todas las categorías</SelectItem>
                    {categorias.map(cat => (
                      <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium flex items-center gap-2">
                  <Package className="h-4 w-4" />
                  Unidad
                </label>
                <Select value={unidadFiltro} onValueChange={setUnidadFiltro}>
                  <SelectTrigger>
                    <SelectValue placeholder="Seleccionar unidad" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__ALL__">Todas las unidades</SelectItem>
                    {unidades.map(u => (
                      <SelectItem key={u} value={u}>{u}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium flex items-center gap-2">
                  <Search className="h-4 w-4" />
                  Buscar
                </label>
                <Input
                  type="text"
                  placeholder="Código o descripción..."
                  value={textoFiltro}
                  onChange={e => setTextoFiltro(e.target.value)}
                  className="w-full"
                />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium text-transparent">Acciones</label>
                <Button
                  variant="outline"
                  onClick={() => {
                    setCategoriaFiltro('__ALL__')
                    setUnidadFiltro('__ALL__')
                    setTextoFiltro('')
                  }}
                  className="w-full"
                >
                  <X className="h-4 w-4 mr-2" />
                  Limpiar filtros
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* Results Summary */}
      <motion.div variants={itemVariants}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Badge variant="secondary" className="text-sm">
              {equiposFiltrados.length} equipos encontrados
            </Badge>
            {(categoriaFiltro !== '__ALL__' || unidadFiltro !== '__ALL__' || textoFiltro) && (
              <Badge variant="outline" className="text-sm">
                Filtros activos
              </Badge>
            )}
          </div>
        </div>
      </motion.div>

      <Separator />

      {/* Equipment Table */}
      <motion.div variants={itemVariants}>
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Package className="h-5 w-5" />
              Lista de Equipos
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[100px]">Código</TableHead>
                    <TableHead className="min-w-[200px]">Descripción</TableHead>
                    <TableHead>Categoría</TableHead>
                    <TableHead>Unidad</TableHead>
                    <TableHead>Marca</TableHead>
                    <TableHead className="text-right">Precio Interno</TableHead>
                    <TableHead className="text-right">Margen</TableHead>
                    <TableHead className="text-right">Precio Venta</TableHead>
                    <TableHead>Estado</TableHead>
                    <TableHead className="text-center">Acciones</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {equiposFiltrados.map((eq, index) => (
                    <motion.tr
                      key={eq.id}
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: index * 0.05 }}
                      className="group hover:bg-muted/50"
                    >
                      <TableCell className="font-mono text-sm">
                        <Badge variant="outline">{eq.codigo}</Badge>
                      </TableCell>
                      <TableCell className="font-medium">
                        <div className="max-w-[200px] truncate" title={eq.descripcion}>
                          {eq.descripcion}
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="secondary">
                          {eq.categoriaEquipo?.nombre || 'Sin categoría'}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline">
                          {eq.unidad?.nombre || 'Sin unidad'}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {eq.marca || 'Sin marca'}
                      </TableCell>
                      <TableCell className="text-right font-mono">
                        {editandoId === eq.id ? (
                          <Input
                            type="number"
                            value={nuevoPrecio ?? ''}
                            onChange={e => setNuevoPrecio(parseFloat(e.target.value))}
                            className="w-24 text-right"
                            step="0.01"
                          />
                        ) : (
                          <span className="text-muted-foreground">
                            {formatCurrency(eq.precioInterno)}
                          </span>
                        )}
                      </TableCell>
                      <TableCell className="text-right">
                        {editandoId === eq.id ? (
                          <Input
                            type="number"
                            step="0.01"
                            value={nuevoMargen ?? ''}
                            onChange={e => setNuevoMargen(parseFloat(e.target.value))}
                            className="w-20 text-right"
                          />
                        ) : (
                          <Badge variant="secondary">
                            {(eq.margen * 100).toFixed(0)}%
                          </Badge>
                        )}
                      </TableCell>
                      <TableCell className="text-right font-mono font-semibold">
                        <span className="text-green-600">
                          {formatCurrency(eq.precioVenta)}
                        </span>
                      </TableCell>
                      <TableCell>
                        <Select
                          value={eq.estado}
                          onValueChange={(value) => handleEditField(eq.id, 'estado', value)}
                        >
                          <SelectTrigger className="w-[130px]">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="pendiente">
                              <div className="flex items-center gap-2">
                                <Clock className="h-3 w-3" />
                                Pendiente
                              </div>
                            </SelectItem>
                            <SelectItem value="aprobado">
                              <div className="flex items-center gap-2">
                                <CheckCircle className="h-3 w-3" />
                                Aprobado
                              </div>
                            </SelectItem>
                            <SelectItem value="rechazado">
                              <div className="flex items-center gap-2">
                                <XCircle className="h-3 w-3" />
                                Rechazado
                              </div>
                            </SelectItem>
                          </SelectContent>
                        </Select>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center justify-center gap-1">
                          {editandoId === eq.id ? (
                            <>
                              <Button 
                                size="sm" 
                                onClick={() => guardarEdicion(eq)}
                                className="h-8 w-8 p-0"
                              >
                                <Save className="h-3 w-3" />
                              </Button>
                              <Button 
                                size="sm" 
                                variant="outline" 
                                onClick={cancelarEdicion}
                                className="h-8 w-8 p-0"
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
                                className="h-8 w-8 p-0 opacity-0 group-hover:opacity-100 transition-opacity"
                              >
                                <Pencil className="h-3 w-3" />
                              </Button>
                              <Button 
                                size="sm" 
                                variant="ghost" 
                                onClick={() => handleDelete(eq.id)}
                                className="h-8 w-8 p-0 opacity-0 group-hover:opacity-100 transition-opacity text-destructive hover:text-destructive"
                              >
                                <Trash2 className="h-3 w-3" />
                              </Button>
                            </>
                          )}
                        </div>
                      </TableCell>
                    </motion.tr>
                  ))}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* No results found */}
      {equiposFiltrados.length === 0 && equipos.length > 0 && (
        <motion.div 
          variants={itemVariants}
          className="text-center py-8"
        >
          <div className="p-4 bg-muted rounded-full w-fit mx-auto mb-4">
            <Search className="h-6 w-6 text-muted-foreground" />
          </div>
          <h3 className="text-lg font-semibold mb-2">No se encontraron equipos</h3>
          <p className="text-muted-foreground mb-4">
            Intenta ajustar los filtros para encontrar lo que buscas.
          </p>
          <Button 
            variant="outline"
            onClick={() => {
              setCategoriaFiltro('__ALL__')
              setUnidadFiltro('__ALL__')
              setTextoFiltro('')
            }}
          >
            <X className="h-4 w-4 mr-2" />
            Limpiar filtros
          </Button>
        </motion.div>
      )}
    </motion.div>
  )
}

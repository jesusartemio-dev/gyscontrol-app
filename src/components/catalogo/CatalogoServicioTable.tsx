'use client'

// ===================================================
// 📁 Archivo: CatalogoServicioTable.tsx (Mejorado con UX/UI moderno)
// 📍 Ubicación: src/components/catalogo/
// ===================================================

import { useEffect, useState } from 'react'
import { getUnidadesServicio } from '@/lib/services/unidadServicio'
import { getRecursos } from '@/lib/services/recurso'
import { getEdts } from '@/lib/services/edt'
import type { CatalogoServicio, TipoFormula } from '@/types'

// UI Components
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { Alert, AlertDescription } from '@/components/ui/alert'
import {
  Select, SelectTrigger, SelectValue, SelectContent, SelectItem
} from '@/components/ui/select'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'

// Icons
import { 
  Pencil, 
  Save, 
  Trash2, 
  Search, 
  Filter,
  Calculator,
  DollarSign,
  Clock,
  AlertCircle,
  CheckCircle,
  X
} from 'lucide-react'

// Animations
import { motion, AnimatePresence } from 'framer-motion'

// Animation variants
const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      duration: 0.6,
      staggerChildren: 0.1
    }
  }
}

const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.5 }
  }
}

interface Props {
  data: CatalogoServicio[]
  onUpdate: (servicio: CatalogoServicio) => void
  onDelete: (id: string) => void
}

export default function CatalogoServicioTable({ data, onUpdate, onDelete }: Props) {
  const [servicios, setServicios] = useState(data)
  const [unidades, setUnidades] = useState<any[]>([])
  const [recursos, setRecursos] = useState<any[]>([])
  const [categorias, setCategorias] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const [filtroCategoria, setFiltroCategoria] = useState('__ALL__')
  const [filtroUnidad, setFiltroUnidad] = useState('__ALL__')
  const [filtroRecurso, setFiltroRecurso] = useState('__ALL__')
  const [filtroTexto, setFiltroTexto] = useState('')

  const [editingId, setEditingId] = useState<string | null>(null)
  const [editData, setEditData] = useState<Partial<CatalogoServicio>>({})
  const [cantidad, setCantidad] = useState<number>(1)

  useEffect(() => {
    setServicios(data)
  }, [data])

  useEffect(() => {
    const loadData = async () => {
      try {
        setLoading(true)
        setError(null)
        const [unidadesData, recursosData, categoriasData] = await Promise.all([
          getUnidadesServicio(),
          getRecursos(),
          getEdts()
        ])
        setUnidades(unidadesData)
        setRecursos(recursosData)
        setCategorias(categoriasData)
      } catch (err) {
        setError('Error al cargar los datos. Por favor, intenta nuevamente.')
        console.error('Error loading data:', err)
      } finally {
        setLoading(false)
      }
    }
    loadData()
  }, [])

  // Utility functions
  const formatCurrency = (amount: number): string => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2
    }).format(amount)
  }

  const getFormulaVariant = (formula: TipoFormula): "default" | "secondary" | "outline" => {
    switch (formula) {
      case 'Proporcional': return 'default'
      case 'Escalonada': return 'secondary'
      case 'Fijo': return 'outline'
      default: return 'outline'
    }
  }

  const getFormulaColor = (formula: TipoFormula): string => {
    switch (formula) {
      case 'Proporcional': return 'bg-blue-100 text-blue-700 border-blue-300'
      case 'Escalonada': return 'bg-green-100 text-green-700 border-green-300'
      case 'Fijo': return 'bg-orange-100 text-orange-700 border-orange-300'
      default: return 'bg-gray-100 text-gray-700 border-gray-300'
    }
  }

  const serviciosFiltrados = servicios
    .filter((s) =>
      (filtroCategoria !== '__ALL__' ? s.categoriaId === filtroCategoria : true) &&
      (filtroUnidad !== '__ALL__' ? s.unidadServicioId === filtroUnidad : true) &&
      (filtroRecurso !== '__ALL__' ? s.recursoId === filtroRecurso : true) &&
      (`${s.nombre} ${s.descripcion}`.toLowerCase().includes(filtroTexto.toLowerCase()))
    )
    .sort((a, b) => {
      // Primero ordenar por EDT (categoría)
      const categoriaA = a.categoria?.nombre || ''
      const categoriaB = b.categoria?.nombre || ''

      if (categoriaA !== categoriaB) {
        return categoriaA.localeCompare(categoriaB)
      }

      // Luego ordenar por orden dentro de la categoría
      return (a.orden || 0) - (b.orden || 0)
    })

  const handleSave = (id: string) => {
    const original = servicios.find(s => s.id === id)
    if (!original) return
    const updated = { ...original, ...editData }
    onUpdate(updated)
    setEditingId(null)
    setEditData({})
  }

  const calcularHoras = (cantidad: number, data: Partial<CatalogoServicio>) => {
    // Solo fórmula escalonada: HH = HH_base + (cantidad - 1) × HH_repetido
    const horasBase = (data.horaBase ?? 0) + Math.max(0, cantidad - 1) * (data.horaRepetido ?? 0);

    // Aplicar factor de dificultad
    const factorDificultad = data.nivelDificultad ?? 1;
    return horasBase * factorDificultad;
  }

  // Loading state
  if (loading) {
    return (
      <div className="space-y-6">
        <Card>
          <CardHeader>
            <div className="flex items-center space-x-2">
              <Skeleton className="h-6 w-6" />
              <Skeleton className="h-6 w-32" />
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-10 w-full" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <div className="space-y-3">
              {[...Array(5)].map((_, i) => (
                <Skeleton key={i} className="h-12 w-full" />
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  // Error state
  if (error) {
    return (
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.3 }}
      >
        <Alert className="border-red-200 bg-red-50">
          <AlertCircle className="h-4 w-4 text-red-600" />
          <AlertDescription className="text-red-800">
            {error}
          </AlertDescription>
        </Alert>
      </motion.div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Temporarily disabled motion for debugging */}
      {/* Filtros Modernos */}
      <motion.div variants={itemVariants}>
        <Card className="border-0 shadow-sm bg-gradient-to-r from-slate-50 to-gray-50">
          <CardHeader className="pb-4">
            <div className="flex items-center space-x-2">
              <div className="p-2 bg-blue-100 rounded-lg">
                <Filter className="h-4 w-4 text-blue-600" />
              </div>
              <CardTitle className="text-lg font-semibold text-gray-800">
                Filtros de Búsqueda
              </CardTitle>
            </div>
            <CardDescription className="text-sm text-gray-600">
              Utiliza los filtros para encontrar servicios específicos
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
              {/* Búsqueda por texto */}
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input
                  placeholder="Buscar servicios..."
                  value={filtroTexto}
                  onChange={(e) => setFiltroTexto(e.target.value)}
                  className="pl-10 border-gray-200 focus:border-blue-400 focus:ring-blue-400"
                />
              </div>
              
              {/* Filtro por EDT */}
              <Select value={filtroCategoria} onValueChange={setFiltroCategoria}>
                <SelectTrigger className="border-gray-200 focus:border-blue-400 focus:ring-blue-400">
                  <SelectValue placeholder="Todos los EDTs" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__ALL__">Todos los EDTs</SelectItem>
                  {categorias.map((c) => (
                    <SelectItem key={c.id} value={c.id}>
                      {c.nombre}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              
              {/* Filtro por Unidad */}
              <Select value={filtroUnidad} onValueChange={setFiltroUnidad}>
                <SelectTrigger className="border-gray-200 focus:border-blue-400 focus:ring-blue-400">
                  <SelectValue placeholder="Todas las unidades" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__ALL__">Todas las unidades</SelectItem>
                  {unidades.map((u) => (
                    <SelectItem key={u.id} value={u.id}>
                      {u.nombre}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              
              {/* Filtro por Recurso */}
              <Select value={filtroRecurso} onValueChange={setFiltroRecurso}>
                <SelectTrigger className="border-gray-200 focus:border-blue-400 focus:ring-blue-400">
                  <SelectValue placeholder="Todos los recursos" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__ALL__">Todos los recursos</SelectItem>
                  {recursos.map((r) => (
                    <SelectItem key={r.id} value={r.id}>
                      {r.nombre}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              
              {/* Contador de resultados */}
              <div className="flex items-center justify-center bg-white rounded-lg border border-gray-200 px-4 py-2">
                <div className="text-center">
                  <div className="text-lg font-semibold text-blue-600">
                    {serviciosFiltrados.length}
                  </div>
                  <div className="text-xs text-gray-500">
                    {serviciosFiltrados.length === 1 ? 'servicio' : 'servicios'}
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* Leyenda de Cálculo de Horas Hombre - Mejorada */}
      <motion.div variants={itemVariants}>
        <Card className="border-0 shadow-sm bg-gradient-to-r from-blue-50 to-indigo-50">
          <CardHeader className="pb-3">
            <div className="flex items-center space-x-2">
              <div className="p-2 bg-blue-100 rounded-lg">
                <Calculator className="h-4 w-4 text-blue-600" />
              </div>
              <CardTitle className="text-lg font-semibold text-gray-800">
                Cálculo de Horas Hombre
              </CardTitle>
            </div>
            <CardDescription className="text-sm text-gray-600">
              Cálculo automático de horas hombre con factor de dificultad
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Escalonada */}
              <motion.div
                className="flex items-center space-x-3 p-3 bg-white rounded-lg border border-green-200"
                whileHover={{ scale: 1.02 }}
                transition={{ duration: 0.2 }}
              >
                <Badge className="bg-green-100 text-green-700 border-green-300 hover:bg-green-200">
                  Escalonada
                </Badge>
                <div className="text-sm text-gray-700">
                  <code className="bg-gray-100 px-2 py-1 rounded text-xs">
                    HH = HH_base + (cantidad - 1) × HH_repetido
                  </code>
                </div>
              </motion.div>

              {/* Factor de Dificultad */}
              <motion.div
                className="flex items-center space-x-3 p-3 bg-white rounded-lg border border-purple-200"
                whileHover={{ scale: 1.02 }}
                transition={{ duration: 0.2 }}
              >
                <Badge className="bg-purple-100 text-purple-700 border-purple-300 hover:bg-purple-200">
                  Dificultad
                </Badge>
                <div className="text-sm text-gray-700">
                  <code className="bg-gray-100 px-2 py-1 rounded text-xs">
                    HH_total = HH_base × factor_dificultad
                  </code>
                </div>
              </motion.div>
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* Tabla Moderna */}
      <motion.div variants={itemVariants}>
        <Card className="border-0 shadow-sm">
          <CardHeader className="pb-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <div className="p-2 bg-green-100 rounded-lg">
                  <Clock className="h-4 w-4 text-green-600" />
                </div>
                <CardTitle className="text-lg font-semibold text-gray-800">
                  Catálogo de Servicios
                </CardTitle>
              </div>
              {serviciosFiltrados.length > 0 && (
                <Badge variant="outline" className="text-sm">
                  {serviciosFiltrados.length} {serviciosFiltrados.length === 1 ? 'servicio' : 'servicios'}
                </Badge>
              )}
            </div>
          </CardHeader>
          <CardContent>
            {serviciosFiltrados.length === 0 ? (
              // Estado vacío
              <motion.div 
                className="text-center py-12"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5 }}
              >
                <div className="mx-auto w-24 h-24 bg-gray-100 rounded-full flex items-center justify-center mb-4">
                  <Search className="h-8 w-8 text-gray-400" />
                </div>
                <h3 className="text-lg font-medium text-gray-900 mb-2">
                  No se encontraron servicios
                </h3>
                <p className="text-gray-500 mb-4">
                  No hay servicios que coincidan con los filtros aplicados.
                </p>
                <Button 
                  variant="outline" 
                  onClick={() => {
                    setFiltroTexto('')
                    setFiltroCategoria('__ALL__')
                    setFiltroUnidad('__ALL__')
                    setFiltroRecurso('__ALL__')
                  }}
                  className="text-blue-600 border-blue-200 hover:bg-blue-50"
                >
                  <X className="h-4 w-4 mr-2" />
                  Limpiar filtros
                </Button>
              </motion.div>
            ) : (
              // Tabla con datos
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-gradient-to-r from-gray-50 to-gray-100">
                      <TableHead className="text-left font-semibold text-gray-700">Servicio</TableHead>
                      <TableHead className="text-center font-semibold text-gray-700">EDT</TableHead>
                      <TableHead className="text-center font-semibold text-gray-700">Orden</TableHead>
                      <TableHead className="text-center font-semibold text-gray-700">Recurso</TableHead>
                      <TableHead className="text-center font-semibold text-gray-700">Unidad</TableHead>
                      <TableHead className="text-center font-semibold text-gray-700">Cantidad</TableHead>
                      <TableHead className="text-center font-semibold text-gray-700">Dificultad</TableHead>
                      <TableHead className="text-center font-semibold text-gray-700">HH Base</TableHead>
                      <TableHead className="text-center font-semibold text-gray-700">HH Repetido</TableHead>
                      <TableHead className="text-center font-semibold text-gray-700">HH Total</TableHead>
                      <TableHead className="text-center font-semibold text-gray-700">Costo/Hora</TableHead>
                      <TableHead className="text-center font-semibold text-gray-700">Costo Total</TableHead>
                      <TableHead className="text-center font-semibold text-gray-700">Acciones</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
            {serviciosFiltrados.map((item) => {
              const isEditing = editingId === item.id
              const recursoId = editData.recursoId ?? item.recursoId
              const formula = editData.formula ?? item.formula
              const cantidadUsar = editData.cantidad ?? item.cantidad ?? 1
              const horasCalculadas = calcularHoras(cantidadUsar, { ...item, ...editData })
              const costoHora = recursos.find(r => r.id === recursoId)?.costoHora ?? item.recurso?.costoHora ?? 0
              const costoTotal = horasCalculadas * costoHora

              return (
                <TableRow 
                  key={item.id}
                  className="group hover:bg-gradient-to-r hover:from-blue-50 hover:to-indigo-50 transition-all duration-200"
                >
                    {/* Nombre del Servicio */}
                    <TableCell className="text-left">
                      <div
                        className="font-medium text-gray-900 cursor-help"
                        title={item.descripcion || 'Sin descripción'}
                      >
                        {item.nombre}
                      </div>
                    </TableCell>

                    {/* EDT */}
                    <TableCell className="text-center">
                      <Badge variant="outline" className="text-xs">
                        {item.categoria?.nombre || 'Sin EDT'}
                      </Badge>
                    </TableCell>

                    {/* Orden */}
                    <TableCell className="text-center">
                      {isEditing ? (
                        <Input
                          type="number"
                          value={(editData.orden ?? item.orden) ?? 0}
                          onChange={(e) => setEditData(d => ({ ...d, orden: parseInt(e.target.value) }))}
                          className="w-20 text-right h-8 text-xs"
                          min="0"
                        />
                      ) : (
                        <span className="text-sm font-medium text-gray-700">
                          {item.orden ?? 0}
                        </span>
                      )}
                    </TableCell>

                    {/* Recurso */}
                    <TableCell className="text-center">
                      {isEditing ? (
                        <Select value={recursoId} onValueChange={(v) => setEditData(d => ({ ...d, recursoId: v }))}>
                          <SelectTrigger className="h-8 text-xs">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {recursos.map(r => (
                              <SelectItem key={r.id} value={r.id}>{r.nombre}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      ) : (
                        <Badge variant="secondary" className="text-xs">
                          {item.recurso?.nombre || 'Sin recurso'}
                        </Badge>
                      )}
                    </TableCell>

                    {/* Unidad */}
                    <TableCell className="text-center">
                      {isEditing ? (
                        <Select value={editData.unidadServicioId ?? item.unidadServicioId} onValueChange={(v) => setEditData(d => ({ ...d, unidadServicioId: v }))}>
                          <SelectTrigger className="h-8 text-xs">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {unidades.map(u => (
                              <SelectItem key={u.id} value={u.id}>{u.nombre}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      ) : (
                        <Badge variant="outline" className="text-xs">
                          {item.unidadServicio?.nombre || 'Sin unidad'}
                        </Badge>
                      )}
                    </TableCell>

                    {/* Cantidad */}
                    <TableCell className="text-center">
                      {isEditing ? (
                        <Input
                          type="number"
                          value={(editData.cantidad ?? item.cantidad) ?? 1}
                          onChange={(e) => setEditData(d => ({ ...d, cantidad: parseInt(e.target.value) }))}
                          className="w-20 text-right h-8 text-xs"
                          min="1"
                        />
                      ) : (
                        <span className="text-sm font-medium text-gray-700">
                          {item.cantidad ?? 1}
                        </span>
                      )}
                    </TableCell>

                    {/* Dificultad */}
                    <TableCell className="text-center">
                      {isEditing ? (
                        <Select value={(editData.nivelDificultad ?? item.nivelDificultad ?? 1).toString()} onValueChange={(v) => setEditData(d => ({ ...d, nivelDificultad: parseInt(v) }))}>
                          <SelectTrigger className="h-8 text-xs">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {[1,2,3,4,5].map(level => (
                              <SelectItem key={level} value={level.toString()}>
                                Nivel {level} {level === 1 ? '(Fácil)' : level === 3 ? '(Medio)' : level === 5 ? '(Difícil)' : ''}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      ) : (
                        <Badge variant="outline" className="text-xs">
                          Nivel {item.nivelDificultad ?? 1}
                        </Badge>
                      )}
                    </TableCell>

                    {/* Campos de Horas - Solo Base y Repetido */}
                    {(['horaBase', 'horaRepetido'] as const).map(field => (
                      <TableCell className="text-center" key={field}>
                        {isEditing ? (
                          <Input
                            type="number"
                            value={(editData[field] ?? item[field]) ?? 0}
                            onChange={(e) => setEditData(d => ({ ...d, [field]: parseFloat(e.target.value) }))}
                            className="w-20 text-right h-8 text-xs"
                            step="0.1"
                            min="0"
                          />
                        ) : (
                          <span className="text-sm font-medium text-gray-700">
                            {(item[field] ?? 0).toFixed(1)}
                          </span>
                        )}
                      </TableCell>
                    ))}
                    
                    {/* Total Horas Hombre */}
                    <TableCell className="text-center">
                      <div className="flex items-center justify-center space-x-1">
                        <Clock className="h-3 w-3 text-blue-600" />
                        <span className="font-semibold text-blue-700">
                          {horasCalculadas.toFixed(1)}
                        </span>
                      </div>
                    </TableCell>

                    {/* Costo por Hora */}
                    <TableCell className="text-center">
                      <span className="font-semibold text-green-700">
                        {formatCurrency(costoHora)}
                      </span>
                    </TableCell>

                    {/* Costo Total */}
                    <TableCell className="text-center">
                      <span className="font-semibold text-green-700">
                        {formatCurrency(costoTotal)}
                      </span>
                    </TableCell>
                    
                    {/* Acciones */}
                    <TableCell className="text-center">
                      <div className="flex items-center justify-center space-x-1">
                        {isEditing ? (
                          <>
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => handleSave(item.id)}
                              className="h-8 w-8 p-0 text-green-600 hover:text-green-800 hover:bg-green-50"
                            >
                              <CheckCircle className="h-4 w-4" />
                            </Button>
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => { setEditingId(null); setEditData({}) }}
                              className="h-8 w-8 p-0 text-gray-500 hover:text-gray-700 hover:bg-gray-50"
                            >
                              <X className="h-4 w-4" />
                            </Button>
                          </>
                        ) : (
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => { setEditingId(item.id); setEditData({}) }}
                            className="h-8 w-8 p-0 text-blue-600 hover:text-blue-800 hover:bg-blue-50"
                          >
                            <Pencil className="h-4 w-4" />
                          </Button>
                        )}
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => onDelete(item.id)}
                          className="h-8 w-8 p-0 text-red-500 hover:text-red-700 hover:bg-red-50"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
              )
            })}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>
      </motion.div>
    </div>
  )
}

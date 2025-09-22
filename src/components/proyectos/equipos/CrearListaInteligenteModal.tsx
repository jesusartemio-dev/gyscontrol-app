'use client'

import React, { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { Separator } from '@/components/ui/separator'
import { ScrollArea } from '@/components/ui/scroll-area'
import {
  Brain,
  CheckCircle2,
  AlertCircle,
  Loader2,
  TrendingUp,
  Target,
  Lightbulb,
  Sparkles,
  BarChart3,
  PieChart,
  Package,
  ChevronDown,
  ChevronRight,
  Eye,
  EyeOff
} from 'lucide-react'
import { toast } from 'sonner'
import { analizarProyectoEquipo, obtenerEstadisticasRapidas, type ResultadoAnalisis, type SugerenciaLista } from '@/lib/services/analisisInteligente'
import type { ProyectoEquipo } from '@/types'

interface Props {
  isOpen: boolean
  onClose: () => void
  proyectoEquipo: ProyectoEquipo
  proyectoId: string
  onDistribucionCompletada: (listaId: string) => void
  refreshData?: () => void // Nueva prop para refrescar datos
}

export default function CrearListaInteligenteModal({
  isOpen,
  onClose,
  proyectoEquipo,
  proyectoId,
  onDistribucionCompletada,
  refreshData
}: Props) {
  const [analisis, setAnalisis] = useState<ResultadoAnalisis | null>(null)
  const [cargando, setCargando] = useState(false)
  const [pasoActual, setPasoActual] = useState<'analizando' | 'mostrando' | 'confirmacion'>('analizando')
  const [sugerenciasSeleccionadas, setSugerenciasSeleccionadas] = useState<Set<number>>(new Set())
  const [sugerenciasExpandidas, setSugerenciasExpandidas] = useState<Set<number>>(new Set())

  // Realizar análisis inteligente al abrir el modal
  useEffect(() => {
    if (isOpen && proyectoEquipo) {
      // Resetear estado del análisis para asegurar datos frescos
      setAnalisis(null)
      setSugerenciasSeleccionadas(new Set())
      setSugerenciasExpandidas(new Set())
      realizarAnalisis()
    }
  }, [isOpen, proyectoEquipo])

  const realizarAnalisis = async () => {
    try {
      setCargando(true)
      setPasoActual('analizando')

      // 🔍 Debug: Información del ProyectoEquipo antes del análisis
      console.log('🔍 Iniciando análisis - Información del ProyectoEquipo:', {
        proyectoEquipoExists: !!proyectoEquipo,
        id: proyectoEquipo?.id,
        nombre: proyectoEquipo?.nombre,
        totalItems: proyectoEquipo?.items?.length || 0,
        itemsExists: !!proyectoEquipo?.items,
        items: proyectoEquipo?.items?.map(item => ({
          id: item?.id,
          descripcion: item?.descripcion,
          estado: item?.estado,
          listaId: item?.listaId
        })) || []
      })

      // ✅ Validar que el ProyectoEquipo existe
      if (!proyectoEquipo) {
        console.error('❌ ProyectoEquipo es null o undefined')
        toast.error('❌ Error: ProyectoEquipo no encontrado')
        onClose()
        return
      }

      if (!proyectoEquipo.items) {
        console.error('❌ ProyectoEquipo.items es null o undefined')
        toast.error('❌ Error: ProyectoEquipo no tiene items')
        onClose()
        return
      }

      // Simular tiempo de análisis para mejor UX
      await new Promise(resolve => setTimeout(resolve, 2000))

      const resultadoAnalisis = await analizarProyectoEquipo(proyectoEquipo)

      // 🔍 Debug: Mostrar información del análisis
      console.log('🔍 Resultado del análisis inteligente:', {
        totalItems: resultadoAnalisis.totalItems,
        categoriasEncontradas: resultadoAnalisis.categoriasEncontradas.length,
        sugerencias: resultadoAnalisis.sugerencias.length,
        proyectoEquipoItems: proyectoEquipo.items?.length || 0
      })

      // ✅ Verificar si hay items disponibles para analizar
      if (resultadoAnalisis.totalItems === 0) {
        console.log('🔄 No hay items del análisis inteligente - Usando fallback directo')

        // 🔧 SOLUCIÓN MEJORADA: Filtrar items que NO están en listas
        const todosLosItems = proyectoEquipo?.items || []
        const itemsDisponibles = todosLosItems.filter(item => !item.listaId)

        console.log('📊 Análisis de disponibilidad:', {
          totalItemsProyecto: todosLosItems.length,
          itemsEnListas: todosLosItems.filter(item => item.listaId).length,
          itemsDisponibles: itemsDisponibles.length,
          itemsEstados: todosLosItems.reduce((acc, item) => {
            acc[item.estado || 'sin-estado'] = (acc[item.estado || 'sin-estado'] || 0) + 1
            return acc
          }, {} as Record<string, number>)
        })

        if (itemsDisponibles.length > 0) {
          console.log('✅ Usando items disponibles del ProyectoEquipo:', itemsDisponibles.length)

          // Obtener categoría predominante para el nombre
          const getCategoriaPredominante = (items: any[]) => {
            const categorias = items.reduce((acc, item) => {
              const categoria = item.categoria || 'SIN-CATEGORIA'
              acc[categoria] = (acc[categoria] || 0) + 1
              return acc
            }, {} as Record<string, number>)

            const categoriaPredominante = Object.entries(categorias)
              .sort((a, b) => (b[1] as number) - (a[1] as number))[0]?.[0]

            return categoriaPredominante && categoriaPredominante !== 'SIN-CATEGORIA'
              ? categoriaPredominante
              : 'Equipos'
          }

          const categoriaPredominante = getCategoriaPredominante(itemsDisponibles)

          // Crear análisis manual con los items disponibles
          const analisisManual = {
            categoriasEncontradas: [{
              nombre: `Equipos de ${categoriaPredominante}`,
              cantidadItems: itemsDisponibles.length,
              porcentaje: 100,
              items: itemsDisponibles
            }],
            totalItems: itemsDisponibles.length,
            patronDominante: 'Análisis directo de items disponibles del ProyectoEquipo',
            sugerencias: [{
              nombre: `Lista de ${categoriaPredominante}`,
              descripcion: `Lista con equipos de ${categoriaPredominante} que aún no están asignados a listas`,
              itemsIds: itemsDisponibles.map((item: any) => item.id),
              categoriaPrincipal: categoriaPredominante,
              confianza: 85,
              razonamiento: `Lista directa con ${itemsDisponibles.length} items de ${categoriaPredominante} disponibles del ProyectoEquipo`
            }],
            confianzaGeneral: 85
          }

          setAnalisis(analisisManual)
          setPasoActual('mostrando')

          toast.success(`✅ Análisis completado con ${itemsDisponibles.length} items disponibles del ProyectoEquipo`)
          return
        }

        // Si no hay items ni en el análisis ni en el ProyectoEquipo
        console.log('ℹ️ No hay items disponibles en ProyectoEquipo - Todos asignados a listas')

        toast.error(`⚠️ No hay items disponibles para analizar en ProyectoEquipo "${proyectoEquipo?.nombre || 'Sin nombre'}"`)

        // Análisis vacío
        setAnalisis({
          categoriasEncontradas: [],
          totalItems: 0,
          patronDominante: 'Sin items disponibles',
          sugerencias: [],
          confianzaGeneral: 0
        })
        setPasoActual('mostrando')
        return
      }

      setAnalisis(resultadoAnalisis)

      // Seleccionar automáticamente todas las sugerencias con alta confianza
      const sugerenciasAltas = resultadoAnalisis.sugerencias
        .map((_, index) => index)
        .filter(index => resultadoAnalisis.sugerencias[index].confianza >= 80)

      setSugerenciasSeleccionadas(new Set(sugerenciasAltas))
      setPasoActual('mostrando')

    } catch (error) {
      console.error('Error en análisis inteligente:', error)
      toast.error('❌ Error al realizar el análisis inteligente')
      onClose()
    } finally {
      setCargando(false)
    }
  }

  const toggleSugerencia = (index: number) => {
    const nuevasSeleccionadas = new Set(sugerenciasSeleccionadas)
    if (nuevasSeleccionadas.has(index)) {
      nuevasSeleccionadas.delete(index)
    } else {
      nuevasSeleccionadas.add(index)
    }
    setSugerenciasSeleccionadas(nuevasSeleccionadas)
  }

  const toggleExpansionSugerencia = (index: number) => {
    const nuevasExpandidas = new Set(sugerenciasExpandidas)
    if (nuevasExpandidas.has(index)) {
      nuevasExpandidas.delete(index)
    } else {
      nuevasExpandidas.add(index)
    }
    setSugerenciasExpandidas(nuevasExpandidas)
  }

  const aplicarSugerenciasSeleccionadas = async () => {
    if (!analisis) return

    try {
      setCargando(true)
      setPasoActual('confirmacion')

      const sugerenciasAAplicar = Array.from(sugerenciasSeleccionadas)
        .map(index => analisis.sugerencias[index])
        .filter(sugerencia => sugerencia !== undefined)

      if (sugerenciasAAplicar.length === 0) {
        toast.error('No hay sugerencias seleccionadas')
        setPasoActual('mostrando')
        return
      }

      let primeraListaId = ''

      // Crear cada lista sugerida
      for (const sugerencia of sugerenciasAAplicar) {
        // 🔧 FILTRAR ITEMS QUE YA ESTÁN EN LISTAS ACTIVAS
        const itemsDisponibles = sugerencia.itemsIds.filter(itemId => {
          const proyectoItem = proyectoEquipo.items?.find(item => item.id === itemId)
          // Solo permitir items que NO estén en listas activas (estado 'en_lista')
          return proyectoItem && proyectoItem.estado !== 'en_lista'
        })

        if (itemsDisponibles.length === 0) {
          console.warn(`⚠️ Lista "${sugerencia.nombre}" omitida: todos los items ya están en listas activas`)
          continue // Saltar esta sugerencia
        }

        console.log('🔄 Creando lista:', {
          nombre: sugerencia.nombre,
          itemsOriginales: sugerencia.itemsIds.length,
          itemsDisponibles: itemsDisponibles.length,
          itemsFiltrados: sugerencia.itemsIds.length - itemsDisponibles.length
        })

        const payload = {
          proyectoId,
          proyectoEquipoId: proyectoEquipo.id,
          nombre: sugerencia.nombre,
          descripcion: sugerencia.descripcion,
          itemsIds: itemsDisponibles
        }

        console.log('📤 Payload enviado:', payload)

        const response = await fetch('/api/lista-equipo/from-proyecto-equipo/distribuir', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        })

        if (!response.ok) {
          let errorMessage = `HTTP ${response.status}: ${response.statusText}`
          try {
            const errorData = await response.json()
            errorMessage = errorData.error || errorData.message || errorMessage
          } catch (parseError) {
            // Si no es JSON, intentar como texto
            try {
              const errorText = await response.text()
              if (errorText) errorMessage = errorText
            } catch (textError) {
              // Mantener el mensaje HTTP por defecto
            }
          }

          console.error('❌ Error en respuesta:', {
            status: response.status,
            statusText: response.statusText,
            errorMessage
          })
          throw new Error(`Error creando lista ${sugerencia.nombre}: ${errorMessage}`)
        }

        const result = await response.json()
        console.log('✅ Lista creada exitosamente:', result)

        // Obtener el ID de la primera lista creada
        if (!primeraListaId) {
          primeraListaId = result.id
        }
      }

      toast.success(`✅ ${sugerenciasAAplicar.length} lista(s) creada(s) exitosamente`)

      // 🔄 Refrescar datos del componente padre si está disponible
      if (refreshData) {
        console.log('🔄 Refrescando datos del componente padre...')
        refreshData()
      }

      onDistribucionCompletada(primeraListaId)
      onClose()

    } catch (error) {
      console.error('Error aplicando sugerencias:', error)
      toast.error('❌ Error al crear las listas')
      setPasoActual('mostrando')
    } finally {
      setCargando(false)
    }
  }

  const [estadisticas, setEstadisticas] = useState<any>(null)

  // Cargar estadísticas cuando se abre el modal
  useEffect(() => {
    if (isOpen && proyectoEquipo) {
      obtenerEstadisticasRapidas(proyectoEquipo).then(setEstadisticas)
    }
  }, [isOpen, proyectoEquipo])

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[80vh] overflow-hidden">
        <DialogHeader className="pb-3">
          <DialogTitle className="flex items-center gap-2 text-lg">
            <Brain className="h-4 w-4 text-purple-600" />
            Crear Lista Inteligente
          </DialogTitle>
        </DialogHeader>

        <ScrollArea className="max-h-[calc(80vh-80px)] pr-2">
          {/* Paso 1: Analizando */}
          {pasoActual === 'analizando' && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="text-center py-4"
            >
              <div className="relative">
                <div className="w-24 h-24 mx-auto mb-6 relative">
                  <div className="absolute inset-0 rounded-full bg-purple-100 animate-pulse"></div>
                  <div className="relative flex items-center justify-center w-full h-full">
                    <Brain className="h-12 w-12 text-purple-600" />
                  </div>
                </div>
                <div className="space-y-3">
                  <h3 className="text-xl font-semibold">Analizando Proyecto</h3>
                  <p className="text-muted-foreground text-base">Procesando categorías y patrones...</p>
                  <div className="flex justify-center mt-6">
                    <div className="flex space-x-2">
                      <div className="w-3 h-3 bg-purple-600 rounded-full animate-bounce"></div>
                      <div className="w-3 h-3 bg-purple-600 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
                      <div className="w-3 h-3 bg-purple-600 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
                    </div>
                  </div>
                </div>
              </div>
            </motion.div>
          )}

          {/* Paso 2: Mostrando Resultados */}
          {pasoActual === 'mostrando' && analisis && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="space-y-3 pb-12"
            >
              {/* Estadísticas Generales */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                <Card className="border-blue-200">
                  <CardContent className="p-3 text-center">
                    <BarChart3 className="h-5 w-5 mx-auto mb-1 text-blue-600" />
                    <div className="text-xl font-bold text-blue-600">{analisis.totalItems}</div>
                    <div className="text-xs text-muted-foreground">Items</div>
                  </CardContent>
                </Card>
                <Card className="border-green-200">
                  <CardContent className="p-3 text-center">
                    <PieChart className="h-5 w-5 mx-auto mb-1 text-green-600" />
                    <div className="text-xl font-bold text-green-600">{analisis.categoriasEncontradas.length}</div>
                    <div className="text-xs text-muted-foreground">Categorías</div>
                  </CardContent>
                </Card>
                <Card className="border-purple-200">
                  <CardContent className="p-3 text-center">
                    <Target className="h-5 w-5 mx-auto mb-1 text-purple-600" />
                    <div className="text-xl font-bold text-purple-600">{analisis.confianzaGeneral}%</div>
                    <div className="text-xs text-muted-foreground">Confianza</div>
                  </CardContent>
                </Card>
                <Card className="border-orange-200">
                  <CardContent className="p-3 text-center">
                    <Sparkles className="h-5 w-5 mx-auto mb-1 text-orange-600" />
                    <div className="text-xl font-bold text-orange-600">{analisis.sugerencias.length}</div>
                    <div className="text-xs text-muted-foreground">Sugerencias</div>
                  </CardContent>
                </Card>
              </div>

              {/* Patrón Detectado */}
              <Card className="border-purple-200 bg-purple-50">
                <CardContent className="p-3">
                  <div className="flex items-center gap-2 mb-1">
                    <Lightbulb className="h-4 w-4 text-purple-600" />
                    <span className="font-semibold text-purple-900 text-sm">Patrón Detectado</span>
                  </div>
                  <p className="text-purple-800 text-sm">{analisis.patronDominante}</p>
                </CardContent>
              </Card>

              {/* Distribución por Categorías */}
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm">Distribución por Categorías</CardTitle>
                </CardHeader>
                <CardContent className="pt-0">
                  <div className="space-y-2 max-h-32 overflow-y-auto">
                    {analisis.categoriasEncontradas.map((categoria, index) => (
                      <div key={index} className="flex items-center justify-between p-2 rounded-lg hover:bg-gray-50">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <span className="font-medium text-sm truncate">{categoria.nombre}</span>
                            <Badge variant="outline" className="text-xs">{categoria.cantidadItems} items</Badge>
                          </div>
                          <Progress value={categoria.porcentaje} className="h-2" />
                        </div>
                        <span className="text-sm font-medium ml-3 text-nowrap">{categoria.porcentaje}%</span>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>

              {/* Sugerencias Inteligentes */}
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm flex items-center gap-2">
                    <TrendingUp className="h-4 w-4" />
                    Sugerencias
                  </CardTitle>
                </CardHeader>
                <CardContent className="pt-0">
                  <div className="space-y-2 max-h-48 overflow-y-auto">
                    {analisis.sugerencias.map((sugerencia, index) => (
                      <motion.div
                        key={index}
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: index * 0.05 }}
                        className={`border rounded-lg transition-all ${
                          sugerenciasSeleccionadas.has(index)
                            ? 'border-purple-300 bg-purple-50 shadow-sm'
                            : 'border-gray-200 hover:border-gray-300'
                        }`}
                      >
                        {/* Header de la sugerencia */}
                        <div
                          className="p-3 cursor-pointer"
                          onClick={() => toggleSugerencia(index)}
                        >
                          <div className="flex items-start gap-2">
                            <input
                              type="checkbox"
                              checked={sugerenciasSeleccionadas.has(index)}
                              onChange={() => toggleSugerencia(index)}
                              className="mt-0.5 rounded border-gray-300"
                            />
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 mb-1 flex-wrap">
                                <h4 className="font-semibold text-sm">{sugerencia.nombre}</h4>
                                <Badge
                                  variant={sugerencia.confianza >= 80 ? "default" : "secondary"}
                                  className={`text-xs ${sugerencia.confianza >= 80 ? "bg-green-100 text-green-800" : ""}`}
                                >
                                  {sugerencia.confianza}%
                                </Badge>
                              </div>
                              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                                <span className="flex items-center gap-1">
                                  <Package className="h-3 w-3" />
                                  {sugerencia.itemsIds.length} items
                                </span>
                                <span>•</span>
                                <span>{sugerencia.categoriaPrincipal}</span>
                              </div>
                            </div>
                            {/* Botón de expandir/colapsar */}
                            <button
                              onClick={(e) => {
                                e.stopPropagation()
                                toggleExpansionSugerencia(index)
                              }}
                              className="p-1 hover:bg-gray-100 rounded transition-colors"
                            >
                              {sugerenciasExpandidas.has(index) ? (
                                <EyeOff className="h-4 w-4 text-gray-500" />
                              ) : (
                                <Eye className="h-4 w-4 text-gray-500" />
                              )}
                            </button>
                          </div>
                        </div>

                        {/* Lista de items (expandible) */}
                        {sugerenciasExpandidas.has(index) && (
                          <motion.div
                            initial={{ opacity: 0, height: 0 }}
                            animate={{ opacity: 1, height: 'auto' }}
                            exit={{ opacity: 0, height: 0 }}
                            className="border-t bg-gray-50/50"
                          >
                            <div className="p-3">
                              <div className="text-xs font-medium text-gray-700 mb-2 flex items-center gap-1">
                                <ChevronRight className="h-3 w-3" />
                                Items incluidos en esta lista:
                              </div>
                              <div className="max-h-32 overflow-y-auto space-y-1">
                                {sugerencia.itemsIds.map((itemId, itemIndex) => {
                                  // Buscar el item en el proyectoEquipo para mostrar su descripción
                                  const item = proyectoEquipo.items?.find(i => i.id === itemId)
                                  return (
                                    <div
                                      key={itemId}
                                      className="text-xs text-gray-600 bg-white px-2 py-1 rounded border flex items-center gap-2"
                                    >
                                      <span className="w-4 h-4 bg-blue-100 text-blue-800 rounded-full flex items-center justify-center text-[10px] font-medium">
                                        {itemIndex + 1}
                                      </span>
                                      <span className="truncate">
                                        {item?.descripcion || `Item ${itemId.substring(0, 8)}...`}
                                      </span>
                                      {item?.categoria && (
                                        <Badge variant="outline" className="text-[10px] px-1 py-0">
                                          {item.categoria}
                                        </Badge>
                                      )}
                                    </div>
                                  )
                                })}
                              </div>
                            </div>
                          </motion.div>
                        )}
                      </motion.div>
                    ))}
                  </div>
                </CardContent>
              </Card>

              {/* Botones de acción dentro del contenido scrolleable */}
              <div className="sticky bottom-0 bg-white border-t pt-2 mt-3">
                <div className="flex justify-between gap-3">
                  <Button variant="outline" onClick={onClose} size="sm" className="flex-1">
                    Cancelar
                  </Button>
                  <Button
                    onClick={aplicarSugerenciasSeleccionadas}
                    disabled={sugerenciasSeleccionadas.size === 0 || cargando}
                    size="sm"
                    className="bg-purple-600 hover:bg-purple-700 flex-1"
                  >
                    {cargando ? (
                      <>
                        <Loader2 className="h-3 w-3 mr-1 animate-spin" />
                        Creando...
                      </>
                    ) : (
                      <>
                        Aplicar {sugerenciasSeleccionadas.size}
                        <Sparkles className="h-3 w-3 ml-1" />
                      </>
                    )}
                  </Button>
                </div>
              </div>
            </motion.div>
          )}

          {/* Paso 3: Confirmación */}
          {pasoActual === 'confirmacion' && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="text-center py-16"
            >
              <div className="text-6xl mb-6">🎉</div>
              <h3 className="text-xl font-semibold mb-3">¡Listas creadas exitosamente!</h3>
              <p className="text-muted-foreground text-base max-w-md mx-auto mb-6">
                Las listas técnicas han sido creadas basadas en el análisis inteligente.
                Puedes acceder a ellas desde el menú de listas.
              </p>
              <Button onClick={onClose} className="w-full bg-green-600 hover:bg-green-700">
                <CheckCircle2 className="h-4 w-4 mr-2" />
                Entendido
              </Button>
            </motion.div>
          )}
        </ScrollArea>
      </DialogContent>
    </Dialog>
  )
}
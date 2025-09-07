// ===================================================
// 📁 Archivo: page.tsx
// 📌 Ubicación: src/app/proyectos/[id]/equipos/comparacion/page.tsx
// 🔧 Descripción: Página de comparación de equipos con UX/UI mejorada
//
// 🎨 Mejoras UX/UI aplicadas:
// - Diseño moderno con Framer Motion
// - Header mejorado con navegación
// - Componentes shadcn/ui consistentes
// - Iconografía Lucide React
// - Layout responsivo
// - Estados de carga optimizados
// ===================================================

'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import { getProyectoById } from '@/lib/services/proyecto'
import { getListaEquiposPorProyecto } from '@/lib/services/listaEquipo'
import type { Proyecto, ListaEquipoItem } from '@/types'
import { Skeleton } from '@/components/ui/skeleton'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Separator } from '@/components/ui/separator'
import { Input } from '@/components/ui/input'
import { 
  GitCompare, 
  Package, 
  ArrowRight, 
  TrendingUp, 
  TrendingDown,
  CheckCircle,
  XCircle,
  Search,
  Filter,
  Download,
  Share2,
  Settings,
  ChevronRight,
  DollarSign,
  AlertTriangle,
  Info,
  Plus,
  X,
  ArrowLeftRight,
  BarChart3,
  Target,
  Calculator,
  RefreshCw
} from 'lucide-react'
import { toast } from 'sonner'
import ComparacionLadoALado from '@/components/proyectos/equipos/ComparacionLadoALado'
import ExportarReporteDiferencias from '@/components/proyectos/ExportarReporteDiferencias'
import SelectorVistaComparacion, { type TipoVista } from '@/components/proyectos/equipos/SelectorVistaComparacion'
import VistaTablaDual from '@/components/proyectos/equipos/VistaTablaDual'
import VistaMatriz from '@/components/proyectos/equipos/VistaMatriz'
import VistaDashboard from '@/components/proyectos/equipos/VistaDashboard'
import VistaTimeline from '@/components/proyectos/equipos/VistaTimeline'
import VistaListaCompacta from '@/components/proyectos/equipos/VistaListaCompacta'
import VistaImpactoFinanciero from '@/components/proyectos/equipos/VistaImpactoFinanciero'

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

const cardVariants = {
  hidden: { opacity: 0, scale: 0.95 },
  visible: { 
    opacity: 1, 
    scale: 1,
    transition: { duration: 0.3 }
  }
}

export default function ComparacionEquiposPage() {
  const { id } = useParams<{ id: string }>()
  const router = useRouter()
  const [proyecto, setProyecto] = useState<Proyecto | null>(null)
  const [listaItems, setListaItems] = useState<ListaEquipoItem[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [filterStatus, setFilterStatus] = useState<string>('all')
  const [vistaActual, setVistaActual] = useState<TipoVista>('lado-a-lado')

  const [totalPEI, setTotalPEI] = useState(0)
  const [totalLEI, setTotalLEI] = useState(0)
  const [diferencia, setDiferencia] = useState(0)
  const [porcentajeDiferencia, setPorcentajeDiferencia] = useState(0)

  // Utility functions
  const formatCurrency = (amount: number): string => {
    return new Intl.NumberFormat('es-PE', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2
    }).format(amount)
  }

  const getStatusVariant = (estado: string): "default" | "secondary" | "outline" => {
    switch (estado?.toLowerCase()) {
      case 'incluido': return 'default'
      case 'nuevo': return 'secondary'
      case 'reemplazo': return 'outline'
      case 'descartado': return 'secondary'
      case 'reemplazado': return 'secondary'
      default: return 'outline'
    }
  }

  const getStatusIcon = (estado: string) => {
    switch (estado?.toLowerCase()) {
      case 'incluido': return <CheckCircle className="h-4 w-4" />
      case 'nuevo': return <Info className="h-4 w-4" />
      case 'reemplazo': return <ArrowRight className="h-4 w-4" />
      case 'descartado': return <XCircle className="h-4 w-4" />
      case 'reemplazado': return <XCircle className="h-4 w-4" />
      default: return <AlertTriangle className="h-4 w-4" />
    }
  }

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [proyectoData, listaData] = await Promise.all([
          getProyectoById(id),
          getListaEquiposPorProyecto(id)
        ])
        
        const items = listaData.flatMap((l) => l.items)
        setProyecto(proyectoData)
        setListaItems(items)
        
        // Calcular totales, diferencias y contadores
        const totalPEI = proyectoData?.equipos?.reduce((acc, grupo) => {
          return acc + grupo.items.reduce((suma, item) =>
            suma + (item.precioInterno || 0) * (item.cantidad || 0), 0)
        }, 0) || 0
        const totalLEI = items.reduce((acc, item) =>
          acc + (item.precioElegido || 0) * (item.cantidad || 0), 0)
        const diff = totalLEI - totalPEI
        const percentage = totalPEI > 0 ? ((diff / totalPEI) * 100) : 0
        
        setTotalPEI(totalPEI)
        setTotalLEI(totalLEI)
        setDiferencia(diff)
        setPorcentajeDiferencia(percentage)
        
        toast.success('Datos de comparación cargados correctamente')
      } catch (error) {
        console.error('Error fetching data:', error)
        toast.error('Error al cargar los datos de comparación')
      } finally {
        setLoading(false)
      }
    }

    if (id) {
      fetchData()
    }
  }, [id])

  // ✅ Enhanced comparison data structure with proper replacement tracking
  const createComparisonData = () => {
    if (!proyecto) return { 
      comparisons: [], 
      summary: { 
        mantenidos: 0, 
        reemplazados: 0, 
        agregados: 0, 
        descartados: 0,
        totalItems: 0,
        impactoFinanciero: 0,
        porcentajeCambio: 0
      } 
    }
    
    const comparisons: any[] = []
    const summary = { 
      mantenidos: 0, 
      reemplazados: 0, 
      agregados: 0, 
      descartados: 0,
      totalItems: 0,
      impactoFinanciero: 0,
      porcentajeCambio: 0
    }
    
    // 📡 Process each ProyectoEquipo group with enhanced logic
    proyecto.equipos.forEach(grupo => {
      grupo.items.forEach(pei => {
        const costoPEI = (pei.precioInterno || 0) * (pei.cantidad || 0)
        
        // 🔁 Find directly related ListaEquipoItems (same item, different versions)
        const itemsDirectos = listaItems.filter(lei => lei.proyectoEquipoItemId === pei.id)
        
        // 🔁 Find replacement items (items that replace this PEI)
        const itemsReemplazo = listaItems.filter(lei => lei.reemplazaProyectoEquipoItemId === pei.id)
        
        if (pei.estado === 'reemplazado') {
          // ✅ Item was replaced - show original and replacement
          const reemplazo = itemsReemplazo[0] // Get the replacement item
          if (reemplazo) {
            const costoLEI = (reemplazo.precioElegido || 0) * (reemplazo.cantidad || 0)
            comparisons.push({
              type: 'reemplazado',
              category: 'reemplazados',
              pei,
              lei: reemplazo,
              grupo: grupo.nombre,
              costoPEI,
              costoLEI,
              diferencia: costoLEI - costoPEI,
              estado: 'reemplazado',
              trazabilidad: {
                original: pei,
                reemplazo: reemplazo,
                motivo: reemplazo.comentarioRevision || pei.motivoCambio || 'No especificado'
              }
            })
            summary.reemplazados++
          } else {
            // ✅ Marked as replaced but no replacement found
            comparisons.push({
              type: 'descartado',
              category: 'descartados',
              pei,
              lei: null,
              grupo: grupo.nombre,
              costoPEI,
              costoLEI: 0,
              diferencia: -costoPEI,
              estado: 'descartado'
            })
            summary.descartados++
          }
        } else if (pei.estado === 'descartado') {
          // ✅ Item was discarded
          comparisons.push({
            type: 'descartado',
            category: 'descartados',
            pei,
            lei: null,
            grupo: grupo.nombre,
            costoPEI,
            costoLEI: 0,
            diferencia: -costoPEI,
            estado: 'descartado'
          })
          summary.descartados++
        } else if (itemsDirectos.length > 0) {
          // ✅ Item maintained (possibly with modifications)
          const itemMantenido = itemsDirectos[0]
          const costoLEI = (itemMantenido.precioElegido || 0) * (itemMantenido.cantidad || 0)
          comparisons.push({
            type: 'mantenido',
            category: 'mantenidos',
            pei,
            lei: itemMantenido,
            grupo: grupo.nombre,
            costoPEI,
            costoLEI,
            diferencia: costoLEI - costoPEI,
            estado: itemMantenido.origen || 'incluido'
          })
          summary.mantenidos++
        } else if (itemsReemplazo.length === 0) {
          // ✅ Item not included in any list
          comparisons.push({
            type: 'no_incluido',
            category: 'descartados',
            pei,
            lei: null,
            grupo: grupo.nombre,
            costoPEI,
            costoLEI: 0,
            diferencia: -costoPEI,
            estado: 'no_incluido'
          })
          summary.descartados++
        }
      })
    })
    
    // 📡 Add completely new items (not related to any PEI)
    proyecto.equipos.forEach(grupo => {
      const itemsNuevos = listaItems.filter(lei => 
        !lei.proyectoEquipoItemId && 
        !lei.reemplazaProyectoEquipoItemId &&
        lei.proyectoEquipoId === grupo.id
      )
      
      itemsNuevos.forEach(lei => {
        const costoLEI = (lei.precioElegido || 0) * (lei.cantidad || 0)
        comparisons.push({
          type: 'agregado',
          category: 'agregados',
          pei: null,
          lei,
          grupo: grupo.nombre,
          costoPEI: 0,
          costoLEI,
          diferencia: costoLEI,
          estado: lei.origen || 'nuevo'
        })
        summary.agregados++
      })
    })
    
    // ✅ Calculate additional summary properties
    summary.totalItems = summary.mantenidos + summary.reemplazados + summary.agregados + summary.descartados
    
    // 💰 Calculate financial impact
    summary.impactoFinanciero = comparisons.reduce((total, item) => total + item.diferencia, 0)
    
    // 📊 Calculate percentage of change
    const totalOriginalCost = comparisons.reduce((total, item) => total + item.costoPEI, 0)
    summary.porcentajeCambio = totalOriginalCost > 0 
      ? ((summary.reemplazados + summary.agregados + summary.descartados) / summary.totalItems) * 100
      : 0
    
    return { comparisons, summary }
  }

  const { comparisons, summary } = createComparisonData()
  
  // Filter comparison data
  const filteredComparisons = comparisons.filter(item => {
    const pei = item.pei
    const lei = item.lei
    
    const matchesSearch = 
      pei?.descripcion?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      pei?.marca?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      lei?.descripcion?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      lei?.codigo?.toLowerCase().includes(searchTerm.toLowerCase())
    
    const matchesFilter = filterStatus === 'all' || item.type?.toLowerCase() === filterStatus.toLowerCase()
    
    return matchesSearch && matchesFilter
  })

  const handleExport = () => {
    toast.info('Función de exportación en desarrollo')
  }

  const handleShare = () => {
    navigator.clipboard.writeText(window.location.href)
    toast.success('Enlace copiado al portapapeles')
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50/30 p-6">
        <motion.div 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="max-w-7xl mx-auto space-y-6"
        >
          <Skeleton className="h-20 w-full rounded-xl" />
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <Skeleton className="h-32 rounded-xl" />
            <Skeleton className="h-32 rounded-xl" />
            <Skeleton className="h-32 rounded-xl" />
          </div>
          <Skeleton className="h-96 w-full rounded-xl" />
        </motion.div>
      </div>
    )
  }

  if (!proyecto) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50/30 flex items-center justify-center">
        <Card className="p-8 text-center">
          <AlertTriangle className="h-12 w-12 text-amber-500 mx-auto mb-4" />
          <h2 className="text-xl font-semibold mb-2">Proyecto no encontrado</h2>
          <p className="text-gray-600 mb-4">No se pudo cargar la información del proyecto</p>
          <Button onClick={() => router.back()} variant="outline">
            Volver
          </Button>
        </Card>
      </div>
    )
  }

  return (
    <motion.div 
      initial="hidden"
      animate="visible"
      variants={containerVariants}
      className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50/30"
    >
      <div className="max-w-7xl mx-auto p-6 space-y-8">
        {/* Header Section */}
        <motion.div variants={itemVariants}>
          <Card className="border-0 shadow-lg bg-white/80 backdrop-blur-sm">
            <CardHeader className="pb-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-4">
                  <div className="p-3 bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl text-white">
                    <GitCompare className="h-6 w-6" />
                  </div>
                  <div>
                    <CardTitle className="text-2xl font-bold bg-gradient-to-r from-gray-900 to-gray-700 bg-clip-text text-transparent">
                      Comparación de Equipos
                    </CardTitle>
                    <div className="flex items-center space-x-2 mt-1">
                      <Package className="h-4 w-4 text-gray-500" />
                      <span className="text-gray-600 font-medium">{proyecto.nombre}</span>
                      <ChevronRight className="h-4 w-4 text-gray-400" />
                      <span className="text-sm text-gray-500">Análisis Financiero</span>
                    </div>
                  </div>
                </div>
                <div className="flex items-center space-x-2">
                  <Button variant="outline" size="sm" onClick={handleShare}>
                    <Share2 className="h-4 w-4 mr-2" />
                    Compartir
                  </Button>
                  <Button variant="outline" size="sm" onClick={handleExport}>
                    <Download className="h-4 w-4 mr-2" />
                    Exportar
                  </Button>
                </div>
              </div>
            </CardHeader>
          </Card>
        </motion.div>

        {/* Vista General de Comparación */}
        <motion.div variants={itemVariants}>
          <Card className="border-0 shadow-md bg-gradient-to-r from-slate-50 to-slate-100/50 mb-4">
            <CardContent className="p-4">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-slate-800 flex items-center gap-2">
                  <BarChart3 className="h-5 w-5" />
                  Resumen General de Comparación
                </h3>
                <div className="flex gap-2">
                  <Badge variant="outline" className="text-xs bg-blue-50 text-blue-700">
                    {proyecto?.equipos?.reduce((acc, g) => acc + g.items.length, 0) || 0} equipos cotizados
                  </Badge>
                  <Badge variant="outline" className="text-xs bg-green-50 text-green-700">
                    {Array.from(new Set(listaItems.map(item => item.listaId))).length} listas activas
                  </Badge>
                </div>
              </div>
              
              {/* Métricas principales */}
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-4">
                <div className="text-center p-3 bg-white rounded-lg border border-blue-200">
                  <p className="text-xl font-bold text-blue-800">{proyecto?.equipos?.length || 0}</p>
                  <p className="text-xs text-slate-600">Grupos Comerciales</p>
                  <p className="text-xs text-blue-600 font-medium">{formatCurrency(totalPEI)}</p>
                </div>
                <div className="text-center p-3 bg-white rounded-lg border border-green-200">
                  <p className="text-xl font-bold text-green-800">{Array.from(new Set(listaItems.map(item => item.listaId))).length}</p>
                  <p className="text-xs text-slate-600">Listas de Proyecto</p>
                  <p className="text-xs text-green-600 font-medium">{formatCurrency(totalLEI)}</p>
                </div>
                <div className="text-center p-3 bg-white rounded-lg border border-orange-200">
                  <p className="text-xl font-bold text-orange-800">{proyecto?.equipos?.reduce((acc, g) => acc + g.items.length, 0) || 0}</p>
                  <p className="text-xs text-slate-600">Equipos Cotizados</p>
                  <p className="text-xs text-orange-600 font-medium">Comercial</p>
                </div>
                <div className="text-center p-3 bg-white rounded-lg border border-purple-200">
                  <p className="text-xl font-bold text-purple-800">{listaItems.length}</p>
                  <p className="text-xs text-slate-600">Items en Listas</p>
                  <p className="text-xs text-purple-600 font-medium">Proyecto</p>
                </div>
              </div>
              
              {/* Resumen de costos totales */}
              <div className="bg-gradient-to-r from-slate-100 to-slate-50 rounded-lg p-4 mb-4 border">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <Calculator className="h-5 w-5 text-slate-600" />
                    <div>
                      <h4 className="text-sm font-semibold text-slate-800">Resumen Financiero Total</h4>
                      <p className="text-xs text-slate-600">Comparación de costos entre equipos comerciales y listas de proyecto</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-lg font-bold text-slate-800">{formatCurrency(totalPEI + totalLEI)}</p>
                    <p className="text-xs text-slate-600">Inversión Total Estimada</p>
                  </div>
                </div>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                 {/* ProyectoEquipo Total */}
                 <div className="bg-blue-50 rounded-lg p-3 border border-blue-200">
                   <div className="flex items-center justify-between mb-2">
                     <h4 className="text-sm font-medium text-blue-800">Equipos Comerciales</h4>
                     <Package className="h-4 w-4 text-blue-600" />
                   </div>
                   <div className="space-y-2">
                     <div>
                       <p className="text-lg font-bold text-blue-900">{formatCurrency(totalPEI)}</p>
                       <p className="text-xs text-blue-600">
                         {proyecto?.equipos?.length || 0} grupos • {proyecto?.equipos.reduce((acc, g) => acc + g.items.length, 0) || 0} items
                       </p>
                     </div>
                     {/* Subtotales por grupo */}
                     <div className="space-y-1 max-h-20 overflow-y-auto">
                       {proyecto?.equipos?.slice(0, 3).map((grupo, idx) => {
                         const grupoTotal = grupo.items.reduce((acc, item) => 
                           acc + (item.precioInterno || 0) * item.cantidad, 0
                         )
                         return (
                           <div key={`grupo-${grupo.id}-${idx}`} className="flex justify-between text-xs">
                             <span className="text-blue-700 truncate">{grupo.nombre}</span>
                             <span className="text-blue-800 font-medium">{formatCurrency(grupoTotal)}</span>
                           </div>
                         )
                       })}
                       {(proyecto?.equipos?.length || 0) > 3 && (
                         <div className="text-xs text-blue-600 text-center">+{(proyecto?.equipos?.length || 0) - 3} grupos más</div>
                       )}
                     </div>
                   </div>
                 </div>

                 {/* ListaEquipo Total */}
                 <div className="bg-green-50 rounded-lg p-3 border border-green-200">
                   <div className="flex items-center justify-between mb-2">
                     <h4 className="text-sm font-medium text-green-800">Listas de Equipos</h4>
                     <Target className="h-4 w-4 text-green-600" />
                   </div>
                   <div className="space-y-2">
                     <div>
                       <p className="text-lg font-bold text-green-900">{formatCurrency(totalLEI)}</p>
                       <p className="text-xs text-green-600">
                         {/* Contar listas únicas */}
                         {Array.from(new Set(listaItems.map(item => item.listaId))).length} listas • {listaItems.length} items
                       </p>
                     </div>
                     {/* Subtotales por lista */}
                     <div className="space-y-1 max-h-20 overflow-y-auto">
                       {Array.from(new Set(listaItems.map(item => item.listaId)))
                         .slice(0, 3)
                         .map((listaId, idx) => {
                           const itemsLista = listaItems.filter(item => item.listaId === listaId)
                           const listaTotal = itemsLista.reduce((acc, item) => 
                             acc + (item.precioElegido || 0) * item.cantidad, 0
                           )
                           const listaNombre = itemsLista[0]?.lista?.nombre || `Lista ${idx + 1}`
                           return (
                             <div key={`lista-${listaId}-${idx}`} className="flex justify-between text-xs">
                               <span className="text-green-700 truncate">{listaNombre}</span>
                               <span className="text-green-800 font-medium">{formatCurrency(listaTotal)}</span>
                             </div>
                           )
                         })}
                       {Array.from(new Set(listaItems.map(item => item.listaId))).length > 3 && (
                         <div className="text-xs text-green-600 text-center">
                           +{Array.from(new Set(listaItems.map(item => item.listaId))).length - 3} listas más
                         </div>
                       )}
                     </div>
                   </div>
                 </div>
               </div>

              {/* Diferencia y Análisis */}
              <div className={`mt-4 p-3 rounded-lg border ${
                diferencia >= 0 
                  ? 'bg-red-50 border-red-200' 
                  : 'bg-emerald-50 border-emerald-200'
              }`}>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    {diferencia >= 0 
                      ? <TrendingUp className="h-4 w-4 text-red-600" />
                      : <TrendingDown className="h-4 w-4 text-emerald-600" />
                    }
                    <span className={`text-sm font-medium ${
                      diferencia >= 0 ? 'text-red-700' : 'text-emerald-700'
                    }`}>
                      {diferencia >= 0 ? 'Sobrecosto' : 'Ahorro'}
                    </span>
                  </div>
                  <div className="text-right">
                    <p className={`text-base font-bold ${
                      diferencia >= 0 ? 'text-red-900' : 'text-emerald-900'
                    }`}>
                      {diferencia >= 0 ? '+' : ''}{formatCurrency(diferencia)}
                    </p>
                    <p className={`text-xs ${
                      diferencia >= 0 ? 'text-red-600' : 'text-emerald-600'
                    }`}>
                      {porcentajeDiferencia.toFixed(1)}% vs comercial
                    </p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* Summary of Changes - New Section */}
        <motion.div variants={itemVariants}>
          <Card className="border-0 shadow-md bg-white/80 backdrop-blur-sm mb-6">
            <CardHeader className="pb-4">
              <CardTitle className="flex items-center space-x-2">
                <TrendingUp className="h-5 w-5 text-blue-600" />
                <span>Resumen de Cambios</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="p-6">
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <Card className="p-4 border-green-200 bg-green-50">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-xs font-medium text-green-700">Mantenidos</p>
                      <p className="text-lg font-bold text-green-900">{summary.mantenidos}</p>
                      <p className="text-xs text-green-600">Sin cambios o modificados</p>
                    </div>
                    <CheckCircle className="h-5 w-5 text-green-600" />
                  </div>
                </Card>
                
                <Card className="p-4 border-blue-200 bg-blue-50">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-xs font-medium text-blue-700">Reemplazados</p>
                      <p className="text-lg font-bold text-blue-900">{summary.reemplazados}</p>
                      <p className="text-xs text-blue-600">Cambiados por otros</p>
                    </div>
                    <ArrowLeftRight className="h-5 w-5 text-blue-600" />
                  </div>
                </Card>
                
                <Card className="p-4 border-purple-200 bg-purple-50">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-xs font-medium text-purple-700">Agregados</p>
                      <p className="text-lg font-bold text-purple-900">{summary.agregados}</p>
                      <p className="text-xs text-purple-600">Nuevos equipos</p>
                    </div>
                    <Plus className="h-5 w-5 text-purple-600" />
                  </div>
                </Card>
                
                <Card className="p-4 border-red-200 bg-red-50">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-xs font-medium text-red-700">Descartados</p>
                      <p className="text-lg font-bold text-red-900">{summary.descartados}</p>
                      <p className="text-xs text-red-600">No incluidos</p>
                    </div>
                    <X className="h-5 w-5 text-red-600" />
                  </div>
                </Card>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* Financial Summary Cards - Compact */}
        <motion.div variants={itemVariants}>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            <Card className="bg-gradient-to-r from-blue-50 to-blue-100 border-blue-200">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs font-medium text-blue-700">Comercial</p>
                    <p className="text-lg font-bold text-blue-900">{formatCurrency(totalPEI)}</p>
                  </div>
                  <TrendingUp className="h-5 w-5 text-blue-600" />
                </div>
              </CardContent>
            </Card>

            <Card className="bg-gradient-to-r from-green-50 to-green-100 border-green-200">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs font-medium text-green-700">Proyectos</p>
                    <p className="text-lg font-bold text-green-900">{formatCurrency(totalLEI)}</p>
                  </div>
                  <Target className="h-5 w-5 text-green-600" />
                </div>
              </CardContent>
            </Card>

            <Card className={`bg-gradient-to-r ${
              diferencia >= 0 
                ? 'from-red-50 to-red-100 border-red-200' 
                : 'from-green-50 to-green-100 border-green-200'
            }`}>
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className={`text-xs font-medium ${
                      diferencia >= 0 ? 'text-red-700' : 'text-green-700'
                    }`}>Diferencia</p>
                    <p className={`text-lg font-bold ${
                      diferencia >= 0 ? 'text-red-900' : 'text-green-900'
                    }`}>
                      {diferencia >= 0 ? '+' : ''}{formatCurrency(diferencia)}
                    </p>
                  </div>
                  {diferencia >= 0 ? <TrendingUp className="h-5 w-5 text-red-600" /> : <TrendingDown className="h-5 w-5 text-green-600" />}
                </div>
              </CardContent>
            </Card>

            <Card className="bg-gradient-to-r from-purple-50 to-purple-100 border-purple-200">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs font-medium text-purple-700">Items</p>
                    <p className="text-lg font-bold text-purple-900">{comparisons.length}</p>
                  </div>
                  <Calculator className="h-5 w-5 text-purple-600" />
                </div>
              </CardContent>
            </Card>
          </div>
        </motion.div>

        {/* 📊 Export Report */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.3 }}
        >
          <ExportarReporteDiferencias
              comparisons={comparisons}
              summary={summary}
              proyectoNombre={proyecto?.nombre || 'Proyecto'}
              fechaComparacion={new Date()}
              className="mb-6"
            />
        </motion.div>

        {/* Filters and Search - Compact */}
        <motion.div variants={itemVariants}>
          <Card className="border-0 shadow-md bg-white/80 backdrop-blur-sm">
            <CardContent className="p-4">
              <div className="flex flex-col md:flex-row gap-3 items-center justify-between">
                <div className="flex items-center space-x-3 flex-1">
                  <div className="relative flex-1 max-w-md">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                    <Input
                      placeholder="Buscar por descripción, marca..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="pl-10 h-9 border-gray-200 focus:border-blue-500 focus:ring-blue-500"
                    />
                  </div>
                </div>
                <div className="flex items-center space-x-2">
                  <Filter className="h-4 w-4 text-gray-500" />
                  <select
                    value={filterStatus}
                    onChange={(e) => setFilterStatus(e.target.value)}
                    className="px-2 py-1.5 text-sm border border-gray-200 rounded-md focus:border-blue-500 focus:ring-blue-500 bg-white"
                  >
                    <option value="all">Todos los tipos</option>
                    <option value="mantenido">✓ Mantenidos ({summary.mantenidos})</option>
                    <option value="reemplazado">⇄ Reemplazados ({summary.reemplazados})</option>
                    <option value="agregado">+ Agregados ({summary.agregados})</option>
                    <option value="descartado">✗ Descartados ({summary.descartados})</option>
                  </select>
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* 🎯 Vista Selector */}
        <motion.div variants={itemVariants}>
          <SelectorVistaComparacion
             vistaActual={vistaActual}
             onCambiarVista={setVistaActual}
             totalComparaciones={filteredComparisons.length}
           />
        </motion.div>

        {/* 📊 Comparison Content - Dynamic Views */}
        <motion.div variants={itemVariants}>
          <AnimatePresence mode="wait">
            {filteredComparisons.length === 0 ? (
              <motion.div 
                key="empty-state"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                className="text-center py-12"
              >
                <Card className="border-0 shadow-lg bg-white/80 backdrop-blur-sm">
                  <CardContent className="p-12">
                    <div className="mx-auto w-24 h-24 bg-slate-100 rounded-full flex items-center justify-center mb-4">
                      <Package className="h-12 w-12 text-slate-400" />
                    </div>
                    <h3 className="text-lg font-medium text-slate-900 mb-2">
                      No se encontraron comparaciones
                    </h3>
                    <p className="text-slate-600">
                      Intenta ajustar los filtros o términos de búsqueda
                    </p>
                  </CardContent>
                </Card>
              </motion.div>
            ) : (
              <motion.div
                key={vistaActual}
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                transition={{ duration: 0.3 }}
              >
                {vistaActual === 'lado-a-lado' && (
                  <Card className="border-0 shadow-lg bg-white/80 backdrop-blur-sm">
                    <CardHeader>
                      <CardTitle className="flex items-center space-x-2">
                        <ArrowLeftRight className="h-5 w-5 text-blue-600" />
                        <span>Vista Lado a Lado</span>
                        <Badge variant="outline" className="ml-2">
                          {filteredComparisons.length} comparaciones
                        </Badge>
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="p-6">
                      <motion.div 
                        className="space-y-4"
                        variants={containerVariants}
                        initial="hidden"
                        animate="visible"
                      >
                        {filteredComparisons.map((comparison, index) => (
                          <ComparacionLadoALado
                            key={`${comparison.pei?.id || 'new'}-${comparison.lei?.id || 'none'}-${index}`}
                            item={comparison}
                            showFinancialDetails={true}
                            compact={false}
                          />
                        ))}
                      </motion.div>
                    </CardContent>
                  </Card>
                )}

                {vistaActual === 'tabla-dual' && (
                  <VistaTablaDual
                    comparisons={filteredComparisons}
                    summary={summary}
                  />
                )}

                {vistaActual === 'matriz' && (
                  <VistaMatriz
                    comparisons={filteredComparisons}
                    summary={summary}
                  />
                )}

                {vistaActual === 'dashboard' && (
                  <VistaDashboard
                    comparisons={filteredComparisons}
                    summary={summary}
                    totalPEI={totalPEI}
                    totalLEI={totalLEI}
                    diferencia={diferencia}
                    porcentajeDiferencia={porcentajeDiferencia}
                  />
                )}

                {vistaActual === 'timeline' && (
                  <VistaTimeline
                    comparisons={filteredComparisons}
                    summary={summary}
                  />
                )}

                {vistaActual === 'lista-compacta' && (
                  <VistaListaCompacta
                    comparisons={filteredComparisons}
                    summary={summary}
                    searchTerm={searchTerm}
                    onSearchChange={setSearchTerm}
                    filterStatus={filterStatus}
                    onFilterChange={setFilterStatus}
                  />
                )}

                {vistaActual === 'impacto-financiero' && (
                  <VistaImpactoFinanciero
                    comparisons={filteredComparisons}
                    summary={summary}
                    totalPEI={totalPEI}
                    totalLEI={totalLEI}
                    diferencia={diferencia}
                    porcentajeDiferencia={porcentajeDiferencia}
                  />
                )}
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>
      </div>
    </motion.div>
  )
}

'use client'

import { useState, useCallback, useEffect } from 'react'
import { useSession } from 'next-auth/react'
import { toast } from 'sonner'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { ScrollArea } from '@/components/ui/scroll-area'
import { cn } from '@/lib/utils'
import {
  Upload,
  FileSpreadsheet,
  CheckCircle,
  AlertCircle,
  Loader2,
  X,
  Package,
  Download,
  Layers,
  TrendingUp,
  ChevronRight,
  ArrowLeft
} from 'lucide-react'
import { importarEquiposDesdeExcel } from '@/lib/utils/equiposExcel'
import * as XLSX from 'xlsx'
import {
  verificarExistenciaEquipos,
  crearEquiposEnCatalogo,
  importarDesdeCotizacion,
  importarDesdeCatalogo,
  type ResumenImportacionExcel
} from '@/lib/services/listaEquipoImportExcel'
import { getProyectoEquipos } from '@/lib/services/proyectoEquipo'
import type { ProyectoEquipoCotizado } from '@/types'

interface Props {
  isOpen: boolean
  proyectoId: string
  listaId: string
  onClose: () => void
  onSuccess: () => void
}

type Step = 'upload' | 'verify' | 'summary' | 'importing'

const steps: { key: Step; label: string }[] = [
  { key: 'upload', label: 'Subir' },
  { key: 'verify', label: 'Verificar' },
  { key: 'summary', label: 'Importar' },
]

export default function ModalImportarExcelLista({
  isOpen,
  proyectoId,
  listaId,
  onClose,
  onSuccess
}: Props) {
  const { data: session } = useSession()
  const [step, setStep] = useState<Step>('upload')
  const [file, setFile] = useState<File | null>(null)
  const [excelData, setExcelData] = useState<any[]>([])
  const [resumen, setResumen] = useState<ResumenImportacionExcel | null>(null)
  const [loading, setLoading] = useState(false)
  const [importProgress, setImportProgress] = useState(0)
  const [proyectoEquipos, setProyectoEquipos] = useState<ProyectoEquipoCotizado[]>([])
  const [selectedProyectoEquipoId, setSelectedProyectoEquipoId] = useState('')

  const resetModal = useCallback(() => {
    setStep('upload')
    setFile(null)
    setExcelData([])
    setResumen(null)
    setLoading(false)
    setImportProgress(0)
    setProyectoEquipos([])
    setSelectedProyectoEquipoId('')
  }, [])

  useEffect(() => {
    const fetchProyectoEquipos = async () => {
      if (isOpen && proyectoId) {
        try {
          const equipos = await getProyectoEquipos(proyectoId)
          setProyectoEquipos(equipos)
        } catch (error) {
          console.error('Error fetching equipment groups:', error)
        }
      }
    }
    fetchProyectoEquipos()
  }, [isOpen, proyectoId])

  const handleClose = useCallback(() => {
    resetModal()
    onClose()
  }, [resetModal, onClose])

  const handleFileUpload = async (file: File) => {
    try {
      setLoading(true)
      setFile(file)

      const data = await importarEquiposDesdeExcel(file)
      setExcelData(data)

      const itemsExcel = data.map((row: any) => ({
        codigo: row['Código'] || '',
        descripcion: row['Descripción'] || '',
        categoria: row['Categoría'] || '',
        unidad: row['Unidad'] || '',
        marca: row['Marca'] || '',
        cantidad: parseFloat(row['Cantidad']) || 1
      }))

      const resumenData = await verificarExistenciaEquipos(itemsExcel, proyectoId)
      setResumen(resumenData)
      setStep('verify')

      toast.success(`${data.length} items procesados`)
    } catch (error) {
      console.error('Error procesando archivo:', error)
      toast.error('Error al procesar el archivo')
    } finally {
      setLoading(false)
    }
  }

  const handleFileInputChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    if (!file.name.endsWith('.xlsx') && !file.name.endsWith('.xls')) {
      toast.error('Solo archivos Excel (.xlsx o .xls)')
      return
    }

    await handleFileUpload(file)
  }

  const handleCrearEnCatalogo = async () => {
    if (!resumen) return

    try {
      setLoading(true)
      if (resumen.equiposNuevosParaCatalogo.length > 0) {
        await crearEquiposEnCatalogo(resumen.equiposNuevosParaCatalogo)
        toast.success(`${resumen.equiposNuevosParaCatalogo.length} equipos creados`)
      }
      setStep('summary')
    } catch (error) {
      console.error('Error creando equipos:', error)
      toast.error('Error al crear equipos')
    } finally {
      setLoading(false)
    }
  }

  const handleEjecutarImportacion = async () => {
    if (!resumen) return

    try {
      setLoading(true)
      setStep('importing')
      setImportProgress(0)

      const itemsCotizacion = resumen.items.filter(item => item.estado === 'en_cotizacion')
      const itemsCatalogo = resumen.items.filter(item => item.estado === 'solo_catalogo' || item.estado === 'nuevo')

      if (itemsCotizacion.length > 0) {
        const itemIdsCotizacion = itemsCotizacion
          .map(item => item.proyectoEquipoItemId)
          .filter((id): id is string => id !== undefined)

        if (itemIdsCotizacion.length > 0) {
          // Pasar datos del Excel para actualizar cantidades si ya existen
          const itemsExcelData = itemsCotizacion.map(item => ({
            codigo: item.codigo,
            cantidad: item.cantidad
          }))
          await importarDesdeCotizacion(listaId, itemIdsCotizacion, itemsExcelData)
          setImportProgress(50)
        }
      }

      if (itemsCatalogo.length > 0) {
        const resumenActualizado = await verificarExistenciaEquipos(
          excelData.map(row => ({
            codigo: row['Código'] || '',
            descripcion: row['Descripción'] || '',
            categoria: row['Categoría'] || '',
            unidad: row['Unidad'] || '',
            marca: row['Marca'] || '',
            cantidad: parseFloat(row['Cantidad']) || 1
          })),
          proyectoId
        )

        const catalogoIds: string[] = []
        const cantidades: Record<string, number> = {}

        for (const item of resumenActualizado.items) {
          if (item.estado === 'solo_catalogo' || item.estado === 'nuevo') {
            if (item.catalogoId) {
              catalogoIds.push(item.catalogoId)
              const cantidad = resumen.items.find(r => r.codigo === item.codigo)?.cantidad || 1
              cantidades[item.catalogoId] = cantidad
            }
          }
        }

        if (catalogoIds.length > 0) {
          const responsableId = session?.user?.id
          if (!responsableId) throw new Error('Usuario no identificado')
          if (!selectedProyectoEquipoId) throw new Error('Seleccione un grupo de equipo')

          await importarDesdeCatalogo(
            listaId,
            selectedProyectoEquipoId,
            catalogoIds,
            cantidades,
            responsableId
          )
        }
      }

      setImportProgress(100)
      toast.success('Importación completada')
      onSuccess()
      handleClose()
    } catch (error) {
      console.error('Error importando:', error)
      toast.error('Error durante la importación')
      setStep('summary')
    } finally {
      setLoading(false)
    }
  }

  const downloadTemplate = () => {
    const templateData = [
      { 'Código': 'EQ001', 'Descripción': 'Ejemplo de Equipo', 'Categoría': 'Eléctricos', 'Unidad': 'UND', 'Marca': 'Siemens', 'Cantidad': 1 },
      { 'Código': 'EQ002', 'Descripción': 'Otro Equipo', 'Categoría': 'Mecánicos', 'Unidad': 'KG', 'Marca': 'ABB', 'Cantidad': 2 }
    ]
    const ws = XLSX.utils.json_to_sheet(templateData)
    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, ws, 'Plantilla')
    XLSX.writeFile(wb, 'plantilla_importacion.xlsx')
  }

  // Step indicator
  const StepIndicator = () => (
    <div className="flex items-center justify-center gap-1 mb-4">
      {steps.map((s, idx) => {
        const isActive = step === s.key || (step === 'importing' && s.key === 'summary')
        const isPast = steps.findIndex(st => st.key === step) > idx || step === 'importing'

        return (
          <div key={s.key} className="flex items-center">
            <div className={cn(
              'flex items-center gap-1.5 px-2 py-1 rounded-full text-xs transition-colors',
              isActive ? 'bg-orange-100 text-orange-700 font-medium' :
              isPast ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'
            )}>
              {isPast && !isActive ? (
                <CheckCircle className="h-3 w-3" />
              ) : (
                <span className="w-4 h-4 rounded-full bg-current/20 flex items-center justify-center text-[10px] font-bold">
                  {idx + 1}
                </span>
              )}
              {s.label}
            </div>
            {idx < steps.length - 1 && (
              <ChevronRight className="h-3 w-3 mx-1 text-gray-300" />
            )}
          </div>
        )
      })}
    </div>
  )

  // Upload step
  const renderUploadStep = () => (
    <div className="space-y-4">
      <div className="text-center">
        <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-orange-100 mb-3">
          <FileSpreadsheet className="h-6 w-6 text-orange-600" />
        </div>
        <p className="text-xs text-muted-foreground">
          Columnas: Código, Descripción, Categoría, Unidad, Marca, Cantidad
        </p>
      </div>

      <label className="flex flex-col items-center justify-center w-full h-28 border-2 border-dashed border-gray-200 rounded-lg cursor-pointer hover:border-orange-300 hover:bg-orange-50/30 transition-all">
        <div className="flex flex-col items-center justify-center py-4">
          <Upload className="w-6 h-6 mb-2 text-gray-400" />
          <p className="text-sm text-gray-600">
            <span className="font-medium text-orange-600">Clic para subir</span> o arrastra
          </p>
          <p className="text-[10px] text-gray-400">.xlsx o .xls</p>
        </div>
        <input
          type="file"
          className="hidden"
          accept=".xlsx,.xls"
          onChange={handleFileInputChange}
          disabled={loading}
        />
      </label>

      <div className="flex justify-center">
        <Button variant="ghost" size="sm" onClick={downloadTemplate} className="h-7 text-xs text-gray-500">
          <Download className="w-3 h-3 mr-1" />
          Descargar plantilla
        </Button>
      </div>

      {loading && (
        <div className="flex items-center justify-center gap-2 py-2">
          <Loader2 className="h-4 w-4 animate-spin text-orange-600" />
          <span className="text-sm text-gray-600">Procesando...</span>
        </div>
      )}
    </div>
  )

  // Verification step
  const renderVerificationStep = () => {
    if (!resumen) return null

    return (
      <div className="space-y-4">
        <div className="text-center">
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-green-100 mb-2">
            <CheckCircle className="h-6 w-6 text-green-600" />
          </div>
          <p className="text-sm font-medium">{resumen.totalItems} items encontrados</p>
        </div>

        {/* Stats compactos */}
        <div className="grid grid-cols-3 gap-2">
          <div className="text-center p-2 rounded-lg bg-blue-50">
            <div className="text-lg font-bold text-blue-600">{resumen.enCotizacion}</div>
            <div className="text-[10px] text-blue-600/70">En Cotización</div>
          </div>
          <div className="text-center p-2 rounded-lg bg-purple-50">
            <div className="text-lg font-bold text-purple-600">{resumen.soloCatalogo}</div>
            <div className="text-[10px] text-purple-600/70">En Catálogo</div>
          </div>
          <div className="text-center p-2 rounded-lg bg-orange-50">
            <div className="text-lg font-bold text-orange-600">{resumen.nuevos}</div>
            <div className="text-[10px] text-orange-600/70">Nuevos</div>
          </div>
        </div>

        {resumen.nuevos > 0 && (
          <div className="flex items-start gap-2 p-2 rounded-lg bg-amber-50 border border-amber-200">
            <AlertCircle className="h-4 w-4 text-amber-600 mt-0.5 flex-shrink-0" />
            <p className="text-xs text-amber-700">
              Se crearán <strong>{resumen.nuevos}</strong> nuevos equipos en el catálogo.
            </p>
          </div>
        )}

        <div className="flex gap-2 pt-2">
          <Button variant="outline" size="sm" onClick={() => setStep('upload')} disabled={loading} className="h-8">
            <ArrowLeft className="w-3 h-3 mr-1" />
            Atrás
          </Button>
          <Button
            size="sm"
            onClick={handleCrearEnCatalogo}
            disabled={loading}
            className="flex-1 h-8 bg-orange-600 hover:bg-orange-700"
          >
            {loading ? (
              <Loader2 className="w-3 h-3 animate-spin" />
            ) : (
              <>Continuar<ChevronRight className="w-3 h-3 ml-1" /></>
            )}
          </Button>
        </div>
      </div>
    )
  }

  // Summary step
  const renderSummaryStep = () => {
    if (!resumen) return null

    const itemsCotizacion = resumen.items.filter(item => item.estado === 'en_cotizacion')
    const itemsCatalogo = resumen.items.filter(item => item.estado === 'solo_catalogo' || item.estado === 'nuevo')
    const canImport = (itemsCotizacion.length > 0 || itemsCatalogo.length > 0) && selectedProyectoEquipoId

    return (
      <div className="space-y-3">
        {/* Items desde cotización */}
        {itemsCotizacion.length > 0 && (
          <div className="border rounded-lg overflow-hidden">
            <div className="flex items-center gap-2 px-3 py-2 bg-blue-50 border-b">
              <TrendingUp className="h-4 w-4 text-blue-600" />
              <span className="text-xs font-medium text-blue-700">
                Desde Cotización ({itemsCotizacion.length})
              </span>
            </div>
            <ScrollArea className="max-h-24">
              <div className="p-2 space-y-1">
                {itemsCotizacion.map((item, idx) => (
                  <div key={idx} className="flex items-center justify-between py-1 px-2 rounded hover:bg-gray-50">
                    <div className="flex items-center gap-2 min-w-0">
                      <Badge variant="outline" className="text-[10px] px-1.5 py-0 font-mono shrink-0">
                        {item.codigo}
                      </Badge>
                      <span className="text-xs text-gray-600 truncate">{item.descripcion}</span>
                    </div>
                    <Badge className="text-[10px] px-1.5 py-0 bg-blue-100 text-blue-700 shrink-0">
                      {item.cantidad}
                    </Badge>
                  </div>
                ))}
              </div>
            </ScrollArea>
          </div>
        )}

        {/* Items desde catálogo */}
        {itemsCatalogo.length > 0 && (
          <div className="border rounded-lg overflow-hidden">
            <div className="flex items-center gap-2 px-3 py-2 bg-purple-50 border-b">
              <Package className="h-4 w-4 text-purple-600" />
              <span className="text-xs font-medium text-purple-700">
                Desde Catálogo ({itemsCatalogo.length})
              </span>
            </div>
            <ScrollArea className="max-h-24">
              <div className="p-2 space-y-1">
                {itemsCatalogo.map((item, idx) => (
                  <div key={idx} className="flex items-center justify-between py-1 px-2 rounded hover:bg-gray-50">
                    <div className="flex items-center gap-2 min-w-0">
                      <Badge variant="outline" className="text-[10px] px-1.5 py-0 font-mono shrink-0">
                        {item.codigo}
                      </Badge>
                      <span className="text-xs text-gray-600 truncate">{item.descripcion}</span>
                    </div>
                    <Badge className="text-[10px] px-1.5 py-0 bg-purple-100 text-purple-700 shrink-0">
                      {item.cantidad}
                    </Badge>
                  </div>
                ))}
              </div>
            </ScrollArea>
          </div>
        )}

        {/* Selector de grupo */}
        <div className="space-y-2 pt-1">
          <div className="flex items-center gap-1.5">
            <Layers className="h-3.5 w-3.5 text-gray-500" />
            <span className="text-xs font-medium text-gray-700">Asignar a grupo</span>
          </div>
          <Select value={selectedProyectoEquipoId} onValueChange={setSelectedProyectoEquipoId}>
            <SelectTrigger className="h-8 text-xs">
              <SelectValue placeholder="Selecciona un grupo del proyecto" />
            </SelectTrigger>
            <SelectContent>
              {proyectoEquipos.map((equipo) => (
                <SelectItem key={equipo.id} value={equipo.id} className="text-xs">
                  {equipo.nombre}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="flex gap-2 pt-2">
          <Button variant="outline" size="sm" onClick={() => setStep('verify')} disabled={loading} className="h-8">
            <ArrowLeft className="w-3 h-3 mr-1" />
            Atrás
          </Button>
          <Button
            size="sm"
            onClick={handleEjecutarImportacion}
            disabled={loading || !canImport}
            className="flex-1 h-8 bg-orange-600 hover:bg-orange-700"
          >
            {loading ? (
              <Loader2 className="w-3 h-3 animate-spin" />
            ) : (
              <>
                <Package className="w-3 h-3 mr-1" />
                Importar {itemsCotizacion.length + itemsCatalogo.length} items
              </>
            )}
          </Button>
        </div>
      </div>
    )
  }

  // Importing step
  const renderImportingStep = () => (
    <div className="space-y-4 py-6 text-center">
      <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-orange-100">
        <Loader2 className="h-6 w-6 text-orange-600 animate-spin" />
      </div>
      <div>
        <p className="text-sm font-medium">Importando equipos...</p>
        <p className="text-xs text-muted-foreground mt-1">
          Esto puede tardar unos segundos
        </p>
      </div>
      <div className="space-y-1 px-8">
        <Progress value={importProgress} className="h-1.5" />
        <p className="text-[10px] text-muted-foreground">{importProgress}%</p>
      </div>
    </div>
  )

  if (!isOpen) return null

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="max-w-md p-0 gap-0 overflow-hidden">
        <DialogHeader className="px-4 pt-4 pb-3 border-b">
          <DialogTitle className="flex items-center gap-2 text-base">
            <FileSpreadsheet className="h-4 w-4 text-orange-600" />
            Importar desde Excel
          </DialogTitle>
        </DialogHeader>

        <div className="p-4">
          {step !== 'importing' && <StepIndicator />}

          {step === 'upload' && renderUploadStep()}
          {step === 'verify' && renderVerificationStep()}
          {step === 'summary' && renderSummaryStep()}
          {step === 'importing' && renderImportingStep()}
        </div>

        {/* Footer con botón cerrar */}
        {step !== 'importing' && (
          <div className="px-4 pb-4">
            <Button
              variant="ghost"
              size="sm"
              onClick={handleClose}
              className="w-full h-7 text-xs text-gray-500"
            >
              <X className="w-3 h-3 mr-1" />
              Cancelar
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}

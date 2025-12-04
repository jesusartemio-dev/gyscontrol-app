'use client'

import { useState, useCallback, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useSession } from 'next-auth/react'
import { toast } from 'sonner'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { Progress } from '@/components/ui/progress'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { ScrollArea } from '@/components/ui/scroll-area'
import {
  Upload,
  FileSpreadsheet,
  CheckCircle,
  AlertCircle,
  Loader2,
  X,
  Package,
  Download,
  Target,
  Layers,
  TrendingUp
} from 'lucide-react'
import { importarEquiposDesdeExcel } from '@/lib/utils/equiposExcel'
import * as XLSX from 'xlsx'
import {
  verificarExistenciaEquipos,
  crearEquiposEnCatalogo,
  importarDesdeCotizacion,
  importarDesdeCatalogo,
  type ItemExcelImportado,
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

export default function ModalImportarExcelLista({
  isOpen,
  proyectoId,
  listaId,
  onClose,
  onSuccess
}: Props) {
  const { data: session } = useSession()
  const [step, setStep] = useState<'upload' | 'verify' | 'summary' | 'importing'>('upload')
  const [file, setFile] = useState<File | null>(null)
  const [excelData, setExcelData] = useState<any[]>([])
  const [resumen, setResumen] = useState<ResumenImportacionExcel | null>(null)
  const [loading, setLoading] = useState(false)
  const [importProgress, setImportProgress] = useState(0)
  const [proyectoEquipos, setProyectoEquipos] = useState<ProyectoEquipoCotizado[]>([])
  const [selectedProyectoEquipoId, setSelectedProyectoEquipoId] = useState('')

  // ✅ Reset modal state
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

  // ✅ Fetch equipment groups when modal opens
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

  // ✅ Handle close
  const handleClose = useCallback(() => {
    resetModal()
    onClose()
  }, [resetModal, onClose])

  // ✅ Handle file upload
  const handleFileUpload = async (file: File) => {
    try {
      setLoading(true)
      setFile(file)

      const data = await importarEquiposDesdeExcel(file)
      setExcelData(data)

      // Transform Excel data to expected format
      const itemsExcel = data.map((row: any) => ({
        codigo: row['Código'] || '',
        descripcion: row['Descripción'] || '',
        categoria: row['Categoría'] || '',
        unidad: row['Unidad'] || '',
        marca: row['Marca'] || '',
        cantidad: parseFloat(row['Cantidad']) || 1
      }))

      // Verify existence
      const resumenData = await verificarExistenciaEquipos(itemsExcel, proyectoId)
      setResumen(resumenData)
      setStep('verify')

      toast.success(`${data.length} items importados desde Excel`)
    } catch (error) {
      console.error('Error procesando archivo:', error)
      toast.error('Error al procesar el archivo Excel')
    } finally {
      setLoading(false)
    }
  }

  // ✅ Handle file input change
  const handleFileInputChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    if (!file.name.endsWith('.xlsx') && !file.name.endsWith('.xls')) {
      toast.error('Por favor seleccione un archivo Excel (.xlsx o .xls)')
      return
    }

    await handleFileUpload(file)
  }

  // ✅ Create missing items in catalog
  const handleCrearEnCatalogo = async () => {
    if (!resumen) return

    try {
      setLoading(true)
      if (resumen.equiposNuevosParaCatalogo.length > 0) {
        await crearEquiposEnCatalogo(resumen.equiposNuevosParaCatalogo)
        toast.success(`${resumen.equiposNuevosParaCatalogo.length} equipos creados en catálogo`)
      }
      setStep('summary')
    } catch (error) {
      console.error('Error creando equipos:', error)
      toast.error('Error al crear equipos en catálogo')
    } finally {
      setLoading(false)
    }
  }

  // ✅ Execute imports
  const handleEjecutarImportacion = async () => {
    if (!resumen) return

    try {
      setLoading(true)
      setStep('importing')
      setImportProgress(0)

      const itemsCotizacion = resumen.items.filter(item => item.estado === 'en_cotizacion')
      const itemsCatalogo = resumen.items.filter(item => item.estado === 'solo_catalogo' || item.estado === 'nuevo')

      // Import from quotation
      if (itemsCotizacion.length > 0) {
        const itemIdsCotizacion = itemsCotizacion
          .map(item => item.proyectoEquipoItemId)
          .filter((id): id is string => id !== undefined)

        if (itemIdsCotizacion.length > 0) {
          await importarDesdeCotizacion(listaId, itemIdsCotizacion)
          setImportProgress(33)
        }
      }

      // Import from catalog
      if (itemsCatalogo.length > 0) {
        // Get updated catalog data after potential new items were created
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

        const itemCatalogoIds = itemsCatalogo
          .map(item => item.codigo)
          .filter(codigo => codigo)

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
          if (!responsableId) {
            throw new Error('No se pudo obtener el usuario actual')
          }
          if (!selectedProyectoEquipoId) {
            throw new Error('Debe seleccionar un grupo de equipo para la importación')
          }
          await importarDesdeCatalogo(
            listaId,
            selectedProyectoEquipoId,
            catalogoIds,
            cantidades,
            responsableId
          )
          setImportProgress(100)
        }
      }

    toast.success('Importación completada exitosamente')
      onSuccess()
      handleClose()
    } catch (error) {
      console.error('Error ejecutando importación:', error)
      toast.error('Error durante la importación')
    } finally {
      setLoading(false)
    }
  }

  // ✅ Render upload step
  const renderUploadStep = () => (
    <div className="space-y-6">
      <div className="text-center space-y-4">
        <div className="p-4 bg-blue-100 rounded-full w-fit mx-auto">
          <FileSpreadsheet className="h-8 w-8 text-blue-600" />
        </div>
        <div>
          <h3 className="text-lg font-semibold">Importar Lista desde Excel</h3>
          <p className="text-sm text-muted-foreground">
            Selecciona un archivo Excel con las columnas: Código, Descripción, Categoría, Unidad, Marca, Cantidad
          </p>
        </div>
      </div>

      <div className="space-y-4">
        <label className="flex flex-col items-center justify-center w-full h-32 border-2 border-dashed border-gray-300 rounded-lg cursor-pointer hover:bg-gray-50 transition-colors">
          <div className="flex flex-col items-center justify-center pt-5 pb-6">
            <Upload className="w-8 h-8 mb-2 text-gray-500" />
            <p className="text-sm text-gray-500">
              <span className="font-semibold">Haz clic para subir</span> o arrastra el archivo
            </p>
            <p className="text-xs text-gray-500">Solo archivos .xlsx o .xls</p>
          </div>
          <input
            type="file"
            className="hidden"
            accept=".xlsx,.xls"
            onChange={handleFileInputChange}
            disabled={loading}
          />
        </label>

        <div className="text-center">
          <Button variant="outline" onClick={() => {
            // Download template as proper Excel file
            const templateData = [
              { 'Código': 'EQ001', 'Descripción': 'Ejemplo de Equipo', 'Categoría': 'Categoría Ejemplo', 'Unidad': 'UND', 'Marca': 'Marca Ejemplo', 'Cantidad': 1 },
              { 'Código': 'EQ002', 'Descripción': 'Otro Equipo', 'Categoría': 'Otra Categoría', 'Unidad': 'KG', 'Marca': 'Otra Marca', 'Cantidad': 2 }
            ]

            const ws = XLSX.utils.json_to_sheet(templateData)
            const wb = XLSX.utils.book_new()
            XLSX.utils.book_append_sheet(wb, ws, 'Plantilla')

            // Generate Excel file
            XLSX.writeFile(wb, 'plantilla_importacion_lista.xlsx')
          }}>
            <Download className="w-4 h-4 mr-2" />
            Descargar Plantilla
          </Button>
        </div>
      </div>

      {loading && (
        <div className="flex items-center justify-center py-4">
          <Loader2 className="h-6 w-6 animate-spin mr-2" />
          <span>Procesando archivo...</span>
        </div>
      )}
    </div>
  )

  // ✅ Render verification step
  const renderVerificationStep = () => {
    if (!resumen) return null

    return (
      <div className="space-y-6">
        <div className="text-center space-y-2">
          <div className="p-4 bg-green-100 rounded-full w-fit mx-auto">
            <CheckCircle className="h-8 w-8 text-green-600" />
          </div>
          <h3 className="text-lg font-semibold">Archivo Procesado</h3>
          <p className="text-sm text-muted-foreground">
            Se encontraron {resumen.totalItems} items en el archivo
          </p>
        </div>

        <div className="grid grid-cols-3 gap-4">
          <Card>
            <CardContent className="p-4 text-center">
              <div className="text-2xl font-bold text-blue-600">{resumen.enCotizacion}</div>
              <div className="text-sm text-muted-foreground">En Cotización</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 text-center">
              <div className="text-2xl font-bold text-purple-600">{resumen.soloCatalogo}</div>
              <div className="text-sm text-muted-foreground">Solo en Catálogo</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 text-center">
              <div className="text-2xl font-bold text-orange-600">{resumen.nuevos}</div>
              <div className="text-sm text-muted-foreground">Nuevos</div>
            </CardContent>
          </Card>
        </div>

        {resumen.nuevos > 0 && (
          <Card className="border-orange-200 bg-orange-50">
            <CardContent className="p-4">
              <div className="flex items-start space-x-3">
                <AlertCircle className="h-5 w-5 text-orange-600 mt-0.5" />
                <div>
                  <p className="text-sm font-medium text-orange-900">
                    Items Nuevos Detectados
                  </p>
                  <p className="text-sm text-orange-700 mt-1">
                    Se crearán {resumen.nuevos} nuevos equipos en el catálogo antes de importar.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        <div className="flex gap-3">
          <Button variant="outline" onClick={() => setStep('upload')} disabled={loading}>
            <X className="w-4 h-4 mr-2" />
            Cancelar
          </Button>
          <Button
            onClick={handleCrearEnCatalogo}
            disabled={loading}
            className="flex-1"
          >
            {loading ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Procesando...
              </>
            ) : (
              <>
                <Package className="w-4 h-4 mr-2" />
                Continuar
              </>
            )}
          </Button>
        </div>
      </div>
    )
  }

  // ✅ Render summary step
  const renderSummaryStep = () => {
    if (!resumen) return null

    const itemsCotizacion = resumen.items.filter(item => item.estado === 'en_cotizacion')
    const itemsCatalogo = resumen.items.filter(item => item.estado === 'solo_catalogo' || item.estado === 'nuevo')

    return (
      <div className="space-y-6">
        <div className="text-center space-y-2">
          <div className="p-4 bg-purple-100 rounded-full w-fit mx-auto">
            <Target className="h-8 w-8 text-purple-600" />
          </div>
          <h3 className="text-lg font-semibold">Resumen de Importación</h3>
          <p className="text-sm text-muted-foreground">
            Configura las opciones de importación
          </p>
        </div>

        {/* Items from Quotation */}
        {itemsCotizacion.length > 0 && (
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <TrendingUp className="h-5 w-5 text-blue-600" />
                Importar desde Cotización ({itemsCotizacion.length} items)
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ScrollArea className="h-32">
                <div className="space-y-2">
                  {itemsCotizacion.map((item, index) => (
                    <div key={index} className="flex items-center justify-between py-1">
                      <div className="flex items-center gap-2">
                        <Badge variant="outline" className="text-xs">{item.codigo}</Badge>
                        <span className="text-sm">{item.descripcion}</span>
                      </div>
                      <Badge variant="secondary">{item.cantidad}</Badge>
                    </div>
                  ))}
                </div>
              </ScrollArea>
            </CardContent>
          </Card>
        )}

        {/* Items from Catalog */}
        {itemsCatalogo.length > 0 && (
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <Package className="h-5 w-5 text-purple-600" />
                Importar desde Catálogo ({itemsCatalogo.length} items)
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ScrollArea className="h-32">
                <div className="space-y-2">
                  {itemsCatalogo.map((item, index) => (
                    <div key={index} className="flex items-center justify-between py-1">
                      <div className="flex items-center gap-2">
                        <Badge variant="outline" className="text-xs">{item.codigo}</Badge>
                        <span className="text-sm">{item.descripcion}</span>
                      </div>
                      <Badge variant="secondary">{item.cantidad}</Badge>
                    </div>
                  ))}
                </div>
              </ScrollArea>
            </CardContent>
          </Card>
        )}

        {/* 🎯 Selección de Grupo de Equipo */}
        {(itemsCotizacion.length > 0 || itemsCatalogo.length > 0) && (
          <Card>
            <CardHeader className="pb-2 pt-3">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <Layers className="h-4 w-4" />
                Asignar a Grupo del Proyecto
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="text-xs text-gray-600">
                <strong>Items a importar ({itemsCotizacion.length + itemsCatalogo.length}):</strong>
              </div>
              <div className="max-h-20 overflow-y-auto">
                <div className="flex flex-wrap gap-1">
                  {[...itemsCotizacion, ...itemsCatalogo].map((item, index) => (
                    <Badge key={index} variant="secondary" className="text-xs">
                      {item.codigo}
                    </Badge>
                  ))}
                </div>
              </div>
              <Select value={selectedProyectoEquipoId} onValueChange={setSelectedProyectoEquipoId}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecciona grupo del proyecto" />
                </SelectTrigger>
                <SelectContent>
                  {proyectoEquipos.map((equipo) => (
                    <SelectItem key={equipo.id} value={equipo.id}>
                      {equipo.nombre}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </CardContent>
          </Card>
        )}

        <div className="flex gap-3">
          <Button variant="outline" onClick={() => setStep('verify')} disabled={loading}>
            <X className="w-4 h-4 mr-2" />
            Atrás
          </Button>
          <Button
            onClick={handleEjecutarImportacion}
            disabled={loading || itemsCotizacion.length === 0 && itemsCatalogo.length === 0 || !selectedProyectoEquipoId}
            className="flex-1"
          >
            {loading ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Importando...
              </>
            ) : (
              <>
                <Layers className="w-4 h-4 mr-2" />
                Ejecutar Importación
              </>
            )}
          </Button>
        </div>
      </div>
    )
  }

  // ✅ Render importing step
  const renderImportingStep = () => (
    <div className="space-y-6 text-center">
      <div className="p-4 bg-blue-100 rounded-full w-fit mx-auto">
        <Loader2 className="h-8 w-8 text-blue-600 animate-spin" />
      </div>
      <div>
        <h3 className="text-lg font-semibold">Importando Items</h3>
        <p className="text-sm text-muted-foreground">
          Procesando importación de equipos a la lista...
        </p>
      </div>
      <div className="space-y-2">
        <Progress value={importProgress} className="w-full" />
        <p className="text-sm text-muted-foreground">
          {importProgress}% completado
        </p>
      </div>
    </div>
  )

  if (!isOpen) return null

  return (
    <AnimatePresence>
      <Dialog open={isOpen} onOpenChange={handleClose}>
        <DialogContent className="max-w-4xl w-full max-h-[90vh] overflow-y-auto">
          <DialogHeader className="space-y-3">
            <DialogTitle className="flex items-center gap-2">
              <FileSpreadsheet className="h-5 w-5" />
              Importar Lista desde Excel
            </DialogTitle>
          </DialogHeader>

          <Separator />

          <div className="min-h-[400px]">
            {step === 'upload' && renderUploadStep()}
            {step === 'verify' && renderVerificationStep()}
            {step === 'summary' && renderSummaryStep()}
            {step === 'importing' && renderImportingStep()}
          </div>
        </DialogContent>
      </Dialog>
    </AnimatePresence>
  )
}
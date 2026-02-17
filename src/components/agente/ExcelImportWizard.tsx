'use client'

import { useState, useCallback } from 'react'
import { Loader2, ChevronLeft, ChevronRight, Check, FileSpreadsheet } from 'lucide-react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { toast } from 'sonner'
import { useRouter } from 'next/navigation'

import { UploadStep } from './steps/UploadStep'
import { PreviewStep, shouldSuggestCatalog } from './steps/PreviewStep'
import { MappingStep } from './steps/MappingStep'
import { ConfigStep } from './steps/ConfigStep'
import { ConfirmStep } from './steps/ConfirmStep'

import type { CatalogSelections } from './steps/PreviewStep'
import type { ExcelExtraido } from '@/lib/agente/excelExtractor'
import type { PropuestaExtraida } from '@/lib/agente/pdfProposalExtractor'

// ── Types for API response ────────────────────────────────

interface MappingSuggestion {
  excelName: string
  matches: Array<{ id: string; nombre: string; score: number }>
}

interface ExtractResponse {
  excel: ExcelExtraido
  pdf: PropuestaExtraida | null
  hojas: Array<{ name: string; rowCount: number }>
  mapeo: {
    recursos: MappingSuggestion[]
    edts: MappingSuggestion[]
    clienteSugerido: { id: string; nombre: string } | null
  }
  catalogos: {
    recursos: Array<{ id: string; nombre: string; costoHora: number }>
    edts: Array<{ id: string; nombre: string }>
    categoriasEquipo: Array<{ id: string; nombre: string }>
    clientes: Array<{ id: string; nombre: string; ruc?: string | null }>
  }
}

// ── Component ─────────────────────────────────────────────

const STEPS = ['Archivos', 'Preview', 'Mapeo', 'Config', 'Confirmar'] as const

interface Props {
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function ExcelImportWizard({ open, onOpenChange }: Props) {
  const router = useRouter()
  const [step, setStep] = useState(0)
  const [loading, setLoading] = useState(false)
  const [loadingMessage, setLoadingMessage] = useState('')

  // Step 1: Files
  const [excelFile, setExcelFile] = useState<File | null>(null)
  const [pdfFile, setPdfFile] = useState<File | null>(null)

  // Step 2: Preview (populated after extraction)
  const [extractData, setExtractData] = useState<ExtractResponse | null>(null)
  const [catalogSelections, setCatalogSelections] = useState<CatalogSelections>({})

  // Step 3: Mappings
  const [recursoMappings, setRecursoMappings] = useState<Record<string, string>>({})
  const [edtMappings, setEdtMappings] = useState<Record<string, string>>({})

  // Step 4: Config
  const [nombreCotizacion, setNombreCotizacion] = useState('')
  const [clienteId, setClienteId] = useState('')
  const [moneda, setMoneda] = useState('USD')
  const [notas, setNotas] = useState('')

  // ── Handlers ──────────────────────────────────────────

  const handleExtract = useCallback(async () => {
    if (!excelFile) return

    setLoading(true)
    setLoadingMessage('Analizando Excel con IA...')

    try {
      const formData = new FormData()
      formData.append('excel', excelFile)
      if (pdfFile) formData.append('pdf', pdfFile)

      const res = await fetch('/api/agente/importar-excel', {
        method: 'POST',
        body: formData,
      })

      if (!res.ok) {
        const err = await res.json().catch(() => ({ error: 'Error de servidor' }))
        throw new Error(err.error || `Error ${res.status}`)
      }

      const data: ExtractResponse = await res.json()
      setExtractData(data)

      // Auto-populate catalog selections using heuristic
      const autoSelections: CatalogSelections = {}
      data.excel.equipos.forEach((grupo, gi) => {
        grupo.items.forEach((item, ii) => {
          autoSelections[`${gi}-${ii}`] = shouldSuggestCatalog(item)
        })
      })
      setCatalogSelections(autoSelections)

      // Auto-populate mappings from suggestions
      const autoRecursos: Record<string, string> = {}
      for (const sug of data.mapeo.recursos) {
        if (sug.matches.length > 0 && sug.matches[0].score >= 0.7) {
          autoRecursos[sug.excelName] = sug.matches[0].id
        }
      }
      setRecursoMappings(autoRecursos)

      const autoEdts: Record<string, string> = {}
      for (const sug of data.mapeo.edts) {
        if (sug.matches.length > 0 && sug.matches[0].score >= 0.7) {
          autoEdts[sug.excelName] = sug.matches[0].id
        }
      }
      setEdtMappings(autoEdts)

      // Auto-populate config from extracted data
      if (data.excel.resumen.nombreProyecto) {
        setNombreCotizacion(data.excel.resumen.nombreProyecto)
      }
      if (data.pdf?.nombreProyecto && !data.excel.resumen.nombreProyecto) {
        setNombreCotizacion(data.pdf.nombreProyecto)
      }
      if (data.mapeo.clienteSugerido) {
        setClienteId(data.mapeo.clienteSugerido.id)
      }
      if (data.excel.resumen.moneda) {
        setMoneda(data.excel.resumen.moneda)
      }

      setStep(1)
      toast.success('Datos extraídos correctamente')
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Error al procesar archivos')
    } finally {
      setLoading(false)
      setLoadingMessage('')
    }
  }, [excelFile, pdfFile])

  const handleConfirm = useCallback(async () => {
    if (!extractData) return

    setLoading(true)
    setLoadingMessage('Creando cotización...')

    try {
      // Build list of catalog item keys (e.g., ["0-0", "0-2", "1-1"])
      const catalogItems = Object.entries(catalogSelections)
        .filter(([, v]) => v)
        .map(([k]) => k)

      const res = await fetch('/api/agente/importar-excel/confirmar', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          equipos: extractData.excel.equipos,
          servicios: extractData.excel.servicios,
          gastos: extractData.excel.gastos,
          recursoMappings: Object.entries(recursoMappings).map(
            ([excelName, recursoId]) => ({ excelName, recursoId })
          ),
          edtMappings: Object.entries(edtMappings).map(
            ([excelEdtName, edtId]) => ({ excelEdtName, edtId })
          ),
          clienteId,
          nombreCotizacion,
          moneda,
          catalogItems,
          notas: notas || undefined,
          condiciones: extractData.pdf?.condiciones.map((c) => ({
            texto: c.texto,
            tipo: c.tipo,
          })),
          exclusiones: extractData.pdf?.exclusiones.map((e) => ({
            texto: e.texto,
          })),
          formaPago: extractData.pdf?.formaPago,
          validezOferta: extractData.pdf?.validezDias,
        }),
      })

      if (!res.ok) {
        const err = await res.json().catch(() => ({ error: 'Error de servidor' }))
        throw new Error(err.error || `Error ${res.status}`)
      }

      const result = await res.json()
      toast.success(`Cotización ${result.codigo} creada exitosamente`)
      onOpenChange(false)
      router.push(`/comercial/cotizaciones/${result.cotizacionId}`)
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Error al crear cotización')
    } finally {
      setLoading(false)
      setLoadingMessage('')
    }
  }, [
    extractData, recursoMappings, edtMappings, clienteId,
    nombreCotizacion, moneda, catalogSelections, notas,
    onOpenChange, router,
  ])

  // ── Navigation ────────────────────────────────────────

  const canNext = () => {
    switch (step) {
      case 0: return !!excelFile
      case 1: return !!extractData
      case 2: return true // Mapeo es opcional
      case 3: return !!nombreCotizacion && !!clienteId
      case 4: return true
      default: return false
    }
  }

  const handleNext = () => {
    if (step === 0) {
      handleExtract()
      return
    }
    if (step === 4) {
      handleConfirm()
      return
    }
    setStep((s) => Math.min(s + 1, STEPS.length - 1))
  }

  const handleBack = () => setStep((s) => Math.max(s - 1, 0))

  const clienteNombre = extractData?.catalogos.clientes.find(
    (c) => c.id === clienteId
  )?.nombre || ''

  const catalogItemCount = Object.values(catalogSelections).filter(Boolean).length
  const totalEquipoItems = extractData?.excel.equipos.reduce(
    (s, g) => s + g.items.length, 0
  ) || 0

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[85vh] flex flex-col p-0">
        <DialogHeader className="px-6 pt-5 pb-3 border-b">
          <DialogTitle className="flex items-center gap-2 text-base">
            <FileSpreadsheet className="h-5 w-5 text-blue-600" />
            Importar Excel de Cotización
          </DialogTitle>

          {/* Step indicator */}
          <div className="flex items-center gap-1 pt-2">
            {STEPS.map((label, i) => (
              <div key={label} className="flex items-center">
                <div
                  className={cn(
                    'flex items-center gap-1 rounded-full px-2.5 py-1 text-[10px] font-medium transition-colors',
                    i === step
                      ? 'bg-blue-100 text-blue-700'
                      : i < step
                        ? 'bg-green-50 text-green-600'
                        : 'bg-gray-50 text-gray-400'
                  )}
                >
                  {i < step ? (
                    <Check className="h-3 w-3" />
                  ) : (
                    <span>{i + 1}</span>
                  )}
                  <span className="hidden sm:inline">{label}</span>
                </div>
                {i < STEPS.length - 1 && (
                  <div className={cn(
                    'mx-1 h-px w-4',
                    i < step ? 'bg-green-300' : 'bg-gray-200'
                  )} />
                )}
              </div>
            ))}
          </div>
        </DialogHeader>

        {/* Content */}
        <div className="flex-1 overflow-y-auto px-6 py-4">
          {loading ? (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <Loader2 className="h-8 w-8 animate-spin text-blue-600 mb-3" />
              <p className="text-sm font-medium text-gray-600">{loadingMessage}</p>
              <p className="text-xs text-gray-400 mt-1">
                Esto puede tomar unos segundos...
              </p>
            </div>
          ) : (
            <>
              {step === 0 && (
                <UploadStep
                  excelFile={excelFile}
                  pdfFile={pdfFile}
                  onExcelChange={setExcelFile}
                  onPdfChange={setPdfFile}
                />
              )}
              {step === 1 && extractData && (
                <PreviewStep
                  data={extractData.excel}
                  pdfData={extractData.pdf}
                  catalogSelections={catalogSelections}
                  onCatalogSelectionsChange={setCatalogSelections}
                />
              )}
              {step === 2 && extractData && (
                <MappingStep
                  recursoSugerencias={extractData.mapeo.recursos}
                  edtSugerencias={extractData.mapeo.edts}
                  catalogoRecursos={extractData.catalogos.recursos}
                  catalogoEdts={extractData.catalogos.edts}
                  recursoMappings={recursoMappings}
                  edtMappings={edtMappings}
                  onRecursoMap={(name, id) =>
                    setRecursoMappings((p) => ({ ...p, [name]: id }))
                  }
                  onEdtMap={(name, id) =>
                    setEdtMappings((p) => ({ ...p, [name]: id }))
                  }
                />
              )}
              {step === 3 && extractData && (
                <ConfigStep
                  nombreCotizacion={nombreCotizacion}
                  clienteId={clienteId}
                  moneda={moneda}
                  notas={notas}
                  clientes={extractData.catalogos.clientes}
                  clienteSugerido={extractData.mapeo.clienteSugerido}
                  onNombreChange={setNombreCotizacion}
                  onClienteChange={setClienteId}
                  onMonedaChange={setMoneda}
                  onNotasChange={setNotas}
                />
              )}
              {step === 4 && extractData && (
                <ConfirmStep
                  data={extractData.excel}
                  nombreCotizacion={nombreCotizacion}
                  clienteNombre={clienteNombre}
                  moneda={moneda}
                  catalogItemCount={catalogItemCount}
                  totalEquipoItems={totalEquipoItems}
                  recursosMapeados={Object.keys(recursoMappings).length}
                  recursosTotal={extractData.mapeo.recursos.length}
                  edtsMapeados={Object.keys(edtMappings).length}
                  edtsTotal={extractData.mapeo.edts.length}
                  condicionesCount={extractData.pdf?.condiciones.length || 0}
                  exclusionesCount={extractData.pdf?.exclusiones.length || 0}
                />
              )}
            </>
          )}
        </div>

        {/* Footer */}
        {!loading && (
          <div className="flex items-center justify-between border-t px-6 py-3">
            <Button
              variant="outline"
              size="sm"
              onClick={handleBack}
              disabled={step === 0}
              className="h-8"
            >
              <ChevronLeft className="h-3.5 w-3.5 mr-1" />
              Atrás
            </Button>

            <Button
              size="sm"
              onClick={handleNext}
              disabled={!canNext()}
              className="h-8"
            >
              {step === 0 ? (
                <>Analizar con IA</>
              ) : step === 4 ? (
                <>
                  <Check className="h-3.5 w-3.5 mr-1" />
                  Importar
                </>
              ) : (
                <>
                  Siguiente
                  <ChevronRight className="h-3.5 w-3.5 ml-1" />
                </>
              )}
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}

'use client'

import { useState, useCallback, useMemo } from 'react'
import { Loader2, ChevronLeft, ChevronRight, Check, FileSpreadsheet, AlertTriangle } from 'lucide-react'
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

import type { CotizacionDestino } from './steps/ConfigStep'
import type { ClasificacionPartida } from './steps/MappingStep'
import type { CatalogSelections } from './steps/PreviewStep'
import type {
  ExcelExtraido,
  ExcelEquipoGrupo,
  ExcelServicioGrupo,
  ExcelGastoGrupo,
} from '@/lib/agente/excelExtractor'
import type { PropuestaExtraida, PdfPartida } from '@/lib/agente/pdfProposalExtractor'
import { RECURSO_SUMA_ALZADA, NOMBRE_RECURSO_SUMA_ALZADA } from '@/lib/agente/sumaAlzada'
import {
  calcularTotalesImportacion,
  objetivosDesdePdf,
  totalGrupoEquipos,
  totalGrupoGastos,
} from '@/lib/agente/totalesImportacion'
import type { Seccion, Exclusiones } from '@/lib/agente/totalesImportacion'
import { normalizarTitulo } from '@/lib/agente/totalesExcel'
import type { TotalesHoja } from '@/lib/agente/totalesExcel'

// ── Types for API response ────────────────────────────────

interface MappingSuggestion {
  excelName: string
  matches: Array<{ id: string; nombre: string; score: number }>
}

interface ExtractResponse {
  excel: ExcelExtraido
  totalesExcel: TotalesHoja[]
  pdfs: PropuestaExtraida[]
  hojas: Array<{ name: string; rowCount: number }>
  mapeo: {
    recursos: MappingSuggestion[]
    edts: MappingSuggestion[]
    clienteSugerido: { id: string; nombre: string } | null
    comercialSugerido: { id: string; nombre: string } | null
  }
  catalogos: {
    recursos: Array<{ id: string; nombre: string; costoHora: number }>
    edts: Array<{ id: string; nombre: string }>
    categoriasEquipo: Array<{ id: string; nombre: string }>
    clientes: Array<{ id: string; nombre: string; ruc?: string | null }>
    comerciales: Array<{ id: string; nombre: string; email?: string | null }>
  }
}

// ── SSE stream parser ─────────────────────────────────────

async function parseSSEStream(
  response: Response,
  onProgress: (message: string) => void
): Promise<ExtractResponse> {
  const reader = response.body!.getReader()
  const decoder = new TextDecoder()
  let buffer = ''
  let result: ExtractResponse | null = null
  let sseError: string | null = null

  while (true) {
    const { done, value } = await reader.read()
    if (done) break

    buffer += decoder.decode(value, { stream: true })

    // Parse complete SSE events (separated by double newline)
    const parts = buffer.split('\n\n')
    buffer = parts.pop()! // Keep incomplete event

    for (const part of parts) {
      if (!part.trim()) continue

      let eventType = ''
      let data = ''

      for (const line of part.split('\n')) {
        if (line.startsWith('event: ')) eventType = line.slice(7)
        if (line.startsWith('data: ')) data = line.slice(6)
      }

      if (!eventType || !data) continue

      try {
        const parsed = JSON.parse(data)
        if (eventType === 'progress') {
          onProgress(parsed.message)
        } else if (eventType === 'result') {
          result = parsed
        } else if (eventType === 'error') {
          sseError = parsed.error
        }
      } catch {
        // Skip malformed events
      }
    }
  }

  if (sseError) throw new Error(sseError)
  if (!result) throw new Error('No se recibió resultado del servidor')

  return result
}

// ── Contraste contra los totales que declara el Excel ─────

/**
 * Monto que el archivo declara para un grupo, o null si no se puede determinar.
 * Se busca el bloque por título; si la IA le puso otro nombre, el total de la hoja
 * solo sirve cuando esa hoja tiene un bloque o ninguno.
 */
function totalDeclaradoDeGrupo(
  totalesExcel: TotalesHoja[],
  hoja: string,
  grupo: string
): number | null {
  const datosHoja = totalesExcel.find((t) => t.hoja === hoja)
  if (!datosHoja) return null

  const bloque = datosHoja.bloques.find(
    (b) => normalizarTitulo(b.titulo) === normalizarTitulo(grupo)
  )
  if (bloque) return bloque.totalCliente

  return datosHoja.bloques.length <= 1 ? datosHoja.totalCliente : null
}

/** Una hoja cuyo total declarado es 0 no aporta nada a esta cotización. */
function hojaEnCero(totalesExcel: TotalesHoja[], hoja: string): boolean {
  const datosHoja = totalesExcel.find((t) => t.hoja === hoja)
  return !!datosHoja && datosHoja.totalCliente === 0
}

// ── Importación histórica desde PDF ───────────────────────

/** Una partida con su procedencia, para no perder de qué propuesta salió cada monto. */
interface PartidaConOrigen extends PdfPartida {
  clave: string
  origen: string
}

function aplanarPartidas(pdfs: PropuestaExtraida[]): PartidaConOrigen[] {
  return pdfs.flatMap((pdf, pi) =>
    pdf.partidas.map((p, i) => ({
      ...p,
      clave: `${pi}-${i}`,
      origen: pdf.codigoOriginal || pdf.archivo || `Propuesta ${pi + 1}`,
    }))
  )
}

/**
 * Funde varias propuestas en la cabecera de una sola cotización: los datos de
 * identidad salen de la primera y las condiciones/exclusiones se acumulan sin
 * repetir, porque el boilerplate legal de GYS se repite casi igual en cada PDF.
 */
function fusionarPdfs(pdfs: PropuestaExtraida[]): PropuestaExtraida | null {
  if (pdfs.length === 0) return null
  if (pdfs.length === 1) return pdfs[0]

  const normalizar = (t: string) => t.trim().toLowerCase().replace(/\s+/g, ' ')
  const condiciones: PropuestaExtraida['condiciones'] = []
  const exclusiones: PropuestaExtraida['exclusiones'] = []
  const vistasCond = new Set<string>()
  const vistasExcl = new Set<string>()

  for (const pdf of pdfs) {
    for (const c of pdf.condiciones) {
      if (vistasCond.has(normalizar(c.texto))) continue
      vistasCond.add(normalizar(c.texto))
      condiciones.push(c)
    }
    for (const e of pdf.exclusiones) {
      if (vistasExcl.has(normalizar(e.texto))) continue
      vistasExcl.add(normalizar(e.texto))
      exclusiones.push(e)
    }
  }

  // Las partidas y el monto sí se acumulan: con varias propuestas cerradas en una
  // sola OC, la referencia es la suma de todas, no la de la primera.
  const partidas = pdfs.flatMap((p) => p.partidas)
  const montos = pdfs.map((p) => p.montoTotal).filter((m): m is number => typeof m === 'number')

  return {
    ...pdfs[0],
    partidas,
    montoTotal: montos.length ? montos.reduce((s, m) => s + m, 0) : undefined,
    condiciones,
    exclusiones,
  }
}

/**
 * Convierte las partidas del cuadro económico de un PDF en los grupos que espera el
 * endpoint, según cómo las clasificó el admin. Los montos entran cerrados y con el
 * costo interno igual a la venta: el PDF es el documento del cliente y no trae costos,
 * así que el margen de estas cotizaciones queda en 0% como marca de "costo desconocido".
 */
function construirGruposDesdePartidas(
  partidas: PartidaConOrigen[],
  clasificacion: Record<string, ClasificacionPartida>,
  catalogoEdts: Array<{ id: string; nombre: string }>
): {
  equipos: ExcelEquipoGrupo[]
  servicios: ExcelServicioGrupo[]
  gastos: ExcelGastoGrupo[]
  edtMappings: Record<string, string>
  usaRecursoMarcador: boolean
} {
  // Se agrupa por propuesta de origen para que en la cotización se vea qué aportó cada POS.
  const equiposPorOrigen = new Map<string, ExcelEquipoGrupo['items']>()
  const gastosPorOrigen = new Map<string, ExcelGastoGrupo['items']>()
  const serviciosPorOrigenEdt = new Map<string, PartidaConOrigen[]>()

  for (const p of partidas) {
    const clase = clasificacion[p.clave]

    if (clase?.bucket === 'servicio' && clase.edtId) {
      const llave = `${p.origen}||${clase.edtId}`
      serviciosPorOrigenEdt.set(llave, [...(serviciosPorOrigenEdt.get(llave) ?? []), p])
      continue
    }

    if (clase?.bucket === 'gasto') {
      gastosPorOrigen.set(p.origen, [
        ...(gastosPorOrigen.get(p.origen) ?? []),
        {
          nombre: p.descripcion,
          cantidad: 1,
          precioUnitario: p.monto,
          costoInterno: p.monto,
          costoCliente: p.monto,
        },
      ])
      continue
    }

    equiposPorOrigen.set(p.origen, [
      ...(equiposPorOrigen.get(p.origen) ?? []),
      {
        descripcion: p.descripcion,
        categoria: 'Histórico',
        unidad: 'Glb',
        marca: '',
        cantidad: 1,
        precioLista: p.monto,
        precioInterno: p.monto,
        precioCliente: p.monto,
        factorCosto: 1,
        factorVenta: 1,
      },
    ])
  }

  const servicios: ExcelServicioGrupo[] = []
  const edtMappings: Record<string, string> = {}

  for (const [llave, items] of serviciosPorOrigenEdt) {
    const [origen, edtId] = llave.split('||')
    const nombreEdt = catalogoEdts.find((e) => e.id === edtId)?.nombre || edtId
    // El endpoint resuelve el EDT por `edtSugerido`, así que varios grupos de
    // distintas propuestas pueden compartir el mismo EDT sin pisarse.
    edtMappings[nombreEdt] = edtId
    servicios.push({
      grupo: `${origen} · ${nombreEdt}`,
      hoja: 'PDF',
      edtSugerido: nombreEdt,
      // Neutros: el monto del PDF ya es el precio final, no se le aplica margen ni contingencia.
      factorSeguridad: 1,
      margen: 1,
      actividades: items.map((p) => ({
        nombre: p.descripcion,
        descripcion: p.descripcion,
        recursos: [
          {
            recursoNombre: NOMBRE_RECURSO_SUMA_ALZADA,
            tipo: 'oficina' as const,
            costoHora: p.monto,
            horas: 1,
          },
        ],
        horasTotal: 1,
        costoInterno: p.monto,
        costoCliente: p.monto,
      })),
    })
  }

  return {
    equipos: [...equiposPorOrigen].map(([origen, items]) => ({
      grupo: `Propuesta ${origen}`,
      hoja: 'PDF',
      items,
    })),
    servicios,
    gastos: [...gastosPorOrigen].map(([origen, items]) => ({
      grupo: `Propuesta ${origen}`,
      hoja: 'PDF',
      items,
    })),
    edtMappings,
    usaRecursoMarcador: servicios.length > 0,
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
  const [pdfFiles, setPdfFiles] = useState<File[]>([])

  // Step 2: Preview (populated after extraction)
  const [extractData, setExtractData] = useState<ExtractResponse | null>(null)
  const [catalogSelections, setCatalogSelections] = useState<CatalogSelections>({})
  const [gruposExcluidos, setGruposExcluidos] = useState<Exclusiones>({})
  const [asignacionPartidas, setAsignacionPartidas] = useState<Record<number, Seccion>>({})
  const [ajustes, setAjustes] = useState<Partial<Record<Seccion, number>>>({})
  const [edtAjuste, setEdtAjuste] = useState('')

  // Step 3: Mappings
  const [recursoMappings, setRecursoMappings] = useState<Record<string, string>>({})
  const [edtMappings, setEdtMappings] = useState<Record<string, string>>({})
  const [clasificacion, setClasificacion] = useState<Record<string, ClasificacionPartida>>({})

  // Step 4: Config
  const [nombreCotizacion, setNombreCotizacion] = useState('')
  const [clienteId, setClienteId] = useState('')
  const [comercialId, setComercialId] = useState('')
  const [moneda, setMoneda] = useState('USD')
  const [notas, setNotas] = useState('')
  const [codigoManual, setCodigoManual] = useState('')
  const [fechaManual, setFechaManual] = useState('')
  const [destino, setDestino] = useState<CotizacionDestino | null>(null)

  // Error state
  const [errorMessage, setErrorMessage] = useState<string | null>(null)

  // Importación histórica: sin Excel, el contenido sale del cuadro económico de los PDFs.
  const partidasPdf = useMemo(
    () => (!excelFile && extractData ? aplanarPartidas(extractData.pdfs) : []),
    [excelFile, extractData]
  )
  const pdfFusionado = useMemo(
    () => (extractData ? fusionarPdfs(extractData.pdfs) : null),
    [extractData]
  )

  // El PDF es lo que vio el cliente y manda sobre el monto; el Excel de costeo
  // está desagregado a más detalle y trae hojas de otros alcances.
  const totalReferencia = pdfFusionado?.montoTotal ?? extractData?.excel.resumen.totalCliente ?? null
  const origenReferencia: 'PDF' | 'Excel' | null = pdfFusionado?.montoTotal
    ? 'PDF'
    : extractData
      ? 'Excel'
      : null

  const gruposDesdePdf = useMemo(
    () =>
      partidasPdf.length && extractData
        ? construirGruposDesdePartidas(partidasPdf, clasificacion, extractData.catalogos.edts)
        : null,
    [partidasPdf, extractData, clasificacion]
  )

  const calcularTotales = useCallback(
    (ignorarMapeos: boolean) => {
      if (!extractData) return { equipos: 0, servicios: 0, gastos: 0, total: 0 }
      const fuente = gruposDesdePdf
        ? { ...extractData.excel, ...gruposDesdePdf }
        : extractData.excel
      const mapeoEdts = gruposDesdePdf ? gruposDesdePdf.edtMappings : edtMappings
      const mapeoRecursos = gruposDesdePdf?.usaRecursoMarcador
        ? { ...recursoMappings, [NOMBRE_RECURSO_SUMA_ALZADA]: RECURSO_SUMA_ALZADA }
        : recursoMappings
      return calcularTotalesImportacion(
        fuente,
        mapeoRecursos,
        mapeoEdts,
        gruposDesdePdf ? {} : gruposExcluidos,
        gruposDesdePdf ? {} : ajustes,
        ignorarMapeos
      )
    },
    [extractData, gruposDesdePdf, recursoMappings, edtMappings, gruposExcluidos, ajustes]
  )

  // Lo que realmente se importará (descarta servicios sin EDT o recurso mapeado).
  const totales = useMemo(() => calcularTotales(false), [calcularTotales])
  // Lo extraído, para el Preview: ahí todavía no se ha pasado por el paso de Mapeo.
  const totalesPreview = useMemo(() => calcularTotales(true), [calcularTotales])

  // Objetivo por sección: las líneas del cuadro resumen del PDF son la referencia,
  // el Excel de costeo está desagregado de otra forma y no cuadra hoja por hoja.
  const objetivosPorSeccion = useMemo(
    () =>
      gruposDesdePdf || !pdfFusionado
        ? null
        : objetivosDesdePdf(pdfFusionado.partidas, asignacionPartidas),
    [gruposDesdePdf, pdfFusionado, asignacionPartidas]
  )

  // Un grupo de servicios ya mapeado sirve de percha para el ajuste; si no hay,
  // el EDT lo tiene que elegir el usuario o el monto se perdería al importar.
  const grupoServicioConEdt = extractData?.excel.servicios.find(
    (g, i) => !gruposExcluidos[`servicios-${i}`] && edtMappings[g.edtSugerido || g.grupo]
  )
  const ajusteServiciosSinEdt =
    !gruposDesdePdf && ajustes.servicios && !grupoServicioConEdt ? ajustes.servicios : null

  const cuadrarSeccion = (seccion: Seccion) => {
    if (!objetivosPorSeccion) return
    const yaAjustado = ajustes[seccion] || 0
    // Se cuadra contra lo que muestra el Preview, que es donde vive el botón.
    const sinAjuste = totalesPreview[seccion] - yaAjustado
    const diferencia = Math.round((objetivosPorSeccion[seccion] - sinAjuste) * 100) / 100
    setAjustes((prev) => ({ ...prev, [seccion]: diferencia }))
  }

  // ── Handlers ──────────────────────────────────────────

  const handleExtract = useCallback(async () => {
    if (!excelFile && pdfFiles.length === 0) return

    setLoading(true)
    setErrorMessage(null)
    setLoadingMessage('Preparando análisis...')

    try {
      const formData = new FormData()
      if (excelFile) formData.append('excel', excelFile)
      for (const pdf of pdfFiles) formData.append('pdf', pdf)

      const res = await fetch('/api/agente/importar-excel', {
        method: 'POST',
        body: formData,
      })

      // Validation errors return normal JSON (not SSE)
      if (!res.ok) {
        const err = await res.json().catch(() => ({ error: `Error del servidor (${res.status})` }))
        throw new Error(err.error || `Error ${res.status}`)
      }

      // Parse SSE stream for progress + result
      const data = await parseSSEStream(res, (msg) => setLoadingMessage(msg))
      setExtractData(data)

      // Auto-populate catalog selections using heuristic.
      // Sin Excel los ítems son sumas alzadas del PDF, no equipos reales: no van al catálogo.
      const autoSelections: CatalogSelections = {}
      data.excel.equipos.forEach((grupo, gi) => {
        grupo.items.forEach((item, ii) => {
          autoSelections[`${gi}-${ii}`] = excelFile ? shouldSuggestCatalog(item) : false
        })
      })
      setCatalogSelections(autoSelections)

      // Se desmarca lo que no forma parte de la propuesta: grupos sin monto, y
      // sobre todo los que el propio Excel declara en cero — ahí es donde el
      // modelo se cuelga de números sueltos de la plantilla reusada.
      const totales = data.totalesExcel || []
      const autoExcluidos: Record<string, boolean> = {}

      const fueraDeAlcance = (hoja: string, grupo: string) =>
        hojaEnCero(totales, hoja) || totalDeclaradoDeGrupo(totales, hoja, grupo) === 0

      data.excel.equipos.forEach((g, i) => {
        if (totalGrupoEquipos(g) === 0 || fueraDeAlcance(g.hoja, g.grupo)) {
          autoExcluidos[`equipos-${i}`] = true
        }
      })
      data.excel.servicios.forEach((g, i) => {
        const suma = g.actividades.reduce((s, a) => s + a.costoCliente, 0)
        if (suma === 0 || fueraDeAlcance(g.hoja, g.grupo)) {
          autoExcluidos[`servicios-${i}`] = true
        }
      })
      data.excel.gastos.forEach((g, i) => {
        if (totalGrupoGastos(g) === 0 || fueraDeAlcance(g.hoja, g.grupo)) {
          autoExcluidos[`gastos-${i}`] = true
        }
      })
      setGruposExcluidos(autoExcluidos)

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

      // Auto-populate config from extracted data. Con varias propuestas, la identidad
      // de la cotización la define la primera: es una sola OC.
      const principal = data.pdfs[0]

      if (data.excel.resumen.nombreProyecto) {
        setNombreCotizacion(data.excel.resumen.nombreProyecto)
      }
      if (principal?.nombreProyecto && !data.excel.resumen.nombreProyecto) {
        setNombreCotizacion(principal.nombreProyecto)
      }
      if (data.mapeo.clienteSugerido) {
        setClienteId(data.mapeo.clienteSugerido.id)
      }
      if (data.mapeo.comercialSugerido) {
        setComercialId(data.mapeo.comercialSugerido.id)
      }
      if (data.excel.resumen.moneda) {
        setMoneda(data.excel.resumen.moneda)
      }

      // Sin Excel, las partidas del PDF se clasifican a mano. Se presume servicio cuando
      // la descripción lo dice, que es el caso habitual en las propuestas antiguas.
      if (!excelFile) {
        const auto: Record<string, ClasificacionPartida> = {}
        for (const p of aplanarPartidas(data.pdfs)) {
          auto[p.clave] = /servicio|mano de obra|programaci|ingenier/i.test(p.descripcion)
            ? { bucket: 'servicio' }
            : { bucket: 'equipo' }
        }
        setClasificacion(auto)
      }

      // El código y la fecha impresos en el PDF mandan sobre el correlativo automático:
      // es lo que hace que una propuesta de 2019 entre con su identidad real.
      if (principal?.codigoOriginal) {
        setCodigoManual(principal.codigoOriginal)
      }
      if (principal?.fechaEmision) {
        setFechaManual(principal.fechaEmision)
      }

      setStep(1)
      toast.success('Datos extraídos correctamente')
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Error al procesar archivos'
      setErrorMessage(msg)
      toast.error(msg)
    } finally {
      setLoading(false)
      setLoadingMessage('')
    }
  }, [excelFile, pdfFiles])

  /**
   * Lo que se va a crear, ya con exclusiones aplicadas y líneas de ajuste incluidas.
   * Lo comparten el resumen de Confirmar y el envío: cuando eran dos cálculos
   * distintos, la pantalla mostraba "0 equipos" mientras el ajuste sí se importaba.
   */
  const payloadFinal = useMemo(() => {
    if (!extractData) return null

    // Con Excel mandan los grupos extraídos; sin él, los arma la clasificación de partidas.
    const desdePdf = gruposDesdePdf

    {
      // Se descartan los grupos excluidos. Las claves del catálogo son por posición
      // (`grupo-item`), así que hay que renumerarlas o apuntarían al grupo equivocado.
      const equiposIncluidos: ExcelEquipoGrupo[] = []
      const catalogItems: string[] = []
      if (!desdePdf) {
        extractData.excel.equipos.forEach((grupo, gi) => {
          if (gruposExcluidos[`equipos-${gi}`]) return
          const items: ExcelEquipoGrupo['items'] = []
          const alCatalogo: number[] = []
          grupo.items.forEach((item, ii) => {
            if (gruposExcluidos[`equipos-${gi}-${ii}`]) return
            if (catalogSelections[`${gi}-${ii}`]) alCatalogo.push(items.length)
            items.push(item)
          })
          if (items.length === 0) return
          const nuevoGi = equiposIncluidos.length
          equiposIncluidos.push({ ...grupo, items })
          alCatalogo.forEach((ii) => catalogItems.push(`${nuevoGi}-${ii}`))
        })
      }

      const serviciosIncluidos = extractData.excel.servicios
        .map((grupo, gi) =>
          gruposExcluidos[`servicios-${gi}`]
            ? null
            : {
                ...grupo,
                actividades: grupo.actividades.filter(
                  (_, ai) => !gruposExcluidos[`servicios-${gi}-${ai}`]
                ),
              }
        )
        .filter((g): g is ExcelServicioGrupo => !!g && g.actividades.length > 0)

      const gastosIncluidos = extractData.excel.gastos
        .map((grupo, gi) =>
          gruposExcluidos[`gastos-${gi}`]
            ? null
            : {
                ...grupo,
                items: grupo.items.filter((_, ii) => !gruposExcluidos[`gastos-${gi}-${ii}`]),
              }
        )
        .filter((g): g is ExcelGastoGrupo => !!g && g.items.length > 0)

      // Línea de cierre contra el PDF. Va como una línea visible y con margen cero,
      // en vez de escalar precios: el precio unitario del Excel alimenta el catálogo.
      const etiquetaAjuste = `Ajuste según propuesta${codigoManual.trim() ? ` ${codigoManual.trim()}` : ''}`
      const edtsFinales: Record<string, string> = { ...edtMappings }

      if (!desdePdf && ajustes.equipos) {
        equiposIncluidos.push({
          grupo: etiquetaAjuste,
          hoja: 'PDF',
          items: [
            {
              descripcion: etiquetaAjuste,
              categoria: 'Ajuste',
              unidad: 'Glb',
              marca: '',
              cantidad: 1,
              precioLista: ajustes.equipos,
              precioInterno: ajustes.equipos,
              precioCliente: ajustes.equipos,
              factorCosto: 1,
              factorVenta: 1,
            },
          ],
        })
      }

      if (!desdePdf && ajustes.gastos) {
        gastosIncluidos.push({
          grupo: etiquetaAjuste,
          hoja: 'PDF',
          items: [
            {
              nombre: etiquetaAjuste,
              cantidad: 1,
              precioUnitario: ajustes.gastos,
              costoInterno: ajustes.gastos,
              costoCliente: ajustes.gastos,
            },
          ],
        })
      }

      if (!desdePdf && ajustes.servicios) {
        // El ajuste necesita un EDT propio: el de los servicios ya mapeados, o el
        // que el usuario eligió en el paso de Mapeo cuando no hay ninguno.
        const edtReferencia = serviciosIncluidos.find(
          (g) => edtMappings[g.edtSugerido || g.grupo]
        )
        const nombreEdtAjuste = edtReferencia
          ? edtReferencia.edtSugerido || edtReferencia.grupo
          : edtAjuste
            ? etiquetaAjuste
            : null

        if (nombreEdtAjuste) {
          if (!edtReferencia) edtsFinales[etiquetaAjuste] = edtAjuste
          serviciosIncluidos.push({
            grupo: etiquetaAjuste,
            hoja: 'PDF',
            edtSugerido: nombreEdtAjuste,
            factorSeguridad: 1,
            margen: 1,
            actividades: [
              {
                nombre: etiquetaAjuste,
                descripcion: etiquetaAjuste,
                recursos: [
                  {
                    recursoNombre: NOMBRE_RECURSO_SUMA_ALZADA,
                    tipo: 'oficina' as const,
                    costoHora: ajustes.servicios,
                    horas: 1,
                  },
                ],
                horasTotal: 1,
                costoInterno: ajustes.servicios,
                costoCliente: ajustes.servicios,
              },
            ],
          })
        }
      }

      // La línea de ajuste de servicios también se apoya en el recurso marcador.
      const recursosFinales =
        desdePdf?.usaRecursoMarcador || (!desdePdf && ajustes.servicios)
          ? { ...recursoMappings, [NOMBRE_RECURSO_SUMA_ALZADA]: RECURSO_SUMA_ALZADA }
          : recursoMappings

      return {
        equipos: desdePdf ? desdePdf.equipos : equiposIncluidos,
        servicios: desdePdf ? desdePdf.servicios : serviciosIncluidos,
        gastos: desdePdf ? desdePdf.gastos : gastosIncluidos,
        catalogItems,
        recursosFinales,
        edtsFinales: desdePdf ? desdePdf.edtMappings : edtsFinales,
      }
    }
  }, [
    extractData, gruposDesdePdf, gruposExcluidos, catalogSelections,
    ajustes, codigoManual, edtMappings, edtAjuste, recursoMappings,
  ])

  const handleConfirm = useCallback(async () => {
    if (!extractData || !payloadFinal) return

    setLoading(true)
    setErrorMessage(null)
    setLoadingMessage('Creando cotización...')

    try {
      const res = await fetch('/api/agente/importar-excel/confirmar', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          equipos: payloadFinal.equipos,
          servicios: payloadFinal.servicios,
          gastos: payloadFinal.gastos,
          recursoMappings: Object.entries(payloadFinal.recursosFinales).map(
            ([excelName, recursoId]) => ({ excelName, recursoId })
          ),
          edtMappings: Object.entries(payloadFinal.edtsFinales).map(
            ([excelEdtName, edtId]) => ({ excelEdtName, edtId })
          ),
          clienteId,
          comercialId: comercialId || undefined,
          nombreCotizacion,
          moneda,
          catalogItems: payloadFinal.catalogItems,
          notas: notas || undefined,
          codigoManual: codigoManual.trim() || undefined,
          fechaManual: fechaManual || undefined,
          cotizacionIdDestino: destino?.id,
          condiciones: pdfFusionado?.condiciones.map((c) => ({
            texto: c.texto,
            tipo: c.tipo,
          })),
          exclusiones: pdfFusionado?.exclusiones.map((e) => ({
            texto: e.texto,
          })),
          formaPago: pdfFusionado?.formaPago,
          validezOferta: pdfFusionado?.validezDias,
        }),
      })

      if (!res.ok) {
        const err = await res.json().catch(() => ({ error: 'Error de servidor' }))
        throw new Error(err.error || `Error ${res.status}`)
      }

      const result = await res.json()
      toast.success(
        result.agregadoAExistente
          ? `Grupos agregados a la cotización ${result.codigo}`
          : `Cotización ${result.codigo} creada exitosamente`
      )
      onOpenChange(false)
      router.push(`/comercial/cotizaciones/${result.cotizacionId}`)
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Error al crear cotización'
      setErrorMessage(msg)
      toast.error(msg)
    } finally {
      setLoading(false)
      setLoadingMessage('')
    }
  }, [
    extractData, payloadFinal, clienteId, comercialId,
    nombreCotizacion, moneda, notas,
    codigoManual, fechaManual, destino, pdfFusionado,
    onOpenChange, router,
  ])

  // ── Navigation ────────────────────────────────────────

  const canNext = () => {
    switch (step) {
      case 0: return !!excelFile || pdfFiles.length > 0
      case 1: return !!extractData
      case 2:
        // Una partida marcada como servicio sin EDT se descartaría en silencio al importar.
        if (
          partidasPdf.some(
            (p) =>
              clasificacion[p.clave]?.bucket === 'servicio' && !clasificacion[p.clave]?.edtId
          )
        ) {
          return false
        }
        // Lo mismo con el ajuste de servicios: sin EDT no se crea el grupo y el monto se pierde.
        return !(ajusteServiciosSinEdt !== null && !edtAjuste)
      case 3: return destino ? true : !!nombreCotizacion && !!clienteId
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
          {/* Error banner */}
          {errorMessage && !loading && (
            <div className="flex items-start gap-2.5 rounded-lg border border-red-200 bg-red-50 px-4 py-3 mb-4">
              <AlertTriangle className="h-4 w-4 shrink-0 text-red-500 mt-0.5" />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-red-800">Error</p>
                <p className="text-xs text-red-600 mt-0.5">{errorMessage}</p>
              </div>
              <button
                onClick={() => setErrorMessage(null)}
                className="text-xs text-red-400 hover:text-red-600 shrink-0"
              >
                Cerrar
              </button>
            </div>
          )}

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
                  pdfFiles={pdfFiles}
                  onExcelChange={setExcelFile}
                  onPdfFilesChange={setPdfFiles}
                />
              )}
              {step === 1 && extractData && (
                <PreviewStep
                  data={extractData.excel}
                  pdfData={pdfFusionado}
                  catalogSelections={catalogSelections}
                  onCatalogSelectionsChange={setCatalogSelections}
                  gruposExcluidos={gruposExcluidos}
                  onToggleGrupo={(clave) =>
                    setGruposExcluidos((prev) => ({ ...prev, [clave]: !prev[clave] }))
                  }
                  moneda={moneda}
                  objetivos={objetivosPorSeccion}
                  totales={totalesPreview}
                  partidasPdf={gruposDesdePdf ? [] : pdfFusionado?.partidas || []}
                  asignacionPartidas={asignacionPartidas}
                  onAsignarPartida={(i, seccion) =>
                    setAsignacionPartidas((prev) => ({ ...prev, [i]: seccion }))
                  }
                  ajustes={ajustes}
                  onCuadrar={cuadrarSeccion}
                  declaradoDeGrupo={(hoja, grupo) =>
                    totalDeclaradoDeGrupo(extractData.totalesExcel || [], hoja, grupo)
                  }
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
                  partidas={partidasPdf}
                  clasificacion={clasificacion}
                  moneda={moneda}
                  onClasificacionChange={(clave, valor) =>
                    setClasificacion((prev) => ({ ...prev, [clave]: valor }))
                  }
                  ajusteServiciosSinEdt={ajusteServiciosSinEdt}
                  edtAjuste={edtAjuste}
                  onEdtAjusteChange={setEdtAjuste}
                />
              )}
              {step === 3 && extractData && (
                <ConfigStep
                  nombreCotizacion={nombreCotizacion}
                  clienteId={clienteId}
                  comercialId={comercialId}
                  moneda={moneda}
                  notas={notas}
                  codigoManual={codigoManual}
                  fechaManual={fechaManual}
                  destino={destino}
                  clientes={extractData.catalogos.clientes}
                  comerciales={extractData.catalogos.comerciales}
                  clienteSugerido={extractData.mapeo.clienteSugerido}
                  comercialSugerido={extractData.mapeo.comercialSugerido}
                  onNombreChange={setNombreCotizacion}
                  onClienteChange={setClienteId}
                  onComercialChange={setComercialId}
                  onMonedaChange={setMoneda}
                  onNotasChange={setNotas}
                  onCodigoManualChange={setCodigoManual}
                  onFechaManualChange={setFechaManual}
                  onDestinoChange={setDestino}
                />
              )}
              {step === 4 && extractData && (
                <ConfirmStep
                  data={{
                    ...extractData.excel,
                    equipos: payloadFinal?.equipos || [],
                    servicios: payloadFinal?.servicios || [],
                    gastos: payloadFinal?.gastos || [],
                  }}
                  nombreCotizacion={nombreCotizacion}
                  clienteNombre={clienteNombre}
                  moneda={moneda}
                  catalogItemCount={catalogItemCount}
                  totalEquipoItems={totalEquipoItems}
                  recursosMapeados={Object.keys(recursoMappings).length}
                  recursosTotal={extractData.mapeo.recursos.length}
                  edtsMapeados={Object.keys(edtMappings).length}
                  edtsTotal={extractData.mapeo.edts.length}
                  condicionesCount={pdfFusionado?.condiciones.length || 0}
                  exclusionesCount={pdfFusionado?.exclusiones.length || 0}
                  codigoManual={codigoManual}
                  fechaManual={fechaManual}
                  destinoCodigo={destino?.codigo || null}
                  totalImportable={totales.total}
                  totalReferencia={totalReferencia}
                  origenReferencia={origenReferencia}
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

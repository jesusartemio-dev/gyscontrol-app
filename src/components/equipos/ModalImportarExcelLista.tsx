'use client'

import { useState, useCallback, useEffect, useRef } from 'react'
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
import { Input } from '@/components/ui/input'
import { Checkbox } from '@/components/ui/checkbox'
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
  ChevronRight,
  ArrowLeft,
  ArrowRight,
  Link2,
  Unlink,
  Database,
  AlertTriangle,
  RefreshCw,
  Search,
  ChevronsUpDown,
  Check
} from 'lucide-react'
import { importarEquiposDesdeExcel } from '@/lib/utils/equiposExcel'
import {
  verificarExistenciaEquipos,
  crearEquiposEnCatalogo,
  importarDesdeCotizacion,
  importarDesdeCatalogo,
  importarDirectoALista,
  importarComoReemplazo,
  type ResumenImportacionExcel
} from '@/lib/services/listaEquipoImportExcel'
import { getProyectoEquipos } from '@/lib/services/proyectoEquipo'
import type { ProyectoEquipoCotizado } from '@/types'

interface Props {
  isOpen: boolean
  proyectoId: string
  listaId: string
  listaCodigo?: string
  listaNombre?: string
  onClose: () => void
  onSuccess: () => void
}

type Step = 'upload' | 'verify' | 'mapping' | 'importing'

interface QuotedItemOption {
  id: string
  codigo: string
  descripcion: string
  categoria: string
  grupoNombre: string
  grupoId: string
}

const MAPPING_NONE = '__none__'

// Simple searchable dropdown for vinculación — plain HTML, no cmdk/Popover
// to avoid pointer-event conflicts with the parent Dialog
function VinculacionCombobox({
  item,
  currentMapping,
  isMapped,
  isReplacement,
  matchedQuoted,
  proyectoEquipos,
  usedByOthers,
  onSelect,
}: {
  item: { codigo: string; categoria: string; descripcion: string }
  currentMapping: string
  isMapped: boolean
  isReplacement: boolean
  matchedQuoted: QuotedItemOption | null | undefined
  proyectoEquipos: ProyectoEquipoCotizado[]
  usedByOthers: Set<string>
  onSelect: (val: string) => void
}) {
  const [open, setOpen] = useState(false)
  const [search, setSearch] = useState('')
  const containerRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  // Close on click outside
  useEffect(() => {
    if (!open) return
    const handler = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false)
        setSearch('')
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [open])

  // Focus search input when opened
  useEffect(() => {
    if (open) setTimeout(() => inputRef.current?.focus(), 50)
  }, [open])

  const excelCategoria = (item.categoria || '').toLowerCase()
  const allItems = proyectoEquipos.flatMap(grupo =>
    (grupo.items || []).map((qi: any) => ({ ...qi, grupoNombre: grupo.nombre }))
  )
  const sameCategory = excelCategoria
    ? allItems.filter((qi: any) => ((qi as any).categoria || '').toLowerCase() === excelCategoria)
    : []
  const otherItems = excelCategoria
    ? allItems.filter((qi: any) => ((qi as any).categoria || '').toLowerCase() !== excelCategoria)
    : allItems

  // Filter by search term
  const term = search.toLowerCase()
  const filterItem = (qi: any) => {
    if (!term) return true
    return `${qi.codigo} ${qi.descripcion} ${qi.categoria || ''}`.toLowerCase().includes(term)
  }
  const filteredSame = sameCategory.filter(filterItem)
  const filteredOther = otherItems.filter(filterItem)
  const hasResults = filteredSame.length > 0 || filteredOther.length > 0 || (!term || 'sin vincular'.includes(term))

  const handleSelect = (val: string) => {
    onSelect(val)
    setOpen(false)
    setSearch('')
  }

  const renderItem = (qi: any) => {
    const isUsed = usedByOthers.has(qi.id)
    const isSelected = currentMapping === qi.id
    return (
      <div
        key={qi.id}
        title={`${qi.codigo} — ${qi.descripcion}`}
        onClick={() => { if (!isUsed) handleSelect(qi.id) }}
        className={cn(
          'flex items-center gap-1.5 px-2 py-1.5 text-xs rounded-sm cursor-pointer',
          isSelected ? 'bg-accent' : 'hover:bg-accent',
          isUsed && 'opacity-50 cursor-not-allowed'
        )}
      >
        <span className="flex items-center gap-1.5 flex-1 min-w-0">
          <span className="font-mono text-[10px] shrink-0">{qi.codigo}</span>
          <span className="truncate">{qi.descripcion}</span>
          {isUsed && <span className="text-[9px] text-orange-500 shrink-0">(ya asignado)</span>}
        </span>
        {isSelected && <Check className="ml-auto h-3 w-3 text-green-600 shrink-0" />}
      </div>
    )
  }

  return (
    <div ref={containerRef} className="relative flex-1">
      <Button
        variant="outline"
        type="button"
        onClick={() => setOpen(!open)}
        title={isMapped && matchedQuoted ? `${matchedQuoted.codigo} — ${matchedQuoted.descripcion}` : undefined}
        className={cn(
          'h-7 text-xs w-full justify-between overflow-hidden font-normal',
          isMapped
            ? isReplacement
              ? 'border-blue-300 text-blue-800'
              : 'border-green-300 text-green-800'
            : 'text-gray-500'
        )}
      >
        <span className="truncate">
          {isMapped && matchedQuoted
            ? <><span className="font-mono">{matchedQuoted.codigo}</span> {matchedQuoted.descripcion.length > 40 ? matchedQuoted.descripcion.slice(0, 40) + '...' : matchedQuoted.descripcion}</>
            : 'Sin vincular'
          }
        </span>
        <ChevronsUpDown className="ml-1 h-3 w-3 shrink-0 opacity-50" />
      </Button>
      {open && (
        <div className="absolute top-full left-0 mt-1 w-[460px] z-[200] rounded-md border bg-popover text-popover-foreground shadow-lg">
          {/* Search input */}
          <div className="flex items-center border-b px-2">
            <Search className="mr-2 h-3.5 w-3.5 shrink-0 opacity-50" />
            <input
              ref={inputRef}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Buscar por código o descripción..."
              className="flex h-8 w-full bg-transparent py-2 text-xs outline-none placeholder:text-muted-foreground"
            />
          </div>
          {/* Items list */}
          <div className="max-h-[250px] overflow-y-auto p-1">
            {/* Sin vincular option */}
            {(!term || 'sin vincular'.includes(term)) && (
              <div
                onClick={() => handleSelect(MAPPING_NONE)}
                className={cn(
                  'flex items-center gap-1.5 px-2 py-1.5 text-xs rounded-sm cursor-pointer',
                  currentMapping === MAPPING_NONE ? 'bg-accent' : 'hover:bg-accent'
                )}
              >
                <Unlink className="h-3 w-3 shrink-0" />
                <span>Sin vincular</span>
                {currentMapping === MAPPING_NONE && <Check className="ml-auto h-3 w-3 text-green-600" />}
              </div>
            )}
            {/* Same category group */}
            {filteredSame.length > 0 && (
              <div className="mt-1">
                <div className="px-2 py-1 text-[10px] font-semibold text-green-600 uppercase">
                  Misma categoría ({item.categoria})
                </div>
                {filteredSame.map(renderItem)}
              </div>
            )}
            {/* Other categories group */}
            {filteredOther.length > 0 && (
              <div className="mt-1">
                <div className="px-2 py-1 text-[10px] font-semibold text-muted-foreground uppercase">
                  {filteredSame.length > 0 || sameCategory.length > 0 ? 'Otras categorías' : 'Equipos cotizados'}
                </div>
                {filteredOther.map(renderItem)}
              </div>
            )}
            {/* No results */}
            {!hasResults && (
              <div className="py-4 text-center text-xs text-muted-foreground">
                No se encontraron items
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

const steps: { key: Step; label: string }[] = [
  { key: 'upload', label: 'Subir' },
  { key: 'verify', label: 'Verificar' },
  { key: 'mapping', label: 'Mapear' },
]

export default function ModalImportarExcelLista({
  isOpen,
  proyectoId,
  listaId,
  listaCodigo,
  listaNombre,
  onClose,
  onSuccess
}: Props) {
  const { data: session } = useSession()
  const [step, setStep] = useState<Step>('upload')
  const [file, setFile] = useState<File | null>(null)
  const [resumen, setResumen] = useState<ResumenImportacionExcel | null>(null)
  const [loading, setLoading] = useState(false)
  const [importProgress, setImportProgress] = useState(0)
  const [proyectoEquipos, setProyectoEquipos] = useState<ProyectoEquipoCotizado[]>([])
  const [selectedProyectoEquipoId, setSelectedProyectoEquipoId] = useState('')
  const [downloadingTemplate, setDownloadingTemplate] = useState(false)
  // Mapping step state: Excel item code → ProyectoEquipoCotizadoItem ID (or MAPPING_NONE)
  const [itemMappings, setItemMappings] = useState<Record<string, string>>({})
  // Flattened list of all quoted items from all equipment groups
  const [allQuotedItems, setAllQuotedItems] = useState<QuotedItemOption[]>([])
  // Option C: items nuevos que el usuario elige guardar en catálogo
  const [saveToCatalog, setSaveToCatalog] = useState<Set<string>>(new Set())
  // Códigos duplicados en el Excel (no se pueden guardar en catálogo)
  const [duplicateCodes, setDuplicateCodes] = useState<Set<string>>(new Set())
  // Replacement flags: Excel item code → true if mapped as replacement
  const [replacementFlags, setReplacementFlags] = useState<Record<string, boolean>>({})
  // Replacement motivos: Excel item code → motivo text
  const [replacementMotivos, setReplacementMotivos] = useState<Record<string, string>>({})

  const resetModal = useCallback(() => {
    setStep('upload')
    setFile(null)
    setResumen(null)
    setLoading(false)
    setImportProgress(0)
    setProyectoEquipos([])
    setSelectedProyectoEquipoId('')
    setItemMappings({})
    setAllQuotedItems([])
    setSaveToCatalog(new Set())
    setDuplicateCodes(new Set())
    setReplacementFlags({})
    setReplacementMotivos({})
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

  // Dismiss: close without resetting (accidental close / click outside / Escape)
  const handleDismiss = useCallback(() => {
    onClose()
  }, [onClose])

  // Cancel: explicit reset + close (user clicks "Cancelar")
  const handleCancel = useCallback(() => {
    resetModal()
    onClose()
  }, [resetModal, onClose])

  // After successful import: reset + close
  const handleImportSuccess = useCallback(() => {
    resetModal()
    onClose()
  }, [resetModal, onClose])

  const handleFileUpload = async (file: File) => {
    try {
      setLoading(true)
      setFile(file)

      const data = await importarEquiposDesdeExcel(file)

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

  const handleGoToMapping = async () => {
    if (!resumen) return

    try {
      setLoading(true)

      // 1. Build flattened list of all quoted items from all equipment groups
      const quotedItems: QuotedItemOption[] = proyectoEquipos.flatMap(grupo =>
        (grupo.items || []).map(item => ({
          id: item.id,
          codigo: item.codigo,
          descripcion: item.descripcion,
          categoria: (item as any).categoria || '',
          grupoNombre: grupo.nombre,
          grupoId: grupo.id,
        }))
      )
      setAllQuotedItems(quotedItems)

      // 2. Auto-match: exact code → fuzzy description → code-in-description
      const mappings: Record<string, string> = {}
      for (const excelItem of resumen.items) {
        const codigoLower = excelItem.codigo.toLowerCase()
        // Strategy 1: exact code match
        const exactMatch = quotedItems.find(qi => qi.codigo.toLowerCase() === codigoLower)
        if (exactMatch) {
          mappings[excelItem.codigo] = exactMatch.id
          continue
        }
        // Strategy 2: fuzzy description match (one contains the other)
        const descLower = excelItem.descripcion.toLowerCase()
        const fuzzyMatches = quotedItems.filter(qi => {
          const qDesc = qi.descripcion.toLowerCase()
          return descLower.includes(qDesc) || qDesc.includes(descLower)
        })
        if (fuzzyMatches.length === 1) {
          mappings[excelItem.codigo] = fuzzyMatches[0].id
          continue
        }
        // Strategy 3: Excel code found inside quoted item's description
        if (codigoLower.length >= 4) {
          const codeInDescMatches = quotedItems.filter(qi =>
            qi.descripcion.toLowerCase().includes(codigoLower)
          )
          if (codeInDescMatches.length === 1) {
            mappings[excelItem.codigo] = codeInDescMatches[0].id
          }
        }
      }
      setItemMappings(mappings)

      // 3. Detect duplicate codes in Excel
      const codigosLower = resumen.items.map(i => i.codigo.toLowerCase())
      const dupes = new Set<string>()
      codigosLower.forEach((c, i) => {
        if (codigosLower.indexOf(c) !== i) dupes.add(c)
      })
      setDuplicateCodes(dupes)

      // 4. Pre-check "save to catalog" for new items with valid, non-duplicate codes
      const preChecked = new Set<string>()
      for (const item of resumen.items) {
        if (item.estado === 'nuevo' && item.codigo.trim() && !dupes.has(item.codigo.toLowerCase())) {
          preChecked.add(item.codigo)
        }
      }
      setSaveToCatalog(preChecked)

      // 5. Auto-select equipment group if there's only one
      if (proyectoEquipos.length === 1) {
        setSelectedProyectoEquipoId(proyectoEquipos[0].id)
      }

      setStep('mapping')
    } catch (error) {
      console.error('Error preparando mapeo:', error)
      toast.error('Error al preparar el mapeo')
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

      const responsableId = session?.user?.id
      if (!responsableId) throw new Error('Usuario no identificado')

      // Split items into 4 groups based on user mappings
      const mappedItems: Array<{ excelItem: typeof resumen.items[0]; quotedItemId: string }> = []
      const replacementItems: Array<{ excelItem: typeof resumen.items[0]; quotedItemId: string; motivo: string }> = []
      const unmappedWithCatalog: typeof resumen.items = [] // ya existen en catálogo o user eligió guardar
      const unmappedDirect: typeof resumen.items = []      // sin catálogo (directo a lista)

      for (const excelItem of resumen.items) {
        const mappedTo = itemMappings[excelItem.codigo]
        if (mappedTo && mappedTo !== MAPPING_NONE) {
          if (replacementFlags[excelItem.codigo]) {
            // Path 1b: Reemplazo de item cotizado
            replacementItems.push({
              excelItem,
              quotedItemId: mappedTo,
              motivo: replacementMotivos[excelItem.codigo] || 'Reemplazo desde importación Excel'
            })
          } else {
            // Path 1: Vinculado a item cotizado
            mappedItems.push({ excelItem, quotedItemId: mappedTo })
          }
        } else if (excelItem.estado === 'solo_catalogo' || excelItem.catalogoId) {
          // Path 2: Ya existe en catálogo → importar desde catálogo
          unmappedWithCatalog.push(excelItem)
        } else if (excelItem.estado === 'nuevo' && saveToCatalog.has(excelItem.codigo)) {
          // Path 2b: Nuevo pero user eligió guardarlo en catálogo
          unmappedWithCatalog.push(excelItem)
        } else {
          // Path 3: Directo a lista sin catálogo
          unmappedDirect.push(excelItem)
        }
      }

      // === Path 1: Import mapped items via cotización link ===
      if (mappedItems.length > 0) {
        const quotedItemIds = mappedItems.map(m => m.quotedItemId)
        const excelData = mappedItems.map(m => ({
          codigo: m.excelItem.codigo,
          cantidad: m.excelItem.cantidad
        }))
        await importarDesdeCotizacion(listaId, quotedItemIds, excelData)
      }
      setImportProgress(20)

      // === Path 1b: Import replacement items ===
      if (replacementItems.length > 0) {
        // Determine equipment group: use selected or find from the quoted item
        const equipoIdForReplacements = selectedProyectoEquipoId ||
          (() => {
            const firstQuotedId = replacementItems[0].quotedItemId
            const matched = allQuotedItems.find(q => q.id === firstQuotedId)
            return matched?.grupoId || ''
          })()

        if (equipoIdForReplacements) {
          await importarComoReemplazo(
            listaId,
            equipoIdForReplacements,
            replacementItems.map(r => ({
              excelItem: {
                codigo: r.excelItem.codigo,
                descripcion: r.excelItem.descripcion,
                categoria: r.excelItem.categoria,
                unidad: r.excelItem.unidad,
                marca: r.excelItem.marca,
                cantidad: r.excelItem.cantidad,
              },
              proyectoEquipoItemId: r.quotedItemId,
              motivo: r.motivo,
            })),
            responsableId
          )
        }
      }
      setImportProgress(40)

      // === Path 2: Items that need catalog (existing or user-chosen) ===
      if (unmappedWithCatalog.length > 0) {
        // Create catalog entries for new items that user chose to save
        const itemsToCreate = unmappedWithCatalog.filter(
          item => item.estado === 'nuevo' && saveToCatalog.has(item.codigo)
        )
        if (itemsToCreate.length > 0 && resumen.equiposNuevosParaCatalogo.length > 0) {
          const payloadsToCreate = resumen.equiposNuevosParaCatalogo.filter(
            p => itemsToCreate.some(i => i.codigo === p.codigo)
          )
          if (payloadsToCreate.length > 0) {
            await crearEquiposEnCatalogo(payloadsToCreate)
          }
        }

        // Re-verify to get fresh catalogoIds
        const resumenActualizado = await verificarExistenciaEquipos(
          unmappedWithCatalog.map(item => ({
            codigo: item.codigo,
            descripcion: item.descripcion,
            categoria: item.categoria,
            unidad: item.unidad,
            marca: item.marca,
            cantidad: item.cantidad
          })),
          proyectoId
        )

        const catalogoIds: string[] = []
        const cantidades: Record<string, number> = {}
        for (const item of resumenActualizado.items) {
          if (item.catalogoId) {
            catalogoIds.push(item.catalogoId)
            cantidades[item.catalogoId] = item.cantidad
          }
        }

        if (catalogoIds.length > 0) {
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
      setImportProgress(70)

      // === Path 3: Direct to list without catalog ===
      if (unmappedDirect.length > 0) {
        if (!selectedProyectoEquipoId) throw new Error('Seleccione un grupo de equipo')
        await importarDirectoALista(
          listaId,
          selectedProyectoEquipoId,
          unmappedDirect.map(item => ({
            codigo: item.codigo,
            descripcion: item.descripcion,
            categoria: item.categoria,
            unidad: item.unidad,
            marca: item.marca,
            cantidad: item.cantidad,
          })),
          responsableId
        )
      }

      setImportProgress(100)
      toast.success('Importación completada')
      onSuccess()
      handleImportSuccess()
    } catch (error) {
      console.error('Error importando:', error)
      toast.error('Error durante la importación')
      setStep('mapping')
    } finally {
      setLoading(false)
    }
  }

  const downloadTemplate = async () => {
    try {
      setDownloadingTemplate(true)
      const ExcelJS = (await import('exceljs')).default

      const [catRes, uniRes] = await Promise.all([
        fetch('/api/categoria-equipo'),
        fetch('/api/unidad')
      ])

      const categorias: Array<{ id: string; nombre: string; descripcion?: string }> = catRes.ok ? await catRes.json() : []
      const unidades: Array<{ id: string; nombre: string }> = uniRes.ok ? await uniRes.json() : []

      const wb = new ExcelJS.Workbook()

      // --- Sheet 1: Plantilla ---
      const wsPlantilla = wb.addWorksheet('Plantilla')
      wsPlantilla.columns = [
        { header: 'Código', key: 'codigo', width: 12 },
        { header: 'Descripción', key: 'descripcion', width: 30 },
        { header: 'Categoría', key: 'categoria', width: 22 },
        { header: 'Unidad', key: 'unidad', width: 10 },
        { header: 'Marca', key: 'marca', width: 15 },
        { header: 'Cantidad', key: 'cantidad', width: 10 },
      ]
      // Header style
      wsPlantilla.getRow(1).font = { bold: true }
      wsPlantilla.getRow(1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF3F4F6' } }

      // Example rows
      wsPlantilla.addRow({
        codigo: 'EQ001', descripcion: 'Ejemplo de Equipo',
        categoria: categorias[0]?.nombre || 'Eléctricos',
        unidad: unidades[0]?.nombre || 'UND',
        marca: 'Siemens', cantidad: 1
      })
      wsPlantilla.addRow({
        codigo: 'EQ002', descripcion: 'Otro Equipo',
        categoria: categorias[1]?.nombre || 'Mecánicos',
        unidad: unidades[1]?.nombre || 'KG',
        marca: 'ABB', cantidad: 2
      })

      // --- Sheet 2: Categorias (VISIBLE - reference with description) ---
      const wsCategorias = wb.addWorksheet('Categorias')
      wsCategorias.columns = [
        { header: 'Categoría', key: 'nombre', width: 25 },
        { header: 'Descripción', key: 'descripcion', width: 70 },
      ]
      wsCategorias.getRow(1).font = { bold: true }
      wsCategorias.getRow(1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFDBEAFE' } }
      for (const cat of categorias) {
        wsCategorias.addRow({ nombre: cat.nombre, descripcion: cat.descripcion || '' })
      }

      // --- Sheet 3: Unidades (HIDDEN) ---
      const wsUnidades = wb.addWorksheet('Unidades')
      wsUnidades.columns = [{ header: 'Unidad', key: 'nombre', width: 15 }]
      for (const uni of unidades) {
        wsUnidades.addRow({ nombre: uni.nombre })
      }
      wsUnidades.state = 'hidden'

      // --- Data validation dropdowns on Plantilla ---
      if (categorias.length > 0) {
        for (let row = 2; row <= 500; row++) {
          wsPlantilla.getCell(`C${row}`).dataValidation = {
            type: 'list',
            allowBlank: true,
            formulae: [`Categorias!$A$2:$A$${categorias.length + 1}`],
            showErrorMessage: true,
            errorTitle: 'Categoría inválida',
            error: 'Selecciona una categoría de la lista o consulta la hoja "Categorias"',
          }
        }
      }
      if (unidades.length > 0) {
        for (let row = 2; row <= 500; row++) {
          wsPlantilla.getCell(`D${row}`).dataValidation = {
            type: 'list',
            allowBlank: true,
            formulae: [`Unidades!$A$2:$A$${unidades.length + 1}`],
            showErrorMessage: true,
            errorTitle: 'Unidad inválida',
            error: 'Selecciona una unidad de la lista',
          }
        }
      }

      // Generate and download
      const buffer = await wb.xlsx.writeBuffer()
      const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      const fileName = listaCodigo && listaNombre
        ? `${listaCodigo}_${listaNombre.replace(/[^a-zA-Z0-9áéíóúñÁÉÍÓÚÑ\s-]/g, '').replace(/\s+/g, '_')}_-_Plantilla.xlsx`
        : 'plantilla_importacion_equipos.xlsx'
      a.download = fileName
      a.click()
      URL.revokeObjectURL(url)
    } catch (error) {
      console.error('Error descargando plantilla:', error)
      toast.error('Error al descargar la plantilla')
    } finally {
      setDownloadingTemplate(false)
    }
  }

  // Step indicator
  const StepIndicator = () => (
    <div className="flex items-center justify-center gap-1 mb-4">
      {steps.map((s, idx) => {
        const isActive = step === s.key || (step === 'importing' && s.key === 'mapping')
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
        <Button variant="ghost" size="sm" onClick={downloadTemplate} disabled={downloadingTemplate} className="h-7 text-xs text-gray-500">
          {downloadingTemplate ? (
            <Loader2 className="w-3 h-3 mr-1 animate-spin" />
          ) : (
            <Download className="w-3 h-3 mr-1" />
          )}
          {downloadingTemplate ? 'Descargando...' : 'Descargar plantilla'}
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
              <strong>{resumen.nuevos}</strong> items no existen en el catálogo. Podrás elegir si guardarlos en el siguiente paso.
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
            onClick={handleGoToMapping}
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

  // Mapping step - link Excel items to quoted items
  const renderMappingStep = () => {
    if (!resumen) return null

    const mappedItems = resumen.items.filter(item => {
      const m = itemMappings[item.codigo]
      return m && m !== MAPPING_NONE
    })
    const linkedCount = mappedItems.filter(item => !replacementFlags[item.codigo]).length
    const replacedCount = mappedItems.filter(item => replacementFlags[item.codigo]).length
    const mappedCount = mappedItems.length
    const unmappedCount = resumen.items.length - mappedCount
    const needsGroup = unmappedCount > 0
    const canImport = resumen.items.length > 0 && (!needsGroup || selectedProyectoEquipoId)

    return (
      <div className="space-y-3">
        {/* Header info */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1.5">
            <Link2 className="h-3.5 w-3.5 text-orange-600" />
            <span className="text-xs font-medium text-gray-700">
              Vincular items a equipos cotizados
            </span>
          </div>
          <div className="flex items-center gap-1.5 flex-wrap">
            {linkedCount > 0 && (
              <Badge variant="outline" className="text-[10px] px-1.5 py-0 bg-green-50 text-green-700 border-green-200">
                {linkedCount} vinculados
              </Badge>
            )}
            {replacedCount > 0 && (
              <Badge variant="outline" className="text-[10px] px-1.5 py-0 bg-blue-50 text-blue-700 border-blue-200">
                {replacedCount} reemplazos
              </Badge>
            )}
            {unmappedCount > 0 && (
              <Badge variant="outline" className="text-[10px] px-1.5 py-0 bg-gray-50 text-gray-500">
                {unmappedCount} sin vincular
              </Badge>
            )}
          </div>
        </div>

        {/* Mapping table */}
        <div className="space-y-2">
          <div className="space-y-2.5">
            {resumen.items.map((item, itemIdx) => {
              const currentMapping = itemMappings[item.codigo] || MAPPING_NONE
              const isMapped = currentMapping !== MAPPING_NONE
              const matchedQuoted = isMapped ? allQuotedItems.find(q => q.id === currentMapping) : null
              const isNew = item.estado === 'nuevo'
              const isDupe = duplicateCodes.has(item.codigo.toLowerCase())
              const showCatalogOption = isNew && !isMapped
              const isReplacement = isMapped && replacementFlags[item.codigo]
              // IDs de items cotizados ya asignados por OTROS items del Excel
              const usedByOthers = new Set(
                Object.entries(itemMappings)
                  .filter(([code, val]) => code !== item.codigo && val && val !== MAPPING_NONE)
                  .map(([, val]) => val)
              )
              // Detectar discrepancia de categoría entre Excel y catálogo
              const hasCategoriaMismatch = item.categoriaCatalogo && item.categoria &&
                item.categoriaCatalogo.toLowerCase() !== item.categoria.toLowerCase()

              return (
                <div
                  key={item.codigo}
                  className={cn(
                    'p-2 rounded-lg border-l-[3px] border transition-colors shadow-sm',
                    isMapped
                      ? isReplacement
                        ? 'border-l-blue-500 border-blue-300 bg-blue-50/40'
                        : 'border-l-green-500 border-green-300 bg-green-50/40'
                      : 'border-l-gray-400 border-gray-300 bg-white'
                  )}
                >
                  {/* Excel item info */}
                  <div className="flex items-start gap-2 mb-1.5">
                    <span className={cn(
                      'w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold shrink-0 mt-0.5',
                      isMapped
                        ? isReplacement
                          ? 'bg-blue-100 text-blue-700'
                          : 'bg-green-100 text-green-700'
                        : 'bg-gray-100 text-gray-500'
                    )}>
                      {isMapped
                        ? isReplacement ? <RefreshCw className="h-2.5 w-2.5" /> : <CheckCircle className="h-3 w-3" />
                        : itemIdx + 1
                      }
                    </span>
                    <Badge variant="outline" className="text-[10px] px-1.5 py-0 font-mono shrink-0 mt-0.5">
                      {item.codigo}
                    </Badge>
                    <span className="text-xs text-gray-700 line-clamp-2 flex-1" title={item.descripcion}>{item.descripcion}</span>
                    <div className="flex items-center gap-1 shrink-0 mt-0.5">
                      {isNew && !isMapped && (
                        <Badge className="text-[10px] px-1 py-0 bg-orange-100 text-orange-700">
                          nuevo
                        </Badge>
                      )}
                      <Badge className="text-[10px] px-1.5 py-0 bg-gray-100 text-gray-600">
                        x{item.cantidad}
                      </Badge>
                    </div>
                  </div>

                  {/* Aviso de discrepancia de categoría */}
                  {hasCategoriaMismatch && (
                    <div className="flex items-center gap-1.5 mb-1 px-1 py-0.5 rounded bg-amber-50 border border-amber-200">
                      <AlertTriangle className="h-3 w-3 text-amber-500 shrink-0" />
                      <span className="text-[10px] text-amber-700">
                        Categoría diferente — Excel: <strong>{item.categoria}</strong> → Catálogo: <strong>{item.categoriaCatalogo}</strong>
                      </span>
                    </div>
                  )}

                  {/* Mapping combobox with search */}
                  <div className="flex items-center gap-1.5">
                    <ArrowRight className="h-3 w-3 text-gray-400 shrink-0" />
                    <VinculacionCombobox
                      item={item}
                      currentMapping={currentMapping}
                      isMapped={isMapped}
                      isReplacement={isReplacement}
                      matchedQuoted={matchedQuoted}
                      proyectoEquipos={proyectoEquipos}
                      usedByOthers={usedByOthers}
                      onSelect={(val) => {
                        setItemMappings(prev => ({ ...prev, [item.codigo]: val }))
                        if (val === MAPPING_NONE) {
                          setReplacementFlags(prev => { const next = { ...prev }; delete next[item.codigo]; return next })
                          setReplacementMotivos(prev => { const next = { ...prev }; delete next[item.codigo]; return next })
                        }
                      }}
                    />
                  </div>

                  {/* Vincular vs Reemplazar toggle — only when mapped */}
                  {isMapped && (
                    <div className="mt-1.5 pl-5 space-y-1.5">
                      <div className="flex items-center gap-3">
                        <button
                          type="button"
                          onClick={() => {
                            setReplacementFlags(prev => { const next = { ...prev }; delete next[item.codigo]; return next })
                            setReplacementMotivos(prev => { const next = { ...prev }; delete next[item.codigo]; return next })
                          }}
                          className={cn(
                            'flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-full border transition-colors',
                            !isReplacement
                              ? 'bg-green-100 border-green-300 text-green-800 font-medium'
                              : 'bg-white border-gray-200 text-gray-500 hover:border-green-300'
                          )}
                        >
                          <Link2 className="h-2.5 w-2.5" />
                          Vincular
                        </button>
                        <button
                          type="button"
                          onClick={() => setReplacementFlags(prev => ({ ...prev, [item.codigo]: true }))}
                          className={cn(
                            'flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-full border transition-colors',
                            isReplacement
                              ? 'bg-blue-100 border-blue-300 text-blue-800 font-medium'
                              : 'bg-white border-gray-200 text-gray-500 hover:border-blue-300'
                          )}
                        >
                          <RefreshCw className="h-2.5 w-2.5" />
                          Reemplazar
                        </button>
                      </div>
                      {isReplacement && (
                        <input
                          type="text"
                          placeholder="Motivo del reemplazo (opcional)"
                          value={replacementMotivos[item.codigo] || ''}
                          onChange={(e) => setReplacementMotivos(prev => ({ ...prev, [item.codigo]: e.target.value }))}
                          className="w-full h-6 text-[10px] px-2 border border-blue-200 rounded bg-white placeholder:text-gray-400 focus:outline-none focus:ring-1 focus:ring-blue-300"
                        />
                      )}
                    </div>
                  )}

                  {/* Catalog save option for new unmapped items */}
                  {showCatalogOption && (
                    <div className="flex items-center gap-2 mt-1.5 pl-5">
                      {isDupe ? (
                        <span className="text-[10px] text-gray-400 italic">
                          Código duplicado en Excel - no se puede guardar en catálogo
                        </span>
                      ) : (
                        <>
                          <Checkbox
                            id={`catalog-${item.codigo}`}
                            checked={saveToCatalog.has(item.codigo)}
                            onCheckedChange={(checked) => {
                              setSaveToCatalog(prev => {
                                const next = new Set(prev)
                                if (checked) next.add(item.codigo)
                                else next.delete(item.codigo)
                                return next
                              })
                            }}
                            className="h-3.5 w-3.5"
                          />
                          <label htmlFor={`catalog-${item.codigo}`} className="text-[10px] text-gray-600 flex items-center gap-1 cursor-pointer">
                            <Database className="h-3 w-3" />
                            Guardar en catálogo
                          </label>
                        </>
                      )}
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        </div>

        {/* Equipment group selector for unmapped items */}
        {needsGroup && (
          <div className="space-y-1.5 pt-1 border-t">
            <div className="flex items-center gap-1.5">
              <Layers className="h-3.5 w-3.5 text-gray-500" />
              <span className="text-xs font-medium text-gray-700">
                Grupo para items sin vincular ({unmappedCount})
              </span>
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
        )}

        {/* Action buttons */}
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
                Importar {resumen.items.length} items
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
    <Dialog open={isOpen} onOpenChange={(open) => { if (!open) handleDismiss() }}>
      <DialogContent className={cn(
        'p-0 gap-0 overflow-hidden transition-all flex flex-col max-h-[85vh]',
        step === 'mapping' ? 'max-w-lg' : 'max-w-md'
      )}>
        <DialogHeader className="px-4 pt-4 pb-3 border-b shrink-0">
          <DialogTitle className="flex items-center gap-2 text-base pr-6">
            <FileSpreadsheet className="h-4 w-4 text-orange-600" />
            Importar desde Excel
            {step !== 'upload' && (
              <span className="text-[10px] font-normal text-muted-foreground ml-auto mr-2">
                Cerrar sin perder progreso
              </span>
            )}
          </DialogTitle>
        </DialogHeader>

        <div className="p-4 overflow-y-auto min-h-0 flex-1">
          {step !== 'importing' && <StepIndicator />}

          {step === 'upload' && renderUploadStep()}
          {step === 'verify' && renderVerificationStep()}
          {step === 'mapping' && renderMappingStep()}
          {step === 'importing' && renderImportingStep()}
        </div>

        {/* Footer con botón cerrar */}
        {step !== 'importing' && (
          <div className="px-4 pb-4 shrink-0">
            <Button
              variant="ghost"
              size="sm"
              onClick={handleCancel}
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

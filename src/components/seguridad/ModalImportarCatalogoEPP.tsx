'use client'

import { useRef, useState } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { ArrowRight, CheckCircle2, Download, FileSpreadsheet, Loader2, Upload, X } from 'lucide-react'
import { toast } from 'sonner'
import {
  descargarPlantillaCatalogoEpp,
  parsearCatalogoEppExcel,
  type EppExcelRow,
} from '@/lib/utils/catalogoEppExcel'

interface UnidadOpt {
  id: string
  nombre: string
}

interface Props {
  open: boolean
  onOpenChange: (v: boolean) => void
  unidades: UnidadOpt[]
  onImportado: () => void // refrescar la lista del catálogo
}

type Step = 1 | 2

interface ResultadoImport {
  total: number
  creados: number
  actualizados: number
  conError: number
  resultados: Array<{ fila?: number; codigo: string; estado: 'creado' | 'actualizado' | 'error'; error?: string }>
}

export default function ModalImportarCatalogoEPP({ open, onOpenChange, unidades, onImportado }: Props) {
  const [step, setStep] = useState<Step>(1)
  const [file, setFile] = useState<File | null>(null)
  const [downloading, setDownloading] = useState(false)
  const [parsing, setParsing] = useState(false)
  const [filas, setFilas] = useState<EppExcelRow[]>([])
  const [erroresParseo, setErroresParseo] = useState<Array<{ fila: number; codigo: string; mensaje: string }>>([])
  const [importando, setImportando] = useState(false)
  const [resultado, setResultado] = useState<ResultadoImport | null>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  const reset = () => {
    setStep(1)
    setFile(null)
    setFilas([])
    setErroresParseo([])
    setResultado(null)
    if (inputRef.current) inputRef.current.value = ''
  }

  const handleClose = (v: boolean) => {
    if (!v) reset()
    onOpenChange(v)
  }

  const descargarPlantilla = async () => {
    setDownloading(true)
    try {
      await descargarPlantillaCatalogoEpp(unidades)
      toast.success('Plantilla descargada')
    } catch (e: any) {
      toast.error(e?.message || 'Error al descargar plantilla')
    } finally {
      setDownloading(false)
    }
  }

  const handleFile = async (f: File | null) => {
    if (!f) return
    setFile(f)
    setParsing(true)
    try {
      const { filas, errores } = await parsearCatalogoEppExcel(f)
      setFilas(filas)
      setErroresParseo(errores)
      setStep(2)
    } catch (e: any) {
      toast.error(e?.message || 'Error al leer el archivo')
      setFile(null)
    } finally {
      setParsing(false)
    }
  }

  const filasValidas = filas.filter(f => !erroresParseo.some(e => e.fila === f.fila))
  const codigosDuplicadosEnArchivo = (() => {
    const counts = new Map<string, number>()
    for (const f of filasValidas) {
      counts.set(f.codigo, (counts.get(f.codigo) ?? 0) + 1)
    }
    return new Set([...counts.entries()].filter(([, n]) => n > 1).map(([c]) => c))
  })()

  const importar = async () => {
    if (filasValidas.length === 0) {
      toast.error('No hay filas válidas para importar')
      return
    }
    setImportando(true)
    try {
      const res = await fetch('/api/catalogo-epp/importar', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          items: filasValidas.map(f => ({
            fila: f.fila,
            codigo: f.codigo,
            descripcion: f.descripcion,
            marca: f.marca,
            modelo: f.modelo,
            subcategoria: f.subcategoria,
            unidad: f.unidad,
            requiereTalla: f.requiereTalla,
            tallaCampo: f.tallaCampo,
            vidaUtilDias: f.vidaUtilDias,
            esConsumible: f.esConsumible,
            precioReferencial: f.precioReferencial,
            monedaReferencial: f.monedaReferencial,
          })),
        }),
      })
      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        throw new Error(err.error || 'Error al importar')
      }
      const data: ResultadoImport = await res.json()
      setResultado(data)
      if (data.conError === 0) {
        toast.success(`Importación: ${data.creados} creados, ${data.actualizados} actualizados`)
      } else {
        toast.warning(`Importado con ${data.conError} errores`)
      }
      onImportado()
    } catch (e: any) {
      toast.error(e?.message || 'Error al importar')
    } finally {
      setImportando(false)
    }
  }

  // ─── Step indicator ─────────────────────────────────────
  const StepIndicator = () => (
    <div className="flex items-center justify-center gap-2 text-xs">
      <Badge variant={step === 1 ? 'default' : 'secondary'} className={step === 1 ? 'bg-orange-500' : ''}>
        1 Subir
      </Badge>
      <ArrowRight className="h-3 w-3 text-muted-foreground" />
      <Badge variant={step === 2 ? 'default' : 'secondary'} className={step === 2 ? 'bg-orange-500' : ''}>
        2 Verificar y confirmar
      </Badge>
    </div>
  )

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileSpreadsheet className="h-5 w-5 text-orange-600" />
            Importar catálogo EPP desde Excel
          </DialogTitle>
        </DialogHeader>

        <StepIndicator />

        {/* ─── Paso 1 ─── */}
        {step === 1 && !resultado && (
          <div className="space-y-4 py-2">
            <div className="text-sm text-center text-muted-foreground">
              Columnas esperadas: <span className="font-mono">Código, Descripción, Marca, Modelo, Subcategoría, Unidad, Requiere Talla, Talla Campo, Vida Útil, Es Consumible, Precio Ref, Moneda</span>
            </div>

            <label className="block border-2 border-dashed border-orange-200 rounded-lg p-8 text-center cursor-pointer hover:bg-orange-50/40 transition">
              <input
                ref={inputRef}
                type="file"
                accept=".xlsx,.xls"
                className="hidden"
                onChange={e => handleFile(e.target.files?.[0] ?? null)}
              />
              {parsing ? (
                <div className="flex flex-col items-center gap-2">
                  <Loader2 className="h-8 w-8 animate-spin text-orange-500" />
                  <p className="text-sm text-muted-foreground">Leyendo archivo...</p>
                </div>
              ) : (
                <>
                  <Upload className="h-8 w-8 mx-auto text-orange-500" />
                  <p className="mt-2 text-sm font-medium text-orange-600">Clic para subir o arrastra</p>
                  <p className="text-[10px] text-muted-foreground">.xlsx o .xls</p>
                </>
              )}
            </label>

            <div className="flex justify-center">
              <Button variant="outline" size="sm" onClick={descargarPlantilla} disabled={downloading}>
                {downloading ? <Loader2 className="h-3.5 w-3.5 animate-spin mr-1" /> : <Download className="h-3.5 w-3.5 mr-1" />}
                Descargar plantilla
              </Button>
            </div>

            <p className="text-[10px] text-center text-muted-foreground">
              La plantilla incluye listas desplegables para Subcategoría, Unidad, Sí/No y Moneda
              — solo se aceptan valores válidos.
            </p>
          </div>
        )}

        {/* ─── Paso 2: Verificar y confirmar ─── */}
        {step === 2 && !resultado && (
          <div className="space-y-3 py-2">
            <div className="flex items-center gap-3 text-xs">
              <span><strong>Archivo:</strong> {file?.name}</span>
              <span>·</span>
              <span><strong>{filas.length}</strong> filas leídas</span>
              <span>·</span>
              <span className="text-emerald-700"><strong>{filasValidas.length}</strong> válidas</span>
              {erroresParseo.length > 0 && (
                <>
                  <span>·</span>
                  <span className="text-red-600"><strong>{erroresParseo.length}</strong> con error</span>
                </>
              )}
            </div>

            {erroresParseo.length > 0 && (
              <div className="border border-red-200 bg-red-50 rounded-md p-3 max-h-40 overflow-auto">
                <p className="text-xs font-semibold text-red-700 mb-2">Errores de validación (no se importarán):</p>
                <ul className="text-[11px] space-y-0.5">
                  {erroresParseo.slice(0, 30).map((e, i) => (
                    <li key={i}>
                      <span className="font-mono">Fila {e.fila}</span> · {e.codigo} → {e.mensaje}
                    </li>
                  ))}
                  {erroresParseo.length > 30 && <li className="italic">... y {erroresParseo.length - 30} más</li>}
                </ul>
              </div>
            )}

            {codigosDuplicadosEnArchivo.size > 0 && (
              <div className="border border-amber-200 bg-amber-50 rounded-md p-3 text-xs text-amber-700">
                ⚠️ Hay códigos duplicados en el archivo: {[...codigosDuplicadosEnArchivo].join(', ')}.
                La última fila prevalecerá.
              </div>
            )}

            <div className="border rounded-md max-h-72 overflow-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-12">#</TableHead>
                    <TableHead>Código</TableHead>
                    <TableHead>Descripción</TableHead>
                    <TableHead>Subcat.</TableHead>
                    <TableHead>Unidad</TableHead>
                    <TableHead>Talla</TableHead>
                    <TableHead className="text-right">Vida útil</TableHead>
                    <TableHead className="text-right">Precio</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filasValidas.slice(0, 100).map(f => (
                    <TableRow key={f.fila} className="text-xs">
                      <TableCell className="text-muted-foreground">{f.fila}</TableCell>
                      <TableCell className="font-mono">{f.codigo}</TableCell>
                      <TableCell>
                        <div>{f.descripcion}</div>
                        {f.marca && <div className="text-[10px] text-muted-foreground">{f.marca}</div>}
                      </TableCell>
                      <TableCell><Badge variant="secondary" className="text-[9px]">{f.subcategoria}</Badge></TableCell>
                      <TableCell>{f.unidad}</TableCell>
                      <TableCell>{f.requiereTalla ? f.tallaCampo : '—'}</TableCell>
                      <TableCell className="text-right">{f.esConsumible ? 'consumible' : (f.vidaUtilDias ?? '—')}</TableCell>
                      <TableCell className="text-right font-mono">
                        {f.precioReferencial != null
                          ? `${f.monedaReferencial === 'USD' ? 'US$' : 'S/'} ${f.precioReferencial.toFixed(2)}`
                          : '—'}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
              {filasValidas.length > 100 && (
                <p className="text-[10px] text-center text-muted-foreground py-2">
                  Mostrando 100 de {filasValidas.length} filas válidas
                </p>
              )}
            </div>
          </div>
        )}

        {/* ─── Resultado final ─── */}
        {resultado && (
          <div className="space-y-3 py-4 text-center">
            <CheckCircle2 className="h-12 w-12 mx-auto text-emerald-500" />
            <h3 className="font-semibold">Importación completa</h3>
            <div className="flex justify-center gap-4 text-sm">
              <span><span className="font-bold text-emerald-700">{resultado.creados}</span> creados</span>
              <span>·</span>
              <span><span className="font-bold text-blue-700">{resultado.actualizados}</span> actualizados</span>
              {resultado.conError > 0 && (
                <>
                  <span>·</span>
                  <span><span className="font-bold text-red-700">{resultado.conError}</span> con error</span>
                </>
              )}
            </div>
            {resultado.conError > 0 && (
              <div className="border border-red-200 bg-red-50 rounded-md p-3 max-h-40 overflow-auto text-left">
                <p className="text-xs font-semibold text-red-700 mb-2">Items con error:</p>
                <ul className="text-[11px] space-y-0.5">
                  {resultado.resultados.filter(r => r.estado === 'error').slice(0, 30).map((r, i) => (
                    <li key={i}>
                      <span className="font-mono">{r.codigo}</span> → {r.error}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        )}

        <DialogFooter className="gap-2">
          {!resultado ? (
            <>
              <Button variant="outline" onClick={() => handleClose(false)} disabled={importando}>
                <X className="h-3.5 w-3.5 mr-1" /> Cancelar
              </Button>
              {step === 2 && (
                <>
                  <Button variant="outline" onClick={reset} disabled={importando}>
                    Subir otro
                  </Button>
                  <Button
                    onClick={importar}
                    disabled={importando || filasValidas.length === 0}
                    className="bg-orange-600 hover:bg-orange-700"
                  >
                    {importando ? <Loader2 className="h-3.5 w-3.5 animate-spin mr-1" /> : <CheckCircle2 className="h-3.5 w-3.5 mr-1" />}
                    Importar {filasValidas.length} item(s)
                  </Button>
                </>
              )}
            </>
          ) : (
            <Button onClick={() => handleClose(false)} className="bg-emerald-600 hover:bg-emerald-700">
              Cerrar
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

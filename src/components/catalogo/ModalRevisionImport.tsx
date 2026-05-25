'use client'

import { useState } from 'react'
import {
  Loader2, FileCheck, Plus, RefreshCw,
  ChevronDown, ChevronRight, Check,
} from 'lucide-react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Switch } from '@/components/ui/switch'
import { cn } from '@/lib/utils'
import type { CatalogoEquipoPayload } from '@/types'

export interface ItemNuevoRevision {
  codigo: string
  descripcion: string
  marca: string
  categoriaNombre: string
  unidadNombre: string
  precioLista: number
  _payload: CatalogoEquipoPayload
}

export interface ItemDuplicadoRevision {
  id: string
  codigo: string
  nuevo: {
    descripcion: string
    marca: string
    categoriaNombre: string
    unidadNombre: string
    precioLista: number
  }
  existente: {
    descripcion: string
    marca: string
    categoriaNombre: string
    unidadNombre: string
    precioLista: number
  }
  _payload: CatalogoEquipoPayload
}

interface Props {
  isOpen: boolean
  onClose: () => void
  nuevos: ItemNuevoRevision[]
  duplicados: ItemDuplicadoRevision[]
  onConfirmar: (mantenerPrecios: boolean) => Promise<void>
  submitting: boolean
}

function DiffCell({ actual, nuevo, muted }: { actual: string; nuevo: string; muted?: boolean }) {
  const changed = actual !== nuevo
  if (!changed) {
    return <span className={cn('text-xs text-muted-foreground truncate block', muted && 'opacity-30')}>{nuevo || '—'}</span>
  }
  return (
    <div className={cn('space-y-0.5', muted && 'opacity-30')}>
      <span className="text-[10px] text-muted-foreground line-through block truncate">{actual || '—'}</span>
      <span className="text-xs font-medium text-amber-700 bg-amber-50 px-1 rounded truncate block">{nuevo || '—'}</span>
    </div>
  )
}

export function ModalRevisionImport({ isOpen, onClose, nuevos, duplicados, onConfirmar, submitting }: Props) {
  const [mantenerPrecios, setMantenerPrecios] = useState(true)
  const [showNuevos, setShowNuevos] = useState(duplicados.length === 0)
  const [showExistentes, setShowExistentes] = useState(true)

  const total = nuevos.length + duplicados.length

  return (
    <Dialog open={isOpen} onOpenChange={(v) => !v && !submitting && onClose()}>
      <DialogContent className="max-w-2xl max-h-[88vh] flex flex-col gap-0 p-0 overflow-hidden">
        <DialogHeader className="px-5 py-3.5 border-b shrink-0">
          <DialogTitle className="flex items-center gap-2 text-sm font-semibold">
            <FileCheck className="h-4 w-4 text-blue-600" />
            Revisión de importación
          </DialogTitle>
          <DialogDescription className="sr-only">Revisa los cambios antes de confirmar</DialogDescription>
        </DialogHeader>

        {/* Summary */}
        <div className="px-5 py-2.5 border-b bg-gray-50/60 flex items-center gap-4 shrink-0">
          {nuevos.length > 0 && (
            <div className="flex items-center gap-1.5">
              <div className="h-5 w-5 rounded-full bg-green-100 flex items-center justify-center">
                <Plus className="h-3 w-3 text-green-700" />
              </div>
              <span className="text-xs font-medium text-green-800">{nuevos.length} nuevos</span>
            </div>
          )}
          {duplicados.length > 0 && (
            <div className="flex items-center gap-1.5">
              <div className="h-5 w-5 rounded-full bg-amber-100 flex items-center justify-center">
                <RefreshCw className="h-3 w-3 text-amber-700" />
              </div>
              <span className="text-xs font-medium text-amber-800">{duplicados.length} a actualizar</span>
            </div>
          )}
          <span className="text-xs text-muted-foreground ml-auto">{total} equipos en total</span>
        </div>

        {/* Opción precios — solo si hay duplicados */}
        {duplicados.length > 0 && (
          <div className="px-5 py-3 border-b shrink-0">
            <div className="flex items-center gap-3 p-3 rounded-lg bg-amber-50 border border-amber-200">
              <div className="flex-1 min-w-0">
                <p className="text-xs font-medium text-amber-900">Mantener precios actuales</p>
                <p className="text-[11px] text-amber-700 mt-0.5 leading-relaxed">
                  {mantenerPrecios
                    ? 'Solo se actualizará: descripción, marca, categoría y unidad. Los precios existentes no se tocarán.'
                    : 'Se actualizarán todos los campos incluyendo precios (recalculados desde el Excel).'}
                </p>
              </div>
              <Switch checked={mantenerPrecios} onCheckedChange={setMantenerPrecios} />
            </div>
          </div>
        )}

        {/* Scrollable content */}
        <div className="flex-1 overflow-y-auto px-5 py-3 space-y-4 min-h-0">

          {/* Nuevos */}
          {nuevos.length > 0 && (
            <section>
              <button
                onClick={() => setShowNuevos(!showNuevos)}
                className="flex items-center gap-1.5 text-xs font-semibold text-gray-700 hover:text-gray-900 mb-2"
              >
                {showNuevos ? <ChevronDown className="h-3.5 w-3.5" /> : <ChevronRight className="h-3.5 w-3.5" />}
                Nuevos a crear
                <Badge className="text-[10px] h-4 px-1.5 bg-green-100 text-green-800 hover:bg-green-100 border-0 font-medium">
                  {nuevos.length}
                </Badge>
              </button>
              {showNuevos && (
                <div className="border rounded-lg overflow-hidden">
                  <table className="w-full text-xs">
                    <thead className="bg-gray-50 border-b">
                      <tr>
                        <th className="px-3 py-2 text-left font-medium text-gray-500">Código</th>
                        <th className="px-3 py-2 text-left font-medium text-gray-500">Descripción</th>
                        <th className="px-3 py-2 text-left font-medium text-gray-500">Categoría</th>
                        <th className="px-3 py-2 text-left font-medium text-gray-500">Marca</th>
                        <th className="px-3 py-2 text-right font-medium text-gray-500">P. Lista</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y">
                      {nuevos.map((item) => (
                        <tr key={item.codigo} className="hover:bg-gray-50/80">
                          <td className="px-3 py-2 font-mono text-[11px] text-gray-700">{item.codigo}</td>
                          <td className="px-3 py-2 text-gray-700 max-w-[180px] truncate">{item.descripcion}</td>
                          <td className="px-3 py-2">
                            <Badge variant="secondary" className="text-[9px] h-4 px-1 font-normal">
                              {item.categoriaNombre}
                            </Badge>
                          </td>
                          <td className="px-3 py-2 text-gray-600">{item.marca || '—'}</td>
                          <td className="px-3 py-2 text-right text-gray-700 font-mono">
                            {item.precioLista > 0 ? item.precioLista.toFixed(2) : '—'}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </section>
          )}

          {/* Duplicados */}
          {duplicados.length > 0 && (
            <section>
              <button
                onClick={() => setShowExistentes(!showExistentes)}
                className="flex items-center gap-1.5 text-xs font-semibold text-gray-700 hover:text-gray-900 mb-2"
              >
                {showExistentes ? <ChevronDown className="h-3.5 w-3.5" /> : <ChevronRight className="h-3.5 w-3.5" />}
                Existentes con cambios
                <Badge className="text-[10px] h-4 px-1.5 bg-amber-100 text-amber-800 hover:bg-amber-100 border-0 font-medium">
                  {duplicados.length}
                </Badge>
                {mantenerPrecios && (
                  <span className="text-[10px] text-muted-foreground font-normal ml-1">(precios bloqueados)</span>
                )}
              </button>
              {showExistentes && (
                <div className="border rounded-lg overflow-hidden">
                  <table className="w-full text-xs">
                    <thead className="bg-gray-50 border-b">
                      <tr>
                        <th className="px-3 py-2 text-left font-medium text-gray-500 w-28">Código</th>
                        <th className="px-3 py-2 text-left font-medium text-gray-500">Descripción</th>
                        <th className="px-3 py-2 text-left font-medium text-gray-500 w-28">Categoría</th>
                        <th className="px-3 py-2 text-left font-medium text-gray-500 w-24">Marca</th>
                        <th className={cn(
                          'px-3 py-2 text-right font-medium w-24 transition-colors',
                          mantenerPrecios ? 'text-gray-300' : 'text-gray-500'
                        )}>
                          P. Lista
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y">
                      {duplicados.map((item) => (
                        <tr key={item.id} className="hover:bg-gray-50/80 align-top">
                          <td className="px-3 py-2 font-mono text-[11px] text-gray-700 pt-2.5">{item.codigo}</td>
                          <td className="px-3 py-2 max-w-[180px]">
                            <DiffCell actual={item.existente.descripcion} nuevo={item.nuevo.descripcion} />
                          </td>
                          <td className="px-3 py-2">
                            <DiffCell actual={item.existente.categoriaNombre} nuevo={item.nuevo.categoriaNombre} />
                          </td>
                          <td className="px-3 py-2">
                            <DiffCell actual={item.existente.marca} nuevo={item.nuevo.marca} />
                          </td>
                          <td className="px-3 py-2 text-right">
                            <DiffCell
                              actual={item.existente.precioLista.toFixed(2)}
                              nuevo={item.nuevo.precioLista.toFixed(2)}
                              muted={mantenerPrecios}
                            />
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </section>
          )}
        </div>

        {/* Footer */}
        <div className="px-5 py-3 border-t shrink-0 flex justify-end gap-2 bg-gray-50/40">
          <Button
            variant="outline"
            size="sm"
            className="h-8 text-xs"
            onClick={onClose}
            disabled={submitting}
          >
            Cancelar
          </Button>
          <Button
            size="sm"
            className="h-8 text-xs"
            onClick={() => onConfirmar(mantenerPrecios)}
            disabled={submitting || total === 0}
          >
            {submitting
              ? <><Loader2 className="h-3.5 w-3.5 animate-spin mr-1.5" />Procesando...</>
              : <><Check className="h-3.5 w-3.5 mr-1.5" />Confirmar importación</>
            }
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}

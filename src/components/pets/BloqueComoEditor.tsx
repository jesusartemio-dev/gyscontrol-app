'use client'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import { ChevronUp, ChevronDown, Trash2, Plus } from 'lucide-react'
import type { BloqueComo } from '@/lib/validators/pets'

// ── Shared helper: editable string array ─────────────────────────────────────

function StringArrayEditor({
  items,
  onChange,
  placeholder = 'Elemento...',
  minItems = 1,
}: {
  items: string[]
  onChange: (items: string[]) => void
  placeholder?: string
  minItems?: number
}) {
  return (
    <div className="space-y-1">
      {items.map((item, i) => (
        <div key={i} className="flex gap-1">
          <Input
            value={item}
            onChange={(e) => {
              const next = [...items]
              next[i] = e.target.value
              onChange(next)
            }}
            className="h-7 text-xs"
            placeholder={placeholder}
          />
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="h-7 w-7 text-red-500 hover:text-red-700 flex-shrink-0"
            onClick={() => onChange(items.filter((_, j) => j !== i))}
            disabled={items.length <= minItems}
          >
            <Trash2 className="h-3 w-3" />
          </Button>
        </div>
      ))}
      <Button
        type="button"
        variant="ghost"
        size="sm"
        className="h-6 text-xs gap-1 px-1"
        onClick={() => onChange([...items, ''])}
      >
        <Plus className="h-3 w-3" /> Agregar
      </Button>
    </div>
  )
}

// ── Type-specific editors ─────────────────────────────────────────────────────

function ParrafoEditor({
  bloque,
  onChange,
}: {
  bloque: Extract<BloqueComo, { tipo: 'parrafo' }>
  onChange: (b: BloqueComo) => void
}) {
  return (
    <Textarea
      value={bloque.texto}
      onChange={(e) => onChange({ ...bloque, texto: e.target.value })}
      className="text-xs min-h-[60px] resize-y"
      placeholder="Texto del párrafo..."
    />
  )
}

function ListaEditor({
  bloque,
  onChange,
}: {
  bloque: Extract<BloqueComo, { tipo: 'lista' }>
  onChange: (b: BloqueComo) => void
}) {
  return (
    <div className="space-y-1.5">
      <Input
        value={bloque.titulo ?? ''}
        onChange={(e) => onChange({ ...bloque, titulo: e.target.value || undefined })}
        className="h-7 text-xs"
        placeholder="Título (opcional)"
      />
      <StringArrayEditor
        items={bloque.items}
        onChange={(items) => onChange({ ...bloque, items })}
        placeholder="Item de lista..."
        minItems={1}
      />
    </div>
  )
}

function SubseccionEditor({
  bloque,
  onChange,
}: {
  bloque: Extract<BloqueComo, { tipo: 'subseccion' }>
  onChange: (b: BloqueComo) => void
}) {
  return (
    <div className="space-y-1.5">
      <Input
        value={bloque.titulo}
        onChange={(e) => onChange({ ...bloque, titulo: e.target.value })}
        className="h-7 text-xs font-semibold"
        placeholder="Título de subsección..."
      />
      <div className="pl-2 border-l-2 border-blue-200">
        <BloqueComoEditor
          bloques={bloque.bloques}
          onChange={(bloques) => onChange({ ...bloque, bloques })}
        />
      </div>
    </div>
  )
}

function TablaEditor({
  bloque,
  onChange,
}: {
  bloque: Extract<BloqueComo, { tipo: 'tabla' }>
  onChange: (b: BloqueComo) => void
}) {
  const updateHeader = (colIdx: number, value: string) => {
    const newHeaders = bloque.headers.map((h, i) => (i === colIdx ? value : h))
    onChange({ ...bloque, headers: newHeaders })
  }
  const updateCell = (rowIdx: number, colIdx: number, value: string) => {
    const newFilas = bloque.filas.map((fila, i) =>
      i === rowIdx ? fila.map((c, j) => (j === colIdx ? value : c)) : fila
    )
    onChange({ ...bloque, filas: newFilas })
  }
  const addFila = () => {
    onChange({ ...bloque, filas: [...bloque.filas, bloque.headers.map(() => '')] })
  }
  const removeFila = (idx: number) => {
    onChange({ ...bloque, filas: bloque.filas.filter((_, i) => i !== idx) })
  }

  return (
    <div className="space-y-1.5">
      <Input
        value={bloque.titulo ?? ''}
        onChange={(e) => onChange({ ...bloque, titulo: e.target.value || undefined })}
        className="h-7 text-xs"
        placeholder="Título de tabla (opcional)"
      />
      <div className="overflow-x-auto">
        <table className="w-full text-xs border-collapse">
          <thead>
            <tr className="bg-gray-50">
              {bloque.headers.map((h, j) => (
                <th key={j} className="border border-gray-200 p-0.5">
                  <Input
                    value={h}
                    onChange={(e) => updateHeader(j, e.target.value)}
                    className="h-6 text-xs font-semibold"
                    placeholder={`Col ${j + 1}`}
                  />
                </th>
              ))}
              <th className="w-6 border border-gray-200" />
            </tr>
          </thead>
          <tbody>
            {bloque.filas.map((fila, i) => (
              <tr key={i}>
                {fila.map((cel, j) => (
                  <td key={j} className="border border-gray-200 p-0.5">
                    <Input
                      value={cel}
                      onChange={(e) => updateCell(i, j, e.target.value)}
                      className="h-6 text-xs"
                    />
                  </td>
                ))}
                <td className="border border-gray-200 text-center">
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="h-6 w-6 text-red-500"
                    onClick={() => removeFila(i)}
                  >
                    <Trash2 className="h-3 w-3" />
                  </Button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <Button
        type="button"
        variant="ghost"
        size="sm"
        className="h-6 text-xs gap-1 px-1"
        onClick={addFila}
      >
        <Plus className="h-3 w-3" /> Agregar fila
      </Button>
    </div>
  )
}

function IlustracionEditor({
  bloque,
  onChange,
}: {
  bloque: Extract<BloqueComo, { tipo: 'ilustracion' }>
  onChange: (b: BloqueComo) => void
}) {
  return (
    <div className="flex gap-1.5">
      <Input
        type="number"
        value={bloque.numero}
        onChange={(e) => onChange({ ...bloque, numero: Number(e.target.value) })}
        className="h-7 text-xs w-20"
        placeholder="Nº"
        min={1}
      />
      <Input
        value={bloque.titulo}
        onChange={(e) => onChange({ ...bloque, titulo: e.target.value })}
        className="h-7 text-xs flex-1"
        placeholder="Título de ilustración..."
      />
    </div>
  )
}

function ReferenciaEditor({
  bloque,
  onChange,
}: {
  bloque: Extract<BloqueComo, { tipo: 'referencia' }>
  onChange: (b: BloqueComo) => void
}) {
  return (
    <div className="space-y-1">
      <Input
        value={bloque.documento}
        onChange={(e) => onChange({ ...bloque, documento: e.target.value })}
        className="h-7 text-xs"
        placeholder="Nombre del documento..."
      />
      <Input
        value={bloque.codigo}
        onChange={(e) => onChange({ ...bloque, codigo: e.target.value })}
        className="h-7 text-xs font-mono"
        placeholder="Código (ej: XX-YY-ZZZ)"
      />
      <Input
        value={bloque.nota ?? ''}
        onChange={(e) => onChange({ ...bloque, nota: e.target.value || undefined })}
        className="h-7 text-xs"
        placeholder="Nota (opcional)"
      />
    </div>
  )
}

function RestriccionEditor({
  bloque,
  onChange,
}: {
  bloque: Extract<BloqueComo, { tipo: 'restriccion' }>
  onChange: (b: BloqueComo) => void
}) {
  return (
    <div className="space-y-1.5">
      <Input
        value={bloque.titulo ?? ''}
        onChange={(e) => onChange({ ...bloque, titulo: e.target.value || undefined })}
        className="h-7 text-xs"
        placeholder="Título (opcional)"
      />
      <StringArrayEditor
        items={bloque.prohibiciones}
        onChange={(prohibiciones) => onChange({ ...bloque, prohibiciones })}
        placeholder="PROHIBIDO / NO SE PERMITE..."
        minItems={1}
      />
    </div>
  )
}

// ── Defaults for new blocks ───────────────────────────────────────────────────

const BLOQUE_DEFAULTS: Record<BloqueComo['tipo'], () => BloqueComo> = {
  parrafo: () => ({ tipo: 'parrafo', texto: '' }),
  lista: () => ({ tipo: 'lista', items: [''] }),
  subseccion: () => ({
    tipo: 'subseccion',
    titulo: '',
    bloques: [{ tipo: 'parrafo', texto: '' }],
  }),
  tabla: () => ({
    tipo: 'tabla',
    headers: ['Columna 1', 'Columna 2'],
    filas: [['', '']],
  }),
  ilustracion: () => ({ tipo: 'ilustracion', numero: 1, titulo: '' }),
  referencia: () => ({ tipo: 'referencia', documento: '', codigo: '' }),
  restriccion: () => ({ tipo: 'restriccion', prohibiciones: [''] }),
}

const TIPO_LABELS: Record<BloqueComo['tipo'], string> = {
  parrafo: 'Párrafo',
  lista: 'Lista',
  subseccion: 'Subsección',
  tabla: 'Tabla',
  ilustracion: 'Ilustración',
  referencia: 'Referencia',
  restriccion: 'Restricción',
}

// ── Main exported component ───────────────────────────────────────────────────

interface Props {
  bloques: BloqueComo[]
  onChange: (bloques: BloqueComo[]) => void
}

export function BloqueComoEditor({ bloques, onChange }: Props) {
  const update = (i: number, b: BloqueComo) => {
    const next = [...bloques]
    next[i] = b
    onChange(next)
  }

  const remove = (i: number) => onChange(bloques.filter((_, j) => j !== i))

  const moveUp = (i: number) => {
    if (i === 0) return
    const next = [...bloques]
    ;[next[i - 1], next[i]] = [next[i], next[i - 1]]
    onChange(next)
  }

  const moveDown = (i: number) => {
    if (i === bloques.length - 1) return
    const next = [...bloques]
    ;[next[i], next[i + 1]] = [next[i + 1], next[i]]
    onChange(next)
  }

  return (
    <div className="space-y-1.5">
      {bloques.map((bloque, i) => (
        <div key={i} className="rounded border border-gray-200 bg-white p-2 space-y-1.5">
          <div className="flex items-center justify-between">
            <Badge variant="outline" className="text-xs h-4 px-1.5">
              {TIPO_LABELS[bloque.tipo]}
            </Badge>
            <div className="flex gap-0.5">
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="h-5 w-5"
                onClick={() => moveUp(i)}
                disabled={i === 0}
              >
                <ChevronUp className="h-3 w-3" />
              </Button>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="h-5 w-5"
                onClick={() => moveDown(i)}
                disabled={i === bloques.length - 1}
              >
                <ChevronDown className="h-3 w-3" />
              </Button>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="h-5 w-5 text-red-500 hover:text-red-700"
                onClick={() => remove(i)}
                disabled={bloques.length <= 1}
              >
                <Trash2 className="h-3 w-3" />
              </Button>
            </div>
          </div>

          {bloque.tipo === 'parrafo' && (
            <ParrafoEditor bloque={bloque} onChange={(b) => update(i, b)} />
          )}
          {bloque.tipo === 'lista' && (
            <ListaEditor bloque={bloque} onChange={(b) => update(i, b)} />
          )}
          {bloque.tipo === 'subseccion' && (
            <SubseccionEditor bloque={bloque} onChange={(b) => update(i, b)} />
          )}
          {bloque.tipo === 'tabla' && (
            <TablaEditor bloque={bloque} onChange={(b) => update(i, b)} />
          )}
          {bloque.tipo === 'ilustracion' && (
            <IlustracionEditor bloque={bloque} onChange={(b) => update(i, b)} />
          )}
          {bloque.tipo === 'referencia' && (
            <ReferenciaEditor bloque={bloque} onChange={(b) => update(i, b)} />
          )}
          {bloque.tipo === 'restriccion' && (
            <RestriccionEditor bloque={bloque} onChange={(b) => update(i, b)} />
          )}
        </div>
      ))}

      <div className="flex flex-wrap gap-1 pt-0.5 border-t border-dashed border-gray-200">
        <span className="text-xs text-gray-400 self-center mr-1">+ Agregar:</span>
        {(Object.keys(TIPO_LABELS) as BloqueComo['tipo'][]).map((tipo) => (
          <Button
            key={tipo}
            type="button"
            variant="outline"
            size="sm"
            className="h-6 text-xs py-0 px-2"
            onClick={() => onChange([...bloques, BLOQUE_DEFAULTS[tipo]()])}
          >
            {TIPO_LABELS[tipo]}
          </Button>
        ))}
      </div>
    </div>
  )
}

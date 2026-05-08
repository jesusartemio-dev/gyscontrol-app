'use client'

import { useMemo, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Checkbox } from '@/components/ui/checkbox'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Plus, Trash2, AlertCircle } from 'lucide-react'
import { toast } from 'sonner'

export interface ColumnaTabla<T> {
  key: keyof T
  label: string
  type: 'text' | 'number' | 'select' | 'multiselect' | 'boolean'
  options?: Array<{ value: string; label: string }>
  required?: boolean
  width?: string
  placeholder?: string
}

interface Props<T extends object> {
  data: T[]
  columns: ColumnaTabla<T>[]
  filaVacia: () => T
  onSave: (data: T[]) => Promise<void>
  onCancel: () => void
}

export function TdrEditableTable<T extends object>({
  data,
  columns,
  filaVacia,
  onSave,
  onCancel,
}: Props<T>) {
  const [filas, setFilas] = useState<T[]>(data)
  const [guardando, setGuardando] = useState(false)

  const errores = useMemo(() => {
    const errs: Record<number, Set<string>> = {}
    filas.forEach((fila, idx) => {
      const erroresFila = new Set<string>()
      columns.forEach(col => {
        if (col.required) {
          const valor = fila[col.key]
          const vacio =
            valor == null ||
            valor === '' ||
            (Array.isArray(valor) && valor.length === 0)
          if (vacio) erroresFila.add(String(col.key))
        }
      })
      if (erroresFila.size > 0) errs[idx] = erroresFila
    })
    return errs
  }, [filas, columns])

  const tieneErrores = Object.keys(errores).length > 0

  const actualizarCelda = (idxFila: number, key: keyof T, valor: unknown) => {
    setFilas(prev =>
      prev.map((f, i) => (i === idxFila ? { ...f, [key]: valor } : f)),
    )
  }

  const agregarFila = () => setFilas(prev => [...prev, filaVacia()])

  const eliminarFila = (idx: number) =>
    setFilas(prev => prev.filter((_, i) => i !== idx))

  const handleGuardar = async () => {
    if (tieneErrores) {
      toast.error('Hay campos requeridos sin completar')
      return
    }
    setGuardando(true)
    try {
      await onSave(filas)
      toast.success('Cambios guardados')
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Error al guardar')
    } finally {
      setGuardando(false)
    }
  }

  return (
    <div className="space-y-3">
      <div className="overflow-x-auto rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              {columns.map(col => (
                <TableHead key={String(col.key)} style={{ width: col.width }}>
                  {col.label}
                  {col.required && <span className="ml-1 text-red-500">*</span>}
                </TableHead>
              ))}
              <TableHead className="w-12" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {filas.length === 0 && (
              <TableRow>
                <TableCell
                  colSpan={columns.length + 1}
                  className="py-6 text-center text-sm text-muted-foreground"
                >
                  Sin filas. Click en &quot;Agregar fila&quot; para empezar.
                </TableCell>
              </TableRow>
            )}
            {filas.map((fila, idxFila) => (
              <TableRow key={idxFila}>
                {columns.map(col => {
                  const valor = fila[col.key]
                  const tieneError = errores[idxFila]?.has(String(col.key))
                  const errorClass = tieneError ? 'border-red-500 focus:ring-red-500' : ''

                  return (
                    <TableCell key={String(col.key)}>
                      {col.type === 'text' && (
                        <Input
                          className={errorClass}
                          value={(valor as string) ?? ''}
                          placeholder={col.placeholder}
                          onChange={e =>
                            actualizarCelda(idxFila, col.key, e.target.value)
                          }
                        />
                      )}
                      {col.type === 'number' && (
                        <Input
                          type="number"
                          className={errorClass}
                          value={(valor as number | undefined) ?? ''}
                          placeholder={col.placeholder}
                          onChange={e =>
                            actualizarCelda(
                              idxFila,
                              col.key,
                              e.target.value === '' ? undefined : Number(e.target.value),
                            )
                          }
                        />
                      )}
                      {col.type === 'select' && (
                        <Select
                          value={(valor as string) ?? ''}
                          onValueChange={v => actualizarCelda(idxFila, col.key, v)}
                        >
                          <SelectTrigger className={errorClass}>
                            <SelectValue placeholder={col.placeholder} />
                          </SelectTrigger>
                          <SelectContent>
                            {col.options?.map(o => (
                              <SelectItem key={o.value} value={o.value}>
                                {o.label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      )}
                      {col.type === 'multiselect' && (
                        <Input
                          className={errorClass}
                          value={
                            Array.isArray(valor)
                              ? (valor as string[]).join(', ')
                              : ''
                          }
                          placeholder={col.placeholder ?? 'Separar con comas'}
                          onChange={e =>
                            actualizarCelda(
                              idxFila,
                              col.key,
                              e.target.value
                                .split(',')
                                .map(s => s.trim())
                                .filter(Boolean),
                            )
                          }
                        />
                      )}
                      {col.type === 'boolean' && (
                        <Checkbox
                          checked={Boolean(valor)}
                          onCheckedChange={v =>
                            actualizarCelda(idxFila, col.key, Boolean(v))
                          }
                        />
                      )}
                    </TableCell>
                  )
                })}
                <TableCell>
                  <Button
                    size="icon"
                    variant="ghost"
                    onClick={() => eliminarFila(idxFila)}
                  >
                    <Trash2 className="h-4 w-4 text-muted-foreground" />
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      <div className="flex items-center justify-between">
        <Button type="button" variant="outline" size="sm" onClick={agregarFila}>
          <Plus className="mr-1 h-4 w-4" />
          Agregar fila
        </Button>

        <div className="flex items-center gap-2">
          {tieneErrores && (
            <span className="flex items-center gap-1 text-xs text-red-600">
              <AlertCircle className="h-3 w-3" />
              Hay campos requeridos sin completar
            </span>
          )}
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={onCancel}
            disabled={guardando}
          >
            Cancelar
          </Button>
          <Button
            type="button"
            size="sm"
            onClick={handleGuardar}
            disabled={guardando || tieneErrores}
          >
            {guardando ? 'Guardando…' : 'Guardar cambios'}
          </Button>
        </div>
      </div>
    </div>
  )
}

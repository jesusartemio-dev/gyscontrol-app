'use client'

// ===================================================
// 📁 Archivo: CatalogoServicioAcordeon.tsx
// 📌 Acordeón compacto con logs para depuración
// ===================================================

import { useState } from 'react'
import { CatalogoServicio, CatalogoServicioUpdatePayload } from '@/types'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '@/components/ui/select'
import { ChevronDown, ChevronUp } from 'lucide-react'

interface Props {
  servicio: CatalogoServicio
  categorias: any[]
  unidades: any[]
  recursos: any[]
  onUpdate: (id: string, payload: CatalogoServicioUpdatePayload) => void
  onDelete: (id: string) => void
}

export default function CatalogoServicioAcordeon({ servicio, categorias, unidades, recursos, onUpdate, onDelete }: Props) {
  const [expandido, setExpandido] = useState(false)
  const [valores, setValores] = useState<Partial<CatalogoServicioUpdatePayload>>({})

  const handleChange = (campo: keyof CatalogoServicioUpdatePayload, valor: any) => {
    setValores(prev => ({
      ...prev,
      [campo]: valor,
    }))
  }

  const guardarCambios = () => {
    console.log('💾 Guardando cambios para servicio:', servicio.id)
    const payload: CatalogoServicioUpdatePayload = {
      nombre: valores.nombre ?? servicio.nombre,
      descripcion: valores.descripcion ?? servicio.descripcion,
      formula: valores.formula ?? servicio.formula,
      horaBase: valores.horaBase ?? servicio.horaBase ?? 0,
      horaRepetido: valores.horaRepetido ?? servicio.horaRepetido ?? 0,
      horaUnidad: valores.horaUnidad ?? servicio.horaUnidad ?? 0,
      horaFijo: valores.horaFijo ?? servicio.horaFijo ?? 0,
      categoriaId: valores.categoriaId ?? servicio.categoriaId,
      unidadServicioId: valores.unidadServicioId ?? servicio.unidadServicioId,
      recursoId: valores.recursoId ?? servicio.recursoId,
    }

    onUpdate(servicio.id, payload)
    setExpandido(false)
    setValores({})
  }

  const cancelarEdicion = () => {
    console.log('❌ Cancelando edición del servicio:', servicio.id)
    setExpandido(false)
    setValores({})
  }

  const resumenFormula: Record<string, string> = {
    'Proporcional': 'Horas x Unidad',
    'Escalonada': 'Base + Repetidos',
    'Fijo': 'Horas Fijas',
  }

  return (
    <div className="bg-white rounded-lg shadow-md p-4 border border-gray-200">
      {/* Cabecera del acordeón */}
      <div
        className="flex justify-between items-start cursor-pointer gap-2 flex-wrap"
        onClick={() => {
          setExpandido(!expandido)
          console.log(`📂 Acordeón ${expandido ? 'colapsado' : 'expandido'} para servicio:`, servicio.id)
        }}
      >
        <div className="space-y-1 flex-1">
          <h3 className="font-bold text-lg">{servicio.nombre}</h3>
          <div className="flex flex-wrap text-sm text-gray-600 gap-x-4 gap-y-1">
            <span>{resumenFormula[servicio.formula]}</span>
            <span>{servicio.categoria?.nombre}</span>
            <span>{servicio.unidadServicio?.nombre}</span>
            <span>Hora Base: {servicio.horaBase ?? 0}</span>
            <span>Hora Repetido: {servicio.horaRepetido ?? 0}</span>
            <span>Hora Unidad: {servicio.horaUnidad ?? 0}</span>
          </div>
        </div>
        <Button variant="outline" size="icon" className="rounded-full">
          {expandido ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
        </Button>
      </div>

      {expandido && (
        <div className="mt-6 space-y-6">
          {/* Horas */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {['horaBase', 'horaRepetido', 'horaUnidad', 'horaFijo'].map((campo) => (
              <div key={campo} className="flex flex-col">
                <label className="text-sm text-gray-700">{campo}</label>
                <Input
                  type="number"
                  value={(valores[campo as keyof CatalogoServicioUpdatePayload] ?? servicio[campo as keyof CatalogoServicio]) as number | undefined}
                  onChange={(e) => handleChange(campo as keyof CatalogoServicioUpdatePayload, parseFloat(e.target.value))}
                />
              </div>
            ))}
          </div>

          {/* Descripción */}
          <div className="flex flex-col">
            <label className="text-sm text-gray-700">Descripción</label>
            <textarea
              className="border rounded px-2 py-1 min-h-[60px]"
              value={(valores.descripcion ?? servicio.descripcion) as string}
              onChange={(e) => handleChange('descripcion', e.target.value)}
            />
          </div>

          {/* Selects */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[{
              campo: 'formula', label: 'Fórmula', lista: ['Proporcional', 'Escalonada', 'Fijo']
            }, {
              campo: 'categoriaId', label: 'Categoría', lista: categorias
            }, {
              campo: 'unidadServicioId', label: 'Unidad', lista: unidades
            }, {
              campo: 'recursoId', label: 'Recurso', lista: recursos
            }].map(({ campo, label, lista }) => (
              <div key={campo} className="flex flex-col">
                <label className="text-sm text-gray-700">{label}</label>
                <Select
                  value={(valores[campo as keyof CatalogoServicioUpdatePayload] ?? servicio[campo as keyof CatalogoServicio]) as string}
                  onValueChange={(val) => handleChange(campo as keyof CatalogoServicioUpdatePayload, val)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder={label} />
                  </SelectTrigger>
                  <SelectContent>
                    {(campo === 'formula'
                      ? lista
                      : (lista as any[])).map((item: any) => (
                        <SelectItem
                          key={typeof item === 'string' ? item : item.id}
                          value={typeof item === 'string' ? item : item.id}
                        >
                          {typeof item === 'string'
                            ? `${item} (${resumenFormula[item]})`
                            : item.nombre}
                        </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            ))}
          </div>

          {/* Botones */}
          <div className="flex gap-2 justify-end">
            <Button size="sm" onClick={guardarCambios}>Guardar</Button>
            <Button
              size="sm"
              variant="destructive"
              onClick={() => {
                console.log('🗑️ Eliminar clicado para ID:', servicio.id)
                onDelete(servicio.id)
              }}
            >
              Eliminar
            </Button>
            <Button size="sm" variant="outline" onClick={cancelarEdicion}>Cancelar</Button>
          </div>
        </div>
      )}
    </div>
  )
}

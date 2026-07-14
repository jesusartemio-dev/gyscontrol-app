'use client'

import { Camera } from 'lucide-react'
import { Popover, PopoverTrigger, PopoverContent } from '@/components/ui/popover'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'

interface Props {
  value: string
  /** Editor: muestra el texto en un Input editable y siempre renderiza el ícono (incluso sin texto, para poder agregar uno). Vista: solo lectura, oculto si no hay texto. */
  editable?: boolean
  /** Tinte del ícono — por defecto `Boolean(value)`. Pasar `false` cuando la tarea/subItem ya tiene fotos propias, para no reclamar atención sobre una sugerencia que ya se cumplió. */
  activo?: boolean
  onChange?: (value: string) => void
  /** Solo en el editor — dispara el selector de archivo de la galería de esta tarea/subItem/EDT. */
  onSubir?: () => void
  /** Solo en el editor — abre el picker "Desde biblioteca" de esta tarea/subItem/EDT. */
  onElegirBiblioteca?: () => void
}

/**
 * Reemplaza el banner ámbar a ancho completo (uno por tarea saturaba la
 * pantalla con 9+ tareas sin foto) por un ícono discreto al final de la
 * viñeta. Click revela el texto en un popover — y, en el editor, permite
 * editar la sugerencia y subir/elegir de biblioteca sin salir de ahí,
 * reutilizando los mismos controles de la galería de esa tarea/subItem/EDT.
 */
export function HintFotoSugerida({ value, editable = false, activo, onChange, onSubir, onElegirBiblioteca }: Props) {
  if (!editable && !value) return null
  const esActivo = activo ?? Boolean(value)

  return (
    <Popover>
      <PopoverTrigger asChild>
        <button
          type="button"
          title="Foto sugerida"
          className={`inline-flex align-middle ml-1 ${esActivo ? 'text-amber-600 hover:text-amber-700' : 'text-gray-300 hover:text-gray-400'}`}
        >
          <Camera size={12} />
        </button>
      </PopoverTrigger>
      <PopoverContent className="w-72 text-xs space-y-2 p-3" align="start">
        {editable ? (
          <div className="space-y-1">
            <p className="font-medium text-amber-700">Foto sugerida</p>
            <Input
              value={value}
              onChange={e => onChange?.(e.target.value)}
              placeholder="¿Qué foto documentaría esto? (opcional, no se exporta al docx)"
              className="h-7 text-xs"
            />
          </div>
        ) : (
          <p className="text-gray-700 leading-relaxed">
            <span className="font-medium text-amber-700">Foto sugerida: </span>
            {value}
          </p>
        )}
        {(onSubir || onElegirBiblioteca) && (
          <div className="flex gap-1.5 pt-1.5 border-t">
            {onSubir && (
              <Button type="button" variant="outline" size="sm" className="h-6 text-[10px]" onClick={onSubir}>
                Subir foto
              </Button>
            )}
            {onElegirBiblioteca && (
              <Button type="button" variant="outline" size="sm" className="h-6 text-[10px]" onClick={onElegirBiblioteca}>
                Desde biblioteca
              </Button>
            )}
          </div>
        )}
      </PopoverContent>
    </Popover>
  )
}

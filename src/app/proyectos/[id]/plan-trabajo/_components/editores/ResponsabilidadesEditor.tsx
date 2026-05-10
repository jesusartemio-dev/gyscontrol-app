'use client'

import { useState } from 'react'
import { toast } from 'sonner'
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetFooter } from '@/components/ui/sheet'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { X, Plus } from 'lucide-react'
import type { PlanResponsabilidades } from '@/types/planTrabajo'

interface Props {
  valor: PlanResponsabilidades
  onSave: (nuevo: PlanResponsabilidades) => Promise<void>
  onCancel: () => void
}

const ROLES: { key: keyof PlanResponsabilidades; label: string }[] = [
  { key: 'gerenteGeneral', label: 'Gerente General' },
  { key: 'supervisor', label: 'Supervisor' },
  { key: 'operario', label: 'Operario / Oficial / Técnico' },
  { key: 'supervisorSeguridad', label: 'Supervisor de Seguridad' },
]

export function ResponsabilidadesEditor({ valor, onSave, onCancel }: Props) {
  const [datos, setDatos] = useState<PlanResponsabilidades>(valor)
  const [guardando, setGuardando] = useState(false)

  const agregarResponsabilidad = (rol: keyof PlanResponsabilidades) => {
    setDatos({ ...datos, [rol]: [...datos[rol], ''] })
  }

  const eliminarResponsabilidad = (rol: keyof PlanResponsabilidades, idx: number) => {
    setDatos({ ...datos, [rol]: datos[rol].filter((_, i) => i !== idx) })
  }

  const actualizarResponsabilidad = (
    rol: keyof PlanResponsabilidades,
    idx: number,
    nuevoTexto: string
  ) => {
    setDatos({ ...datos, [rol]: datos[rol].map((t, i) => (i === idx ? nuevoTexto : t)) })
  }

  const handleSave = async () => {
    setGuardando(true)
    try {
      const limpio: PlanResponsabilidades = {
        gerenteGeneral: datos.gerenteGeneral.filter(t => t.trim()),
        supervisor: datos.supervisor.filter(t => t.trim()),
        operario: datos.operario.filter(t => t.trim()),
        supervisorSeguridad: datos.supervisorSeguridad.filter(t => t.trim()),
      }
      await onSave(limpio)
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Error al guardar')
    } finally {
      setGuardando(false)
    }
  }

  return (
    <Sheet open onOpenChange={(open) => !open && onCancel()}>
      <SheetContent side="right" className="w-full sm:max-w-3xl overflow-y-auto">
        <SheetHeader>
          <SheetTitle>Editar Responsabilidades</SheetTitle>
        </SheetHeader>

        <div className="space-y-6 mt-4">
          {ROLES.map(rol => (
            <div key={rol.key} className="border rounded-lg p-3">
              <div className="flex items-center justify-between mb-2">
                <h4 className="font-semibold text-sm">{rol.label}</h4>
                <Button size="sm" variant="outline" onClick={() => agregarResponsabilidad(rol.key)}>
                  <Plus className="h-3 w-3 mr-1" />
                  Agregar
                </Button>
              </div>

              <div className="space-y-2">
                {datos[rol.key].length === 0 && (
                  <p className="text-xs text-muted-foreground italic">
                    Sin responsabilidades. Click en &quot;Agregar&quot; para empezar.
                  </p>
                )}
                {datos[rol.key].map((texto, idx) => (
                  <div key={idx} className="flex items-center gap-2">
                    <span className="text-xs text-muted-foreground">•</span>
                    <Input
                      value={texto}
                      onChange={e => actualizarResponsabilidad(rol.key, idx, e.target.value)}
                      placeholder="Describe la responsabilidad..."
                      className="flex-1"
                    />
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => eliminarResponsabilidad(rol.key, idx)}
                    >
                      <X className="h-3 w-3" />
                    </Button>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>

        <SheetFooter className="mt-6">
          <Button variant="outline" onClick={onCancel} disabled={guardando}>
            Cancelar
          </Button>
          <Button onClick={handleSave} disabled={guardando}>
            {guardando ? 'Guardando...' : 'Guardar'}
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  )
}

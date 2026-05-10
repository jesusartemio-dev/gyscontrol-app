'use client'

import type { PlanHerramientasYEquipos, PlanItemRecurso } from '@/types/planTrabajo'
import { TdrEditableTable, type ColumnaTabla } from '@/components/tdr/TdrEditableTable'
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'

interface Props {
  valor: PlanHerramientasYEquipos
  onSave: (v: PlanHerramientasYEquipos) => Promise<void>
  onCancel: () => void
}

const COLUMNS: ColumnaTabla<PlanItemRecurso>[] = [
  { key: 'nombre', label: 'Nombre', type: 'text', required: true },
  { key: 'cantidad', label: 'Cantidad', type: 'number', width: '90px' },
  { key: 'unidad', label: 'Unidad', type: 'text', width: '90px', placeholder: 'Ej: und, m, kg' },
  { key: 'observaciones', label: 'Observaciones', type: 'text' },
]

const filaVacia = (): PlanItemRecurso => ({ nombre: '', observaciones: '' })

export function HerramientasEditor({ valor, onSave, onCancel }: Props) {
  return (
    <Sheet open onOpenChange={(open) => !open && onCancel()}>
      <SheetContent side="right" className="sm:max-w-3xl overflow-y-auto">
        <SheetHeader>
          <SheetTitle>Editar Herramientas y Equipos</SheetTitle>
        </SheetHeader>
        <Tabs defaultValue="equipos" className="mt-4">
          <TabsList>
            <TabsTrigger value="equipos">Equipos</TabsTrigger>
            <TabsTrigger value="herramientas">Herramientas</TabsTrigger>
            <TabsTrigger value="materiales">Materiales</TabsTrigger>
          </TabsList>

          <TabsContent value="equipos" className="mt-4">
            <TdrEditableTable
              data={valor.equipos}
              columns={COLUMNS}
              filaVacia={filaVacia}
              onSave={async (rows) => onSave({ ...valor, equipos: rows })}
              onCancel={onCancel}
            />
          </TabsContent>

          <TabsContent value="herramientas" className="mt-4">
            <TdrEditableTable
              data={valor.herramientas}
              columns={COLUMNS}
              filaVacia={filaVacia}
              onSave={async (rows) => onSave({ ...valor, herramientas: rows })}
              onCancel={onCancel}
            />
          </TabsContent>

          <TabsContent value="materiales" className="mt-4">
            <TdrEditableTable
              data={valor.materiales}
              columns={COLUMNS}
              filaVacia={filaVacia}
              onSave={async (rows) => onSave({ ...valor, materiales: rows })}
              onCancel={onCancel}
            />
          </TabsContent>
        </Tabs>
      </SheetContent>
    </Sheet>
  )
}

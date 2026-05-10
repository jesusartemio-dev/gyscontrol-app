'use client'

import type { PlanEPP, PlanEPPItem } from '@/types/planTrabajo'
import { TdrEditableTable, type ColumnaTabla } from '@/components/tdr/TdrEditableTable'
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'

interface Props {
  valor: PlanEPP
  onSave: (v: PlanEPP) => Promise<void>
  onCancel: () => void
}

const COLUMNS: ColumnaTabla<PlanEPPItem>[] = [
  { key: 'nombre', label: 'Nombre', type: 'text', required: true },
  { key: 'norma', label: 'Norma', type: 'text', width: '140px' },
  { key: 'observaciones', label: 'Observaciones', type: 'text' },
]

const filaVacia = (): PlanEPPItem => ({ nombre: '', norma: '', observaciones: '' })

export function EppRequeridosEditor({ valor, onSave, onCancel }: Props) {
  return (
    <Sheet open onOpenChange={(open) => !open && onCancel()}>
      <SheetContent side="right" className="sm:max-w-3xl overflow-y-auto">
        <SheetHeader>
          <SheetTitle>Editar EPP Requeridos</SheetTitle>
        </SheetHeader>
        <Tabs defaultValue="basico" className="mt-4">
          <TabsList>
            <TabsTrigger value="basico">Básico</TabsTrigger>
            <TabsTrigger value="bioseguridad">Bioseguridad</TabsTrigger>
            <TabsTrigger value="riesgoEspecifico">Riesgo Específico</TabsTrigger>
          </TabsList>

          <TabsContent value="basico" className="mt-4">
            <TdrEditableTable
              data={valor.basico}
              columns={COLUMNS}
              filaVacia={filaVacia}
              onSave={async (rows) => onSave({ ...valor, basico: rows })}
              onCancel={onCancel}
            />
          </TabsContent>

          <TabsContent value="bioseguridad" className="mt-4">
            <TdrEditableTable
              data={valor.bioseguridad}
              columns={COLUMNS}
              filaVacia={filaVacia}
              onSave={async (rows) => onSave({ ...valor, bioseguridad: rows })}
              onCancel={onCancel}
            />
          </TabsContent>

          <TabsContent value="riesgoEspecifico" className="mt-4">
            <TdrEditableTable
              data={valor.riesgoEspecifico}
              columns={COLUMNS}
              filaVacia={filaVacia}
              onSave={async (rows) => onSave({ ...valor, riesgoEspecifico: rows })}
              onCancel={onCancel}
            />
          </TabsContent>
        </Tabs>
      </SheetContent>
    </Sheet>
  )
}

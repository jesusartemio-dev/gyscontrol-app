'use client'

import type { PlanAlcanceItem } from '@/types/planTrabajo'
import { TdrEditableTable, type ColumnaTabla } from '@/components/tdr/TdrEditableTable'
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet'

interface Props {
  valor: PlanAlcanceItem[]
  onSave: (v: PlanAlcanceItem[]) => Promise<void>
  onCancel: () => void
}

const COLUMNS: ColumnaTabla<PlanAlcanceItem>[] = [
  { key: 'numero', label: 'N°', type: 'text', width: '60px', placeholder: '1.1' },
  { key: 'nombre', label: 'Nombre', type: 'text', required: true },
  { key: 'descripcion', label: 'Descripción', type: 'text' },
  { key: 'ubicacion', label: 'Ubicación', type: 'text', width: '120px' },
  { key: 'tieneRiesgoAltura', label: 'Altura', type: 'boolean', width: '70px' },
  { key: 'tieneRiesgoCaliente', label: 'T. Cal.', type: 'boolean', width: '70px' },
  { key: 'tieneRiesgoElectrico', label: 'Eléct.', type: 'boolean', width: '70px' },
  { key: 'tieneRiesgoEspacioConfinado', label: 'Esp.Conf.', type: 'boolean', width: '80px' },
]

const filaVacia = (): PlanAlcanceItem => ({
  numero: '',
  nombre: '',
  descripcion: '',
  tieneRiesgoAltura: false,
  tieneRiesgoCaliente: false,
  tieneRiesgoElectrico: false,
  tieneRiesgoEspacioConfinado: false,
})

export function AlcanceDetalladoEditor({ valor, onSave, onCancel }: Props) {
  return (
    <Sheet open onOpenChange={(open) => !open && onCancel()}>
      <SheetContent side="right" className="sm:max-w-5xl overflow-y-auto">
        <SheetHeader>
          <SheetTitle>Editar Alcance Detallado</SheetTitle>
        </SheetHeader>
        <div className="mt-4">
          <TdrEditableTable
            data={valor}
            columns={COLUMNS}
            filaVacia={filaVacia}
            onSave={onSave}
            onCancel={onCancel}
          />
        </div>
      </SheetContent>
    </Sheet>
  )
}

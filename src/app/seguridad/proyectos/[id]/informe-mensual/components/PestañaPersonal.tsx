'use client'

import { TablaExportable } from './TablaExportable'
import type { InformeMensualAgregado } from '@/lib/services/informeMensualSeguridad'
import type { PersonalMes } from '@/lib/validators/informeMensual'

const ROL_LABELS: Record<string, string> = {
  lider_ssoma: 'Líder SSOMA',
  supervisor: 'Supervisor',
  ingeniero: 'Ingeniero',
  tecnico: 'Técnico',
  operario: 'Operario',
  administrativo: 'Administrativo',
}

function formatRol(rol?: string) {
  if (!rol) return '—'
  return ROL_LABELS[rol] ?? rol.replace(/_/g, ' ')
}

const COLUMNS = [
  {
    header: 'Nombre',
    accessor: (p: PersonalMes) => p.usuario.name ?? p.usuario.email,
  },
  {
    header: 'Email',
    accessor: (p: PersonalMes) => p.usuario.email,
  },
  {
    header: 'Rol en proyecto',
    accessor: (p: PersonalMes) => formatRol(p.rol),
  },
  {
    header: 'Horas',
    accessor: (p: PersonalMes) => p.totalHoras.toFixed(1),
  },
  {
    header: 'Jornadas',
    accessor: (p: PersonalMes) => p.jornadasCount,
  },
]

export function PestañaPersonal({ data }: { data: InformeMensualAgregado }) {
  const { personal, kpis, proyecto, periodo } = data
  const filename = `${proyecto.codigo}_personal_${periodo.mes}`

  const totalHoras = personal.reduce((s, p) => s + p.totalHoras, 0)

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-4 text-sm text-muted-foreground">
        <span>
          <strong className="text-foreground">{kpis.personalUnico}</strong> personas únicas
        </span>
        <span>
          <strong className="text-foreground">{totalHoras.toFixed(1)}</strong> HHT total
        </span>
      </div>

      <TablaExportable
        columns={COLUMNS}
        rows={personal}
        filename={filename}
        emptyMessage="No hay personal registrado en jornadas de campo para este mes."
      />
    </div>
  )
}

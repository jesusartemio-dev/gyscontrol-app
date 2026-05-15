import { PrismaClient, TipoCicloSaldo } from '@prisma/client'

const prisma = new PrismaClient()

type TipoAusenciaSeed = {
  codigo: string
  nombre: string
  color: string
  descuentaSaldo: boolean
  diasPorDefecto: number | null
  tipoCicloSaldo: TipoCicloSaldo
  requiereDocumento: boolean
  requiereAprobacion: boolean
  requiereAprobacion2: boolean
  diasUmbralAprobacion2: number | null
  aplicaFinDeSemana: boolean
  orden: number
}

const TIPOS: TipoAusenciaSeed[] = [
  {
    codigo: 'VAC',
    nombre: 'Vacaciones',
    color: '#3B82F6',
    descuentaSaldo: true,
    diasPorDefecto: 15,        // régimen MYPE; RRHH ajusta a 30 para contratos especiales
    tipoCicloSaldo: TipoCicloSaldo.anio_servicio,
    requiereDocumento: false,
    requiereAprobacion: true,
    requiereAprobacion2: false,
    diasUmbralAprobacion2: null,
    aplicaFinDeSemana: false,
    orden: 1,
  },
  {
    codigo: 'PERM_GOCE',
    nombre: 'Permiso con goce',
    color: '#10B981',
    descuentaSaldo: false,
    diasPorDefecto: null,
    tipoCicloSaldo: TipoCicloSaldo.sin_ciclo,
    requiereDocumento: false,
    requiereAprobacion: true,
    requiereAprobacion2: false,
    diasUmbralAprobacion2: null,
    aplicaFinDeSemana: false,
    orden: 2,
  },
  {
    codigo: 'PERM_SIN_GOCE',
    nombre: 'Permiso sin goce',
    color: '#F59E0B',
    descuentaSaldo: false,
    diasPorDefecto: null,
    tipoCicloSaldo: TipoCicloSaldo.sin_ciclo,
    requiereDocumento: false,
    requiereAprobacion: true,
    requiereAprobacion2: false,
    diasUmbralAprobacion2: 3,  // > 3 días hábiles activa aprobación nivel 2
    aplicaFinDeSemana: false,
    orden: 3,
  },
  {
    codigo: 'LIC_MED',
    nombre: 'Licencia médica',
    color: '#EF4444',
    descuentaSaldo: false,
    diasPorDefecto: null,
    tipoCicloSaldo: TipoCicloSaldo.sin_ciclo,
    requiereDocumento: true,
    requiereAprobacion: true,
    requiereAprobacion2: false,
    diasUmbralAprobacion2: 5,  // > 5 días activa aprobación nivel 2
    aplicaFinDeSemana: false,
    orden: 4,
  },
  {
    codigo: 'MAT',
    nombre: 'Maternidad',
    color: '#EC4899',
    descuentaSaldo: false,
    diasPorDefecto: null,
    tipoCicloSaldo: TipoCicloSaldo.sin_ciclo,
    requiereDocumento: true,
    requiereAprobacion: true,
    requiereAprobacion2: true,   // siempre requiere nivel 2 (RRHH confirma duración legal)
    diasUmbralAprobacion2: null,
    aplicaFinDeSemana: true,     // ley 29992: cómputo incluye sábados y domingos
    orden: 5,
  },
  {
    codigo: 'PAT',
    nombre: 'Paternidad',
    color: '#8B5CF6',
    descuentaSaldo: false,
    diasPorDefecto: null,
    tipoCicloSaldo: TipoCicloSaldo.sin_ciclo,
    requiereDocumento: true,
    requiereAprobacion: true,
    requiereAprobacion2: false,
    diasUmbralAprobacion2: null,
    aplicaFinDeSemana: false,
    orden: 6,
  },
  {
    codigo: 'DUE',
    nombre: 'Duelo',
    color: '#6B7280',
    descuentaSaldo: false,
    diasPorDefecto: null,
    tipoCicloSaldo: TipoCicloSaldo.sin_ciclo,
    requiereDocumento: false,
    requiereAprobacion: true,
    requiereAprobacion2: false,
    diasUmbralAprobacion2: null,
    aplicaFinDeSemana: false,
    orden: 7,
  },
  {
    codigo: 'CAP',
    nombre: 'Capacitación externa',
    color: '#F97316',
    descuentaSaldo: false,
    diasPorDefecto: null,
    tipoCicloSaldo: TipoCicloSaldo.sin_ciclo,
    requiereDocumento: false,
    requiereAprobacion: true,
    requiereAprobacion2: false,
    diasUmbralAprobacion2: null,
    aplicaFinDeSemana: false,
    orden: 8,
  },
  {
    codigo: 'COMP_HE',
    nombre: 'Compensación horas extras',
    color: '#06B6D4',
    descuentaSaldo: true,       // consume saldo acreditado manualmente por RRHH desde HE trabajadas
    diasPorDefecto: null,       // saldo no es fijo; RRHH lo acredita vía ajuste_manual
    tipoCicloSaldo: TipoCicloSaldo.sin_ciclo,
    requiereDocumento: false,
    requiereAprobacion: true,
    requiereAprobacion2: false,
    diasUmbralAprobacion2: null,
    aplicaFinDeSemana: false,
    orden: 9,
  },
]

async function main() {
  console.log('🌱 Seeding TipoAusencia...')

  let created = 0
  let skipped = 0

  for (const tipo of TIPOS) {
    const existing = await prisma.tipoAusencia.findUnique({
      where: { codigo: tipo.codigo },
    })

    if (existing) {
      skipped++
      continue
    }

    await prisma.tipoAusencia.create({ data: tipo })
    created++
    console.log(`  ✅ ${tipo.codigo} — ${tipo.nombre}`)
  }

  console.log(`\n✅ TipoAusencia: ${created} creados, ${skipped} ya existían`)
}

main()
  .catch((e) => {
    console.error('❌ Error en seed tipos-ausencia:', e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })

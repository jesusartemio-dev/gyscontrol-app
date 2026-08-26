// ===================================================
// Liquidación de personal tercero (personal eventual, pago por día)
//
// Toma las horas ya APROBADAS de campo de gente con Empleado.tipoPersonal
// = 'tercero' en un rango de fechas, las agrupa por persona+proyecto, y
// calcula lo que corresponde pagar según su tarifa/día — misma conversión
// día↔hora que usa costoHoraSnapshot.ts, para que el "costo devengado" del
// proyecto (por horas) y lo que aquí se liquida (para pagar) coincidan.
//
// Este cálculo es la fuente única para el endpoint de preview y el de
// confirmación: el de confirmación vuelve a correrlo server-side en vez de
// confiar en lo que mandó el cliente, así nunca liquida horas que ya se
// liquidaron entre que el usuario abrió el preview y confirmó.
// ===================================================

import { prisma } from '@/lib/prisma'
import { obtenerParametros } from '@/lib/utils/costoHoraSnapshot'

export interface GrupoPagoTercero {
  usuarioId: string
  nombre: string
  proyectoId: string
  proyectoCodigo: string
  proyectoNombre: string
  horas: number
  dias: number
  tarifaDia: number | null
  monedaTarifa: string
  /** Monto sugerido en PEN (tarifaDia convertida × días). */
  subtotal: number
  /** true si el tercero no tiene tarifaDia cargada — subtotal sale en 0. */
  sinTarifa: boolean
  /** RegistroHoras.id incluidos en este grupo — se marcan liquidados al confirmar. */
  registroIds: string[]
}

export interface CalcularGruposParams {
  fechaDesde: Date
  fechaHasta: Date
  proyectoId?: string
}

export async function calcularGruposPagoTerceros(
  params: CalcularGruposParams,
): Promise<{ grupos: GrupoPagoTercero[]; horasPorDia: number; tipoCambio: number }> {
  const { fechaDesde, fechaHasta, proyectoId } = params

  const registros = await prisma.registroHoras.findMany({
    where: {
      fechaTrabajo: { gte: fechaDesde, lte: fechaHasta },
      aprobado: true,
      liquidadoEnHojaId: null,
      ...(proyectoId ? { proyectoId } : {}),
      user: { empleado: { tipoPersonal: 'tercero' } },
    },
    select: {
      id: true,
      usuarioId: true,
      proyectoId: true,
      horasTrabajadas: true,
      user: {
        select: {
          name: true,
          empleado: { select: { tarifaDia: true, monedaTarifa: true } },
        },
      },
      proyecto: { select: { codigo: true, nombre: true } },
    },
  })

  const { horasDia, tipoCambio } = await obtenerParametros()

  const grupos = new Map<string, GrupoPagoTercero>()
  for (const r of registros) {
    const key = `${r.usuarioId}::${r.proyectoId}`
    const tarifaDia = r.user.empleado?.tarifaDia ?? null
    const monedaTarifa = r.user.empleado?.monedaTarifa ?? 'PEN'

    const existente = grupos.get(key)
    if (existente) {
      existente.horas += r.horasTrabajadas
      existente.registroIds.push(r.id)
      continue
    }

    grupos.set(key, {
      usuarioId: r.usuarioId,
      nombre: r.user.name || 'Sin nombre',
      proyectoId: r.proyectoId,
      proyectoCodigo: r.proyecto.codigo,
      proyectoNombre: r.proyecto.nombre,
      horas: r.horasTrabajadas,
      dias: 0, // se calcula abajo, tras acumular todas las horas del grupo
      tarifaDia,
      monedaTarifa,
      subtotal: 0,
      sinTarifa: !tarifaDia,
      registroIds: [r.id],
    })
  }

  const resultado = Array.from(grupos.values()).map((g) => {
    const dias = horasDia > 0 ? g.horas / horasDia : 0
    const tarifaDiaPEN = g.tarifaDia
      ? (g.monedaTarifa === 'USD' ? g.tarifaDia * tipoCambio : g.tarifaDia)
      : 0
    return {
      ...g,
      dias: Math.round(dias * 100) / 100,
      subtotal: Math.round(dias * tarifaDiaPEN * 100) / 100,
    }
  })

  resultado.sort((a, b) => a.nombre.localeCompare(b.nombre) || a.proyectoCodigo.localeCompare(b.proyectoCodigo))

  return { grupos: resultado, horasPorDia: horasDia, tipoCambio }
}

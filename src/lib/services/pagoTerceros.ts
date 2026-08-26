// ===================================================
// Liquidación de personal tercero (personal eventual, pago por día)
//
// Toma las horas ya APROBADAS de campo de gente con Empleado.tipoPersonal
// = 'tercero' en un rango de fechas, las agrupa por persona+proyecto+DÍA (no
// por todo el periodo junto), y calcula lo que corresponde pagar según su
// tarifa/día — misma conversión día↔hora que usa costoHoraSnapshot.ts, para
// que el "costo devengado" del proyecto (por horas) y lo que aquí se
// liquida (para pagar) coincidan.
//
// Cada día se cruza con el marcaje real (Asistencia, vía JornadaAsistencia)
// de esa jornada de campo: las horas de tarea son lo que alguien tipeó al
// registrar avance, el marcaje es el ingreso/salida por QR. Pueden no
// coincidir — un supervisor puede cargar horas de una jornada sin ingreso
// registrado, por ejemplo — así que se muestran ambas y es la persona quien
// decide si paga ese día o lo revisa antes.
//
// Este cálculo es la fuente única para el endpoint de preview y el de
// confirmación: el de confirmación vuelve a correrlo server-side en vez de
// confiar en lo que mandó el cliente, así nunca liquida horas que ya se
// liquidaron entre que el usuario abrió el preview y confirmó.
// ===================================================

import { prisma } from '@/lib/prisma'
import { obtenerParametros } from '@/lib/utils/costoHoraSnapshot'

export type EstadoAsistenciaDia =
  | 'completo' // tiene ingreso y salida marcados
  | 'sin_ingreso' // tiene salida pero no ingreso
  | 'sin_salida' // tiene ingreso pero no salida (jornada sin cerrar)
  | 'sin_marcaje' // la jornada tiene sesión de asistencia pero ningún marcaje
  | 'sin_sesion' // la jornada de campo no tiene ninguna sesión de asistencia vinculada

export interface LineaPagoTercero {
  usuarioId: string
  nombre: string
  proyectoId: string
  proyectoCodigo: string
  proyectoNombre: string
  /** YYYY-MM-DD — un día de trabajo, no todo el periodo. */
  fecha: string
  horas: number
  dias: number
  tarifaDia: number | null
  monedaTarifa: string
  /** Monto sugerido en PEN (tarifaDia convertida × días). */
  subtotal: number
  /** true si el tercero no tiene tarifaDia cargada — subtotal sale en 0. */
  sinTarifa: boolean
  /** RegistroHoras.id incluidos en este día — se marcan liquidados al confirmar. */
  registroIds: string[]
  // Cruce con el marcaje real de esa jornada (Asistencia vía JornadaAsistencia)
  estadoAsistencia: EstadoAsistenciaDia
  horaIngreso: string | null
  horaSalida: string | null
  /** Horas entre ingreso y salida marcados — para comparar contra `horas` (de tarea). */
  horasMarcadas: number | null
}

export interface CalcularGruposParams {
  fechaDesde: Date
  fechaHasta: Date
  proyectoId?: string
}

function formatHoraLocal(fecha: Date): string {
  return fecha.toLocaleTimeString('es-PE', { hour: '2-digit', minute: '2-digit', hour12: false, timeZone: 'America/Lima' })
}

export async function calcularGruposPagoTerceros(
  params: CalcularGruposParams,
): Promise<{ lineas: LineaPagoTercero[]; horasPorDia: number; tipoCambio: number }> {
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
      fechaTrabajo: true,
      horasTrabajadas: true,
      user: {
        select: {
          name: true,
          empleado: { select: { tarifaDia: true, monedaTarifa: true } },
        },
      },
      proyecto: { select: { codigo: true, nombre: true } },
      // Cadena hasta la jornada de campo y su sesión de asistencia (si la tiene).
      // OJO: una JornadaAsistencia es una sesión de QR GRUPAL — toda la
      // cuadrilla que escanea ese día comparte la misma. Por eso `asistencias`
      // se filtra por usuarioId aquí mismo: si no se filtra, se termina
      // mostrando el ingreso/salida de OTRO integrante de la cuadrilla como
      // si fuera el marcaje de la persona que se está liquidando.
      origenCampoMiembro: {
        select: {
          registroCampoTarea: {
            select: {
              registroCampo: {
                select: {
                  jornadaAsistencia: {
                    select: {
                      id: true,
                      // Trae TODA la cuadrilla de esa sesión — se filtra por
                      // usuarioId más abajo, fila por fila, porque Prisma no
                      // permite correlacionar este `where` con la fila externa.
                      asistencias: { select: { userId: true, tipo: true, fechaHora: true } },
                    },
                  },
                },
              },
            },
          },
        },
      },
    },
  })

  const { horasDia, tipoCambio } = await obtenerParametros()

  // Clave = persona + proyecto + DÍA (no todo el periodo junto).
  const grupos = new Map<
    string,
    Omit<LineaPagoTercero, 'dias' | 'subtotal'> & { tarifaDiaRaw: number | null }
  >()

  for (const r of registros) {
    const fechaKey = r.fechaTrabajo.toISOString().slice(0, 10)
    const key = `${r.usuarioId}::${r.proyectoId}::${fechaKey}`
    const tarifaDia = r.user.empleado?.tarifaDia ?? null
    const monedaTarifa = r.user.empleado?.monedaTarifa ?? 'PEN'

    const existente = grupos.get(key)
    if (existente) {
      existente.horas += r.horasTrabajadas
      existente.registroIds.push(r.id)
      continue
    }

    const jornada = r.origenCampoMiembro?.registroCampoTarea?.registroCampo?.jornadaAsistencia ?? null
    // `jornada.asistencias` trae a TODA la cuadrilla de esa sesión de QR —
    // aquí se queda solo con las marcas de esta persona (r.usuarioId).
    const asistenciasPropias = jornada?.asistencias.filter((a) => a.userId === r.usuarioId) ?? []
    let estadoAsistencia: EstadoAsistenciaDia
    let horaIngreso: string | null = null
    let horaSalida: string | null = null
    let horasMarcadas: number | null = null

    if (!jornada) {
      estadoAsistencia = 'sin_sesion'
    } else if (asistenciasPropias.length === 0) {
      estadoAsistencia = 'sin_marcaje'
    } else {
      const ingresos = asistenciasPropias.filter((a) => a.tipo === 'ingreso').sort((a, b) => a.fechaHora.getTime() - b.fechaHora.getTime())
      const salidas = asistenciasPropias.filter((a) => a.tipo === 'salida').sort((a, b) => b.fechaHora.getTime() - a.fechaHora.getTime())
      const ingreso = ingresos[0] ?? null
      const salida = salidas[0] ?? null
      horaIngreso = ingreso ? formatHoraLocal(ingreso.fechaHora) : null
      horaSalida = salida ? formatHoraLocal(salida.fechaHora) : null
      if (ingreso && salida) {
        estadoAsistencia = 'completo'
        horasMarcadas = Math.round(((salida.fechaHora.getTime() - ingreso.fechaHora.getTime()) / 3_600_000) * 100) / 100
      } else if (salida && !ingreso) {
        estadoAsistencia = 'sin_ingreso'
      } else {
        estadoAsistencia = 'sin_salida'
      }
    }

    grupos.set(key, {
      usuarioId: r.usuarioId,
      nombre: r.user.name || 'Sin nombre',
      proyectoId: r.proyectoId,
      proyectoCodigo: r.proyecto.codigo,
      proyectoNombre: r.proyecto.nombre,
      fecha: fechaKey,
      horas: r.horasTrabajadas,
      tarifaDia,
      tarifaDiaRaw: tarifaDia,
      monedaTarifa,
      sinTarifa: !tarifaDia,
      registroIds: [r.id],
      estadoAsistencia,
      horaIngreso,
      horaSalida,
      horasMarcadas,
    })
  }

  const lineas = Array.from(grupos.values()).map((g) => {
    const dias = horasDia > 0 ? g.horas / horasDia : 0
    const tarifaDiaPEN = g.tarifaDiaRaw
      ? (g.monedaTarifa === 'USD' ? g.tarifaDiaRaw * tipoCambio : g.tarifaDiaRaw)
      : 0
    const { tarifaDiaRaw, ...resto } = g
    return {
      ...resto,
      dias: Math.round(dias * 100) / 100,
      subtotal: Math.round(dias * tarifaDiaPEN * 100) / 100,
    }
  })

  lineas.sort((a, b) => a.nombre.localeCompare(b.nombre) || a.fecha.localeCompare(b.fecha) || a.proyectoCodigo.localeCompare(b.proyectoCodigo))

  return { lineas, horasPorDia: horasDia, tipoCambio }
}

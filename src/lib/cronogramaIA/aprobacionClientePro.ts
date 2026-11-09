/**
 * PRO "Suministro de Equipos": cada familia lleva SIEMPRE los mismos 5 pasos
 * (estándar desde CJM52 — al cliente se le envían las fichas técnicas de todo):
 *
 *   1. {alias} - Cotización y Evaluación Técnica          (5 h, Gestor)
 *   2. {alias} - Aprobación Ficha Técnica por {CLIENTE}   (1 día de espera, sin horas)
 *   3. ◆ {alias} - Emisión de Orden de Compra             (hito)
 *   4. {alias} - Plazo de Entrega del Proveedor           (Gestor)
 *   5. {alias} - Recepción e Inspección en Almacén GYS    (Técnico)
 *
 * La IA reparte los servicios del catálogo entre familias a su criterio; este
 * paso determinista normaliza cada familia a esos 5 pasos (en ese orden) y
 * descarta los servicios viejos que reemplazan (Solicitud de Cotización,
 * Recepción de Cotizaciones, Evaluación Técnica, Aprobación del Cliente,
 * Seguimiento de Compra (Expediting), Recepción en Almacén GYS). Lo demás que
 * tenga la familia (p. ej. el traslado, que luego va a "Seguimiento y Entrega
 * en Obra") queda detrás.
 */
import type { ActividadPropuesta, CatalogoServicioParaWizard, ConfiguracionWizardPaso1, TareaPropuesta } from '@/types/cronogramaIA'
import { construirTareaPropuesta, type ConfiguracionCantidadDeterminista } from './reglasActividades'

export const SERVICIO_COTIZACION = 'Cotización y Evaluación Técnica'
export const SERVICIO_APROBACION_FICHA = 'Aprobación Ficha Técnica'
export const SERVICIO_ORDEN_COMPRA = 'Emisión de Orden de Compra'
export const SERVICIO_PLAZO_ENTREGA = 'Plazo de Entrega del Proveedor'
export const SERVICIO_RECEPCION_ALMACEN = 'Recepción e Inspección en Almacén GYS'

/** Los 5 pasos, en orden. */
export const PASOS_PRO = [
  SERVICIO_COTIZACION, SERVICIO_APROBACION_FICHA, SERVICIO_ORDEN_COMPRA, SERVICIO_PLAZO_ENTREGA, SERVICIO_RECEPCION_ALMACEN,
] as const

/** Nombres anteriores de esos servicios: si la IA los usa, se reemplazan por los pasos estándar. */
const SERVICIOS_REEMPLAZADOS = [
  'Solicitud de Cotización', 'Recepción de Cotizaciones', 'Evaluación Técnica', 'Aprobación del Cliente',
  'Seguimiento de Compra (Expediting)', 'Recepción en Almacén GYS',
]

/** "Aprobación Ficha Técnica por NEXA" (primera palabra del nombre del cliente). */
export function nombreHitoAprobacion(nombreCliente?: string | null): string {
  const corto = (nombreCliente ?? '').trim().split(/\s+/)[0]
  return corto ? `${SERVICIO_APROBACION_FICHA} por ${corto.toUpperCase()}` : SERVICIO_APROBACION_FICHA
}

const normalizar = (s: string) => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().trim()
/** Nombre del servicio (de los conocidos) con el que termina la tarea, o null. */
function servicioDeTarea(t: TareaPropuesta, conocidos: string[]): string | null {
  const n = normalizar(t.nombre)
  return conocidos.find(s => n === normalizar(s) || n.endsWith(` - ${normalizar(s)}`)) ?? null
}
/** Las aprobaciones ya renombradas ("… - Aprobación por NEXA", "… - Aprobación Ficha Técnica por NEXA"). */
const esAprobacionRenombrada = (t: TareaPropuesta) => /(^|- )aprobaci[oó]n (ficha t[eé]cnica )?por /i.test(t.nombre)

export function aplicarAprobacionCliente(
  actividades: ActividadPropuesta[],
  serviciosPro: CatalogoServicioParaWizard[],
  config: Pick<ConfiguracionWizardPaso1, 'brownfield' | 'ingenieriaDetalle'> & ConfiguracionCantidadDeterminista,
  nombreCliente?: string | null,
): ActividadPropuesta[] {
  const pasos = PASOS_PRO.map(n => serviciosPro.find(s => s.nombre === n))
  if (pasos.some(s => !s)) return actividades // catálogo sin los 5 servicios: no se toca nada
  const conocidos = [...PASOS_PRO, ...SERVICIOS_REEMPLAZADOS]

  return actividades.map(a => {
    if (a.edtNombre !== 'PRO' || a.actividadNombre === 'Seguimiento y Entrega en Obra') return a
    // Prefijo de alias de la familia ("Cables - "), tomado de cualquier tarea conocida.
    let prefijo = ''
    for (const t of a.tareas) {
      const s = servicioDeTarea(t, conocidos)
      if (s && t.nombre.length > s.length) { prefijo = t.nombre.slice(0, t.nombre.length - s.length); break }
    }
    const otras = a.tareas.filter(t => !servicioDeTarea(t, conocidos) && !esAprobacionRenombrada(t))
    const nuevas: TareaPropuesta[] = pasos.map((s, i) => {
      // Sale del catálogo (hito, horas); si la IA ya puso ese servicio con su
      // cantidad, se respetan su cantidad y horas — salvo en los hitos.
      const delCatalogo = construirTareaPropuesta(s!, config)
      const existente = a.tareas.find(t => t.catalogoServicioId === s!.id)
      const base = existente && !delCatalogo.esHito
        ? { ...delCatalogo, cantidad: existente.cantidad, horasEstimadas: existente.horasEstimadas }
        : delCatalogo
      const nombre = s!.nombre === SERVICIO_APROBACION_FICHA ? nombreHitoAprobacion(nombreCliente) : s!.nombre
      return { ...base, nombre: `${prefijo}${nombre}`, incluida: true, motivoExclusion: undefined, orden: i }
    })
    return { ...a, tareas: [...nuevas, ...otras] }
  })
}

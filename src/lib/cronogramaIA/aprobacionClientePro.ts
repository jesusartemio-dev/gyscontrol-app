/**
 * PRO: en las familias de CABLES, EQUIPOS e INSTRUMENTOS (las que el cliente
 * aprueba técnicamente), después de la Solicitud de Cotización van:
 *   Recepción de Cotizaciones → Evaluación Técnica → ◆ Aprobación por {Cliente}
 * y recién entonces la Emisión de OC (como CJM50). Los materiales estándar
 * (canalización, bandejas, comunicación…) no pasan por aprobación.
 *
 * La IA reparte los servicios del catálogo entre familias a su criterio; este
 * paso determinista normaliza: quita esos 3 servicios de donde los haya puesto
 * y los inserta solo en las familias que corresponde.
 */
import type { ActividadPropuesta, CatalogoServicioParaWizard, ConfiguracionWizardPaso1, TareaPropuesta } from '@/types/cronogramaIA'
import { construirTareaPropuesta, type ConfiguracionCantidadDeterminista } from './reglasActividades'

export const SERVICIO_RECEPCION_COTIZACIONES = 'Recepción de Cotizaciones'
export const SERVICIO_EVALUACION_TECNICA = 'Evaluación Técnica'
export const SERVICIO_APROBACION_CLIENTE = 'Aprobación del Cliente'
const SERVICIOS_APROBACION = [SERVICIO_RECEPCION_COTIZACIONES, SERVICIO_EVALUACION_TECNICA, SERVICIO_APROBACION_CLIENTE]
const SERVICIO_SOLICITUD = 'Solicitud de Cotización'

/** Familias oficiales que el cliente aprueba técnicamente (vocabularioFamiliasPro.ts). Cables: fuerza, control e instrumentación (NEXA los aprueba). */
const FAMILIAS_CON_APROBACION = new Set(['Cables', 'Equipos Eléctricos', 'Equipos de Control', 'Tableros', 'Instrumentos'])
const normalizar = (s: string) => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase()

/** ¿El cliente aprueba técnicamente esta familia? Vocabulario oficial y, si no, palabras clave. */
export function familiaRequiereAprobacion(nombre: string): boolean {
  if (FAMILIAS_CON_APROBACION.has(nombre)) return true
  const n = normalizar(nombre)
  if (/material/.test(n)) return false
  return /cable|equipo|instrument|valvul|transmisor|variador|arrancador|plc|hmi|tablero|cubiculo/.test(n)
}

/** "Aprobación del Cliente" → "Aprobación por NEXA" (primera palabra del nombre del cliente). */
export function nombreHitoAprobacion(nombreCliente?: string | null): string {
  const corto = (nombreCliente ?? '').trim().split(/\s+/)[0]
  return corto ? `Aprobación por ${corto.toUpperCase()}` : SERVICIO_APROBACION_CLIENTE
}

const esServicio = (t: TareaPropuesta, servicio: string) => t.nombre === servicio || t.nombre.endsWith(` - ${servicio}`)
/** "Cables - Solicitud de Cotización" → "Cables - " (el mismo prefijo de alias que el resto de la familia). */
const prefijoDe = (t: TareaPropuesta) => t.nombre.slice(0, t.nombre.length - SERVICIO_SOLICITUD.length)

export function aplicarAprobacionCliente(
  actividades: ActividadPropuesta[],
  serviciosPro: CatalogoServicioParaWizard[],
  config: Pick<ConfiguracionWizardPaso1, 'brownfield' | 'ingenieriaDetalle'> & ConfiguracionCantidadDeterminista,
  nombreCliente?: string | null,
): ActividadPropuesta[] {
  const servicios = SERVICIOS_APROBACION.map(n => serviciosPro.find(s => s.nombre === n))
  if (servicios.some(s => !s)) return actividades // catálogo sin estos servicios: no se toca nada

  return actividades.map(a => {
    if (a.edtNombre !== 'PRO') return a
    const tareas = a.tareas.filter(t => !SERVICIOS_APROBACION.some(n => esServicio(t, n)))
    const iSolicitud = tareas.findIndex(t => esServicio(t, SERVICIO_SOLICITUD))
    if (!familiaRequiereAprobacion(a.actividadNombre) || iSolicitud < 0) return { ...a, tareas }
    const prefijo = prefijoDe(tareas[iSolicitud])
    const nuevas = servicios.map(s => {
      const t = construirTareaPropuesta(s!, config)
      const nombre = s!.nombre === SERVICIO_APROBACION_CLIENTE ? nombreHitoAprobacion(nombreCliente) : s!.nombre
      return { ...t, nombre: `${prefijo}${nombre}`, incluida: true, motivoExclusion: undefined }
    })
    return { ...a, tareas: [...tareas.slice(0, iSolicitud + 1), ...nuevas, ...tareas.slice(iSolicitud + 1)] }
  })
}

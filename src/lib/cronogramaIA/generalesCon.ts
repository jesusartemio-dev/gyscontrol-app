/**
 * CON "Construcción": dos actividades fijas que arma el generador, una al
 * inicio y otra al final del EDT (las zonas que propone la IA van en medio):
 *
 *   Generales - Movilización y Obras Preliminares   (servicios con etiqueta "Movilizacion")
 *   Generales - Desmovilización                     (servicios con etiqueta "Desmovilizacion")
 *
 * Sus tareas salen del catálogo de CON, en el orden del catálogo, con el
 * prefijo "GEN - ". Etiquetas de los servicios:
 *   - "Paralelo": arranca junto con la tarea anterior y depende de la misma
 *     predecesora (en la tabla del usuario: 4, 5 y 6 dependen de la 3).
 *   - "Andamios": solo si alguna zona tiene "Armado de Andamios".
 *   - "{CLIENTE}" en el nombre se reemplaza por el cliente ("… con NEXA").
 * La IA nunca recibe estos servicios (no los mete en las zonas): ver agrupar-esquema-ia.
 */
import type { ActividadPropuesta, CatalogoServicioParaWizard, ConfiguracionWizardPaso1, TareaPropuesta } from '@/types/cronogramaIA'
import { construirTareaPropuesta, esServicioObsoleto, type ConfiguracionCantidadDeterminista } from './reglasActividades'

export const ACTIVIDAD_MOVILIZACION = 'Generales - Movilización y Obras Preliminares'
export const ACTIVIDAD_DESMOVILIZACION = 'Generales - Desmovilización'
export const PREFIJO_GENERALES = 'GEN - '
/** Actividades "Generales - …": sus tareas se encadenan FC (ver construirEstructuraReal). */
export const esActividadGenerales = (nombre: string) => nombre.startsWith('Generales - ')

const normalizar = (s: string) => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().trim()
const tieneTag = (s: Pick<CatalogoServicioParaWizard, 'actividadTag'>, tag: string) =>
  (s.actividadTag ?? []).some(t => normalizar(t) === normalizar(tag))

/** Servicio de las actividades generales (no va a las zonas). */
export const esServicioGeneral = (s: Pick<CatalogoServicioParaWizard, 'actividadTag'>) =>
  tieneTag(s, 'Movilizacion') || tieneTag(s, 'Desmovilizacion')

/** "Replanteo con {CLIENTE}" → "Replanteo con NEXA" (primera palabra del cliente). */
export function nombreConCliente(nombre: string, nombreCliente?: string | null): string {
  const corto = (nombreCliente ?? '').trim().split(/\s+/)[0]
  return nombre.replace(/\{CLIENTE\}/gi, corto ? corto.toUpperCase() : 'el Cliente')
}

export function agregarGeneralesCon(
  actividades: ActividadPropuesta[],
  serviciosCon: CatalogoServicioParaWizard[],
  config: Pick<ConfiguracionWizardPaso1, 'brownfield' | 'ingenieriaDetalle'> & ConfiguracionCantidadDeterminista,
  nombreCliente?: string | null,
): ActividadPropuesta[] {
  const generales = serviciosCon.filter(s => esServicioGeneral(s) && !esServicioObsoleto(s))
  if (!generales.length) return actividades
  const idsGenerales = new Set(generales.map(s => s.id))

  // Zonas de CON sin las actividades generales previas (re-agrupar) ni servicios
  // generales sueltos (por si la IA igual puso alguno en una zona).
  const resto = actividades
    .filter(a => !(a.edtNombre === 'CON' && esActividadGenerales(a.actividadNombre)))
    .map(a => (a.edtNombre === 'CON' ? { ...a, tareas: a.tareas.filter(t => !t.catalogoServicioId || !idsGenerales.has(t.catalogoServicioId)) } : a))
  const hayAndamios = resto.some(a => a.edtNombre === 'CON' && a.tareas.some(t => /armado de andamios/i.test(t.nombre)))

  const armar = (tag: string, nombreActividad: string): ActividadPropuesta | null => {
    const tareas: TareaPropuesta[] = generales
      .filter(s => tieneTag(s, tag) && (hayAndamios || !tieneTag(s, 'Andamios')))
      .sort((a, b) => (a.orden ?? 0) - (b.orden ?? 0))
      .map((s, i) => ({
        ...construirTareaPropuesta(s, config),
        nombre: `${PREFIJO_GENERALES}${nombreConCliente(s.nombre, nombreCliente)}`,
        orden: i,
        ...(tieneTag(s, 'Paralelo') && i > 0 && { paraleloConAnterior: true }),
      }))
    return tareas.length ? { edtNombre: 'CON', actividadNombre: nombreActividad, origen: 'determinista', tareas } : null
  }
  const inicio = armar('Movilizacion', ACTIVIDAD_MOVILIZACION)
  const fin = armar('Desmovilizacion', ACTIVIDAD_DESMOVILIZACION)

  // Movilización antes de la primera zona de CON; desmovilización después de la última.
  const iPrimera = resto.findIndex(a => a.edtNombre === 'CON')
  if (iPrimera < 0) return actividades // sin zonas no hay obra: no se agrega nada
  let iUltima = resto.length - 1
  while (resto[iUltima].edtNombre !== 'CON') iUltima--
  return [
    ...resto.slice(0, iPrimera),
    ...(inicio ? [inicio] : []),
    ...resto.slice(iPrimera, iUltima + 1),
    ...(fin ? [fin] : []),
    ...resto.slice(iUltima + 1),
  ]
}

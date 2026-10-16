/**
 * PRO "Suministro de Equipos" se queda con los materiales; los alquileres y
 * subcontratos van al EDT SER "Servicios y Alquileres" (fase PROCURA). La IA
 * sigue proponiendo las familias de procura como siempre (vocabulario de
 * vocabularioFamiliasPro.ts); aquí se reubican las de alquiler/subcontrato y
 * se les asignan los pasos de SER según su tipo (etiquetas "Alquiler" /
 * "Subcontrato" de los servicios del catálogo).
 */
import type { ActividadPropuesta, CatalogoServicioParaWizard, ConfiguracionWizardPaso1 } from '@/types/cronogramaIA'
import { FAMILIAS_OFICIALES_PRO } from './vocabularioFamiliasPro'
import { construirTareaPropuesta, esServicioObsoleto, type ConfiguracionCantidadDeterminista } from './reglasActividades'
import { aplicarPrefijoDeActividad } from './aliasActividad'

export const EDT_SERVICIOS_ALQUILERES = 'SER'
export type TipoServicioProcura = 'alquiler' | 'subcontrato'

const normalizar = (s: string) => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase()
// Subcontrato primero: "Andamios multicuerpo (tercerizado)" es subcontrato aunque diga andamio.
const RX_SUBCONTRATO = /subcontrat|terceriz|tercero|multicuerpo|izaje|transporte|obra civil|calibraci/
const RX_ALQUILER = /alquiler|andamio|manlift|tijera|elevaci|grua|medicion certificad|instrumentos de medicion/

/** Tipo de una familia de procura por su nombre: vocabulario oficial y, si no, palabras clave. null = material (se queda en PRO). */
export function tipoServicioDeFamilia(nombre: string): TipoServicioProcura | null {
  const oficial = FAMILIAS_OFICIALES_PRO.find(f => normalizar(f.nombre) === normalizar(nombre))
  if (oficial) return oficial.grupo === 'alquileres' ? 'alquiler' : oficial.grupo === 'subcontratos' ? 'subcontrato' : null
  const n = normalizar(nombre)
  if (RX_SUBCONTRATO.test(n)) return 'subcontrato'
  if (RX_ALQUILER.test(n)) return 'alquiler'
  return null
}

/**
 * Mueve a SER las actividades de PRO que son alquiler o subcontrato, con los
 * servicios de SER de su tipo. Sin servicios de SER en el catálogo, no cambia nada.
 */
export function separarServiciosYAlquileres(
  actividades: ActividadPropuesta[],
  serviciosSer: CatalogoServicioParaWizard[],
  config: Pick<ConfiguracionWizardPaso1, 'brownfield' | 'ingenieriaDetalle'> & ConfiguracionCantidadDeterminista,
  aliasPropuestoPorNombre?: Map<string, string>,
): ActividadPropuesta[] {
  const vigentes = serviciosSer.filter(s => !esServicioObsoleto(s))
  if (!vigentes.length) return actividades
  const deTipo = (tipo: TipoServicioProcura) =>
    vigentes.filter(s => (s.actividadTag ?? []).some(t => normalizar(t) === tipo))

  const quedan: ActividadPropuesta[] = []
  const ser: ActividadPropuesta[] = []
  for (const a of actividades) {
    const tipo = a.edtNombre === 'PRO' ? tipoServicioDeFamilia(a.actividadNombre) : null
    const servicios = tipo ? deTipo(tipo) : []
    if (!tipo || !servicios.length) { quedan.push(a); continue }
    ser.push({ ...a, edtNombre: EDT_SERVICIOS_ALQUILERES, tareas: servicios.map(s => construirTareaPropuesta(s, config)) })
  }
  // Mismo criterio de prefijo "{alias} - " que PRO cuando hay 2+ actividades.
  return [...quedan, ...aplicarPrefijoDeActividad(ser, aliasPropuestoPorNombre)]
}

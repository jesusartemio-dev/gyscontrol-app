/**
 * Vocabulario oficial de familias de procura de GYS CONTROL INDUSTRIAL SAC
 * — única fuente de verdad (vive en código, no solo en el prompt). La IA
 * propone esquemas de familias para PRO usando ESTOS nombres exactos
 * cuando el alcance los evidencie (ver SYSTEM_ESQUEMAS_FAMILIAS_PRO); el
 * flag `fueraDeVocabulario` de una familia propuesta se valida contra
 * `NOMBRE_FAMILIA_OFICIAL_PRO`, nunca contra el criterio del LLM.
 */

export interface FamiliaOficialPro {
  nombre: string
  alias: string
  grupo: 'materiales' | 'alquileres' | 'subcontratos'
  descripcion: string
}

export const FAMILIAS_OFICIALES_PRO: FamiliaOficialPro[] = [
  { nombre: 'Cables', alias: 'Cables', grupo: 'materiales', descripcion: 'fuerza, control, instrumentación, comunicación' },
  { nombre: 'Tuberías y Canalización', alias: 'Tuberias', grupo: 'materiales', descripcion: 'conduit RGS/EMT/PVC, cajas de paso, condulets, accesorios' },
  { nombre: 'Bandejas y Soportería', alias: 'Bandejas', grupo: 'materiales', descripcion: 'bandejas portacables, perfiles, soportes estándar, anclajes, pernería' },
  { nombre: 'Soportes Fabricados', alias: 'Soportes', grupo: 'materiales', descripcion: 'soportería especial mandada a fabricar; requiere planos previos (PLA)' },
  { nombre: 'Equipos Eléctricos', alias: 'ElectEquip', grupo: 'materiales', descripcion: 'seccionadores, arrancadores, variadores, transformadores, luminarias' },
  { nombre: 'Equipos de Control', alias: 'Control', grupo: 'materiales', descripcion: 'PLCs, HMIs, switches, módulos I/O; típicamente importación, lead time largo' },
  { nombre: 'Tableros', alias: 'Tableros', grupo: 'materiales', descripcion: 'autosoportados, murales; fabricación nacional por terceros (distinto del EDT TAB)' },
  { nombre: 'Materiales de Tablero', alias: 'MatTablero', grupo: 'materiales', descripcion: 'breakers, contactores, borneras, fuentes, gabinetes; solo si hay TAB' },
  { nombre: 'Materiales de Marshalling', alias: 'Marshalling', grupo: 'materiales', descripcion: 'borneras, rieles, marcadores, accesorios de interconexión de señales' },
  { nombre: 'Instrumentos', alias: 'Instrum', grupo: 'materiales', descripcion: 'transmisores, sensores, válvulas de control, manómetros' },
  { nombre: 'Materiales Neumáticos', alias: 'Neumatica', grupo: 'materiales', descripcion: 'tubing, racores, FRL, válvulas neumáticas' },
  { nombre: 'Equipos de Elevación y Acceso', alias: 'Elevacion', grupo: 'alquileres', descripcion: 'manlift, tijeras, andamios de terceros' },
  { nombre: 'Instrumentos de Medición Certificados', alias: 'MedCert', grupo: 'alquileres', descripcion: 'megóhmetro, telurómetro' },
  { nombre: 'Transporte e Izajes', alias: 'Izajes', grupo: 'subcontratos', descripcion: '' },
  { nombre: 'Obra Civil Menor', alias: 'ObraCivil', grupo: 'subcontratos', descripcion: '' },
  { nombre: 'Calibración Certificada', alias: 'Calibracion', grupo: 'subcontratos', descripcion: '' },
]

export const NOMBRE_FAMILIA_OFICIAL_PRO = new Set(FAMILIAS_OFICIALES_PRO.map(f => f.nombre))

/** Nombre real de la familia "Soportes Fabricados" — usado por la regla de dependencia con PLA (ver reglasDependencias.ts). */
export const FAMILIA_SOPORTES_FABRICADOS = 'Soportes Fabricados'

const NOMBRE_GRUPO: Record<FamiliaOficialPro['grupo'], string> = {
  materiales: 'MATERIALES (Cotización → OC → Expediting → Recepción GYS → Traslado)',
  alquileres: 'ALQUILERES (Cotización → OC → Coordinación de Alquiler)',
  subcontratos: 'SUBCONTRATOS (Cotización → OC)',
}

/** Texto del vocabulario oficial para embeber en el prompt de Etapa A de PRO — generado desde la constante, nunca duplicado a mano. */
export function textoVocabularioFamiliasPro(): string {
  const grupos: FamiliaOficialPro['grupo'][] = ['materiales', 'alquileres', 'subcontratos']
  const lineas: string[] = []
  let contador = 1
  for (const grupo of grupos) {
    lineas.push(NOMBRE_GRUPO[grupo] + ':')
    for (const f of FAMILIAS_OFICIALES_PRO.filter(x => x.grupo === grupo)) {
      lineas.push(f.descripcion ? `${contador}. ${f.nombre} — ${f.descripcion}` : `${contador}. ${f.nombre}`)
      contador++
    }
  }
  return lineas.join('\n')
}

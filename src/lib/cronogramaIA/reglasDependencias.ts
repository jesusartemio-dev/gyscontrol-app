export interface TareaCreadaParaDependencias {
  id: string
  nombre: string
  edtNombre: string
}

export interface DependenciaSugerida {
  tareaOrigenId: string
  tareaDependienteId: string
  tipo: 'finish_to_start'
}

interface ReglaDependencia {
  origen: { edtNombre: string; nombre: string }
  dependiente: { edtNombre: string; nombre: string }
}

/**
 * Pares (nombre real de catálogo, EDT) — determinista, sin IA. Cada regla
 * solo genera una dependencia si AMBAS tareas nombradas existen realmente
 * en la generación (no todo proyecto incluye CMM, por ejemplo).
 */
const REGLAS: ReglaDependencia[] = [
  { origen: { edtNombre: 'CIE', nombre: 'Firma del Acta de Conformidad' }, dependiente: { edtNombre: 'CIE', nombre: 'Cierre Contractual' } },
  { origen: { edtNombre: 'CIE', nombre: 'Firma del Acta de Conformidad' }, dependiente: { edtNombre: 'CIE', nombre: 'Valorización Final y Conformidad HES' } },
  { origen: { edtNombre: 'CON', nombre: 'Armado de Andamios' }, dependiente: { edtNombre: 'CON', nombre: 'Desmontaje de Andamios' } },
  { origen: { edtNombre: 'CMM', nombre: 'Energización de Tableros' }, dependiente: { edtNombre: 'CMM', nombre: 'Comisionamiento en Frío' } },
  { origen: { edtNombre: 'CMM', nombre: 'Comisionamiento en Frío' }, dependiente: { edtNombre: 'CMM', nombre: 'Comisionamiento en Caliente' } },
  { origen: { edtNombre: 'PRO', nombre: 'Recepción en Almacén GYS' }, dependiente: { edtNombre: 'CON', nombre: 'Preparación y Traslado de Materiales' } },
]

/** Dependencias sugeridas por coincidencia exacta de (edtNombre, nombre real de catálogo) — nunca por IA. */
export function sugerirDependencias(tareasCreadas: TareaCreadaParaDependencias[]): DependenciaSugerida[] {
  const porClave = new Map<string, string>()
  for (const t of tareasCreadas) {
    porClave.set(`${t.edtNombre}::${t.nombre}`, t.id)
  }

  const sugerencias: DependenciaSugerida[] = []
  for (const regla of REGLAS) {
    const origenId = porClave.get(`${regla.origen.edtNombre}::${regla.origen.nombre}`)
    const dependienteId = porClave.get(`${regla.dependiente.edtNombre}::${regla.dependiente.nombre}`)
    if (origenId && dependienteId && origenId !== dependienteId) {
      sugerencias.push({ tareaOrigenId: origenId, tareaDependienteId: dependienteId, tipo: 'finish_to_start' })
    }
  }
  return sugerencias
}

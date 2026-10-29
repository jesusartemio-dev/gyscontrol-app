import type { PlanReferencia } from '@/types/planTrabajo'

/**
 * Referencias por defecto del plan — los documentos contractuales del propio
 * proyecto, como el plan aprobado por NEXA (PN-I790126044-3GYS-0370COR0001-RC §3).
 * Antes eran normativa genérica (Ley 29783, ISO, ANSI, IEEE…) más las normas
 * del TDR, que no se usan en el trabajo. Se editan por proyecto en la app.
 */
export function referenciasDelProyecto(datos: {
  cotizacionCodigo?: string | null
  ordenCompra?: string | null
  clienteNombre?: string | null
}): PlanReferencia[] {
  const cliente = datos.clienteNombre?.trim()
  const lista: PlanReferencia[] = []
  if (datos.cotizacionCodigo?.trim()) {
    lista.push({ titulo: `Propuesta técnica económica ${datos.cotizacionCodigo.trim()}`, origen: 'COTIZACION' })
  }
  if (datos.ordenCompra?.trim()) {
    lista.push({ titulo: `Contrato de obra (OC – ${datos.ordenCompra.trim()})`, origen: 'COTIZACION' })
  }
  lista.push(
    { titulo: 'Planos de arreglo general, cortes y detalles para instalación mecánica', origen: 'MANUAL' },
    { titulo: 'Planos de Instalaciones Eléctricas', origen: 'MANUAL' },
    { titulo: 'Data Sheet de Equipos', origen: 'MANUAL' },
    { titulo: cliente ? `Procedimientos de Seguridad de ${cliente}` : 'Procedimientos de Seguridad del cliente', origen: 'MANUAL' },
    { titulo: 'Reglamento Interno de Seguridad y Salud en el Trabajo', origen: 'NORMATIVA' },
    { titulo: 'Respuesta de Emergencia', origen: 'MANUAL' },
  )
  return lista
}

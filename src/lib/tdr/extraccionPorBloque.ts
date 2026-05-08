import type { BloqueId } from '@/types/tdr'

export interface ExtraccionBloqueRequest {
  bloque: BloqueId
  cotizacionId: string
}

export interface ExtraccionBloqueResponse {
  bloque: BloqueId
  datos: Record<string, unknown>
}

// Instrucciones específicas por bloque para guiar la extracción de Claude
export const INSTRUCCIONES_POR_BLOQUE: Record<BloqueId, string> = {
  identificacion: `
Extrae los datos de identificación del proyecto del TDR:
- clienteDetectado: nombre completo del cliente/empresa contratante
- proyectoDetectado: nombre o código del proyecto
- ubicacionDetectada: ubicación geográfica del proyecto (ciudad, región, país)

Devuelve solo los campos encontrados, null si no se menciona.`,

  alcance: `
Extrae los datos de alcance del TDR:
- resumenTdr: resumen ejecutivo del documento completo (2-4 oraciones)
- alcanceDetectado: descripción detallada del alcance técnico del proyecto
- requerimientos: lista de requerimientos técnicos específicos, cada uno con:
  { descripcion: string, cantidad?: number, especificacion?: string, criticidad?: "alta"|"media"|"baja" }

Enfócate en requerimientos concretos y medibles.`,

  suministros: `
Extrae los suministros mencionados en el TDR:
- equiposIdentificados: equipos, maquinaria e instrumentos con:
  { nombre: string, cantidad?: number, especificacion?: string, estimadoUsd?: number, suministra?: "contratista"|"cliente", marcaSugerida?: string }
- serviciosIdentificados: servicios técnicos y especializados con:
  { nombre: string, descripcion?: string, horasEstimadas?: number }

Incluye todos los equipos mencionados aunque no tengan precio.`,

  personal: `
Extrae los requerimientos de personal del TDR:
- personalRequerido: lista con:
  { rol: string, cantidad: number, experienciaAnios?: number, certificaciones?: string[], obligatorio: boolean }

Incluye roles de supervisión, ingeniería, técnicos y operativos. Si no se menciona cantidad, asume 1.`,

  plazos: `
Extrae la información de plazos del TDR:
- cronogramaEstimado: fases del proyecto con:
  { fase: string, duracion?: string, observaciones?: string }
- hitosContractuales: hitos clave con:
  { nombre: string, tipo: "kom"|"fat"|"sat"|"comisionamiento"|"as-built"|"otro", fechaEstimada?: string, diasDesdeInicio?: number }

Convierte plazos a semanas o días cuando sea posible.`,

  ssoma: `
Extrae los requisitos de SSOMA del TDR:
- normasAplicables: normas, estándares y regulaciones con:
  { codigo: string, nombre: string, categoria?: "electrica"|"mecanica"|"ssoma"|"calidad"|"otro" }
- documentosPrevios: documentos que se deben entregar antes del inicio con:
  { nombre: string, diasAnticipacion?: number, responsable?: "contratista"|"cliente", obligatorio: boolean }
- riesgosCriticos: riesgos de seguridad mencionados con:
  { riesgo: string, probabilidad?: "alta"|"media"|"baja", impacto?: "alta"|"media"|"baja", mitigacion?: string }`,

  comercial: `
Extrae los datos comerciales y económicos del TDR:
- presupuestoEstimado: { equipos?: number, servicios?: number, gastos?: number, total?: number } (en USD)
- penalidades: penalidades contractuales con:
  { causa: string, tipo: "porcentaje-diario"|"monto-fijo"|"porcentaje-total", valor: number, topeMaximo?: number }
- garantias: objeto con garantías exigidas:
  { fielCumplimiento?: { porcentaje: number, vigencia: string }, adelanto?: { porcentaje: number, vigencia: string }, responsabilidadCivil?: { monto: number, moneda: string }, servicio?: { duracionMeses: number } }`,

  entregables: `
Extrae los entregables del dossier técnico requeridos en el TDR:
- entregablesDossier: lista de documentos a entregar con:
  { nombre: string, formato?: "fisico"|"digital"|"ambos", fase: "ingenieria"|"construccion"|"cierre" }

Agrupa los entregables por su fase correspondiente. Incluye planos, memorias, reportes, manuales, etc.`,
}

import type { PlanResponsabilidades } from '@/types/planTrabajo'

export const RESPONSABILIDADES_DEFAULT: PlanResponsabilidades = {
  gerenteGeneral: [
    'Aprobar el presente Plan de Trabajo',
    'Asegurar la disponibilidad de recursos para la ejecución',
    'Velar por el cumplimiento de los estándares de calidad y seguridad',
  ],
  supervisor: [
    'Supervisar la ejecución diaria de las actividades',
    'Difundir el presente Plan de Trabajo al equipo asignado',
    'Coordinar con el cliente las actividades programadas',
    'Reportar avances y desviaciones a la Gerencia',
  ],
  operario: [
    'Ejecutar las actividades técnicas asignadas según procedimientos',
    'Cumplir con las medidas de seguridad establecidas en ART y PETAR',
    'Reportar cualquier desviación o incidente al Supervisor',
    'Mantener orden y limpieza en el área de trabajo',
  ],
  supervisorSeguridad: [
    'Verificar el cumplimiento de las normas de SSOMA',
    'Realizar inspecciones diarias y verificar uso de EPP',
    'Difundir charlas de 5 minutos al inicio de jornada',
    'Investigar incidentes y proponer medidas correctivas',
  ],
}

export function aplicarDefaults<T>(valor: T | null | undefined, defecto: T): T {
  if (valor === null || valor === undefined) return defecto
  if (Array.isArray(valor) && valor.length === 0) return defecto
  if (typeof valor === 'object' && !Array.isArray(valor) && Object.keys(valor as object).length === 0) return defecto
  return valor
}

// ===================================================
// 📁 Archivo: index.ts
// 📌 Ubicación: src/components/crm/index.ts
// 🔧 Descripción: Exportaciones centralizadas de componentes CRM
// ✅ Punto único de importación para todos los componentes CRM
// ✍️ Autor: Sistema GYS - Asistente IA
// 📅 Última actualización: 2025-09-19
// ===================================================

// Componentes principales
export { default as OportunidadesList } from './OportunidadesList'
export { default as OportunidadForm } from './OportunidadForm'

// Componentes de actividades
export { default as ActividadForm } from './ActividadForm'
export { default as ActividadList } from './ActividadList'

// Componentes de contactos
export * from './contactos'

// Tipos y constantes comunes
export const CRM_COMPONENTES = {
  LISTA_OPORTUNIDADES: 'OportunidadesList',
  FORMULARIO_OPORTUNIDAD: 'OportunidadForm',
  FORMULARIO_ACTIVIDAD: 'ActividadForm',
  LISTA_ACTIVIDADES: 'ActividadList',
} as const

// Funciones helper para componentes CRM
export const getCrmComponentName = (component: keyof typeof CRM_COMPONENTES): string => {
  return CRM_COMPONENTES[component]
}

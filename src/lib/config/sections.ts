// ===================================================
// Definiciones centralizadas de secciones del sidebar
// Fuente de verdad para sectionKeys, labels y defaults
// ===================================================

export const SECTION_KEYS = [
  'comercial',
  'crm',
  'proyectos',
  'documentos',
  'mi-trabajo',
  'supervision',
  'logistica',
  'aprovisionamiento',
  'gestion',
  'configuracion',
] as const

export type SectionKey = (typeof SECTION_KEYS)[number]

export const SECTION_LABELS: Record<SectionKey, string> = {
  comercial: 'Comercial',
  crm: 'CRM',
  proyectos: 'Proyectos',
  documentos: 'Documentos',
  'mi-trabajo': 'Mi Trabajo',
  supervision: 'Supervisión',
  logistica: 'Logística',
  aprovisionamiento: 'Aprovisionamiento',
  gestion: 'Gestión',
  configuracion: 'Configuración',
}

export const ALL_ROLES = [
  'admin',
  'gerente',
  'gestor',
  'coordinador',
  'proyectos',
  'seguridad',
  'comercial',
  'presupuestos',
  'logistico',
  'colaborador',
] as const

export type RoleKey = (typeof ALL_ROLES)[number]

// Mapeo por defecto (fallback) basado en la config hardcodeada actual del Sidebar
export const DEFAULT_ROLE_SECTIONS: Record<RoleKey, SectionKey[]> = {
  admin: ['comercial', 'crm', 'proyectos', 'documentos', 'mi-trabajo', 'supervision', 'logistica', 'aprovisionamiento', 'gestion', 'configuracion'],
  gerente: ['comercial', 'crm', 'proyectos', 'documentos', 'mi-trabajo', 'supervision', 'logistica', 'aprovisionamiento', 'gestion', 'configuracion'],
  gestor: ['proyectos', 'documentos', 'mi-trabajo', 'supervision', 'aprovisionamiento', 'gestion'],
  coordinador: ['proyectos', 'documentos', 'mi-trabajo', 'supervision'],
  proyectos: ['proyectos', 'documentos', 'mi-trabajo', 'supervision'],
  seguridad: ['mi-trabajo'],
  comercial: ['comercial', 'crm', 'documentos', 'mi-trabajo'],
  presupuestos: ['comercial', 'mi-trabajo'],
  logistico: ['logistica', 'documentos', 'mi-trabajo'],
  colaborador: ['mi-trabajo'],
}

// Mapeo de prefijos de ruta a sectionKey (para middleware)
export const ROUTE_TO_SECTION: Record<string, SectionKey> = {
  '/comercial': 'comercial',
  '/crm': 'crm',
  '/proyectos': 'proyectos',
  '/documentos': 'documentos',
  '/mi-trabajo': 'mi-trabajo',
  '/supervision': 'supervision',
  '/logistica': 'logistica',
  '/finanzas': 'aprovisionamiento',
  '/gestion': 'gestion',
  '/configuracion': 'configuracion',
  '/catalogo': 'configuracion',
  '/admin': 'configuracion',
}

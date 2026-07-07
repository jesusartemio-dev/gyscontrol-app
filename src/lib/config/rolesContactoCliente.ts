export const ROLES_CONTACTO_CLIENTE = [
  { value: 'administrador_contrato', label: 'Administrador de Contrato' },
  { value: 'jefe_proyecto_cliente',  label: 'Jefe de Proyecto del Cliente' },
  { value: 'inspector_supervisor',   label: 'Inspector / Supervisor' },
] as const

export type RolContactoCliente = typeof ROLES_CONTACTO_CLIENTE[number]['value']

export const ROL_CONTACTO_CLIENTE_LABELS: Record<string, string> = Object.fromEntries(
  ROLES_CONTACTO_CLIENTE.map(r => [r.value, r.label])
)

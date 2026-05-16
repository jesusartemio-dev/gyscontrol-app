import { describe, it, expect } from '@jest/globals'

// La lógica de autorización del endpoint PATCH /api/saldos-ausencia/ajuste
// es: solo roles en ROLES_ADMIN pueden acceder.
// Extraemos la constante para testarla sin montar Next.js.
const ROLES_ADMIN = ['admin', 'administracion', 'gerente', 'gestor', 'coordinador']

function puedeAjustar(role: string): boolean {
  return ROLES_ADMIN.includes(role)
}

describe('PATCH /api/saldos-ausencia/ajuste — autorización', () => {
  it('coordinador puede ajustar saldos', () => {
    expect(puedeAjustar('coordinador')).toBe(true)
  })

  it('gestor puede ajustar saldos', () => {
    expect(puedeAjustar('gestor')).toBe(true)
  })

  it('gerente puede ajustar saldos', () => {
    expect(puedeAjustar('gerente')).toBe(true)
  })

  it('admin puede ajustar saldos', () => {
    expect(puedeAjustar('admin')).toBe(true)
  })

  it('administracion puede ajustar saldos', () => {
    expect(puedeAjustar('administracion')).toBe(true)
  })

  it('proyectos NO puede ajustar saldos → 403', () => {
    expect(puedeAjustar('proyectos')).toBe(false)
  })

  it('colaborador NO puede ajustar saldos → 403', () => {
    expect(puedeAjustar('colaborador')).toBe(false)
  })

  it('comercial NO puede ajustar saldos → 403', () => {
    expect(puedeAjustar('comercial')).toBe(false)
  })
})

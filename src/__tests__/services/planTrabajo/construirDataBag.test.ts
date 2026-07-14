import { construirDataBag } from '@/lib/planTrabajo/construirDataBag'
import type { PlanAlcanceDetalladoEdt } from '@/types/planTrabajo'
import type { PlanTrabajo, Cliente, Proyecto } from '@prisma/client'

/**
 * Integración a nivel dataBag (no solo builder) — regresión del bug auditado
 * en el docx real (proyecto CJM49): construirDataBag.ts renombraba cada
 * subItem a {subnumero, subnombre, subdescripcion}, nombres que NO existen en
 * la plantilla .docx (su loop {#subItems} usa {numeracion}/{actividadNombre}/
 * {descripcion}, igual que el builder). Docxtemplater resuelve un tag no
 * encontrado en el scope del subItem subiendo al scope del EDT padre — por
 * eso cada subItem terminaba mostrando la numeración/descripción del padre
 * clonada y el nombre de actividad vacío. Este test verifica el dataBag tal
 * cual sale, con los MISMOS nombres que consume la plantilla real.
 */

function planFixture(alcanceDetallado: PlanAlcanceDetalladoEdt[]): PlanTrabajo {
  return {
    id: 'plan-1',
    proyectoId: 'proyecto-1',
    codigoDocumento: 'PN-001',
    numeroConsultor: null,
    numeroRevision: 'A',
    tipoEmision: null,
    fechaEmision: new Date('2026-01-01'),
    preparadoPor: null,
    preparadoCargo: null,
    revisadoPor: null,
    revisadoCargo: null,
    aprobadoPor: null,
    aprobadoCargo: null,
    objetivo: null,
    alcanceGeneral: null,
    personalAsignado: [],
    matrizRaci: null,
    eppRequeridos: null,
    herramientasYEquipos: null,
    restricciones: null,
    alcanceDetallado: alcanceDetallado as unknown as PlanTrabajo['alcanceDetallado'],
    histogramas: null,
    cronogramaResumen: null,
    referencias: null,
    incluirMatriz: true,
    incluirCronograma: true,
    incluirHistogramas: true,
    incluirTDR: true,
  } as unknown as PlanTrabajo
}

const proyectoFixture = {
  id: 'proyecto-1',
  nombre: 'Proyecto de prueba',
  ordenCompraCliente: null,
  estado: null,
  cliente: { nombre: 'Cliente S.A.', direccion: null } as Cliente,
} as unknown as Proyecto & { cliente: Cliente | null }

function edtDetallado(): PlanAlcanceDetalladoEdt {
  return {
    numeracion: '11.2',
    edtNombre: 'Construcción',
    edtCodigo: 'CON',
    faseNombre: 'EJECUCIÓN',
    faseAbreviatura: 'EJECUCIÓN',
    descripcion: 'Descripción general del EDT de Construcción, redactada por IA.',
    tipoDetalle: 'detallado',
    edtRefId: 'edt-con',
    personalRequerido: [{ cantidad: 3, cargo: 'Técnico Operario' }],
    subItems: [
      {
        numeracion: '11.2.1',
        actividadNombre: 'Tendido de cable de fuerza',
        descripcion: 'Descripción específica de tendido.',
        actividadRefId: 'act-1',
        tareas: [
          { tareaRefId: 'tarea-1', nombre: 'desenergizar', texto: 'Desenergizar y bloquear la alimentación mediante dispositivos DAE.', fotoSugerida: 'Foto del punto de bloqueo antes de intervenir.' },
          { tareaRefId: 'tarea-2', nombre: 'delimitar-area', texto: 'Delimitar el área de trabajo con cinta de seguridad y señalización visible.' },
          { tareaRefId: 'tarea-3', nombre: 'verificar-tension', texto: 'Verificar ausencia de tensión con multímetro certificado.' },
        ],
        fotoSugerida: 'Foto del área antes de iniciar el tendido de cable.',
      },
      { numeracion: '11.2.2', actividadNombre: 'Montaje de tablero eléctrico', descripcion: 'Descripción específica de montaje.', actividadRefId: 'act-2' },
      { numeracion: '11.2.3', actividadNombre: 'Pruebas eléctricas de continuidad', descripcion: 'Descripción específica de pruebas.', actividadRefId: 'act-3' },
    ],
  }
}

function edtResumido(): PlanAlcanceDetalladoEdt {
  return {
    numeracion: '11.1',
    edtNombre: 'Planificación General',
    edtCodigo: 'PLAN',
    faseNombre: 'PLANIFICACIÓN',
    faseAbreviatura: 'PLANIFICACIÓN',
    descripcion: 'Descripción general del EDT de Planificación.',
    tipoDetalle: 'resumido',
    edtRefId: 'edt-plan',
    subItems: [],
  }
}

describe('construirDataBag — alcanceDetallado.subItems', () => {
  const dataBag = construirDataBag({
    plan: planFixture([edtResumido(), edtDetallado()]),
    proyecto: proyectoFixture,
    organigramaPngBase64: '',
  })
  const alcance = dataBag.alcanceDetallado as Array<{
    edtNombre: string
    descripcion: string
    personalRequerido: { cantidad: number; cargo: string }[]
    tienePersonalRequerido: boolean
    subItems: { numeracion: string; actividadNombre: string; descripcion: string; tareas: { texto: string }[] }[]
  }>
  const con = alcance.find(a => a.edtNombre === 'Construcción')!
  const plan = alcance.find(a => a.edtNombre === 'Planificación General')!

  it('tienePersonalRequerido es true cuando el EDT trae personalRequerido, y false cuando no (plantilla v5, {#tienePersonalRequerido})', () => {
    expect(con.tienePersonalRequerido).toBe(true)
    expect(plan.tienePersonalRequerido).toBe(false)
  })

  it('cada subItem tiene su propia numeración incremental (no la del EDT padre)', () => {
    expect(con.subItems.map(s => s.numeracion)).toEqual(['11.2.1', '11.2.2', '11.2.3'])
  })

  it('cada subItem tiene el nombre real de la actividad (nunca vacío)', () => {
    const nombres = con.subItems.map(s => s.actividadNombre)
    expect(nombres).toEqual([
      'Tendido de cable de fuerza',
      'Montaje de tablero eléctrico',
      'Pruebas eléctricas de continuidad',
    ])
    for (const n of nombres) expect(n.trim().length).toBeGreaterThan(0)
  })

  it('cada subItem tiene su propia descripción, distinta entre sí y distinta de la del EDT padre', () => {
    const descripciones = con.subItems.map(s => s.descripcion)
    expect(new Set(descripciones).size).toBe(descripciones.length)
    for (const d of descripciones) expect(d).not.toBe(con.descripcion)
  })

  it('un EDT resumido llega al dataBag con subItems vacío', () => {
    expect(plan.subItems).toEqual([])
  })

  it('(Tarea 4) un subItem detallado con 3 tareas llega al dataBag con 3 viñetas distintas y no vacías', () => {
    const tareas = con.subItems[0].tareas
    expect(tareas).toHaveLength(3)
    const textos = tareas.map(t => t.texto)
    for (const t of textos) expect(t.trim().length).toBeGreaterThan(0)
    expect(new Set(textos).size).toBe(textos.length)
  })

  it('(Tarea 4) un subItem sin tareas (o de un EDT resumido) llega al dataBag con tareas.length === 0', () => {
    expect(con.subItems[1].tareas).toEqual([])
    expect(plan.subItems).toEqual([])
  })

  it('(Tarea 5) fotoSugerida de actividad NUNCA llega al dataBag — es solo UI, no se exporta al docx', () => {
    // El fixture del subItem[0] trae fotoSugerida (ver arriba) — confirma que
    // construirDataBag no la incluye en ningún campo del objeto mapeado.
    expect(con.subItems[0]).not.toHaveProperty('fotoSugerida')
    expect(Object.keys(con.subItems[0])).toEqual(['numeracion', 'actividadNombre', 'descripcion', 'tareas', 'imagenes'])
  })

  it('(Tarea 2, sesión 2) fotoSugerida de tarea NUNCA llega al dataBag — es solo UI, no se exporta al docx', () => {
    // El fixture de la tarea 0 del subItem[0] trae fotoSugerida (ver arriba).
    const primeraTarea = con.subItems[0].tareas[0] as Record<string, unknown>
    expect(primeraTarea).not.toHaveProperty('fotoSugerida')
    expect(Object.keys(primeraTarea)).toEqual(['texto', 'imagenes'])
  })
})

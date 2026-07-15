import { construirDataBag } from '@/lib/planTrabajo/construirDataBag'
import type { ImagenResueltaTag } from '@/lib/planTrabajo/exportDocx'
import type { PlanAlcanceDetalladoEdt, PlanHistogramas } from '@/types/planTrabajo'
import type { PlanTrabajo, Cliente, Proyecto, PlanTrabajoImagen } from '@prisma/client'

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
    expect(Object.keys(con.subItems[0])).toEqual(['numeracion', 'actividadNombre', 'descripcion', 'tareas', 'imagenesSubItem'])
  })

  it('(Tarea 2, sesión 2) fotoSugerida de tarea NUNCA llega al dataBag — es solo UI, no se exporta al docx', () => {
    // El fixture de la tarea 0 del subItem[0] trae fotoSugerida (ver arriba).
    const primeraTarea = con.subItems[0].tareas[0] as Record<string, unknown>
    expect(primeraTarea).not.toHaveProperty('fotoSugerida')
    expect(Object.keys(primeraTarea)).toEqual(['texto', 'imagenes'])
  })
})

describe('construirDataBag — imágenes por tarea (Tarea 3, sesión 2)', () => {
  function imagenFixture(overrides: Partial<PlanTrabajoImagen>): PlanTrabajoImagen {
    return {
      id: 'img-default',
      planTrabajoId: 'plan-1',
      edtRef: 'edt-con',
      subItemRef: null,
      tareaRef: null,
      nombreArchivo: 'foto.jpg',
      urlArchivo: '',
      driveFileId: 'drive-1',
      tipoArchivo: null,
      tamano: null,
      caption: null,
      orden: 0,
      createdById: 'user-1',
      createdAt: new Date('2026-01-01'),
      ...overrides,
    } as unknown as PlanTrabajoImagen
  }

  const imagenResuelta: ImagenResueltaTag = { data: 'base64', width: 100, height: 100 }

  const imagenesAlcance: PlanTrabajoImagen[] = [
    // 2 imágenes de la tarea-1 (subItem act-1)
    imagenFixture({ id: 'img-tarea-1a', tareaRef: 'tarea-1', orden: 0 }),
    imagenFixture({ id: 'img-tarea-1b', tareaRef: 'tarea-1', orden: 1 }),
    // 1 imagen del subItem act-1 (no de ninguna tarea)
    imagenFixture({ id: 'img-subitem', subItemRef: 'act-1', orden: 0 }),
    // 1 imagen del EDT (ni subItemRef ni tareaRef)
    imagenFixture({ id: 'img-edt', orden: 0 }),
  ]
  const imagenesResueltas = new Map<string, ImagenResueltaTag | null>([
    ['img-tarea-1a', imagenResuelta],
    ['img-tarea-1b', imagenResuelta],
    ['img-subitem', imagenResuelta],
    ['img-edt', imagenResuelta],
  ])

  const dataBag = construirDataBag({
    plan: planFixture([edtDetallado()]),
    proyecto: proyectoFixture,
    organigramaPngBase64: '',
    imagenesAlcance,
    imagenesResueltas,
  })
  const alcance = dataBag.alcanceDetallado as Array<{
    edtNombre: string
    imagenes: unknown[]
    subItems: { actividadRefId?: string; imagenesSubItem: unknown[]; tareas: { imagenes: unknown[] }[] }[]
  }>
  const con = alcance.find(a => a.edtNombre === 'Construcción')!

  it('una tarea con 2 imágenes las recibe bajo tareas[].imagenes (no bajo el subItem)', () => {
    expect(con.subItems[0].tareas[0].imagenes).toHaveLength(2)
  })

  it('las imágenes de un subItem se reciben bajo imagenesSubItem (plantilla v6, {#imagenesSubItem})', () => {
    expect(con.subItems[0].imagenesSubItem).toHaveLength(1)
  })

  it('las demás tareas del mismo subItem no reciben imágenes ajenas', () => {
    expect(con.subItems[0].tareas[1].imagenes).toHaveLength(0)
    expect(con.subItems[0].tareas[2].imagenes).toHaveLength(0)
  })

  it('los tres niveles (EDT, subItem, tarea) no se mezclan entre sí', () => {
    // 1 imagen de EDT, 1 de subItem, 2 de tarea — cada una SOLO en su propio nivel.
    expect(con.imagenes).toHaveLength(1) // solo la del EDT
    expect(con.subItems[0].imagenesSubItem).toHaveLength(1) // solo la del subItem
    expect(con.subItems[0].tareas[0].imagenes).toHaveLength(2) // solo las de la tarea-1
    // Los demás subItems/tareas no reciben ninguna imagen ajena.
    expect(con.subItems[1].imagenesSubItem).toHaveLength(0)
    expect(con.subItems[2].imagenesSubItem).toHaveLength(0)
  })

  it('(tarea menor) numera los captions como "Figura {n}." correlativo, en el MISMO orden en que la plantilla las renderiza (tareas → imagenesSubItem → imagenes de EDT)', () => {
    const alcanceConCaptions = dataBag.alcanceDetallado as Array<{
      edtNombre: string
      imagenes: { caption: string }[]
      subItems: { imagenesSubItem: { caption: string }[]; tareas: { imagenes: { caption: string }[] }[] }[]
    }>
    const construccion = alcanceConCaptions.find(a => a.edtNombre === 'Construcción')!

    // Orden real de la plantilla: tarea-1 (2 imgs) -> imagenesSubItem del subItem (1 img) -> imagenes del EDT (1 img, al final).
    expect(construccion.subItems[0].tareas[0].imagenes[0].caption).toMatch(/^Figura 1\. /)
    expect(construccion.subItems[0].tareas[0].imagenes[1].caption).toMatch(/^Figura 2\. /)
    expect(construccion.subItems[0].imagenesSubItem[0].caption).toMatch(/^Figura 3\. /)
    expect(construccion.imagenes[0].caption).toMatch(/^Figura 4\. /)
  })
})

describe('construirDataBag — tareas excluidas del plan (Bloque 4.2 sesión 3)', () => {
  function imagenFixture(overrides: Partial<PlanTrabajoImagen>): PlanTrabajoImagen {
    return {
      id: 'img-default',
      planTrabajoId: 'plan-1',
      edtRef: 'edt-con',
      subItemRef: null,
      tareaRef: null,
      nombreArchivo: 'foto.jpg',
      urlArchivo: '',
      driveFileId: 'drive-1',
      tipoArchivo: null,
      tamano: null,
      caption: null,
      orden: 0,
      createdById: 'user-1',
      createdAt: new Date('2026-01-01'),
      ...overrides,
    } as unknown as PlanTrabajoImagen
  }

  function edtConTareaExcluida(): PlanAlcanceDetalladoEdt {
    const base = edtDetallado()
    return {
      ...base,
      subItems: base.subItems!.map((s, i) =>
        i !== 0 ? s : {
          ...s,
          tareas: s.tareas!.map(t => t.tareaRefId === 'tarea-2' ? { ...t, excluida: true } : t),
        }
      ),
    }
  }

  const imagenResuelta: ImagenResueltaTag = { data: 'base64', width: 100, height: 100 }
  // Imagen adjunta a la tarea EXCLUIDA — no debe aparecer en ningún lado del export.
  const imagenesAlcance: PlanTrabajoImagen[] = [imagenFixture({ id: 'img-tarea-excluida', tareaRef: 'tarea-2', orden: 0 })]
  const imagenesResueltas = new Map<string, ImagenResueltaTag | null>([['img-tarea-excluida', imagenResuelta]])

  const dataBag = construirDataBag({
    plan: planFixture([edtConTareaExcluida()]),
    proyecto: proyectoFixture,
    organigramaPngBase64: '',
    imagenesAlcance,
    imagenesResueltas,
  })
  const alcance = dataBag.alcanceDetallado as Array<{
    edtNombre: string
    subItems: { tareas: { texto: string; imagenes: unknown[] }[] }[]
  }>
  const con = alcance.find(a => a.edtNombre === 'Construcción')!

  it('la tarea excluida NO aparece en tareas[] del export (ni su viñeta ni sus imágenes)', () => {
    const tareas = con.subItems[0].tareas
    expect(tareas).toHaveLength(2) // de 3 tareas, 1 excluida -> quedan 2
    expect(tareas.some(t => t.texto.includes('Delimitar el área de trabajo'))).toBe(false)
  })

  it('las imágenes de la tarea excluida no consumen numeración de Figura ni aparecen en ningún otro nivel', () => {
    const tareas = con.subItems[0].tareas
    for (const t of tareas) expect(t.imagenes).toHaveLength(0)
  })

  it('las demás tareas (no excluidas) del subItem se exportan igual que siempre', () => {
    const textos = con.subItems[0].tareas.map(t => t.texto)
    expect(textos).toEqual([
      'Desenergizar y bloquear la alimentación mediante dispositivos DAE.',
      'Verificar ausencia de tensión con multímetro certificado.',
    ])
  })
})

/**
 * Capa dataBag/export para el histograma de equipo (informe §13, Bug 2):
 * `construirDataBag` es un passthrough — el `total` que llega a la plantilla
 * es exactamente el `total` que ya calculó `calcularHistogramasYCronograma`
 * (Etapa 1), sin recalcular nada. Este test fija ese contrato con un fixture
 * REALISTA (no `histogramas: null` como el resto del archivo) para que un
 * futuro refactor de construirDataBag no reintroduzca una suma silenciosa —
 * antes, ningún test tocaba este dato con valores que distinguieran
 * "suma de meses activos" de "pico real de personas" (12 tests verdes con un
 * docx roto, ver informe §13).
 */
describe('construirDataBag — histogramaEquipo (dataBag/export layer)', () => {
  it('el total que llega al tag {total} de la plantilla es el pico real, no la suma de meses activos', () => {
    const histogramas: PlanHistogramas = {
      meses: ['2026-07', '2026-08', '2026-09'],
      equipoTrabajo: [
        { etiqueta: 'Procura', valoresPorMes: [1, 1, 0], total: 1 }, // ya viene correcto de Etapa 1
        { etiqueta: 'Construccion', valoresPorMes: [0, 3, 4], total: 4 },
      ],
      horasHombre: [
        { etiqueta: 'Procura', valoresPorMes: [50, 50, 0], total: 100 },
        { etiqueta: 'Construccion', valoresPorMes: [0, 184, 184], total: 368 },
      ],
    }

    const plan = planFixture([])
    ;(plan as unknown as { histogramas: unknown }).histogramas = histogramas as unknown as PlanTrabajo['histogramas']

    const dataBag = construirDataBag({ plan, proyecto: proyectoFixture, organigramaPngBase64: '' })
    const histogramaEquipo = dataBag.histogramaEquipo as { etiqueta: string; total: number }[]
    const histogramaHH = dataBag.histogramaHH as { etiqueta: string; total: number }[]

    expect(histogramaEquipo.find(f => f.etiqueta === 'Procura')!.total).toBe(1)
    expect(histogramaEquipo.find(f => f.etiqueta === 'Construccion')!.total).toBe(4)
    // Regresión: el histograma de HH sigue siendo una suma, y totalHH sigue coincidiendo.
    expect(histogramaHH.reduce((s, f) => s + f.total, 0)).toBe(468)
    expect(dataBag.totalHH).toBe(468)
  })
})

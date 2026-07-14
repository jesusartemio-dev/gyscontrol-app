import PizZip from 'pizzip'
import { renderizarPlanTrabajoDocx, IMAGEN_PLACEHOLDER, type ImagenResueltaTag } from '@/lib/planTrabajo/exportDocx'
import { construirDataBag } from '@/lib/planTrabajo/construirDataBag'
import { generarHistogramaEquipoPng, generarHistogramaHHPng } from '@/lib/planTrabajo/generarHistogramaPng'
import { asertarXmlBienFormado } from '@/__tests__/testUtils/xmlTestUtils'
import type { PlanAlcanceDetalladoEdt, PlanHistogramas } from '@/types/planTrabajo'
import type { PlanTrabajo, Cliente, Proyecto, PlanTrabajoImagen } from '@prisma/client'

/**
 * Integración contra la plantilla REAL (plan-trabajo-nexa-template.docx) —
 * cubre los 2 bugs de docxtemplater-image-module-free corregidos junto con
 * este test (ver comentarios en exportDocx.ts):
 * 1) render() síncrono no soporta objetos {data,width,height} como valor de
 *    {%img} — corregido usando renderAsync().
 * 2) resolve() (la ruta de renderAsync) devuelve un objeto plano en vez de
 *    una Promise cuando el valor del tag es falsy ('' / null) — corregido
 *    reemplazando cualquier '' / null de imagen por IMAGEN_PLACEHOLDER antes
 *    de que llegue a docxtemplater.
 * Reproducido originalmente contra un plan real de producción (proyecto
 * f545f8a0-...) que fallaba con 500 al exportar.
 */

const PNG_1X1_BASE64 =
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAAC0lEQVQI12NgAAIABQAABjE+ibYAAAAASUVORK5CYII='

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
    objetivo: 'Objetivo de prueba.',
    alcanceGeneral: 'Alcance general de prueba.',
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
    incluirOrganigrama: true,
  } as unknown as PlanTrabajo
}

const proyectoFixture = {
  id: 'proyecto-1',
  codigo: 'GYS-0001',
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
    descripcion: 'Descripción general del EDT de Construcción.',
    tipoDetalle: 'detallado',
    edtRefId: 'edt-con',
    personalRequerido: [{ cantidad: 2, cargo: 'Técnico Operario' }],
    subItems: [],
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

function edtDetalladoConTareas(): PlanAlcanceDetalladoEdt {
  return {
    numeracion: '11.2',
    edtNombre: 'Construcción',
    edtCodigo: 'CON',
    faseNombre: 'EJECUCIÓN',
    faseAbreviatura: 'EJECUCIÓN',
    descripcion: 'Descripción general del EDT de Construcción.',
    tipoDetalle: 'detallado',
    edtRefId: 'edt-con',
    personalRequerido: [{ cantidad: 2, cargo: 'Técnico Operario' }],
    subItems: [
      {
        numeracion: '11.2.1',
        actividadNombre: 'Tendido de cable de fuerza',
        descripcion: 'Descripción específica de tendido.',
        actividadRefId: 'act-1',
        tareas: [
          { tareaRefId: 'tarea-1', nombre: 'desenergizar', texto: 'Desenergizar y bloquear la alimentación mediante dispositivos DAE.' },
          { tareaRefId: 'tarea-2', nombre: 'delimitar-area', texto: 'Delimitar el área de trabajo con cinta de seguridad y señalización visible.' },
        ],
      },
    ],
  }
}

function imagenFixture(id: string): PlanTrabajoImagen {
  return {
    id,
    planTrabajoId: 'plan-1',
    edtRef: 'edt-con',
    subItemRef: null,
    nombreArchivo: 'foto.jpg',
    urlArchivo: 'https://drive.google.com/file/d/dummy/view',
    driveFileId: 'dummy',
    tipoArchivo: 'image/jpeg',
    tamano: 1234,
    caption: 'Foto de prueba',
    orden: 0,
    createdAt: new Date('2026-01-01'),
    createdById: null,
  } as unknown as PlanTrabajoImagen
}

function partesXmlYRels(buffer: Buffer): { nombre: string; contenido: string }[] {
  const zip = new PizZip(buffer)
  return Object.keys(zip.files)
    .filter(nombre => !zip.files[nombre].dir && (nombre.endsWith('.xml') || nombre.endsWith('.rels')))
    .map(nombre => ({ nombre, contenido: zip.file(nombre)!.asText() }))
}

function asertarPaqueteBienFormado(buffer: Buffer): { nombre: string; contenido: string }[] {
  const partes = partesXmlYRels(buffer)
  expect(partes.length).toBeGreaterThan(5)
  for (const { nombre, contenido } of partes) asertarXmlBienFormado(contenido, nombre)
  return partes
}

/** Todo <wp:extent cx=".." cy=".."/> del documento — nunca debe haber cx/cy en 0 (Word puede mostrar "archivo dañado" con drawings de tamaño cero). */
function extentsDeImagenes(xml: string): { cx: number; cy: number }[] {
  return Array.from(xml.matchAll(/<wp:extent cx="(\d+)" cy="(\d+)"/g)).map(m => ({
    cx: Number(m[1]),
    cy: Number(m[2]),
  }))
}

describe('renderizarPlanTrabajoDocx — imágenes contra la plantilla REAL', () => {
  it('(a) imagen real {data,width,height} en el alcance detallado: renderAsync produce un docx válido', async () => {
    const imagenesAlcance = [imagenFixture('img-1')]
    const imagenesResueltas = new Map<string, ImagenResueltaTag | null>([
      ['img-1', { data: `data:image/png;base64,${PNG_1X1_BASE64}`, width: 300, height: 180 }],
    ])

    const dataBag = construirDataBag({
      plan: planFixture([edtDetallado()]),
      proyecto: proyectoFixture,
      organigramaPngBase64: `data:image/png;base64,${PNG_1X1_BASE64}`,
      imagenesAlcance,
      imagenesResueltas,
    })

    const buffer = await renderizarPlanTrabajoDocx({ dataBag })
    expect(Buffer.isBuffer(buffer)).toBe(true)

    const partes = asertarPaqueteBienFormado(buffer)
    const documentXml = partes.find(p => p.nombre === 'word/document.xml')!.contenido
    const extents = extentsDeImagenes(documentXml)
    expect(extents.length).toBeGreaterThan(0)
    for (const { cx, cy } of extents) {
      expect(cx).toBeGreaterThan(0)
      expect(cy).toBeGreaterThan(0)
    }
  })

  it('(b) organigramaPng ausente/falsy: se sustituye por IMAGEN_PLACEHOLDER y el export no truena', async () => {
    const dataBag = construirDataBag({
      plan: planFixture([edtDetallado()]),
      proyecto: proyectoFixture,
      organigramaPngBase64: '',
    })

    expect(dataBag.organigramaPng).toEqual(IMAGEN_PLACEHOLDER)

    const buffer = await renderizarPlanTrabajoDocx({ dataBag })
    expect(Buffer.isBuffer(buffer)).toBe(true)

    const partes = asertarPaqueteBienFormado(buffer)
    const documentXml = partes.find(p => p.nombre === 'word/document.xml')!.contenido
    // El placeholder (width/height en 0 en IMAGEN_PLACEHOLDER) nunca debe llegar
    // a un <wp:extent> de tamaño cero — getSize lo colapsa a 1x1 px reales.
    for (const { cx, cy } of extentsDeImagenes(documentXml)) {
      expect(cx).toBeGreaterThan(0)
      expect(cy).toBeGreaterThan(0)
    }
  })

  it('(c) imagen del alcance detallado inaccesible (Drive): se sustituye por IMAGEN_PLACEHOLDER y el export se completa sin romperse', async () => {
    const imagenesAlcance = [imagenFixture('img-inaccesible')]
    // resolverImagenesAlcance.ts devuelve null cuando la imagen no se pudo leer de Drive.
    const imagenesResueltas = new Map<string, ImagenResueltaTag | null>([['img-inaccesible', null]])

    const dataBag = construirDataBag({
      plan: planFixture([edtDetallado()]),
      proyecto: proyectoFixture,
      organigramaPngBase64: `data:image/png;base64,${PNG_1X1_BASE64}`,
      imagenesAlcance,
      imagenesResueltas,
    })

    const alcance = dataBag.alcanceDetallado as Array<{ imagenes: { img: ImagenResueltaTag }[] }>
    expect(alcance[0].imagenes[0].img).toEqual(IMAGEN_PLACEHOLDER)

    const buffer = await renderizarPlanTrabajoDocx({ dataBag })
    expect(Buffer.isBuffer(buffer)).toBe(true)
    asertarPaqueteBienFormado(buffer)
  })
})

describe('renderizarPlanTrabajoDocx — gráficos de histograma (Bloque 4.2, Tarea 3)', () => {
  const histogramasFixture: PlanHistogramas = {
    meses: ['2026-02', '2026-03'],
    equipoTrabajo: [{ etiqueta: 'Construcción', valoresPorMes: [1, 1], total: 2 }],
    horasHombre: [{ etiqueta: 'Construcción', valoresPorMes: [80, 80], total: 160 }],
  }

  it('con datos: los dos gráficos se generan y el docx los renderiza sin drawings de tamaño cero', async () => {
    const [histogramaEquipoPng, histogramaHHPng] = await Promise.all([
      generarHistogramaEquipoPng(histogramasFixture),
      generarHistogramaHHPng(histogramasFixture),
    ])

    const dataBag = construirDataBag({
      plan: planFixture([edtDetallado()]),
      proyecto: proyectoFixture,
      organigramaPngBase64: `data:image/png;base64,${PNG_1X1_BASE64}`,
      histogramaEquipoPng,
      histogramaHHPng,
    })

    expect(dataBag.tieneHistogramaEquipoPng).toBe(true)
    expect(dataBag.tieneHistogramaHHPng).toBe(true)

    const buffer = await renderizarPlanTrabajoDocx({ dataBag })
    const partes = asertarPaqueteBienFormado(buffer)
    const documentXml = partes.find(p => p.nombre === 'word/document.xml')!.contenido
    for (const { cx, cy } of extentsDeImagenes(documentXml)) {
      expect(cx).toBeGreaterThan(0)
      expect(cy).toBeGreaterThan(0)
    }
  })

  it('sin datos (plan nuevo, aún sin Etapa 1 calculada): los flags quedan en false y el export no truena', async () => {
    const dataBag = construirDataBag({
      plan: planFixture([edtDetallado()]),
      proyecto: proyectoFixture,
      organigramaPngBase64: `data:image/png;base64,${PNG_1X1_BASE64}`,
    })

    expect(dataBag.tieneHistogramaEquipoPng).toBe(false)
    expect(dataBag.tieneHistogramaHHPng).toBe(false)

    const buffer = await renderizarPlanTrabajoDocx({ dataBag })
    expect(Buffer.isBuffer(buffer)).toBe(true)
    asertarPaqueteBienFormado(buffer)
  })
})

describe('renderizarPlanTrabajoDocx — viñetas de tareas por subItem (Bloque 4.2, Tarea 4)', () => {
  it('el docx real renderiza cada viñeta de tarea dentro de {#subItems}/{#tareas}, sin dejar tags crudos', async () => {
    const dataBag = construirDataBag({
      plan: planFixture([edtDetalladoConTareas()]),
      proyecto: proyectoFixture,
      organigramaPngBase64: `data:image/png;base64,${PNG_1X1_BASE64}`,
    })

    const buffer = await renderizarPlanTrabajoDocx({ dataBag })
    const partes = asertarPaqueteBienFormado(buffer)
    const documentXml = partes.find(p => p.nombre === 'word/document.xml')!.contenido

    expect(documentXml).toContain('Desenergizar y bloquear la alimentación mediante dispositivos DAE.')
    expect(documentXml).toContain('Delimitar el área de trabajo con cinta de seguridad y señalización visible.')
    expect(documentXml).not.toMatch(/\{#tareas\}|\{\/tareas\}|\{texto\}/)
  })
})

describe('renderizarPlanTrabajoDocx — personalRequerido condicional (plantilla v5, {#tienePersonalRequerido})', () => {
  const LINEA_INTRO_PERSONAL = 'Para el desarrollo de los trabajos se necesitará la intervención del siguiente personal:'

  it('un EDT con personalRequerido: dataBag.tienePersonalRequerido=true y el docx renderiza la línea introductoria + la fila de personal, sin tags crudos', async () => {
    const dataBag = construirDataBag({
      plan: planFixture([edtDetallado()]),
      proyecto: proyectoFixture,
      organigramaPngBase64: `data:image/png;base64,${PNG_1X1_BASE64}`,
    })
    const alcance = dataBag.alcanceDetallado as Array<{ edtNombre: string; tienePersonalRequerido: boolean }>
    expect(alcance.find(a => a.edtNombre === 'Construcción')!.tienePersonalRequerido).toBe(true)

    const buffer = await renderizarPlanTrabajoDocx({ dataBag })
    const partes = asertarPaqueteBienFormado(buffer)
    const documentXml = partes.find(p => p.nombre === 'word/document.xml')!.contenido

    expect(documentXml).toContain(LINEA_INTRO_PERSONAL)
    expect(documentXml).toContain('Técnico Operario')
    expect(documentXml).not.toMatch(/\{#tienePersonalRequerido\}|\{\/tienePersonalRequerido\}/)
  })

  it('un EDT sin personalRequerido: dataBag.tienePersonalRequerido=false y el docx NO renderiza ni la línea introductoria ni la lista (bloque completo ausente)', async () => {
    const dataBag = construirDataBag({
      plan: planFixture([edtResumido()]),
      proyecto: proyectoFixture,
      organigramaPngBase64: `data:image/png;base64,${PNG_1X1_BASE64}`,
    })
    const alcance = dataBag.alcanceDetallado as Array<{ edtNombre: string; tienePersonalRequerido: boolean }>
    expect(alcance.find(a => a.edtNombre === 'Planificación General')!.tienePersonalRequerido).toBe(false)

    const buffer = await renderizarPlanTrabajoDocx({ dataBag })
    const partes = asertarPaqueteBienFormado(buffer)
    const documentXml = partes.find(p => p.nombre === 'word/document.xml')!.contenido

    expect(documentXml).not.toContain(LINEA_INTRO_PERSONAL)
  })
})

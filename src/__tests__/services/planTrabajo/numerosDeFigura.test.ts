import { calcularNumerosDeFigura } from '@/lib/planTrabajo/numerosDeFigura'
import type { PlanAlcanceDetalladoEdt } from '@/types/planTrabajo'
import type { PlanTrabajoImagen } from '@prisma/client'

/**
 * Compartida por construirDataBag.ts (export) y AlcanceDetalladoView.tsx
 * (preview) — el número que ve el usuario en la app debe ser SIEMPRE el
 * mismo que sale en el docx. Cobertura directa de la función pura (la
 * cobertura indirecta ya existe en construirDataBag.test.ts/exportDocx.test.ts).
 */

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

function edtFixture(): PlanAlcanceDetalladoEdt {
  return {
    numeracion: '11.2',
    edtNombre: 'Construcción',
    edtCodigo: 'CON',
    faseNombre: 'EJECUCIÓN',
    faseAbreviatura: 'EJECUCIÓN',
    descripcion: 'Descripción general.',
    tipoDetalle: 'detallado',
    edtRefId: 'edt-con',
    subItems: [
      {
        numeracion: '11.2.1',
        actividadNombre: 'Tendido de cable de fuerza',
        descripcion: 'Descripción de la actividad.',
        actividadRefId: 'act-1',
        tareas: [
          { tareaRefId: 'tarea-1', nombre: 'desenergizar', texto: 'Desenergizar.' },
          { tareaRefId: 'tarea-2', nombre: 'delimitar-area', texto: 'Delimitar el área.', excluida: true },
        ],
      },
    ],
  }
}

describe('calcularNumerosDeFigura', () => {
  it('numera en el orden del docx: tareas -> imagenesSubItem -> imagenes de EDT', () => {
    const imagenes: PlanTrabajoImagen[] = [
      imagenFixture({ id: 'img-tarea', tareaRef: 'tarea-1', orden: 0 }),
      imagenFixture({ id: 'img-subitem', subItemRef: 'act-1', orden: 0 }),
      imagenFixture({ id: 'img-edt', orden: 0 }),
    ]

    const numeros = calcularNumerosDeFigura([edtFixture()], imagenes)

    expect(numeros.get('img-tarea')).toBe(1)
    expect(numeros.get('img-subitem')).toBe(2)
    expect(numeros.get('img-edt')).toBe(3)
  })

  it('una imagen de una tarea EXCLUIDA no consume número ni aparece en el mapa', () => {
    const imagenes: PlanTrabajoImagen[] = [
      imagenFixture({ id: 'img-tarea-excluida', tareaRef: 'tarea-2', orden: 0 }),
      imagenFixture({ id: 'img-edt', orden: 0 }),
    ]

    const numeros = calcularNumerosDeFigura([edtFixture()], imagenes)

    expect(numeros.has('img-tarea-excluida')).toBe(false)
    expect(numeros.get('img-edt')).toBe(1) // sigue siendo 1, no 2 — la excluida no consumió número
  })

  it('respeta el orden (campo `orden`) entre varias imágenes del mismo nodo', () => {
    const imagenes: PlanTrabajoImagen[] = [
      imagenFixture({ id: 'img-b', subItemRef: 'act-1', orden: 1 }),
      imagenFixture({ id: 'img-a', subItemRef: 'act-1', orden: 0 }),
    ]

    const numeros = calcularNumerosDeFigura([edtFixture()], imagenes)

    expect(numeros.get('img-a')).toBe(1)
    expect(numeros.get('img-b')).toBe(2)
  })

  it('la numeración es correlativa GLOBAL entre EDTs — no se reinicia por EDT', () => {
    const segundoEdt: PlanAlcanceDetalladoEdt = {
      ...edtFixture(),
      edtRefId: 'edt-otro',
      edtNombre: 'Otro EDT',
      subItems: [{ numeracion: '11.3.1', actividadNombre: 'Otra actividad', descripcion: 'x', actividadRefId: 'act-2' }],
    }
    const imagenes: PlanTrabajoImagen[] = [
      imagenFixture({ id: 'img-primer-edt', edtRef: 'edt-con', orden: 0 }),
      imagenFixture({ id: 'img-segundo-edt', edtRef: 'edt-otro', orden: 0 }),
    ]

    const numeros = calcularNumerosDeFigura([edtFixture(), segundoEdt], imagenes)

    expect(numeros.get('img-primer-edt')).toBe(1)
    expect(numeros.get('img-segundo-edt')).toBe(2)
  })

  it('sin imágenes, devuelve un mapa vacío', () => {
    expect(calcularNumerosDeFigura([edtFixture()], []).size).toBe(0)
  })
})

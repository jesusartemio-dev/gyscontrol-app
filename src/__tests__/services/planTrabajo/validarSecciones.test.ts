import { planAlcanceDetalladoSubItemSchema, planAlcanceDetalladoEdtSchema } from '@/lib/validators/planTrabajo'

/**
 * Regresión de un patrón de bug ya visto en este proyecto (cronogramaIA,
 * commit 598c8f3b): un schema Zod que no declara un campo nuevo lo descarta
 * en silencio al validar, aunque el builder/IA lo produzcan correctamente.
 * Acá: `tareas` (Tarea 4) y `fotoSugerida` (Tarea 5) del subItem — si el
 * schema no los declara, la Etapa 2 los persiste sin ellos aunque
 * generarAlcanceDetallado.ts los redacte bien.
 */
describe('planAlcanceDetalladoSubItemSchema — tareas/fotoSugerida sobreviven la validación', () => {
  it('no descarta tareas ni fotoSugerida al parsear un subItem completo', () => {
    const subItem = {
      numeracion: '11.2.1',
      actividadNombre: 'Tendido de cable de fuerza',
      descripcion: 'x'.repeat(60),
      actividadRefId: 'act-1',
      tareas: [
        { tareaRefId: 'tarea-1', nombre: 'desenergizar', texto: 'Desenergizar y bloquear la alimentación.' },
      ],
      fotoSugerida: 'Foto del área antes de iniciar el tendido de cable.',
    }

    const parseado = planAlcanceDetalladoSubItemSchema.parse(subItem)

    expect(parseado.tareas).toEqual(subItem.tareas)
    expect(parseado.fotoSugerida).toBe(subItem.fotoSugerida)
  })

  it('acepta un subItem sin tareas ni fotoSugerida (resumido, o antes de que la IA las genere)', () => {
    const subItem = {
      numeracion: '11.1.1',
      actividadNombre: 'Kickoff',
      descripcion: 'x'.repeat(60),
    }
    expect(() => planAlcanceDetalladoSubItemSchema.parse(subItem)).not.toThrow()
  })

  it('un EDT completo con subItems anidados conserva tareas/fotoSugerida tras validar', () => {
    const edt = {
      numeracion: '11.2',
      edtNombre: 'Construcción',
      edtCodigo: 'CON',
      faseNombre: 'EJECUCIÓN',
      faseAbreviatura: 'EJECUCIÓN',
      descripcion: 'x'.repeat(60),
      tipoDetalle: 'detallado' as const,
      subItems: [
        {
          numeracion: '11.2.1',
          actividadNombre: 'Tendido de cable de fuerza',
          descripcion: 'x'.repeat(60),
          tareas: [{ tareaRefId: 'tarea-1', nombre: 'desenergizar', texto: 'Desenergizar la línea.' }],
          fotoSugerida: 'Foto del área antes de intervenir.',
        },
      ],
    }

    const parseado = planAlcanceDetalladoEdtSchema.parse(edt)
    expect(parseado.subItems?.[0].tareas).toEqual(edt.subItems[0].tareas)
    expect(parseado.subItems?.[0].fotoSugerida).toBe(edt.subItems[0].fotoSugerida)
  })
})

import { sugerirDependencias } from '@/lib/cronogramaIA/reglasDependencias'
import { FAMILIA_SOPORTES_FABRICADOS } from '@/lib/cronogramaIA/vocabularioFamiliasPro'

describe('sugerirDependencias', () => {
  it('sugiere Cierre Contractual y Valorización Final después de Firma del Acta', () => {
    const r = sugerirDependencias([
      { id: 'a', nombreCatalogo: 'Firma del Acta de Conformidad', edtNombre: 'CIE', actividadNombre: 'Cierre Técnico' },
      { id: 'b', nombreCatalogo: 'Cierre Contractual', edtNombre: 'CIE', actividadNombre: 'Cierre de Gestión' },
      { id: 'c', nombreCatalogo: 'Valorización Final y Conformidad HES', edtNombre: 'CIE', actividadNombre: 'Cierre de Gestión' },
    ])
    expect(r.sugerencias).toEqual(
      expect.arrayContaining([
        { tareaOrigenId: 'a', tareaDependienteId: 'b', tipo: 'finish_to_start' },
        { tareaOrigenId: 'a', tareaDependienteId: 'c', tipo: 'finish_to_start' },
      ])
    )
    expect(r.advertencias).toHaveLength(0)
  })

  it('sugiere Desmontaje de Andamios después de Armado de Andamios — matcheando por nombre REAL de catálogo, no por el nombre de presentación (con prefijo de alias)', () => {
    const r = sugerirDependencias([
      { id: 'a', nombreCatalogo: 'Armado de Andamios', edtNombre: 'CON', actividadNombre: 'Zona Elevador' },
      { id: 'b', nombreCatalogo: 'Desmontaje de Andamios', edtNombre: 'CON', actividadNombre: 'Zona Elevador' },
    ])
    expect(r.sugerencias).toEqual([{ tareaOrigenId: 'a', tareaDependienteId: 'b', tipo: 'finish_to_start' }])
  })

  it('sugiere la cadena Energización -> Frío -> Caliente en CMM', () => {
    const r = sugerirDependencias([
      { id: 'a', nombreCatalogo: 'Energización de Tableros', edtNombre: 'CMM', actividadNombre: 'Comisionamiento' },
      { id: 'b', nombreCatalogo: 'Comisionamiento en Frío', edtNombre: 'CMM', actividadNombre: 'Comisionamiento' },
      { id: 'c', nombreCatalogo: 'Comisionamiento en Caliente', edtNombre: 'CMM', actividadNombre: 'Comisionamiento' },
    ])
    expect(r.sugerencias).toEqual(
      expect.arrayContaining([
        { tareaOrigenId: 'a', tareaDependienteId: 'b', tipo: 'finish_to_start' },
        { tareaOrigenId: 'b', tareaDependienteId: 'c', tipo: 'finish_to_start' },
      ])
    )
  })

  it('sugiere Recepción en Almacén (PRO) antes de Preparación y Traslado de Materiales (CON)', () => {
    const r = sugerirDependencias([
      { id: 'a', nombreCatalogo: 'Recepción en Almacén GYS', edtNombre: 'PRO', actividadNombre: 'Cables' },
      { id: 'b', nombreCatalogo: 'Preparación y Traslado de Materiales', edtNombre: 'CON', actividadNombre: 'Zona Elevador' },
    ])
    expect(r.sugerencias).toEqual([{ tareaOrigenId: 'a', tareaDependienteId: 'b', tipo: 'finish_to_start' }])
  })

  it('no sugiere nada si falta una de las dos tareas de la regla (proyecto sin ese EDT)', () => {
    const r = sugerirDependencias([{ id: 'a', nombreCatalogo: 'Firma del Acta de Conformidad', edtNombre: 'CIE', actividadNombre: 'Cierre Técnico' }])
    expect(r.sugerencias).toHaveLength(0)
  })

  it('lista vacía no genera ninguna dependencia', () => {
    expect(sugerirDependencias([]).sugerencias).toHaveLength(0)
  })

  describe('Soportes Fabricados (PRO) depende de Planos Típicos de Montaje (PLA)', () => {
    it('con PLA en el plan, sugiere la dependencia', () => {
      const r = sugerirDependencias([
        { id: 'pla-1', nombreCatalogo: 'Planos Típicos de Montaje', edtNombre: 'PLA', actividadNombre: 'Disciplina Eléctrica' },
        { id: 'pro-1', nombreCatalogo: 'Solicitud de Cotización', edtNombre: 'PRO', actividadNombre: FAMILIA_SOPORTES_FABRICADOS },
      ])
      expect(r.sugerencias).toEqual([{ tareaOrigenId: 'pla-1', tareaDependienteId: 'pro-1', tipo: 'finish_to_start' }])
      expect(r.advertencias).toHaveLength(0)
    })

    it('sin PLA en el plan, no sugiere la dependencia y emite advertencia', () => {
      const r = sugerirDependencias([{ id: 'pro-1', nombreCatalogo: 'Solicitud de Cotización', edtNombre: 'PRO', actividadNombre: FAMILIA_SOPORTES_FABRICADOS }])
      expect(r.sugerencias).toHaveLength(0)
      expect(r.advertencias).toEqual(['Soportes Fabricados requiere planos previos — verifica quién los elabora.'])
    })

    it('una "Solicitud de Cotización" de OTRA familia de PRO no dispara la regla (scoping por actividadNombre)', () => {
      const r = sugerirDependencias([
        { id: 'pla-1', nombreCatalogo: 'Planos Típicos de Montaje', edtNombre: 'PLA', actividadNombre: 'Disciplina Eléctrica' },
        { id: 'pro-1', nombreCatalogo: 'Solicitud de Cotización', edtNombre: 'PRO', actividadNombre: 'Cables' },
      ])
      expect(r.sugerencias).toHaveLength(0)
      expect(r.advertencias).toHaveLength(0)
    })
  })
})

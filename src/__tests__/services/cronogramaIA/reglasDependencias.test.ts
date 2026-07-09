import { sugerirDependencias } from '@/lib/cronogramaIA/reglasDependencias'

describe('sugerirDependencias', () => {
  it('sugiere Cierre Contractual y Valorización Final después de Firma del Acta', () => {
    const r = sugerirDependencias([
      { id: 'a', nombre: 'Firma del Acta de Conformidad', edtNombre: 'CIE' },
      { id: 'b', nombre: 'Cierre Contractual', edtNombre: 'CIE' },
      { id: 'c', nombre: 'Valorización Final y Conformidad HES', edtNombre: 'CIE' },
    ])
    expect(r).toEqual(
      expect.arrayContaining([
        { tareaOrigenId: 'a', tareaDependienteId: 'b', tipo: 'finish_to_start' },
        { tareaOrigenId: 'a', tareaDependienteId: 'c', tipo: 'finish_to_start' },
      ])
    )
  })

  it('sugiere Desmontaje de Andamios después de Armado de Andamios', () => {
    const r = sugerirDependencias([
      { id: 'a', nombre: 'Armado de Andamios', edtNombre: 'CON' },
      { id: 'b', nombre: 'Desmontaje de Andamios', edtNombre: 'CON' },
    ])
    expect(r).toEqual([{ tareaOrigenId: 'a', tareaDependienteId: 'b', tipo: 'finish_to_start' }])
  })

  it('sugiere la cadena Energización -> Frío -> Caliente en CMM', () => {
    const r = sugerirDependencias([
      { id: 'a', nombre: 'Energización de Tableros', edtNombre: 'CMM' },
      { id: 'b', nombre: 'Comisionamiento en Frío', edtNombre: 'CMM' },
      { id: 'c', nombre: 'Comisionamiento en Caliente', edtNombre: 'CMM' },
    ])
    expect(r).toEqual(
      expect.arrayContaining([
        { tareaOrigenId: 'a', tareaDependienteId: 'b', tipo: 'finish_to_start' },
        { tareaOrigenId: 'b', tareaDependienteId: 'c', tipo: 'finish_to_start' },
      ])
    )
  })

  it('sugiere Recepción en Almacén (PRO) antes de Preparación y Traslado de Materiales (CON)', () => {
    const r = sugerirDependencias([
      { id: 'a', nombre: 'Recepción en Almacén GYS', edtNombre: 'PRO' },
      { id: 'b', nombre: 'Preparación y Traslado de Materiales', edtNombre: 'CON' },
    ])
    expect(r).toEqual([{ tareaOrigenId: 'a', tareaDependienteId: 'b', tipo: 'finish_to_start' }])
  })

  it('no sugiere nada si falta una de las dos tareas de la regla (proyecto sin ese EDT)', () => {
    const r = sugerirDependencias([{ id: 'a', nombre: 'Firma del Acta de Conformidad', edtNombre: 'CIE' }])
    expect(r).toHaveLength(0)
  })

  it('lista vacía no genera ninguna dependencia', () => {
    expect(sugerirDependencias([])).toHaveLength(0)
  })
})

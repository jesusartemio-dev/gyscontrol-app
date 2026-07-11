/**
 * Test de aceptación 6a: organigrama REAL del proyecto G300 (cargoLabel
 * verbatim tal como aparece en /proyectos/[id]/organigrama, confirmado por
 * el usuario — ver query de verificación en la PR/commit). No pega contra
 * la base de datos (resolverOrganigramaProyecto/calcularRolResponsable son
 * puras) — usa los mismos strings reales como fixture, que es justamente lo
 * que valida el matcher: cargoLabel de producción, no sintético.
 */
import { resolverOrganigramaProyecto } from '@/lib/cronogramaResponsables/resolverOrganigrama'
import { calcularRolResponsable } from '@/lib/cronogramaResponsables/reglasResponsable'
import { asignarResponsablesEstructura } from '@/lib/cronogramaResponsables/asignarResponsablesEstructura'
import type { FilaEdt, FilaActividad, FilaTarea } from '@/lib/cronogramaIA/construirEstructuraReal'

const FECHA = new Date('2026-01-01')

// cargoLabel verbatim de G300 (confirmado por el usuario) + orden real de
// aparición en el organigrama. Los técnicos de campo y los nodos sin nombre
// de persona confirmado quedan sin userId (vacantes) — no se inventan.
const ORG_NODOS_G300 = [
  { id: 'n-ger-gral', userId: null, cargoLabel: 'Gerencia General', orden: 0 },
  { id: 'n-comercial', userId: null, cargoLabel: 'Comercial', orden: 1 },
  { id: 'n-ger-proy', userId: 'u-jesus', cargoLabel: 'Gerencia de Proyectos', orden: 2, user: { name: 'Jesús Mamani' } },
  { id: 'n-ssoma', userId: 'u-yony', cargoLabel: 'SSOMA', orden: 3, user: { name: 'Yony Apaza' } },
  { id: 'n-logistica', userId: null, cargoLabel: 'Logística', orden: 4 },
  { id: 'n-gestor', userId: 'u-piero', cargoLabel: 'Gestor de Proyectos', orden: 5, user: { name: 'Piero Ríos' } },
  { id: 'n-residente', userId: 'u-alonso', cargoLabel: 'Residente', orden: 6, user: { name: 'Alonso Piscoya' } },
  { id: 'n-supervisor', userId: 'u-tito', cargoLabel: 'Supervisor', orden: 7, user: { name: 'Tito Álvarez' } },
  { id: 'n-cadista', userId: 'u-armando', cargoLabel: 'Cadista', orden: 8, user: { name: 'Armando Chumbes' } },
  { id: 'n-tec-instr', userId: 'u-tec1', cargoLabel: 'Técnico Instrumentista', orden: 9, user: { name: 'Técnico 1' } },
  { id: 'n-tec-oper', userId: 'u-tec2', cargoLabel: 'Técnico Operario', orden: 10, user: { name: 'Técnico 2' } },
  { id: 'n-tec-ofic', userId: 'u-tec3', cargoLabel: 'Técnico Oficial', orden: 11, user: { name: 'Técnico 3' } },
  { id: 'n-tec-ayud', userId: 'u-tec4', cargoLabel: 'Técnico Ayudante', orden: 12, user: { name: 'Técnico 4' } },
]

function organigramaG300() {
  return resolverOrganigramaProyecto(ORG_NODOS_G300)
}

describe('G300 (real) — resolución de organigrama', () => {
  it('Gestor de Proyectos (Piero Ríos) resuelve el rol gestor', () => {
    expect(organigramaG300().porRol.get('gestor')?.nombre).toBe('Piero Ríos')
  })

  it('"Gerencia de Proyectos" (Jesús Mamani) NO matchea como gestor — son cargos distintos', () => {
    const { porRol } = organigramaG300()
    expect(porRol.get('gestor')?.userId).toBe('u-piero')
    expect(porRol.get('gestor')?.userId).not.toBe('u-jesus')
  })

  it('Residente (Alonso Piscoya) resuelve el rol residente', () => {
    expect(organigramaG300().porRol.get('residente')?.nombre).toBe('Alonso Piscoya')
  })

  it('Supervisor (Tito Álvarez) resuelve el rol supervisor', () => {
    expect(organigramaG300().porRol.get('supervisor')?.nombre).toBe('Tito Álvarez')
  })

  it('SSOMA (Yony Apaza) resuelve el rol ssoma', () => {
    expect(organigramaG300().porRol.get('ssoma')?.nombre).toBe('Yony Apaza')
  })

  it('Cadista (Armando Chumbes) resuelve el rol cadista', () => {
    expect(organigramaG300().porRol.get('cadista')?.nombre).toBe('Armando Chumbes')
  })

  it('"Comercial" y "Logística" SÍ matchean (comparten regla con logistica) — no quedan como no reconocidos', () => {
    const { cargoLabelsNoReconocidos } = organigramaG300()
    const labels = cargoLabelsNoReconocidos.map(n => n.cargoLabel)
    expect(labels).not.toEqual(expect.arrayContaining(['Comercial', 'Logística']))
  })

  it('cargoLabels no reconocidos: Gerencia General, Gerencia de Proyectos y los 4 Técnico-* — se auditan, nunca se inventan', () => {
    const { cargoLabelsNoReconocidos } = organigramaG300()
    const labels = cargoLabelsNoReconocidos.map(n => n.cargoLabel)
    expect(labels).toEqual(
      expect.arrayContaining([
        'Gerencia General',
        'Gerencia de Proyectos',
        'Técnico Instrumentista',
        'Técnico Operario',
        'Técnico Oficial',
        'Técnico Ayudante',
      ])
    )
  })
})

describe('G300 (real) — tabla EDT->rol aplicada a este organigrama', () => {
  const { porRol } = organigramaG300()

  it('GES, PRO y CIE (base) resuelven a Piero Ríos', () => {
    for (const codigo of ['GES', 'PRO', 'CIE']) {
      const rol = calcularRolResponsable({ edtCodigo: codigo })!
      expect(porRol.get(rol)?.nombre).toBe('Piero Ríos')
    }
  })

  it('ING y PLA (base) resuelven a Alonso Piscoya', () => {
    for (const codigo of ['ING', 'PLA']) {
      const rol = calcularRolResponsable({ edtCodigo: codigo })!
      expect(porRol.get(rol)?.nombre).toBe('Alonso Piscoya')
    }
  })

  it('CON y CMM resuelven a Tito Álvarez — corrige el bug real (antes caía en el Gestor)', () => {
    for (const codigo of ['CON', 'CMM']) {
      const rol = calcularRolResponsable({ edtCodigo: codigo })!
      expect(porRol.get(rol)?.nombre).toBe('Tito Álvarez')
    }
  })

  it('SEG (corrección: base = ssoma para todo el EDT) resuelve a Yony Apaza', () => {
    const rol = calcularRolResponsable({ edtCodigo: 'SEG' })!
    expect(porRol.get(rol)?.nombre).toBe('Yony Apaza')
  })

  it('CIE + Actividad "Cierre Técnico" resuelve a Tito Álvarez (excepción, no al Gestor base)', () => {
    const rol = calcularRolResponsable({ edtCodigo: 'CIE', actividadNombre: 'Cierre Técnico' })!
    expect(porRol.get(rol)?.nombre).toBe('Tito Álvarez')
  })
})

describe('G300 (real) — cascada completa sobre una estructura de cronograma', () => {
  function edt(id: string, nombre: string): FilaEdt {
    return {
      id, proyectoId: 'g300', proyectoCronogramaId: 'c-g300', proyectoFaseId: 'f-1', edtId: `cat-${id}`,
      nombre, descripcion: null, orden: 0, horasPlan: 0, fechaInicioPlan: FECHA, fechaFinPlan: FECHA,
      updatedAt: FECHA, responsableId: null,
    }
  }
  function actividad(id: string, proyectoEdtId: string, nombre: string): FilaActividad {
    return {
      id, proyectoEdtId, proyectoCronogramaId: 'c-g300', nombre, orden: 0, horasPlan: 0,
      fechaInicioPlan: FECHA, fechaFinPlan: FECHA, updatedAt: FECHA, responsableId: null,
    }
  }
  function tarea(id: string, proyectoEdtId: string, proyectoActividadId: string, nombre: string): FilaTarea {
    return {
      id, proyectoEdtId, proyectoActividadId, proyectoCronogramaId: 'c-g300', nombre, orden: 0,
      fechaInicio: FECHA, fechaFin: FECHA, horasEstimadas: 8, updatedAt: FECHA,
      catalogoServicioId: `serv-${id}`, recursoId: null, responsableId: null,
    }
  }

  it('la fila de Construcción queda con Tito Álvarez como responsable, no con Piero Ríos', () => {
    const edts = [edt('edt-con', 'Construcción')]
    const actividades = [actividad('act-con', 'edt-con', 'Zona 1')]
    const tareas = [tarea('t-con', 'edt-con', 'act-con', 'Montaje de bandejas')]
    const edtIdACodigo = new Map([['edt-con', 'CON']])

    const resultado = asignarResponsablesEstructura({ edts, actividades, tareas, edtIdACodigo }, organigramaG300().porRol)

    expect(resultado.edts[0].responsableId).toBe('u-tito')
    expect(resultado.edts[0].responsableId).not.toBe('u-piero')
    expect(resultado.tareas[0].responsableId).toBe('u-tito')
  })

  it('Cierre Técnico -> Tito, Cierre de Gestión -> Piero, dentro del mismo EDT CIE', () => {
    const edts = [edt('edt-cie', 'Cierre del Proyecto')]
    const actividades = [
      actividad('act-tec', 'edt-cie', 'Cierre Técnico'),
      actividad('act-ges', 'edt-cie', 'Cierre de Gestión'),
    ]
    const tareas = [
      tarea('t-tec', 'edt-cie', 'act-tec', 'Protocolo de entrega'),
      tarea('t-ges', 'edt-cie', 'act-ges', 'Cierre administrativo'),
    ]
    const edtIdACodigo = new Map([['edt-cie', 'CIE']])

    const resultado = asignarResponsablesEstructura({ edts, actividades, tareas, edtIdACodigo }, organigramaG300().porRol)

    expect(resultado.tareas.find(t => t.id === 't-tec')!.responsableId).toBe('u-tito')
    expect(resultado.tareas.find(t => t.id === 't-ges')!.responsableId).toBe('u-piero')
  })

  it('TODAS las tareas de SEG (IPERC, PETS, MEPP, Envío y Aprobación de Documentos HSE, Habilitación HSE de Personal) quedan con Yony Apaza (SSOMA)', () => {
    const edts = [edt('edt-seg', 'Seguridad')]
    const actividades = [actividad('act-seg', 'edt-seg', 'Documentos de Seguridad')]
    const tareas = [
      tarea('t-hse', 'edt-seg', 'act-seg', 'Envío y Aprobación de Documentos HSE'),
      tarea('t-iperc', 'edt-seg', 'act-seg', 'Elaboración de IPERC'),
      tarea('t-pets', 'edt-seg', 'act-seg', 'Elaboración de PETS'),
      tarea('t-mepp', 'edt-seg', 'act-seg', 'Elaboración de MEPP'),
      tarea('t-habilit', 'edt-seg', 'act-seg', 'Habilitación HSE de Personal'),
    ]
    const edtIdACodigo = new Map([['edt-seg', 'SEG']])

    const resultado = asignarResponsablesEstructura({ edts, actividades, tareas, edtIdACodigo }, organigramaG300().porRol)

    expect(resultado.edts[0].responsableId).toBe('u-yony')
    expect(resultado.actividades[0].responsableId).toBe('u-yony')
    for (const t of resultado.tareas) {
      expect(t.responsableId).toBe('u-yony')
    }
  })
})

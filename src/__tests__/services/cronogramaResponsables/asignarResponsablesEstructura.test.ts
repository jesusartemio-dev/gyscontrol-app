import {
  asignarResponsablesEstructura,
  previsualizarResponsablesDesdeNombres,
} from '@/lib/cronogramaResponsables/asignarResponsablesEstructura'
import { resolverOrganigramaProyecto } from '@/lib/cronogramaResponsables/resolverOrganigrama'
import type { FilaEdt, FilaActividad, FilaTarea } from '@/lib/cronogramaIA/construirEstructuraReal'
import type { ActividadPropuesta } from '@/types/cronogramaIA'

const FECHA = new Date('2026-01-01')

function edt(id: string, nombre: string): FilaEdt {
  return {
    id,
    proyectoId: 'p-1',
    proyectoCronogramaId: 'c-1',
    proyectoFaseId: 'f-1',
    edtId: `catalogo-${id}`,
    nombre,
    descripcion: null,
    orden: 0,
    horasPlan: 0,
    fechaInicioPlan: FECHA,
    fechaFinPlan: FECHA,
    updatedAt: FECHA,
    responsableId: null,
  }
}

function actividad(id: string, proyectoEdtId: string, nombre: string): FilaActividad {
  return {
    id,
    proyectoEdtId,
    proyectoCronogramaId: 'c-1',
    nombre,
    orden: 0,
    horasPlan: 0,
    fechaInicioPlan: FECHA,
    fechaFinPlan: FECHA,
    updatedAt: FECHA,
    responsableId: null,
  }
}

function tarea(id: string, proyectoEdtId: string, proyectoActividadId: string, nombre: string): FilaTarea {
  return {
    id,
    proyectoEdtId,
    proyectoActividadId,
    proyectoCronogramaId: 'c-1',
    nombre,
    orden: 0,
    fechaInicio: FECHA,
    fechaFin: FECHA,
    horasEstimadas: 8,
    updatedAt: FECHA,
    catalogoServicioId: `serv-${id}`,
    recursoId: null,
    responsableId: null,
  }
}

// Organigrama sintético reutilizado en varios casos de esta suite.
const ORGANIGRAMA_NODOS = [
  { id: 'n-gestor', userId: 'u-gestor', cargoLabel: 'Gestor de Proyectos', orden: 0, user: { name: 'Gestor Uno' } },
  { id: 'n-residente', userId: 'u-residente', cargoLabel: 'Residente', orden: 1, user: { name: 'Residente Uno' } },
  { id: 'n-supervisor', userId: 'u-supervisor', cargoLabel: 'Supervisor', orden: 2, user: { name: 'Supervisor Uno' } },
  { id: 'n-ssoma', userId: 'u-ssoma', cargoLabel: 'SSOMA', orden: 3, user: { name: 'SSOMA Uno' } },
]

function organigramaResuelto() {
  return resolverOrganigramaProyecto(ORGANIGRAMA_NODOS).porRol
}

describe('asignarResponsablesEstructura — cascada sobre EstructuraReal', () => {
  it('el rol del EDT se propaga a Actividad y Tarea (caso simple, GES)', () => {
    const edts = [edt('edt-ges', 'Gestión')]
    const actividades = [actividad('act-1', 'edt-ges', 'Documentos de Gestión')]
    const tareas = [tarea('t-1', 'edt-ges', 'act-1', 'Elaboración de Plan de Gestión')]
    const edtIdACodigo = new Map([['edt-ges', 'GES']])

    const resultado = asignarResponsablesEstructura({ edts, actividades, tareas, edtIdACodigo }, organigramaResuelto())

    expect(resultado.edts[0].responsableId).toBe('u-gestor')
    expect(resultado.actividades[0].responsableId).toBe('u-gestor')
    expect(resultado.tareas[0].responsableId).toBe('u-gestor')
    expect(resultado.asignaciones).toEqual([{ proyectoTareaId: 't-1', edtCodigo: 'GES', responsableIdAsignado: 'u-gestor' }])
    expect(resultado.advertencias).toEqual([])
  })

  it('CIE divide por nombre de Actividad: Cierre Técnico -> supervisor, Cierre de Gestión -> gestor', () => {
    const edts = [edt('edt-cie', 'Cierre del Proyecto')]
    const actividades = [
      actividad('act-tecnico', 'edt-cie', 'Cierre Técnico'),
      actividad('act-gestion', 'edt-cie', 'Cierre de Gestión'),
    ]
    const tareas = [
      tarea('t-tecnico', 'edt-cie', 'act-tecnico', 'Cualquier tarea técnica'),
      tarea('t-gestion', 'edt-cie', 'act-gestion', 'Cualquier tarea de gestión'),
    ]
    const edtIdACodigo = new Map([['edt-cie', 'CIE']])

    const resultado = asignarResponsablesEstructura({ edts, actividades, tareas, edtIdACodigo }, organigramaResuelto())

    // El EDT en sí queda con el rol base (gestor), nunca desviado por excepción.
    expect(resultado.edts[0].responsableId).toBe('u-gestor')
    const actTecnico = resultado.actividades.find(a => a.id === 'act-tecnico')!
    const actGestion = resultado.actividades.find(a => a.id === 'act-gestion')!
    expect(actTecnico.responsableId).toBe('u-supervisor')
    expect(actGestion.responsableId).toBe('u-gestor')
    expect(resultado.tareas.find(t => t.id === 't-tecnico')!.responsableId).toBe('u-supervisor')
    expect(resultado.tareas.find(t => t.id === 't-gestion')!.responsableId).toBe('u-gestor')
  })

  it('SEG (corrección: sin excepción por tarea) resuelve TODO el EDT/Actividad/Tarea a ssoma', () => {
    const edts = [edt('edt-seg', 'Seguridad')]
    const actividades = [actividad('act-seg', 'edt-seg', 'Documentos de Seguridad')]
    const tareas = [
      tarea('t-hse', 'edt-seg', 'act-seg', 'Envío y Aprobación de Documentos HSE'),
      tarea('t-iperc', 'edt-seg', 'act-seg', 'Elaboración de IPERC'),
    ]
    const edtIdACodigo = new Map([['edt-seg', 'SEG']])

    const resultado = asignarResponsablesEstructura({ edts, actividades, tareas, edtIdACodigo }, organigramaResuelto())

    expect(resultado.edts[0].responsableId).toBe('u-ssoma')
    expect(resultado.actividades[0].responsableId).toBe('u-ssoma')
    expect(resultado.tareas.find(t => t.id === 't-hse')!.responsableId).toBe('u-ssoma')
    expect(resultado.tareas.find(t => t.id === 't-iperc')!.responsableId).toBe('u-ssoma')
  })

  it('un EDT sin regla (ej. PRE, legacy) queda sin asignar + advertencia — nunca inventa', () => {
    const edts = [edt('edt-pre', 'Preparativos Técnicos')]
    const actividades = [actividad('act-pre', 'edt-pre', 'Preparativos')]
    const tareas = [tarea('t-pre', 'edt-pre', 'act-pre', 'Cualquier tarea')]
    const edtIdACodigo = new Map([['edt-pre', 'PRE']])

    const resultado = asignarResponsablesEstructura({ edts, actividades, tareas, edtIdACodigo }, organigramaResuelto())

    expect(resultado.edts[0].responsableId).toBeNull()
    expect(resultado.tareas[0].responsableId).toBeNull()
    expect(resultado.asignaciones).toEqual([])
    expect(resultado.advertencias.some(a => a.includes('Preparativos Técnicos'))).toBe(true)
  })

  it('un rol cubierto por la tabla pero sin persona en el organigrama de este proyecto queda sin asignar + advertencia', () => {
    const organigramaSinSupervisor = resolverOrganigramaProyecto(
      ORGANIGRAMA_NODOS.filter(n => n.cargoLabel !== 'Supervisor')
    ).porRol
    const edts = [edt('edt-con', 'Construcción')]
    const actividades = [actividad('act-con', 'edt-con', 'Construcción')]
    const tareas = [tarea('t-con', 'edt-con', 'act-con', 'Cualquier tarea de campo')]
    const edtIdACodigo = new Map([['edt-con', 'CON']])

    const resultado = asignarResponsablesEstructura({ edts, actividades, tareas, edtIdACodigo }, organigramaSinSupervisor)

    expect(resultado.edts[0].responsableId).toBeNull()
    expect(resultado.advertencias.some(a => a.includes('Supervisor'))).toBe(true)
  })

  it('caso end-to-end PLC -> Residente usando el organigrama sintético (prueba que la tabla es global, la resolución es por proyecto)', () => {
    const edts = [edt('edt-plc', 'Programación PLC')]
    const actividades = [actividad('act-plc', 'edt-plc', 'Programación')]
    const tareas = [tarea('t-plc', 'edt-plc', 'act-plc', 'Programación de PLC')]
    const edtIdACodigo = new Map([['edt-plc', 'PLC']])

    const resultado = asignarResponsablesEstructura({ edts, actividades, tareas, edtIdACodigo }, organigramaResuelto())

    expect(resultado.edts[0].responsableId).toBe('u-residente')
    expect(resultado.tareas[0].responsableId).toBe('u-residente')
  })
})

describe('previsualizarResponsablesDesdeNombres — dry-run sobre el borrador del wizard (Paso 2)', () => {
  it('agrupa por EDT y desglosa por rol, igual que el llamador sobre EstructuraReal', () => {
    const actividadesPropuestas: ActividadPropuesta[] = [
      {
        edtNombre: 'CIE',
        actividadNombre: 'Cierre Técnico',
        origen: 'determinista',
        tareas: [
          { catalogoServicioId: 's-1', nombre: 'Tarea técnica', cantidad: 1, nivelDificultad: 1, horaBase: 1, horaRepetido: 0, horasEstimadas: 1, incluida: true, orden: 0 },
        ],
      },
      {
        edtNombre: 'CIE',
        actividadNombre: 'Cierre de Gestión',
        origen: 'determinista',
        tareas: [
          { catalogoServicioId: 's-2', nombre: 'Tarea de gestión', cantidad: 1, nivelDificultad: 1, horaBase: 1, horaRepetido: 0, horasEstimadas: 1, incluida: true, orden: 0 },
        ],
      },
    ]

    const { preview, advertencias } = previsualizarResponsablesDesdeNombres(actividadesPropuestas, organigramaResuelto())

    expect(preview).toHaveLength(1)
    const cie = preview[0]
    expect(cie.edtCodigo).toBe('CIE')
    const rolSupervisor = cie.desglose.find(d => d.rol === 'supervisor')!
    const rolGestor = cie.desglose.find(d => d.rol === 'gestor')!
    expect(rolSupervisor.responsableNombre).toBe('Supervisor Uno')
    expect(rolGestor.responsableNombre).toBe('Gestor Uno')
    expect(advertencias).toEqual([])
  })

  it('tareas no incluidas (incluida=false) no cuentan para el desglose', () => {
    const actividadesPropuestas: ActividadPropuesta[] = [
      {
        edtNombre: 'GES',
        actividadNombre: 'Documentos de Gestión',
        origen: 'determinista',
        tareas: [
          { catalogoServicioId: 's-1', nombre: 'Tarea incluida', cantidad: 1, nivelDificultad: 1, horaBase: 1, horaRepetido: 0, horasEstimadas: 1, incluida: true, orden: 0 },
          { catalogoServicioId: 's-2', nombre: 'Tarea excluida', cantidad: 1, nivelDificultad: 1, horaBase: 1, horaRepetido: 0, horasEstimadas: 1, incluida: false, orden: 1 },
        ],
      },
    ]

    const { preview } = previsualizarResponsablesDesdeNombres(actividadesPropuestas, organigramaResuelto())
    expect(preview[0].desglose[0].tareasCount).toBe(1)
  })
})

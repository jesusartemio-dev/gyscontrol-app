import { tipoServicioDeFamilia, separarServiciosYAlquileres } from '@/lib/cronogramaIA/separarServiciosAlquileres'
import { construirEstructuraReal, type EdtCatalogoInfo } from '@/lib/cronogramaIA/construirEstructuraReal'
import type { ActividadPropuesta, CatalogoServicioParaWizard, TareaPropuesta } from '@/types/cronogramaIA'

const config = { brownfield: false, ingenieriaDetalle: false, nPets: 0, tableros: [], plcs: [], hmiCantidad: 0 } as any

function servicioSer(id: string, nombre: string, tags: string[], orden: number): CatalogoServicioParaWizard {
  return { id, nombre, descripcion: '', edtNombre: 'SER', actividadTag: tags, filtroAlcance: 'general', notaCantidad: null, horaBase: 1, horaRepetido: 1, cantidad: 1, nivelDificultad: 1, orden, unidadNombre: 'Evento', recursoNombre: 'Gestor' }
}
const SERVICIOS_SER = [
  servicioSer('s1', 'Solicitud de Cotización', ['Alquiler', 'Subcontrato'], 1),
  servicioSer('s2', 'Emisión de Orden de Servicio', ['Alquiler', 'Subcontrato'], 2),
  servicioSer('s3', 'Movilización a Obra', ['Alquiler'], 3),
  servicioSer('s4', 'Habilitación Subcontratista', ['Subcontrato'], 4),
  servicioSer('s5', 'Desmovilización', ['Alquiler', 'Subcontrato'], 5),
  servicioSer('s6', 'Conformidad del Servicio', ['Subcontrato'], 6),
  servicioSer('s7', 'Servicio viejo', ['Obsoleto'], 7),
]
const tarea = (nombre: string): TareaPropuesta => ({ catalogoServicioId: 'p', nombre, cantidad: 1, nivelDificultad: 1, horaBase: 2, horaRepetido: 1, horasEstimadas: 2, incluida: true, orden: 0 })
const actPro = (nombre: string): ActividadPropuesta => ({ edtNombre: 'PRO', actividadNombre: nombre, tareas: [tarea(`${nombre} - Solicitud de Cotización`)], origen: 'ia' })

describe('tipoServicioDeFamilia', () => {
  it('usa el grupo del vocabulario oficial', () => {
    expect(tipoServicioDeFamilia('Equipos de Elevación y Acceso')).toBe('alquiler')
    expect(tipoServicioDeFamilia('Transporte e Izajes')).toBe('subcontrato')
    expect(tipoServicioDeFamilia('Cables')).toBeNull()
  })
  it('fuera del vocabulario, por palabras clave (subcontrato gana: multicuerpo tercerizado)', () => {
    expect(tipoServicioDeFamilia('Andamios')).toBe('alquiler')
    expect(tipoServicioDeFamilia('Manlift')).toBe('alquiler')
    expect(tipoServicioDeFamilia('Andamios Multicuerpo')).toBe('subcontrato')
    expect(tipoServicioDeFamilia('Bandejas')).toBeNull()
  })
})

describe('separarServiciosYAlquileres', () => {
  it('materiales se quedan en PRO; alquileres y subcontratos pasan a SER con sus pasos', () => {
    const r = separarServiciosYAlquileres([actPro('Cables'), actPro('Andamios'), actPro('Andamios Multicuerpo')], SERVICIOS_SER, config)
    expect(r.filter(a => a.edtNombre === 'PRO').map(a => a.actividadNombre)).toEqual(['Cables'])
    const alq = r.find(a => a.actividadNombre === 'Andamios')!
    const sub = r.find(a => a.actividadNombre === 'Andamios Multicuerpo')!
    expect(alq.edtNombre).toBe('SER')
    expect(alq.tareas.map(t => t.nombre.replace(/^.* - /, ''))).toEqual(['Solicitud de Cotización', 'Emisión de Orden de Servicio', 'Movilización a Obra', 'Desmovilización'])
    expect(sub.tareas.map(t => t.nombre.replace(/^.* - /, ''))).toEqual(['Solicitud de Cotización', 'Emisión de Orden de Servicio', 'Habilitación Subcontratista', 'Desmovilización', 'Conformidad del Servicio'])
    // Con 2+ actividades en SER, las tareas llevan prefijo de su actividad
    expect(alq.tareas[0].nombre).toMatch(/ - Solicitud de Cotización$/)
    // El servicio obsoleto nunca entra
    expect(r.flatMap(a => a.tareas).some(t => t.nombre.includes('Servicio viejo'))).toBe(false)
  })
  it('sin servicios de SER en el catálogo no cambia nada', () => {
    const acts = [actPro('Andamios')]
    expect(separarServiciosYAlquileres(acts, [], config)).toBe(acts)
  })
})

describe('construirEstructuraReal — PRO y SER en paralelo dentro de PROCURA', () => {
  it('ambos EDTs arrancan el mismo día (no se encadenan)', () => {
    const CATALOGO = new Map<string, EdtCatalogoInfo>([
      ['GES', { id: 'g', nombre: 'GES', descripcionEdt: 'Planificación', faseNombre: 'PLANIFICACION', faseOrden: 0, edtOrden: 0 }],
      ['PRO', { id: 'p', nombre: 'PRO', descripcionEdt: 'Suministro de Equipos', faseNombre: 'PROCURA', faseOrden: 3, edtOrden: 0 }],
      ['SER', { id: 's', nombre: 'SER', descripcionEdt: 'Servicios y Alquileres', faseNombre: 'PROCURA', faseOrden: 3, edtOrden: 1 }],
    ])
    const t = (h: number): TareaPropuesta => ({ ...tarea('x'), horasEstimadas: h })
    const r = construirEstructuraReal({
      actividades: [
        { edtNombre: 'GES', actividadNombre: 'Inicio', tareas: [t(8)], origen: 'determinista' },
        { edtNombre: 'PRO', actividadNombre: 'Cables', tareas: [t(40)], origen: 'ia' },
        { edtNombre: 'SER', actividadNombre: 'Andamios', tareas: [t(8)], origen: 'ia' },
      ],
      edtsCatalogo: CATALOGO, proyectoId: 'p1', proyectoCronogramaId: 'c1',
      fechaInicioProyecto: new Date('2026-08-03T00:00:00'),
      calendarioLaboral: { horasPorDia: 8, diasLaborables: ['lunes', 'martes', 'miercoles', 'jueves', 'viernes'], horaInicioManana: '08:00', horaFinManana: '12:00', horaInicioTarde: '13:00', horaFinTarde: '17:00', diaCalendario: [], excepcionCalendario: [] } as any,
      recursoPorServicio: new Map(),
    })
    const pro = r.edts.find(e => e.nombre === 'Suministro de Equipos')!
    const ser = r.edts.find(e => e.nombre === 'Servicios y Alquileres')!
    expect(ser.fechaInicioPlan.getTime()).toBe(pro.fechaInicioPlan.getTime())
  })
})

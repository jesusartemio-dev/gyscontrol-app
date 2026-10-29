import { xmlGanttDetalle, xmlGanttGeneral, type FilaGantt } from '@/lib/planTrabajo/ganttDocx'
import { layoutOrganigrama, xmlOrganigrama, type NodoOrganigrama } from '@/lib/planTrabajo/organigramaDocx'
import { asertarXmlBienFormado } from '@/__tests__/testUtils/xmlTestUtils'

const NS = 'xmlns:w="w" xmlns:wp="wp" xmlns:a="a" xmlns:wpg="wpg" xmlns:wps="wps"'
const texto = (xml: string) => [...xml.matchAll(/<w:t[^>]*>([^<]*)<\/w:t>/g)].map(m => m[1])

const filas: FilaGantt[] = [
  { nivel: 'fase', nombre: 'Ejecución', inicio: '2026-11-03', fin: '2026-12-02', hh: 708, faseIndice: 0 },
  { nivel: 'edt', nombre: 'Construcción', inicio: '2026-11-03', fin: '2026-12-02', hh: 708, faseIndice: 0 },
  { nivel: 'actividad', nombre: 'Zona Torre', inicio: '2026-11-26', fin: '2026-12-01', hh: 100, faseIndice: 0 },
  { nivel: 'tarea', nombre: 'Tendido de Cables', inicio: '2026-11-30', fin: '2026-12-01', hh: 40, recurso: 'Cuadrilla 8P', faseIndice: 0 },
  { nivel: 'hito', nombre: 'Entrega', inicio: '2026-12-02', fin: '2026-12-02', faseIndice: 0 },
]

describe('ganttDocx', () => {
  it('B.1: una columna por semana (lunes) agrupadas por mes, fases en mayúsculas e hitos con ◆', () => {
    const xml = xmlGanttGeneral(filas)
    asertarXmlBienFormado(`<r ${NS}>${xml}</r>`, 'gantt general')
    const t = texto(xml)
    expect(t).toEqual(expect.arrayContaining(['NOVIEMBRE 2026', 'EJECUCIÓN', '◆ Entrega', '◆', '708']))
    // 3/11 es martes: la primera semana empieza el lunes 2; la última cubre el 2/12 (semana del 30/11).
    expect(t).toEqual(expect.arrayContaining(['02', '09', '16', '23', '30']))
    const columnas = xml.match(/<w:gridCol /g)!.length
    expect(columnas).toBe(4 + 5)
  })

  it('B.2: una tabla por mes con un día por columna, el recurso de cada tarea y solo las filas de ese mes', () => {
    const xml = xmlGanttDetalle(filas.slice(1))
    asertarXmlBienFormado(`<r ${NS}>${xml}</r>`, 'gantt detalle')
    const tablas = xml.split('<w:tbl>').slice(1)
    expect(tablas).toHaveLength(2)
    expect(texto(tablas[0])).toEqual(expect.arrayContaining(['NOVIEMBRE 2026', 'Cuadrilla 8P', '30']))
    expect(texto(tablas[1])).toEqual(expect.arrayContaining(['DICIEMBRE 2026', '1', '2', '◆ Entrega']))
    // Noviembre del 3 al 30 = 28 días + 4 columnas fijas.
    expect(tablas[0].match(/<w:gridCol /g)!.length).toBe(4 + 28)
  })

  it('sin fechas no genera nada', () => {
    expect(xmlGanttGeneral([{ nivel: 'edt', nombre: 'X', inicio: null, fin: null, faseIndice: 0 }])).toBe('')
  })
})

const nodo = (id: string, parentId: string | null, orden: number, nombre: string | null = id): NodoOrganigrama =>
  ({ id, parentId, orden, cargo: `Cargo ${id}`, nombre, esFijoGys: false, empresa: null })

describe('organigramaDocx', () => {
  it('padre centrado sobre sus hijos y sin cuadros superpuestos', () => {
    const { cajas } = layoutOrganigrama([nodo('raiz', null, 0), nodo('a', 'raiz', 1), nodo('b', 'raiz', 2), nodo('c', 'raiz', 3)])
    const caja = (id: string) => cajas.find(c => c.nodo.id === id)!
    const centro = (id: string) => caja(id).x + caja(id).w / 2
    expect(centro('raiz')).toBeCloseTo(centro('b'), -2)
    expect(caja('a').x + caja('a').w).toBeLessThan(caja('b').x)
    expect(caja('a').y).toBeGreaterThan(caja('raiz').y + caja('raiz').h)
  })

  it('árbol muy ancho: los grupos de hojas se apilan en vertical', () => {
    const nodos = [nodo('raiz', null, 0), ...Array.from({ length: 4 }, (_, i) => nodo(`j${i}`, 'raiz', i))]
    for (let i = 0; i < 4; i++) for (let k = 0; k < 4; k++) nodos.push(nodo(`h${i}${k}`, `j${i}`, k))
    const { cajas } = layoutOrganigrama(nodos)
    const hijos = cajas.filter(c => c.nodo.parentId === 'j0')
    expect(new Set(hijos.map(c => Math.round(c.x))).size).toBe(1)
    expect(new Set(hijos.map(c => Math.round(c.y))).size).toBe(4)
  })

  it('genera un grupo de formas con un cuadro por cargo, VACANTE si no hay persona', () => {
    const xml = xmlOrganigrama([nodo('raiz', null, 0, 'CARLOS'), nodo('a', 'raiz', 1, null)])
    asertarXmlBienFormado(`<r ${NS}>${xml}</r>`, 'organigrama')
    expect(xml).toContain('wordprocessingGroup')
    expect(xml.match(/prst="roundRect"/g)).toHaveLength(2)
    expect(texto(xml)).toEqual(expect.arrayContaining(['CARLOS', 'VACANTE']))
    expect(xmlOrganigrama([])).toBe('')
  })
})

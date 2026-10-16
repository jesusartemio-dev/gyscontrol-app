// Exportación del cronograma de proyecto a MS Project en formato XML (MSPDI),
// el formato nativo de intercambio de MS Project de escritorio (2013+).
//
// A diferencia del Excel, el XML lleva todo lo necesario para que MS Project
// muestre exactamente lo mismo que GYS:
// - Calendario del proyecto: jornada (mañana/tarde), días laborables, horas por
//   día y excepciones (feriados, días extra como paradas).
// - Tareas en modo MANUAL con sus fechas exactas: MS Project no las reprograma.
// - Duración = horas laborables entre inicio y fin (la columna DUR de GYS).
// - Trabajo = HH, como asignación del recurso (sin asignación MS Project pone 0).
// - Dependencias con tipo (FC, CC, FF, CF) y desfase.
// - Hitos (duración 0) y fecha límite (Deadline).
// - El ID de GYS de cada elemento en el campo Text1 ("GYS ID"), para que la
//   importación pueda reconocer cada tarea y actualizarla.
//
// Fechas en "hora de obra": la hora tal cual en obra, en los campos UTC. MS
// Project no maneja zonas horarias, así que se escriben sin zona.

const DIAS_MSP: Record<string, number> = {
  domingo: 1, lunes: 2, martes: 3, miercoles: 4, jueves: 5, viernes: 6, sabado: 7,
}
// Text1 en MS Project
const FIELD_ID_TEXT1 = '188743731'
// Tipo de vínculo en MSPDI: 0 = FF, 1 = FC, 2 = CF, 3 = CC
const TIPO_VINCULO: Record<string, number> = {
  finish_to_finish: 0, finish_to_start: 1, start_to_finish: 2, start_to_start: 3,
}

export interface NodoArbolExport {
  id: string // "tarea-<uuid>", "actividad-<uuid>", …
  type: string
  nombre: string
  level: number
  data?: Record<string, any>
  children?: NodoArbolExport[]
}

export interface DependenciaExport {
  tareaOrigenId: string
  tareaDependienteId: string
  tipo: string
  lagMinutos?: number
}

export interface CalendarioExport {
  nombre?: string
  horasPorDia: number
  diasLaborables: string[]
  horaInicioManana?: string
  horaFinManana?: string
  horaInicioTarde?: string
  horaFinTarde?: string
  diaCalendario?: { diaSemana: string; esLaborable: boolean; horaInicioManana?: string | null; horaFinManana?: string | null; horaInicioTarde?: string | null; horaFinTarde?: string | null }[]
  excepcionCalendario?: { fecha: string | Date; tipo: string; nombre?: string; horaInicio?: string | null; horaFin?: string | null }[]
}

const esc = (s: string) =>
  s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&apos;')

/** Fecha guardada (hora de obra en UTC) → "YYYY-MM-DDTHH:MM:SS" sin zona. */
const fechaMsp = (v: string | Date) => new Date(v).toISOString().slice(0, 19)
const horaMsp = (hhmm: string) => `${hhmm.length === 4 ? '0' + hhmm : hhmm}:00`

/** Horas → duración ISO de MSPDI (PT9H30M0S). */
const duracionMsp = (horas: number) => {
  const min = Math.max(0, Math.round(horas * 60))
  return `PT${Math.floor(min / 60)}H${min % 60}M0S`
}

const tramos = (m1?: string | null, m2?: string | null, t1?: string | null, t2?: string | null) => {
  const lista: [string, string][] = []
  if (m1 && m2 && m2 > m1) lista.push([m1, m2])
  if (t1 && t2 && t2 > t1) lista.push([t1, t2])
  return lista
}

function calendarioXml(cal: CalendarioExport): string {
  const base = tramos(cal.horaInicioManana ?? '08:00', cal.horaFinManana ?? '12:00', cal.horaInicioTarde ?? '13:00', cal.horaFinTarde ?? '17:00')
  const weekDays = Object.entries(DIAS_MSP).map(([dia, tipo]) => {
    const conf = cal.diaCalendario?.find((d) => d.diaSemana === dia)
    const laborable = conf ? conf.esLaborable : cal.diasLaborables.includes(dia)
    const horario = conf && (conf.horaInicioManana || conf.horaInicioTarde)
      ? tramos(conf.horaInicioManana, conf.horaFinManana, conf.horaInicioTarde, conf.horaFinTarde)
      : base
    return `      <WeekDay>
        <DayType>${tipo}</DayType>
        <DayWorking>${laborable ? 1 : 0}</DayWorking>${laborable ? `
        <WorkingTimes>${horario.map(([a, b]) => `
          <WorkingTime><FromTime>${horaMsp(a)}</FromTime><ToTime>${horaMsp(b)}</ToTime></WorkingTime>`).join('')}
        </WorkingTimes>` : ''}
      </WeekDay>`
  }).join('\n')

  const excepciones = (cal.excepcionCalendario ?? []).map((e) => {
    const dia = new Date(e.fecha).toISOString().slice(0, 10)
    const trabaja = e.tipo === 'dia_laboral_extra'
    const horario = trabaja ? (e.horaInicio && e.horaFin ? [[e.horaInicio, e.horaFin]] : base) : []
    return `      <Exception>
        <EnteredByOccurrences>0</EnteredByOccurrences>
        <TimePeriod><FromDate>${dia}T00:00:00</FromDate><ToDate>${dia}T23:59:00</ToDate></TimePeriod>
        <Occurrences>1</Occurrences>
        <Name>${esc(e.nombre || (trabaja ? 'Día laboral extra' : 'No laborable'))}</Name>
        <Type>1</Type>
        <DayWorking>${trabaja ? 1 : 0}</DayWorking>${trabaja ? `
        <WorkingTimes>${horario.map(([a, b]) => `
          <WorkingTime><FromTime>${horaMsp(a!)}</FromTime><ToTime>${horaMsp(b!)}</ToTime></WorkingTime>`).join('')}
        </WorkingTimes>` : ''}
      </Exception>`
  }).join('\n')

  return `    <Calendar>
      <UID>1</UID>
      <Name>${esc(cal.nombre || 'Calendario GYS')}</Name>
      <IsBaseCalendar>1</IsBaseCalendar>
      <IsBaselineCalendar>0</IsBaselineCalendar>
      <BaseCalendarUID>-1</BaseCalendarUID>
      <WeekDays>
${weekDays}
      </WeekDays>${excepciones ? `
      <Exceptions>
${excepciones}
      </Exceptions>` : ''}
    </Calendar>`
}

// Calendario propio de cada recurso, basado en el del proyecto (así lo escribe
// MS Project). Si el recurso apunta directo al calendario base, MS Project lo
// convierte en calendario de ese recurso y deja el proyecto con "Standard"
// (8 h, hasta las 17:00): las duraciones salían recortadas (1.84d en vez de 2d).
const calendarioRecursoXml = (uid: number, nombre: string) => `    <Calendar>
      <UID>${uid}</UID>
      <Name>${esc(nombre)}</Name>
      <IsBaseCalendar>0</IsBaseCalendar>
      <IsBaselineCalendar>0</IsBaselineCalendar>
      <BaseCalendarUID>1</BaseCalendarUID>
    </Calendar>`

interface FilaTarea {
  uid: number
  nodo: NodoArbolExport
  outlineLevel: number
  outlineNumber: string
  esResumen: boolean
}

/**
 * Genera el XML (MSPDI) del cronograma. `arbol` es la raíz devuelta por
 * /cronograma/tree (nodo proyecto con sus fases).
 */
export function generarMspdiProyecto(opts: {
  proyectoNombre: string
  arbol: NodoArbolExport
  dependencias: DependenciaExport[]
  calendario: CalendarioExport
}): string {
  const { proyectoNombre, arbol, dependencias, calendario } = opts
  const hpd = calendario.horasPorDia || 8
  const jornadaIni = calendario.horaInicioManana ?? '08:00'
  const jornadaFin = calendario.horaFinTarde ?? '17:00'

  // Aplanar en orden de esquema. El proyecto es la tarea resumen 0 de MS Project.
  const filas: FilaTarea[] = []
  let uid = 1
  const visitar = (n: NodoArbolExport, nivel: number, prefijo: string, indice: number) => {
    const d = n.data || {}
    // Fuera del plan: el grupo "Tareas Extras" y sus tareas no se exportan.
    if (d.isExtrasGroup || d.esExtra) return
    const outlineNumber = prefijo ? `${prefijo}.${indice}` : `${indice}`
    const hijos = (n.children || []).filter((c) => !c.data?.isExtrasGroup && !c.data?.esExtra)
    filas.push({ uid: uid++, nodo: n, outlineLevel: nivel, outlineNumber, esResumen: hijos.length > 0 })
    hijos.forEach((c, i) => visitar(c, nivel + 1, outlineNumber, i + 1))
  }
  ;(arbol.children || [])
    .filter((c) => !c.data?.isExtrasGroup && !c.data?.esExtra)
    .forEach((c, i) => visitar(c, 1, '', i + 1))

  const realId = (nodeId: string) => nodeId.replace(/^(proyecto|fase|edt|actividad|tarea)-/, '')
  const uidPorTarea = new Map<string, number>()
  for (const f of filas) if (f.nodo.type === 'tarea') uidPorTarea.set(realId(f.nodo.id), f.uid)

  // Vínculos agrupados por la tarea sucesora.
  const vinculos = new Map<string, DependenciaExport[]>()
  for (const dep of dependencias) {
    if (!uidPorTarea.has(dep.tareaOrigenId) || !uidPorTarea.has(dep.tareaDependienteId)) continue
    const lista = vinculos.get(dep.tareaDependienteId) ?? []
    lista.push(dep)
    vinculos.set(dep.tareaDependienteId, lista)
  }

  // Recursos y asignaciones (una por tarea con recurso): trabajo = HH.
  const recursos = new Map<string, { uid: number; nombre: string; maxUnidades: number }>()
  const asignaciones: { uid: number; tareaUid: number; recursoUid: number; trabajo: number; unidades: number; inicio: string; fin: string }[] = []

  const proyectoInicio = filas.reduce<string | null>((min, f) => {
    const v = f.nodo.data?.fechaInicio ?? f.nodo.data?.fechaInicioComercial
    return v && (!min || new Date(v) < new Date(min)) ? v : min
  }, null)

  const tareasXml = filas.map((f) => {
    const d = f.nodo.data || {}
    const ini = d.fechaInicio ?? d.fechaInicioComercial
    const fin = d.fechaFin ?? d.fechaFinComercial
    const esHito = f.nodo.type === 'tarea' && d.esHito === true
    const horasDur = esHito ? 0 : Number(d.duracionHoras) || 0
    const hh = Number(d.horasHombre) || 0
    const id = realId(f.nodo.id)

    if (f.nodo.type === 'tarea' && !esHito && d.recursoNombre && hh > 0 && ini && fin) {
      const clave = d.recursoId || d.recursoNombre
      let r = recursos.get(clave)
      const unidades = horasDur > 0 ? hh / horasDur : 1
      if (!r) { r = { uid: recursos.size + 1, nombre: d.recursoNombre, maxUnidades: 1 }; recursos.set(clave, r) }
      r.maxUnidades = Math.max(r.maxUnidades, Math.ceil(unidades))
      asignaciones.push({ uid: asignaciones.length + 1, tareaUid: f.uid, recursoUid: r.uid, trabajo: hh, unidades, inicio: fechaMsp(ini), fin: fechaMsp(fin) })
    }

    const preds = (vinculos.get(id) ?? []).map((dep) => {
      const lag = dep.lagMinutos ?? 0
      const formatoLag = lag % Math.round(hpd * 60) === 0 ? 7 : 5 // 7 = días, 5 = horas
      return `      <PredecessorLink>
        <PredecessorUID>${uidPorTarea.get(dep.tareaOrigenId)}</PredecessorUID>
        <Type>${TIPO_VINCULO[dep.tipo] ?? 1}</Type>
        <CrossProject>0</CrossProject>
        <LinkLag>${lag * 10}</LinkLag>
        <LagFormat>${formatoLag}</LagFormat>
      </PredecessorLink>`
    }).join('\n')

    // Duración real y restante según el avance. Sin RemainingDuration, MS Project
    // deja en 0 la duración de las tareas sin asignación (trabajo 0) y las
    // convierte en hitos al abrir el archivo.
    const avance = Math.min(100, Math.max(0, Math.round(Number(d.progreso ?? d.porcentajeAvance ?? 0)) || 0))
    const horasReales = (horasDur * avance) / 100
    const fechas = ini && fin
      ? `      <Start>${fechaMsp(ini)}</Start>
      <Finish>${fechaMsp(fin)}</Finish>${f.esResumen ? '' : `
      <Duration>${duracionMsp(horasDur)}</Duration>
      <ManualStart>${fechaMsp(ini)}</ManualStart>
      <ManualFinish>${fechaMsp(fin)}</ManualFinish>
      <ManualDuration>${duracionMsp(horasDur)}</ManualDuration>`}`
      : ''
    // Van después de PercentComplete (orden del esquema MSPDI).
    const duracionesAvance = ini && fin && !f.esResumen
      ? `
      <ActualDuration>${duracionMsp(horasReales)}</ActualDuration>
      <RemainingDuration>${duracionMsp(horasDur - horasReales)}</RemainingDuration>`
      : ''
    const limite = esHito && d.fechaLimite
      ? `\n      <Deadline>${new Date(d.fechaLimite).toISOString().slice(0, 10)}T${horaMsp(jornadaFin)}</Deadline>`
      : ''

    // Elementos en el orden del esquema oficial (mspdi_pj12.xsd): versiones de MS
    // Project más estrictas ignoran lo que llega fuera de orden — p. ej. Manual
    // tarde deja las tareas en automático, desde el inicio del proyecto.
    return `    <Task>
      <UID>${f.uid}</UID>
      <ID>${f.uid}</ID>
      <Name>${esc(f.nodo.nombre || '')}</Name>
      <Manual>${f.esResumen ? 0 : 1}</Manual>
      <Type>1</Type>
      <IsNull>0</IsNull>
      <OutlineNumber>${f.outlineNumber}</OutlineNumber>
      <OutlineLevel>${f.outlineLevel}</OutlineLevel>
${fechas}
      <DurationFormat>${horasDur > 0 && horasDur < hpd ? 5 : 7}</DurationFormat>
      <Work>${duracionMsp(f.esResumen ? 0 : hh)}</Work>
      <EffortDriven>0</EffortDriven>
      <Estimated>0</Estimated>
      <Milestone>${esHito ? 1 : 0}</Milestone>
      <Summary>${f.esResumen ? 1 : 0}</Summary>
      <PercentComplete>${avance}</PercentComplete>${duracionesAvance}${limite}${d.descripcion ? `
      <Notes>${esc(String(d.descripcion))}</Notes>` : ''}
${preds}
      <ExtendedAttribute>
        <FieldID>${FIELD_ID_TEXT1}</FieldID>
        <Value>${esc(f.nodo.id)}</Value>
      </ExtendedAttribute>
    </Task>`
  }).join('\n')

  const recursosXml = [...recursos.values()].map((r) => `    <Resource>
      <UID>${r.uid}</UID>
      <ID>${r.uid}</ID>
      <Name>${esc(r.nombre)}</Name>
      <Type>1</Type>
      <IsNull>0</IsNull>
      <MaxUnits>${Math.max(1, Math.ceil(r.maxUnidades))}</MaxUnits>
      <CalendarUID>${r.uid + 1}</CalendarUID>
    </Resource>`).join('\n')

  // Sin números con decimales: en una PC con coma decimal (español), MS Project
  // leía "0.2632" como 0 % y recalculaba las duraciones en 0. Las unidades las
  // calcula MS Project con el trabajo y la duración (tarea de duración fija).
  // Orden del esquema: Finish, Start, …, Work.
  const asignacionesXml = asignaciones.map((a) => `    <Assignment>
      <UID>${a.uid}</UID>
      <TaskUID>${a.tareaUid}</TaskUID>
      <ResourceUID>${a.recursoUid}</ResourceUID>
      <Finish>${a.fin}</Finish>
      <Start>${a.inicio}</Start>
      <Work>${duracionMsp(a.trabajo)}</Work>
    </Assignment>`).join('\n')

  const minDia = Math.round(hpd * 60)
  const diasSemana = calendario.diasLaborables.length || 5
  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Project xmlns="http://schemas.microsoft.com/project">
  <SaveVersion>14</SaveVersion>
  <Name>${esc(proyectoNombre)}</Name>
  <Title>${esc(proyectoNombre)}</Title>
  <ScheduleFromStart>1</ScheduleFromStart>${proyectoInicio ? `
  <StartDate>${fechaMsp(proyectoInicio)}</StartDate>` : ''}
  <CalendarUID>1</CalendarUID>
  <DefaultStartTime>${horaMsp(jornadaIni)}</DefaultStartTime>
  <DefaultFinishTime>${horaMsp(jornadaFin)}</DefaultFinishTime>
  <MinutesPerDay>${minDia}</MinutesPerDay>
  <MinutesPerWeek>${minDia * diasSemana}</MinutesPerWeek>
  <DaysPerMonth>20</DaysPerMonth>
  <DefaultTaskType>1</DefaultTaskType>
  <DurationFormat>7</DurationFormat>
  <WorkFormat>2</WorkFormat>
  <NewTasksEffortDriven>0</NewTasksEffortDriven>
  <NewTasksEstimated>0</NewTasksEstimated>
  <ExtendedAttributes>
    <ExtendedAttribute>
      <FieldID>${FIELD_ID_TEXT1}</FieldID>
      <FieldName>Text1</FieldName>
      <Alias>GYS ID</Alias>
    </ExtendedAttribute>
  </ExtendedAttributes>
  <Calendars>
${[calendarioXml(calendario), ...[...recursos.values()].map((r) => calendarioRecursoXml(r.uid + 1, r.nombre))].join('\n')}
  </Calendars>
  <Tasks>
${tareasXml}
  </Tasks>
  <Resources>
${recursosXml}
  </Resources>
  <Assignments>
${asignacionesXml}
  </Assignments>
</Project>
`
}

import { prisma } from '@/lib/prisma'
import type { TipoDependencia } from '@prisma/client'

// 📊 Obtener dependencias de una cotización
export const getDependenciasCotizacion = async (cotizacionId: string) => {
  return await prisma.cotizacionDependenciasTarea.findMany({
    where: {
      tareaOrigen: { cotizacionActividad: { cotizacionEdt: { cotizacionId } } }
    },
    include: {
      tareaOrigen: { select: { id: true, nombre: true, fechaInicio: true, fechaFin: true, horasEstimadas: true } },
      tareaDependiente: { select: { id: true, nombre: true, fechaInicio: true, fechaFin: true, horasEstimadas: true } }
    }
  })
}

// 📊 Obtener dependencias de una tarea específica
export const getDependenciasByTarea = async (tareaId: string) => {
  const [dependenciasOrigen, dependenciasDestino] = await Promise.all([
    prisma.cotizacionDependenciasTarea.findMany({
      where: { tareaOrigenId: tareaId },
      include: {
        tareaDependiente: { select: { id: true, nombre: true } }
      }
    }),
    prisma.cotizacionDependenciasTarea.findMany({
      where: { tareaDependienteId: tareaId },
      include: {
        tareaOrigen: { select: { id: true, nombre: true } }
      }
    })
  ])

  return {
    dependenciasOrigen,
    dependenciasDestino
  }
}

// 🔄 Aplicar dependencias a fechas de tareas con propagación jerárquica completa
export const aplicarDependenciasAFechas = async (
  cotizacionId: string,
  calendarioLaboral: any
) => {
  const dependencias = await getDependenciasCotizacion(cotizacionId)
  const correcciones: string[] = []
  const tareasProcesadas = new Set<string>() // Evitar ciclos infinitos

  console.log(`🔗 Aplicando ${dependencias.length} dependencias con propagación jerárquica`)

  for (const dependencia of dependencias) {
    const { tareaOrigen, tareaDependiente, tipo, lagMinutos } = dependencia

    // Verificar que ambas tareas tengan fechas válidas
    if (!tareaOrigen.fechaInicio || !tareaOrigen.fechaFin || !tareaDependiente.fechaInicio || !tareaDependiente.fechaFin) {
      console.warn(`⚠️ Dependencia omitida: fechas inválidas entre ${tareaOrigen.nombre} y ${tareaDependiente.nombre}`)
      continue
    }

    // Calcular nueva fecha de inicio para tarea dependiente
    let nuevaFechaInicio: Date

    switch (tipo) {
      case 'finish_to_start':
        // FS: tareaDependiente inicia cuando tareaOrigen termina + lag
        nuevaFechaInicio = new Date(tareaOrigen.fechaFin.getTime() + (lagMinutos * 60 * 1000))
        break

      case 'start_to_start':
        // SS: tareaDependiente inicia cuando tareaOrigen inicia + lag
        nuevaFechaInicio = new Date(tareaOrigen.fechaInicio.getTime() + (lagMinutos * 60 * 1000))
        break

      case 'finish_to_finish':
        // FF: tareaDependiente termina cuando tareaOrigen termina + lag
        const fechaFinCalculada = new Date(tareaOrigen.fechaFin.getTime() + (lagMinutos * 60 * 1000))
        // Calcular fechaInicio para que termine en fechaFinCalculada
        const duracionTarea = tareaDependiente.fechaFin.getTime() - tareaDependiente.fechaInicio.getTime()
        nuevaFechaInicio = new Date(fechaFinCalculada.getTime() - duracionTarea)
        break

      case 'start_to_finish':
        // SF: tareaDependiente termina cuando tareaOrigen inicia + lag
        const fechaFinCalculadaSF = new Date(tareaOrigen.fechaInicio.getTime() + (lagMinutos * 60 * 1000))
        const duracionTareaSF = tareaDependiente.fechaFin.getTime() - tareaDependiente.fechaInicio.getTime()
        nuevaFechaInicio = new Date(fechaFinCalculadaSF.getTime() - duracionTareaSF)
        break
    }

    // Ajustar al calendario laboral
    nuevaFechaInicio = ajustarFechaADiaLaborable(nuevaFechaInicio, calendarioLaboral)

    // Actualizar fecha si es diferente
    if (nuevaFechaInicio.getTime() !== tareaDependiente.fechaInicio.getTime()) {
      // Marcar tarea como procesada para evitar ciclos
      if (tareasProcesadas.has(tareaDependiente.id)) {
        console.warn(`⚠️ Ciclo detectado en dependencia, omitiendo tarea ${tareaDependiente.nombre}`)
        continue
      }
      tareasProcesadas.add(tareaDependiente.id)

      await prisma.cotizacionTarea.update({
        where: { id: tareaDependiente.id },
        data: { fechaInicio: nuevaFechaInicio }
      })

      // Calcular nueva fecha fin basada en duración
      const duracionHoras = Number(tareaDependiente.horasEstimadas) || 8
      const nuevaFechaFin = calcularFechaFinConCalendario(nuevaFechaInicio, duracionHoras, calendarioLaboral)

      await prisma.cotizacionTarea.update({
        where: { id: tareaDependiente.id },
        data: { fechaFin: nuevaFechaFin }
      })

      correcciones.push(`Tarea "${tareaDependiente.nombre}" ajustada por dependencia ${tipo}`)

      // 🚀 PROPAGACIÓN JERÁRQUICA COMPLETA

      // 1. Propagar hacia arriba (tarea → actividad → EDT → fase)
      console.log(`⬆️ Propagando cambios hacia arriba desde tarea ${tareaDependiente.nombre}`)
      const correccionesArriba = await propagarCambioArriba(tareaDependiente.id, nuevaFechaInicio, calendarioLaboral)
      correcciones.push(...correccionesArriba)

      // 2. Propagar hacia abajo (ajustar tareas hermanas)
      console.log(`⬇️ Propagando cambios hacia abajo desde tarea ${tareaDependiente.nombre}`)
      const correccionesAbajo = await propagarCambioAbajo(tareaDependiente.id, nuevaFechaInicio, calendarioLaboral)
      correcciones.push(...correccionesAbajo)

      // 3. Propagar transversalmente (dependencias cruzadas)
      console.log(`➡️ Propagando cambios transversalmente desde tarea ${tareaDependiente.nombre}`)
      const correccionesTransversales = await propagarCambioTransversal(cotizacionId, tareaDependiente.id, calendarioLaboral)
      correcciones.push(...correccionesTransversales)
    }
  }

  console.log(`✅ Propagación jerárquica completada: ${correcciones.length} correcciones aplicadas`)
  return correcciones
}

// 🚫 Detectar ciclos en dependencias
export const detectarCiclos = async (cotizacionId: string): Promise<string[]> => {
  const dependencias = await getDependenciasCotizacion(cotizacionId)
  const errores: string[] = []

  // Crear grafo de dependencias
  const grafo: { [key: string]: string[] } = {}

  dependencias.forEach(dep => {
    if (!grafo[dep.tareaOrigenId]) grafo[dep.tareaOrigenId] = []
    grafo[dep.tareaOrigenId].push(dep.tareaDependienteId)
  })

  // Función recursiva para detectar ciclos
  const tieneCiclo = (nodo: string, visitados: Set<string>): boolean => {
    if (visitados.has(nodo)) return true

    visitados.add(nodo)

    const dependientes = grafo[nodo] || []
    for (const dependiente of dependientes) {
      if (tieneCiclo(dependiente, new Set(visitados))) {
        return true
      }
    }

    visitados.delete(nodo)
    return false
  }

  // Verificar cada nodo
  Object.keys(grafo).forEach(nodo => {
    if (tieneCiclo(nodo, new Set())) {
      errores.push(`Ciclo detectado en dependencias desde tarea ${nodo}`)
    }
  })

  return errores
}

// 🎯 Identificar hitos automáticamente
export const identificarHitosAutomaticamente = async (cotizacionId: string) => {
  const tareas = await prisma.cotizacionTarea.findMany({
    where: { cotizacionActividad: { cotizacionEdt: { cotizacionId } } }
  })

  const hitosIdentificados: string[] = []

  for (const tarea of tareas) {
    const esHito =
      (tarea.duracionHoras && Number(tarea.duracionHoras) === 0) ||
      (tarea.fechaInicio && tarea.fechaFin && tarea.fechaInicio.getTime() === tarea.fechaFin.getTime())

    if (esHito && !tarea.esHito) {
      await prisma.cotizacionTarea.update({
        where: { id: tarea.id },
        data: { esHito: true }
      })
      hitosIdentificados.push(`Hito identificado: ${tarea.nombre}`)
    }
  }

  return hitosIdentificados
}

// 🔄 Propagar cambios hacia arriba en la jerarquía (tarea → actividad → EDT → fase)
async function propagarCambioArriba(tareaId: string, nuevaFechaInicio: Date, calendarioLaboral: any): Promise<string[]> {
  const correcciones: string[] = []

  try {
    // Obtener la tarea y su actividad padre
    const tarea = await prisma.cotizacionTarea.findUnique({
      where: { id: tareaId },
      include: {
        cotizacionActividad: {
          include: {
            cotizacionEdt: {
              include: {
                cotizacionFase: true
              }
            }
          }
        }
      }
    })

    if (!tarea || !tarea.cotizacionActividad) return correcciones

    const actividad = tarea.cotizacionActividad
    const edt = actividad.cotizacionEdt
    const fase = edt?.cotizacionFase

    // 1. Actualizar actividad padre si la tarea cambió su fecha de inicio
    const tareasDeActividad = await prisma.cotizacionTarea.findMany({
      where: { cotizacionActividadId: actividad.id }
    })

    if (tareasDeActividad.length > 0) {
      const fechaInicioActividad = new Date(Math.min(...tareasDeActividad.map(t =>
        t.fechaInicio ? new Date(t.fechaInicio).getTime() : Date.now()
      )))

      if (fechaInicioActividad.getTime() !== actividad.fechaInicioComercial?.getTime()) {
        await prisma.cotizacionActividad.update({
          where: { id: actividad.id },
          data: { fechaInicioComercial: fechaInicioActividad }
        })
        correcciones.push(`Actividad ${actividad.nombre} ajustada por tarea dependiente`)
      }

      // Calcular nueva fecha fin de actividad
      const fechaFinActividad = new Date(Math.max(...tareasDeActividad.map(t =>
        t.fechaFin ? new Date(t.fechaFin).getTime() : Date.now()
      )))

      if (fechaFinActividad.getTime() !== actividad.fechaFinComercial?.getTime()) {
        await prisma.cotizacionActividad.update({
          where: { id: actividad.id },
          data: { fechaFinComercial: fechaFinActividad }
        })
        correcciones.push(`Fecha fin actividad ${actividad.nombre} extendida`)
      }
    }

    // 2. Actualizar EDT padre
    if (edt) {
      const actividadesDeEdt = await prisma.cotizacionActividad.findMany({
        where: { cotizacionEdtId: edt.id }
      })

      if (actividadesDeEdt.length > 0) {
        const fechaInicioEdt = new Date(Math.min(...actividadesDeEdt.map(a =>
          a.fechaInicioComercial ? new Date(a.fechaInicioComercial).getTime() : Date.now()
        )))

        if (fechaInicioEdt.getTime() !== edt.fechaInicioComercial?.getTime()) {
          await prisma.cotizacionEdt.update({
            where: { id: edt.id },
            data: { fechaInicioComercial: fechaInicioEdt }
          })
          correcciones.push(`EDT ${edt.nombre} ajustado por actividad dependiente`)
        }

        const fechaFinEdt = new Date(Math.max(...actividadesDeEdt.map(a =>
          a.fechaFinComercial ? new Date(a.fechaFinComercial).getTime() : Date.now()
        )))

        if (fechaFinEdt.getTime() !== edt.fechaFinComercial?.getTime()) {
          await prisma.cotizacionEdt.update({
            where: { id: edt.id },
            data: { fechaFinComercial: fechaFinEdt }
          })
          correcciones.push(`Fecha fin EDT ${edt.nombre} extendida`)
        }
      }
    }

    // 3. Actualizar fase padre
    if (fase) {
      const edtsDeFase = await prisma.cotizacionEdt.findMany({
        where: { cotizacionFaseId: fase.id }
      })

      if (edtsDeFase.length > 0) {
        const fechaInicioFase = new Date(Math.min(...edtsDeFase.map(e =>
          e.fechaInicioComercial ? new Date(e.fechaInicioComercial).getTime() : Date.now()
        )))

        if (fechaInicioFase.getTime() !== fase.fechaInicioPlan?.getTime()) {
          await prisma.cotizacionFase.update({
            where: { id: fase.id },
            data: { fechaInicioPlan: fechaInicioFase }
          })
          correcciones.push(`Fase ${fase.nombre} ajustada por EDT dependiente`)
        }

        const fechaFinFase = new Date(Math.max(...edtsDeFase.map(e =>
          e.fechaFinComercial ? new Date(e.fechaFinComercial).getTime() : Date.now()
        )))

        if (fechaFinFase.getTime() !== fase.fechaFinPlan?.getTime()) {
          await prisma.cotizacionFase.update({
            where: { id: fase.id },
            data: { fechaFinPlan: fechaFinFase }
          })
          correcciones.push(`Fecha fin fase ${fase.nombre} extendida`)
        }
      }
    }

  } catch (error) {
    console.error('Error propagando cambio hacia arriba:', error)
  }

  return correcciones
}

// 🔄 Propagar cambios hacia abajo (ajustar tareas hermanas)
async function propagarCambioAbajo(tareaId: string, nuevaFechaInicio: Date, calendarioLaboral: any): Promise<string[]> {
  const correcciones: string[] = []

  try {
    // Obtener la tarea y su actividad padre
    const tarea = await prisma.cotizacionTarea.findUnique({
      where: { id: tareaId },
      include: {
        cotizacionActividad: true
      }
    })

    if (!tarea || !tarea.cotizacionActividad) return correcciones

    // Obtener todas las tareas hermanas (mismo padre)
    const tareasHermanas = await prisma.cotizacionTarea.findMany({
      where: {
        cotizacionActividadId: tarea.cotizacionActividad.id,
        id: { not: tareaId } // Excluir la tarea actual
      },
      orderBy: { fechaInicio: 'asc' }
    })

    // Si hay tareas hermanas, ajustar su secuenciación FS+1
    if (tareasHermanas.length > 0) {
      let currentDate = ajustarFechaADiaLaborable(new Date(nuevaFechaInicio), calendarioLaboral)

      for (const hermana of tareasHermanas) {
        // Calcular nueva fecha de inicio (FS+1)
        const nuevaFechaInicioHermana = new Date(currentDate)
        nuevaFechaInicioHermana.setDate(nuevaFechaInicioHermana.getDate() + 1) // FS+1
        const fechaAjustada = ajustarFechaADiaLaborable(nuevaFechaInicioHermana, calendarioLaboral)

        if (fechaAjustada.getTime() !== hermana.fechaInicio?.getTime()) {
          await prisma.cotizacionTarea.update({
            where: { id: hermana.id },
            data: { fechaInicio: fechaAjustada }
          })
          correcciones.push(`Tarea hermana ${hermana.nombre} re-secuenciada FS+1`)
        }

        // Actualizar fecha fin basada en duración
        const duracionHoras = Number(hermana.horasEstimadas) || 8
        const nuevaFechaFin = calcularFechaFinConCalendario(fechaAjustada, duracionHoras, calendarioLaboral)

        if (nuevaFechaFin.getTime() !== hermana.fechaFin?.getTime()) {
          await prisma.cotizacionTarea.update({
            where: { id: hermana.id },
            data: { fechaFin: nuevaFechaFin }
          })
          correcciones.push(`Fecha fin tarea hermana ${hermana.nombre} ajustada`)
        }

        currentDate = new Date(nuevaFechaFin)
      }

      // Propagar cambios hacia arriba desde las tareas hermanas ajustadas
      for (const hermana of tareasHermanas) {
        const correccionesArriba = await propagarCambioArriba(hermana.id, hermana.fechaInicio!, calendarioLaboral)
        correcciones.push(...correccionesArriba)
      }
    }

  } catch (error) {
    console.error('Error propagando cambio hacia abajo:', error)
  }

  return correcciones
}

// 🔄 Propagar cambios transversalmente (dependencias cruzadas entre ramas)
async function propagarCambioTransversal(cotizacionId: string, tareaId: string, calendarioLaboral: any): Promise<string[]> {
  const correcciones: string[] = []

  try {
    // Obtener todas las dependencias donde otras tareas dependen de esta
    const dependenciasSalientes = await prisma.cotizacionDependenciasTarea.findMany({
      where: { tareaOrigenId: tareaId },
      include: {
        tareaDependiente: true
      }
    })

    // Para cada dependencia saliente, aplicar la lógica de dependencia
    for (const dependencia of dependenciasSalientes) {
      const tareaOrigen = await prisma.cotizacionTarea.findUnique({
        where: { id: tareaId }
      })

      if (!tareaOrigen) continue

      let nuevaFechaInicio: Date

      switch (dependencia.tipo) {
        case 'finish_to_start':
          nuevaFechaInicio = new Date(tareaOrigen.fechaFin!.getTime() + (dependencia.lagMinutos * 60 * 1000))
          break
        case 'start_to_start':
          nuevaFechaInicio = new Date(tareaOrigen.fechaInicio!.getTime() + (dependencia.lagMinutos * 60 * 1000))
          break
        case 'finish_to_finish':
          const fechaFinCalculada = new Date(tareaOrigen.fechaFin!.getTime() + (dependencia.lagMinutos * 60 * 1000))
          const duracionTarea = dependencia.tareaDependiente.fechaFin!.getTime() - dependencia.tareaDependiente.fechaInicio!.getTime()
          nuevaFechaInicio = new Date(fechaFinCalculada.getTime() - duracionTarea)
          break
        case 'start_to_finish':
          const fechaFinCalculadaSF = new Date(tareaOrigen.fechaInicio!.getTime() + (dependencia.lagMinutos * 60 * 1000))
          const duracionTareaSF = dependencia.tareaDependiente.fechaFin!.getTime() - dependencia.tareaDependiente.fechaInicio!.getTime()
          nuevaFechaInicio = new Date(fechaFinCalculadaSF.getTime() - duracionTareaSF)
          break
      }

      nuevaFechaInicio = ajustarFechaADiaLaborable(nuevaFechaInicio, calendarioLaboral)

      if (nuevaFechaInicio.getTime() !== dependencia.tareaDependiente.fechaInicio!.getTime()) {
        await prisma.cotizacionTarea.update({
          where: { id: dependencia.tareaDependiente.id },
          data: { fechaInicio: nuevaFechaInicio }
        })

        // Calcular nueva fecha fin
        const duracionHoras = Number(dependencia.tareaDependiente.horasEstimadas) || 8
        const nuevaFechaFin = calcularFechaFinConCalendario(nuevaFechaInicio, duracionHoras, calendarioLaboral)

        await prisma.cotizacionTarea.update({
          where: { id: dependencia.tareaDependiente.id },
          data: { fechaFin: nuevaFechaFin }
        })

        correcciones.push(`Dependencia transversal aplicada: ${dependencia.tareaDependiente.nombre} (${dependencia.tipo})`)

        // Recursión: propagar cambios desde la tarea dependiente
        const correccionesRecursivas = await propagarCambioTransversal(cotizacionId, dependencia.tareaDependiente.id, calendarioLaboral)
        correcciones.push(...correccionesRecursivas)
      }
    }

  } catch (error) {
    console.error('Error propagando cambio transversal:', error)
  }

  return correcciones
}

//  Función auxiliar para ajustar fechas al calendario laboral
function ajustarFechaADiaLaborable(fecha: Date, calendarioLaboral: any): Date {
  // Implementación básica - ajustar según calendario laboral
  // En una implementación completa, esto debería usar la lógica del calendario
  const diaSemana = fecha.getDay()
  if (diaSemana === 0 || diaSemana === 6) { // Domingo o sábado
    // Mover al siguiente lunes
    const diasHastaLunes = diaSemana === 0 ? 1 : 2
    fecha.setDate(fecha.getDate() + diasHastaLunes)
  }
  return fecha
}

// 🔧 Función auxiliar para calcular fecha fin con calendario
function calcularFechaFinConCalendario(fechaInicio: Date, horasTotales: number, calendarioLaboral: any): Date {
  // Implementación básica - en producción debería usar la lógica completa del calendario
  const horasPorDia = calendarioLaboral.horasPorDia || 8
  const diasNecesarios = Math.ceil(horasTotales / horasPorDia)

  const fechaFin = new Date(fechaInicio)
  fechaFin.setDate(fechaFin.getDate() + diasNecesarios - 1) // -1 porque el día de inicio cuenta

  return ajustarFechaADiaLaborable(fechaFin, calendarioLaboral)
}
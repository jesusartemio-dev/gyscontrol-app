import { prisma } from '@/lib/prisma'
import { isIAFeatureEnabled } from '@/lib/agente/featureFlags'
import type { PlanPrerrequisitos, PlanTrabajoContexto } from '@/types/planTrabajo'

/**
 * Carga el contexto completo del Plan de Trabajo para un proyecto.
 * No valida acceso — eso le corresponde a cada endpoint.
 * Retorna null si el proyecto no existe.
 */
export async function cargarContextoPlanTrabajo(
  proyectoId: string
): Promise<PlanTrabajoContexto | null> {
  const [
    proyecto,
    planTrabajo,
    equipos,
    servicios,
    gastos,
    cronogramaPlanificacion,
    cronogramaComercial,
    organigrama,
    matriz,
    tdr,
    iaPlanTrabajoHabilitada,
  ] = await Promise.all([
    prisma.proyecto.findUnique({
      where: { id: proyectoId },
      select: {
        id: true,
        codigo: true,
        nombre: true,
        descripcion: true,
        numeroContrato: true,
        ordenCompraCliente: true,
        fechaFirmaContrato: true,
        fechaInicio: true,
        fechaFin: true,
        estado: true,
        cotizacionId: true,
        cotizacion: { select: { id: true, estado: true } },
        cliente: {
          select: { id: true, codigo: true, nombre: true, ruc: true, direccion: true },
        },
        gestor: { select: { id: true, name: true, email: true } },
        supervisor: { select: { id: true, name: true, email: true } },
        lider: { select: { id: true, name: true, email: true } },
      },
    }),

    prisma.planTrabajo.findUnique({
      where: { proyectoId },
      include: {
        generaciones: { orderBy: { generadoEn: 'desc' } },
        imagenes: { orderBy: { orden: 'asc' } },
      },
    }),

    prisma.proyectoEquipoCotizado.findMany({
      where: { proyectoId },
      select: {
        id: true,
        nombre: true,
        descripcion: true,
        subtotalInterno: true,
        subtotalCliente: true,
        proyectoEquipoCotizadoItem: {
          select: {
            id: true,
            codigo: true,
            descripcion: true,
            categoria: true,
            cantidad: true,
            precioInterno: true,
            precioCliente: true,
            costoInterno: true,
            costoCliente: true,
          },
        },
      },
      orderBy: { createdAt: 'asc' },
    }),

    prisma.proyectoServicioCotizado.findMany({
      where: { proyectoId },
      select: {
        id: true,
        nombre: true,
        edtId: true,
        subtotalInterno: true,
        subtotalCliente: true,
        proyectoServicioCotizadoItem: {
          select: {
            id: true,
            nombre: true,
            edtId: true,
            cantidadHoras: true,
            costoHoraInterno: true,
            costoHoraCliente: true,
            costoInterno: true,
            costoCliente: true,
          },
        },
      },
      orderBy: { createdAt: 'asc' },
    }),

    prisma.proyectoGastoCotizado.findMany({
      where: { proyectoId },
      select: {
        id: true,
        nombre: true,
        descripcion: true,
        subtotalInterno: true,
        subtotalCliente: true,
        proyectoGastoCotizadoItem: {
          select: {
            id: true,
            nombre: true,
            cantidad: true,
            precioUnitario: true,
            costoInterno: true,
            costoCliente: true,
          },
        },
      },
      orderBy: { createdAt: 'asc' },
    }),

    prisma.proyectoCronograma.findFirst({
      where: { proyectoId, tipo: 'planificacion' },
      select: {
        id: true,
        tipo: true,
        nombre: true,
        esBaseline: true,
        proyectoFase: {
          select: {
            id: true,
            nombre: true,
            orden: true,
            estado: true,
            proyectoEdt: {
              select: {
                id: true,
                nombre: true,
                edtId: true,
                orden: true,
                fechaInicioPlan: true,
                fechaFinPlan: true,
                horasPlan: true,
                estado: true,
                prioridad: true,
                descripcion: true,
                proyectoFaseId: true,
                responsableId: true,
                proyectoActividad: {
                  select: {
                    id: true,
                    nombre: true,
                    orden: true,
                    fechaInicioPlan: true,
                    fechaFinPlan: true,
                    horasPlan: true,
                    estado: true,
                    prioridad: true,
                    descripcion: true,
                    proyectoTarea: {
                      select: {
                        id: true,
                        nombre: true,
                        orden: true,
                        fechaInicio: true,
                        fechaFin: true,
                        horasEstimadas: true,
                        personasEstimadas: true,
                        estado: true,
                        prioridad: true,
                        // Dotación real por cargo (histograma §13.1, informe §13
                        // Bug 3) — personasEstimadas NO es la fuente (override
                        // manual sin usar). Cuadrilla: perfiles (recursos
                        // individuales × cantidad, ver RecursoPerfil) — antes
                        // se leía RecursoComposicion (empleados), que resultó
                        // ser solo una referencia de costo repetida N veces,
                        // nunca dotación real (docs/analisis-composicion-recursos.md).
                        recurso: {
                          select: {
                            nombre: true,
                            tipo: true,
                            perfiles: {
                              where: { activo: true },
                              select: {
                                cantidad: true,
                                recursoMiembro: { select: { nombre: true } },
                              },
                            },
                          },
                        },
                      },
                      orderBy: { orden: 'asc' },
                    },
                  },
                  orderBy: { orden: 'asc' },
                },
              },
              orderBy: { orden: 'asc' },
            },
          },
          orderBy: { orden: 'asc' },
        },
      },
    }),

    prisma.proyectoCronograma.findFirst({
      where: { proyectoId, tipo: 'comercial' },
      select: { id: true, tipo: true, nombre: true, esBaseline: true },
    }),

    prisma.proyectoOrgNodo.findMany({
      where: { proyectoId },
      select: {
        id: true,
        parentId: true,
        orden: true,
        cargoLabel: true,
        esFijoGys: true,
        empresaOverride: true,
        telefonoOverride: true,
        cipOverride: true,
        createdAt: true,
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            empleado: { select: { cip: true, telefono: true } },
          },
        },
      },
      orderBy: { orden: 'asc' },
    }),

    prisma.matrizComunicacion.findUnique({
      where: { proyectoId },
      select: {
        id: true,
        version: true,
        generadoConIA: true,
        filas: {
          select: {
            id: true,
            orden: true,
            informacion: true,
            emisor: true,
            receptores: true,
            medio: true,
            frecuencia: true,
          },
          orderBy: { orden: 'asc' },
        },
      },
    }),

    prisma.proyectoTdrAnalisis.findUnique({
      where: { proyectoId },
      select: {
        id: true,
        resumenTdr: true,
        alcanceDetectado: true,
        equiposIdentificados: true,
        serviciosIdentificados: true,
        personalRequerido: true,
        normasAplicables: true,
        hitosContractuales: true,
        cronogramaEstimado: true,
        riesgosCriticos: true,
        bloquesCompletitud: true,
        ubicacionDetectada: true,
      },
    }),

    isIAFeatureEnabled('planTrabajo'),
  ])

  if (!proyecto) return null

  // ─── Prerrequisitos ───
  const cotizacionAprobada =
    Boolean(proyecto.cotizacionId) && proyecto.cotizacion?.estado === 'aprobada'
  const organigramaCreado = organigrama.length > 0
  const cronogramaPlanificacionExiste = cronogramaPlanificacion !== null
  const matrizComunicacionCreada = matriz !== null && matriz.filas.length > 0
  const serviciosCotizados = servicios.length > 0
  const equiposCotizados = equipos.length > 0
  const tdrAnalizado = tdr !== null

  const clienteCargado = proyecto.cliente !== null
  const puedeGenerar = cotizacionAprobada && organigramaCreado && cronogramaPlanificacionExiste

  const bloqueantesFaltantes: string[] = []
  if (!cotizacionAprobada) bloqueantesFaltantes.push('La cotización del proyecto debe estar aprobada')
  if (!organigramaCreado) bloqueantesFaltantes.push('El organigrama del proyecto debe estar creado')
  if (!cronogramaPlanificacionExiste) bloqueantesFaltantes.push('Debe existir un cronograma de planificación (línea base)')
  if (!clienteCargado) bloqueantesFaltantes.push('El proyecto debe tener un cliente asignado')

  const advertencias: string[] = []
  if (!matrizComunicacionCreada) advertencias.push('La Matriz de Comunicaciones no está creada — se omitirá del Plan')
  if (!serviciosCotizados) advertencias.push('No hay servicios cotizados registrados')
  if (!equiposCotizados) advertencias.push('No hay equipos cotizados registrados')
  if (!tdrAnalizado) advertencias.push('El TDR no ha sido analizado — no se podrán precargar normas ni riesgos')

  const prerrequisitos: PlanPrerrequisitos = {
    cotizacionAprobada,
    organigramaCreado,
    cronogramaPlanificacionExiste,
    clienteCargado,
    matrizComunicacionCreada,
    serviciosCotizados,
    equiposCotizados,
    tdrAnalizado,
    puedeGenerar,
    bloqueantesFaltantes,
    advertencias,
  }

  // ─── Cronograma mapeado ───
  const cronogramaSeleccionado = cronogramaPlanificacion
    ? {
        id: cronogramaPlanificacion.id,
        tipo: cronogramaPlanificacion.tipo,
        nombre: cronogramaPlanificacion.nombre,
        esBaseline: cronogramaPlanificacion.esBaseline,
        fases: cronogramaPlanificacion.proyectoFase.map(f => ({
          id: f.id,
          nombre: f.nombre,
          orden: f.orden,
          estado: f.estado,
          edts: f.proyectoEdt.map(e => ({
            id: e.id,
            nombre: e.nombre,
            edtId: e.edtId,
            orden: e.orden,
            fechaInicioPlan: e.fechaInicioPlan,
            fechaFinPlan: e.fechaFinPlan,
            horasPlan: e.horasPlan ? Number(e.horasPlan) : null,
            estado: e.estado,
            prioridad: e.prioridad,
            descripcion: e.descripcion,
            proyectoFaseId: e.proyectoFaseId,
            responsableId: e.responsableId,
            actividades: e.proyectoActividad.map(a => ({
              id: a.id,
              nombre: a.nombre,
              orden: a.orden,
              fechaInicioPlan: a.fechaInicioPlan,
              fechaFinPlan: a.fechaFinPlan,
              horasPlan: a.horasPlan ? Number(a.horasPlan) : null,
              estado: a.estado,
              prioridad: a.prioridad,
              descripcion: a.descripcion,
              tareas: a.proyectoTarea.map(t => ({
                id: t.id,
                nombre: t.nombre,
                orden: t.orden,
                fechaInicio: t.fechaInicio,
                fechaFin: t.fechaFin,
                horasEstimadas: t.horasEstimadas ? Number(t.horasEstimadas) : null,
                personasEstimadas: t.personasEstimadas,
                estado: t.estado,
                prioridad: t.prioridad,
                recurso: t.recurso
                  ? {
                      nombre: t.recurso.nombre,
                      tipo: t.recurso.tipo,
                      perfiles: t.recurso.perfiles.map(p => ({
                        cantidad: p.cantidad,
                        recursoMiembroNombre: p.recursoMiembro.nombre,
                      })),
                    }
                  : null,
              })),
            })),
          })),
        })),
      }
    : null

  const tipoUsado: 'planificacion' | 'comercial' | null = cronogramaPlanificacion
    ? 'planificacion'
    : cronogramaComercial
      ? 'comercial'
      : null
  const advertenciaPlanificacionFaltante =
    cronogramaPlanificacion === null && cronogramaComercial !== null

  return {
    proyecto: {
      id: proyecto.id,
      codigo: proyecto.codigo,
      nombre: proyecto.nombre,
      descripcion: proyecto.descripcion,
      numeroContrato: proyecto.numeroContrato,
      ordenCompraCliente: proyecto.ordenCompraCliente,
      fechaFirmaContrato: proyecto.fechaFirmaContrato,
      fechaInicio: proyecto.fechaInicio,
      fechaFin: proyecto.fechaFin,
      estado: proyecto.estado,
      cliente: proyecto.cliente,
      gestor: proyecto.gestor,
      supervisor: proyecto.supervisor,
      lider: proyecto.lider,
    },
    planTrabajo,
    cotizacion: {
      aprobada: cotizacionAprobada,
      equipos: equipos.map(e => ({
        id: e.id,
        nombre: e.nombre,
        descripcion: e.descripcion,
        subtotalInterno: e.subtotalInterno,
        subtotalCliente: e.subtotalCliente,
        items: e.proyectoEquipoCotizadoItem,
      })),
      servicios: servicios.map(s => ({
        id: s.id,
        nombre: s.nombre,
        edtId: s.edtId,
        subtotalInterno: s.subtotalInterno,
        subtotalCliente: s.subtotalCliente,
        items: s.proyectoServicioCotizadoItem,
      })),
      gastos: gastos.map(g => ({
        id: g.id,
        nombre: g.nombre,
        descripcion: g.descripcion,
        subtotalInterno: g.subtotalInterno,
        subtotalCliente: g.subtotalCliente,
        items: g.proyectoGastoCotizadoItem,
      })),
    },
    cronograma: {
      cronogramaSeleccionado,
      tipoUsado,
      advertenciaPlanificacionFaltante,
    },
    organigrama,
    matriz,
    tdr,
    prerrequisitos,
    iaPlanTrabajoHabilitada,
  }
}

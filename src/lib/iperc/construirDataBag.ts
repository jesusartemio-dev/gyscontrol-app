import type { Iperc, IpercFila, Proyecto } from '@prisma/client'

interface IpercEvaluador {
  nombre: string
  cargo: string
}

interface IpercConFilas extends Iperc {
  filas: IpercFila[]
}

function formatEvaluador(ev: IpercEvaluador): string {
  if (!ev.nombre) return ''
  return ev.cargo ? `${ev.nombre} (${ev.cargo})` : ev.nombre
}

export function construirDataBagIperc(iperc: IpercConFilas, proyecto: Proyecto) {
  const evaluadores = (iperc.evaluadores as unknown as IpercEvaluador[]) ?? []

  return {
    cabecera: {
      tituloProyecto: proyecto.nombre,
      gerencia: iperc.gerencia,
      area: iperc.area,
      fechaElaboracion: new Date(iperc.fechaElaboracion).toLocaleDateString('es-PE'),
      fechaActualizacion: new Date(iperc.fechaActualizacion).toLocaleDateString('es-PE'),
      codigoDocumento: iperc.codigoDocumento,
      revision: iperc.revision,
      evaluador1: evaluadores[0] ? formatEvaluador(evaluadores[0]) : '',
      evaluador2: evaluadores[1] ? formatEvaluador(evaluadores[1]) : '',
      evaluador3: evaluadores[2] ? formatEvaluador(evaluadores[2]) : '',
      evaluador4: evaluadores[3] ? formatEvaluador(evaluadores[3]) : '',
      evaluador5: evaluadores[4] ? formatEvaluador(evaluadores[4]) : '',
    },
    filas: iperc.filas
      .sort((a, b) => a.numero - b.numero)
      .map(f => ({
        numero: f.numero,
        proceso: f.proceso,
        actividad: f.actividad,
        tarea: f.tarea,
        puestoTrabajo: f.puestoTrabajo,
        factorRiesgo: f.factorRiesgo,
        condicionActividad: f.condicionActividad,
        peligro: f.peligro,
        riesgo: f.riesgo,
        consecuencia: f.consecuencia,
        severidad: f.severidad,
        probabilidad: f.probabilidad,
        eliminar: f.eliminar,
        sustituir: f.sustituir,
        controlIngenieria: f.controlIngenieria,
        controlAdministrativo: f.controlAdministrativo,
        controlReceptor: f.controlReceptor,
        severidadResidual: f.severidadResidual,
        probabilidadResidual: f.probabilidadResidual,
        accionesMejora: f.accionesMejora,
        responsables: f.responsables,
      })),
  }
}

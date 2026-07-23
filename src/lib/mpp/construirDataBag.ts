import { resolverPuestosMpp } from './catalogos/puestos'

interface MppEppCatalogo {
  nombre: string
  riesgo: string
  parteCuerpo: string
  durabilidad: string | null
}

interface MppItemConCatalogo {
  orden: number
  asignaciones: unknown
  mppEppCatalogo: MppEppCatalogo | null
}

interface MppConItems {
  codigoDocumento: string
  revision: string
  area: string
  gerencia: string
  fechaElaboracion: Date
  fechaActualizacion: Date
  evaluadores: unknown
  puestos: string[]
  items: MppItemConCatalogo[]
}

interface ClienteInfo {
  nombre: string
}

interface ProyectoInfo {
  nombre: string
  codigo: string
  cliente?: ClienteInfo | null
}

interface EvaluadorObj {
  nombre: string
  cargo?: string
}

export function construirDataBagMpp(mpp: MppConItems, proyecto: ProyectoInfo) {
  const evaluadores = (mpp.evaluadores as EvaluadorObj[] | null) ?? []
  const formatearEvaluador = (e: EvaluadorObj) =>
    e.cargo ? `${e.nombre} (${e.cargo})` : e.nombre

  return {
    cabecera: {
      tituloProyecto: proyecto.nombre,
      cliente: proyecto.cliente?.nombre ?? '',
      seccion: mpp.area,
      codigoDocumento: mpp.codigoDocumento,
      revision: mpp.revision,
      gerencia: mpp.gerencia,
      area: mpp.area,
      fechaElaboracion: new Date(mpp.fechaElaboracion).toLocaleDateString('es-PE'),
      fechaActualizacion: new Date(mpp.fechaActualizacion).toLocaleDateString('es-PE'),
      evaluador1: evaluadores[0] ? formatearEvaluador(evaluadores[0]) : '',
      evaluador2: evaluadores[1] ? formatearEvaluador(evaluadores[1]) : '',
      evaluador3: evaluadores[2] ? formatearEvaluador(evaluadores[2]) : '',
      evaluador4: evaluadores[3] ? formatearEvaluador(evaluadores[3]) : '',
      evaluador5: evaluadores[4] ? formatearEvaluador(evaluadores[4]) : '',
    },
    puestos: resolverPuestosMpp(mpp.puestos),
    items: [...mpp.items]
      .sort((a, b) => a.orden - b.orden)
      .map(it => {
        const epp = it.mppEppCatalogo
        return {
          orden: it.orden,
          nombre: epp?.nombre ?? '',
          riesgo: epp?.riesgo ?? '',
          parteCuerpo: epp?.parteCuerpo ?? '',
          durabilidad: epp?.durabilidad ?? '',
          asignaciones: (it.asignaciones as Record<string, boolean>) ?? {},
        }
      }),
  }
}

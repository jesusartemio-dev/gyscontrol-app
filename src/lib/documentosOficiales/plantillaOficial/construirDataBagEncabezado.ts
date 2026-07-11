import { formatearFirma, inicialesDe } from './formatearFirma'

export interface EncabezadoDatosDocumento {
  codigoDocumento: string | null
  revisionDocumento: string
  numeroConsultor: string | null
  desarrolloNombre: string | null
  verificoNombre: string | null
  aproboNombre: string | null
  autorizoNombre: string | null
}

export interface EncabezadoDatosProyecto {
  nombre: string
  clienteNombre: string
  sede: string | null
  ordenCompraCliente: string | null
  etapa: string | null
}

export interface DataBagEncabezado {
  cliente: string
  sede: string
  ordenCompra: string
  nombreProyecto: string
  etapa: string
  tituloDocumento: string
  codigoDocumento: string
  numeroConsultor: string
  revision: string
  revisiones: Array<{ rev: string; te: string; teDescripcion: string; des: string; ver: string; apr: string; aut: string; fecha: string }>
  firmaDes: string
  firmaVer: string
  firmaApr: string
  firmaAut: string
}

/**
 * Bloque de dataBag común a cualquier documento con la plantilla oficial de
 * cliente: encabezado (cliente/sede/orden de compra/proyecto/etapa/código/
 * revisión), tabla de revisiones (v1: una sola fila con la revisión actual —
 * no se modela historial todavía) y las 4 firmas. Cada renderer específico
 * (Matriz, Organigrama) agrega encima sus propios campos si los tiene.
 */
export function construirDataBagEncabezado(input: {
  proyecto: EncabezadoDatosProyecto
  documento: EncabezadoDatosDocumento
  tituloDocumento: string
}): DataBagEncabezado {
  const hoy = new Date().toLocaleDateString('es-PE', { day: '2-digit', month: '2-digit', year: 'numeric' })

  return {
    cliente: input.proyecto.clienteNombre,
    sede: input.proyecto.sede ?? '',
    ordenCompra: input.proyecto.ordenCompraCliente ?? '',
    nombreProyecto: input.proyecto.nombre,
    etapa: input.proyecto.etapa ?? '',
    tituloDocumento: input.tituloDocumento,
    codigoDocumento: input.documento.codigoDocumento ?? '',
    numeroConsultor: input.documento.numeroConsultor ?? '',
    revision: input.documento.revisionDocumento,
    revisiones: [
      {
        rev: input.documento.revisionDocumento,
        te: 'A',
        teDescripcion: 'Para Conocimiento',
        des: inicialesDe(input.documento.desarrolloNombre ?? ''),
        ver: inicialesDe(input.documento.verificoNombre ?? ''),
        apr: inicialesDe(input.documento.aproboNombre ?? ''),
        aut: inicialesDe(input.documento.autorizoNombre ?? ''),
        fecha: hoy,
      },
    ],
    firmaDes: formatearFirma(input.documento.desarrolloNombre),
    firmaVer: formatearFirma(input.documento.verificoNombre),
    firmaApr: formatearFirma(input.documento.aproboNombre),
    firmaAut: formatearFirma(input.documento.autorizoNombre),
  }
}

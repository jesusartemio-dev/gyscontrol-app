import { format } from 'date-fns'
import type { Pets, Proyecto, Cliente } from '@prisma/client'
import { petsContenidoSchema } from '@/lib/validators/pets'
import type { BloqueComo } from '@/lib/validators/pets'

// ─── Tipos exportados ────────────────────────────────────────────────────────

export type PetsDataBag = {
  // Cabecera
  tituloProyecto: string
  clienteUnidad: string
  codigoDocumento: string
  numeroRevision: string
  area: string
  fechaEmision: string
  fechaAprobacion: string
  preparadoPor: string
  preparadoCargo: string
  revisadoPor1: string
  revisadoCargo1: string
  revisadoPor2: string
  revisadoCargo2: string
  aprobadoPor: string
  aprobadoCargo: string

  // Loops
  personal: { rol: string }[]
  eppBasico: { nombre: string }[]
  eppBioseguridad: { nombre: string }[]
  eppEspecifico: { nombre: string }[]
  equipos: { nombre: string }[]
  herramientas: { nombre: string }[]
  materiales: { nombre: string }[]
  etapas: {
    letra: string
    titulo: string
    pasos: {
      que: string
      comoLineas: { texto: string }[]
      quien: { rol: string }[]
    }[]
  }[]
  restricciones: { texto: string }[]
  cambios: { fecha: string; version: string; descripcion: string }[]
}

// ─── Helpers privados ────────────────────────────────────────────────────────

function fmtDate(d: Date | string | null | undefined): string {
  if (!d) return ''
  const date = typeof d === 'string' ? new Date(d) : d
  if (isNaN(date.getTime())) return ''
  return format(date, 'dd/MM/yyyy')
}

function aplanarBloques(bloques: BloqueComo[], nivel = 0): { texto: string }[] {
  const lines: { texto: string }[] = []
  const ind = (n: number) => '  '.repeat(n)

  for (const bloque of bloques) {
    switch (bloque.tipo) {
      case 'parrafo':
        lines.push({ texto: ind(nivel) + bloque.texto })
        break

      case 'lista':
        if (bloque.titulo) lines.push({ texto: ind(nivel) + bloque.titulo })
        for (const item of bloque.items) {
          lines.push({ texto: ind(bloque.titulo ? nivel + 1 : nivel) + '• ' + item })
        }
        break

      case 'subseccion':
        lines.push({ texto: ind(nivel) + '▸ ' + bloque.titulo })
        lines.push(...aplanarBloques(bloque.bloques, nivel + 1))
        break

      case 'tabla':
        if (bloque.titulo) lines.push({ texto: ind(nivel) + bloque.titulo })
        for (const fila of bloque.filas) {
          const celda = bloque.headers
            .map((h, i) => `${h}: ${fila[i] ?? ''}`)
            .join(' | ')
          lines.push({ texto: ind(nivel + 1) + celda })
        }
        break

      case 'ilustracion':
        lines.push({
          texto: ind(nivel) + `[ Ilustración ${bloque.numero}: ${bloque.titulo} ]`,
        })
        break

      case 'referencia':
        lines.push({
          texto:
            ind(nivel) +
            `Ver: ${bloque.documento} (${bloque.codigo})` +
            (bloque.nota ? ` — ${bloque.nota}` : ''),
        })
        break

      case 'restriccion':
        if (bloque.titulo) lines.push({ texto: ind(nivel) + bloque.titulo })
        for (const prohib of bloque.prohibiciones) {
          lines.push({ texto: ind(nivel + 1) + '✗ ' + prohib })
        }
        break
    }
  }

  return lines
}

// ─── Función principal ────────────────────────────────────────────────────────

export function construirDataBagPets(
  pets: Pets,
  proyecto: Proyecto & { cliente: Cliente | null },
  opciones?: { unidad?: string | null }
): PetsDataBag {
  const contenido = petsContenidoSchema.parse(pets.contenido)

  const clienteUnidad = [proyecto.cliente?.nombre, opciones?.unidad]
    .filter(Boolean)
    .join(' — ')

  const etapas = contenido.procedimiento.etapas.map((etapa, i) => ({
    letra: etapa.letra ?? String.fromCharCode(65 + i),
    titulo: etapa.titulo,
    pasos: etapa.pasos.map(paso => ({
      que: paso.que,
      comoLineas: aplanarBloques(paso.como),
      quien: paso.quien,
    })),
  }))

  return {
    // Cabecera
    tituloProyecto: proyecto.nombre,
    clienteUnidad,
    codigoDocumento: pets.codigoDocumento ?? '',
    numeroRevision: pets.revision ?? '01',
    area: pets.area ?? 'Proyectos',
    fechaEmision: fmtDate(pets.fechaEmision),
    fechaAprobacion: fmtDate(pets.fechaAprobacion),
    preparadoPor: pets.preparadoPor ?? '',
    preparadoCargo: pets.preparadoCargo ?? '',
    revisadoPor1: pets.revisadoPor1 ?? '',
    revisadoCargo1: pets.revisadoCargo1 ?? '',
    revisadoPor2: pets.revisadoPor2 ?? '',
    revisadoCargo2: pets.revisadoCargo2 ?? '',
    aprobadoPor: pets.aprobadoPor ?? '',
    aprobadoCargo: pets.aprobadoCargo ?? '',

    // Loops directos
    personal: contenido.personal,
    eppBasico: contenido.epp.basico,
    eppBioseguridad: contenido.epp.bioseguridad,
    eppEspecifico: contenido.epp.especifico,
    equipos: contenido.recursos.equipos,
    herramientas: contenido.recursos.herramientas,
    materiales: contenido.recursos.materiales,
    restricciones: contenido.restricciones,
    cambios: contenido.cambios,

    // Etapas transformadas
    etapas,
  }
}

import { buildApiUrl } from '@/lib/utils'

export interface JornadaEnCurso {
  id: string
  fechaTrabajo: string
  proyecto: {
    id: string
    codigo: string
    nombre: string
    clienteId: string | null
    cliente: { id: string; nombre: string } | null
  }
  cantidadMiembros: number
  miembros: Array<{ userId: string; nombre: string | null }>
}

export async function getJornadasEnCurso(): Promise<JornadaEnCurso[]> {
  const res = await fetch(buildApiUrl('/api/horas-hombre/jornada/en-curso'))
  if (!res.ok) {
    const err = await res.json()
    throw new Error(err.error || 'Error al obtener jornadas en curso')
  }
  const json = await res.json()
  return json.data
}

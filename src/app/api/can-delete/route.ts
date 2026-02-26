import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { canDelete, type DeletableEntity } from '@/lib/utils/deleteValidation'

const VALID_ENTITIES: DeletableEntity[] = [
  'listaEquipo',
  'listaEquipoItem',
  'cotizacionProveedor',
  'pedidoEquipo',
  'ordenCompra',
  'valorizacion',
  'cuentaPorCobrar',
  'cuentaPorPagar',
  'recepcionPendiente',
]

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const entity = searchParams.get('entity') as DeletableEntity | null
    const id = searchParams.get('id')

    if (!entity || !id) {
      return NextResponse.json(
        { error: 'Parámetros "entity" e "id" son requeridos' },
        { status: 400 }
      )
    }

    if (!VALID_ENTITIES.includes(entity)) {
      return NextResponse.json(
        { error: `Entidad "${entity}" no es válida` },
        { status: 400 }
      )
    }

    const result = await canDelete(entity, id)
    return NextResponse.json(result)
  } catch (error) {
    console.error('Error en pre-check de eliminación:', error)
    return NextResponse.json(
      { error: 'Error del servidor' },
      { status: 500 }
    )
  }
}

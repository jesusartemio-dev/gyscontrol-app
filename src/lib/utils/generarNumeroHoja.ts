import { prisma } from '@/lib/prisma'

/** Lo mínimo que necesita esta función — evita pelear con el tipo exacto
 * del cliente transaccional (que difiere del cliente global por las
 * extensiones/adapter del proyecto, aunque ambos exponen lo mismo en runtime). */
interface ClienteHojaDeGastos {
  hojaDeGastos: {
    findFirst: (args: { where: { numero: { startsWith: string } }; orderBy: { numero: 'desc' } }) => Promise<{ numero: string } | null>
  }
}

/**
 * Genera el siguiente número correlativo del día (REQ-YYMMDD-NNN).
 *
 * Acepta opcionalmente el cliente de una transacción (`tx`). Es obligatorio
 * pasarlo si se van a generar VARIOS números dentro de una misma
 * `$transaction`: con el cliente global, las hojas recién creadas dentro de
 * la transacción no son visibles todavía (no se ha hecho commit), así que
 * cada llamada leería el mismo "último número" y devolvería duplicados —
 * rompe el `@unique` de `numero` en la segunda hoja.
 */
export async function generarNumeroHoja(
  client: ClienteHojaDeGastos = prisma,
): Promise<string> {
  const now = new Date()
  const yy = String(now.getFullYear()).slice(-2)
  const mm = String(now.getMonth() + 1).padStart(2, '0')
  const dd = String(now.getDate()).padStart(2, '0')
  const prefix = `REQ-${yy}${mm}${dd}`

  const ultimo = await client.hojaDeGastos.findFirst({
    where: { numero: { startsWith: prefix } },
    orderBy: { numero: 'desc' },
  })

  let correlativo = 1
  if (ultimo) {
    const parts = ultimo.numero.split('-')
    correlativo = parseInt(parts[parts.length - 1]) + 1
  }

  return `${prefix}-${String(correlativo).padStart(3, '0')}`
}

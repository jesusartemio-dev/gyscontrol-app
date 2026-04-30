/**
 * Script para actualizar el radio de las ubicaciones según su tipo.
 *
 * Las plantas y obras industriales son grandes — un radio de 150m (default)
 * causa que marcajes legítimos dentro de la planta queden "fuera de zona"
 * por fluctuaciones del GPS. Este script aplica radios sugeridos por tipo:
 *
 *   - oficina → 150m (sin cambio, suficiente para edificio de oficinas)
 *   - planta  → 700m (típico de planta industrial mediana)
 *   - obra    → 1000m (obras pueden ser muy extensas)
 *
 * Modo seguro: por default solo IMPRIME los cambios sin aplicarlos.
 * Para aplicarlos, pasa el flag --apply.
 *
 * Uso:
 *   - Dev/local:    npx dotenv -e .env -o -- tsx scripts/update-radios-ubicaciones.ts
 *   - Producción:   npx dotenv -e .env.production -o -- tsx scripts/update-radios-ubicaciones.ts
 *   - Aplicar:      agregar --apply al final
 */
import { PrismaClient, type TipoUbicacion } from '@prisma/client'

const prisma = new PrismaClient()

const RADIOS_SUGERIDOS: Record<TipoUbicacion, number> = {
  oficina: 150,
  planta: 700,
  obra: 1000,
}

async function main() {
  const apply = process.argv.includes('--apply')
  console.log(`Modo: ${apply ? 'APLICAR cambios' : 'DRY-RUN (solo imprimir)'}`)
  console.log('---')

  const ubicaciones = await prisma.ubicacion.findMany({
    orderBy: [{ tipo: 'asc' }, { nombre: 'asc' }],
  })

  let actualizadas = 0
  for (const u of ubicaciones) {
    const sugerido = RADIOS_SUGERIDOS[u.tipo]
    const necesitaCambio = u.radioMetros !== sugerido
    const flag = necesitaCambio ? '🔧' : '✓ '
    console.log(
      `${flag} ${u.nombre.padEnd(30)} | tipo=${u.tipo.padEnd(8)} | radio actual=${String(u.radioMetros).padStart(5)}m → sugerido=${sugerido}m`,
    )
    if (necesitaCambio && apply) {
      await prisma.ubicacion.update({
        where: { id: u.id },
        data: { radioMetros: sugerido },
      })
      actualizadas++
    } else if (necesitaCambio) {
      actualizadas++
    }
  }

  console.log('---')
  if (apply) {
    console.log(`✅ Aplicados ${actualizadas} cambios.`)
  } else {
    console.log(`📝 Dry-run: ${actualizadas} ubicaciones cambiarian.`)
    console.log(`   Para aplicar: agrega --apply al comando.`)
  }
}

main()
  .catch(e => {
    console.error(e)
    process.exit(1)
  })
  .finally(() => prisma.$disconnect())

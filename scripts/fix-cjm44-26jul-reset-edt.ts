/**
 * Resetea proyectoEdtId=null en la jornada CJM44 del 26-jul, que quedó
 * bloqueada en "CON - Construcción" por el bug del auto-preselect en
 * AgregarTareaModal (ver commit del fix). Verificado que solo tiene la tarea
 * placeholder de asistencia automática, ninguna tarea real ligada a CON.
 *
 * Uso (dry-run por defecto):
 *   npx dotenv -e .env.production -o -- npx tsx scripts/fix-cjm44-26jul-reset-edt.ts
 * Para aplicar:
 *   npx dotenv -e .env.production -o -- npx tsx scripts/fix-cjm44-26jul-reset-edt.ts --apply
 */
import { prisma } from '../src/lib/prisma'

const JORNADA_ID = 'cms1r3mge0001l304kkge67bv'

async function main() {
  const apply = process.argv.includes('--apply')

  const jornada = await prisma.registroHorasCampo.findUnique({
    where: { id: JORNADA_ID },
    select: { id: true, estado: true, proyectoEdtId: true, fechaTrabajo: true }
  })

  if (!jornada) throw new Error('Jornada no encontrada')
  console.log(`Jornada ${jornada.id} | ${jornada.fechaTrabajo.toISOString().slice(0,10)} | estado=${jornada.estado} | proyectoEdtId actual=${jornada.proyectoEdtId}`)

  if (jornada.estado !== 'iniciado') {
    throw new Error(`Estado inesperado (${jornada.estado}), abortando por seguridad`)
  }

  if (!apply) {
    console.log('Dry-run: no se modificó nada. Vuelve a correr con --apply para aplicar.')
    return
  }

  await prisma.registroHorasCampo.update({
    where: { id: JORNADA_ID },
    data: { proyectoEdtId: null }
  })
  console.log('✅ proyectoEdtId reseteado a null.')
}

main()
  .catch((e) => {
    console.error('❌ Error:', e)
    process.exitCode = 1
  })
  .finally(() => prisma.$disconnect())

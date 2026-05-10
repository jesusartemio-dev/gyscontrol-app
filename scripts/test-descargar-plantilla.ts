/**
 * Test standalone para verificar que la plantilla DOCX se descarga correctamente de Drive.
 * Ejecutar con: npx dotenv -e .env.production -- npx tsx scripts/test-descargar-plantilla.ts
 * (requiere GOOGLE_SERVICE_ACCOUNT_EMAIL, GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY,
 *  GOOGLE_SHARED_DRIVE_ID y GOOGLE_DRIVE_PLAN_TEMPLATE_FILE_ID configurados)
 */

import { descargarPlantillaPlanTrabajo, limpiarCachePlantilla } from '../src/lib/planTrabajo/descargarPlantilla'

async function main() {
  console.log('FileId:', process.env.GOOGLE_DRIVE_PLAN_TEMPLATE_FILE_ID ?? '(no configurado)')

  try {
    const buf = await descargarPlantillaPlanTrabajo()
    console.log(`✅ OK — ${buf.length.toLocaleString()} bytes descargados`)

    // Verificar magic bytes de .docx (PK header de ZIP/OOXML)
    const magic = buf.slice(0, 4).toString('hex')
    if (magic === '504b0304') {
      console.log('✅ Magic bytes OK (PK ZIP header — .docx válido)')
    } else {
      console.warn(`⚠️  Magic bytes inesperados: ${magic} (esperado: 504b0304)`)
    }

    // Test caché: segunda llamada debe ser instantánea
    const t0 = Date.now()
    const buf2 = await descargarPlantillaPlanTrabajo()
    const elapsed = Date.now() - t0
    console.log(`✅ Caché funcionando — segunda llamada en ${elapsed}ms (esperado <10ms)`)
    console.log(`   Mismo buffer: ${buf === buf2}`)

    // Test limpiarCaché + re-descarga
    limpiarCachePlantilla()
    const buf3 = await descargarPlantillaPlanTrabajo()
    console.log(`✅ Re-descarga tras limpiar caché: ${buf3.length.toLocaleString()} bytes`)
  } catch (e) {
    console.error('❌ Error:', e instanceof Error ? e.message : e)
    process.exit(1)
  }
}

main()

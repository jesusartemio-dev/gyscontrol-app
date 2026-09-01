/**
 * Verifica contra el Google Drive real que deleteFile() efectivamente saca el
 * archivo (papelera si no se puede borrar definitivo), en vez de fallar en
 * silencio y dejarlo huérfano.
 *
 * Correr con:  npx dotenv -e .env -o -- npx tsx scripts/test-drive-delete.ts
 */
import { google } from 'googleapis'
import { uploadFile, createFolder, getAdminDriveId, deleteFile } from '../src/lib/services/googleDrive'

let ok = 0
let fail = 0
function assert(cond: boolean, msg: string) {
  if (cond) { ok++; console.log(`  OK: ${msg}`) }
  else { fail++; console.log(`  FALLA: ${msg}`) }
}

function rawDrive() {
  const auth = new google.auth.GoogleAuth({
    credentials: {
      client_email: process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL,
      private_key: process.env.GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY?.replace(/\\n/g, '\n'),
    },
    scopes: ['https://www.googleapis.com/auth/drive'],
  })
  return google.drive({ version: 'v3', auth })
}

async function main() {
  const drive = rawDrive()
  const carpeta = await createFolder({ parentId: getAdminDriveId(), folderName: 'TMP_TEST_DELETE' })

  const subido = await uploadFile({
    folderId: carpeta.id!,
    fileName: `borrar-${Date.now()}.txt`,
    mimeType: 'text/plain',
    buffer: Buffer.from('archivo de prueba para verificar deleteFile'),
  })
  assert(!!subido.id, `se subió el archivo de prueba (${subido.id})`)

  const antes = await drive.files.get({ fileId: subido.id!, fields: 'trashed,capabilities(canDelete,canTrash)', supportsAllDrives: true })
  console.log('  permisos de la cuenta de servicio:', JSON.stringify(antes.data.capabilities))
  assert(antes.data.trashed === false, 'antes de borrar, el archivo está activo')

  // Lo que se está probando
  await deleteFile(subido.id!)
  console.log('  deleteFile() no lanzó error')

  let sigueActivo = false
  try {
    const despues = await drive.files.get({ fileId: subido.id!, fields: 'trashed', supportsAllDrives: true })
    sigueActivo = despues.data.trashed === false
    assert(despues.data.trashed === true, 'el archivo quedó en la papelera')
  } catch {
    ok++
    console.log('  OK: el archivo ya no existe (borrado definitivo)')
  }
  assert(!sigueActivo, 'el archivo NO sigue activo en Drive (era el bug)')

  // Un id inexistente tiene que seguir fallando: si no, los llamadores
  // creerían que borraron algo que nunca estuvo.
  try {
    await deleteFile('id-que-no-existe-000000000000')
    assert(false, 'un fileId inexistente debe lanzar error')
  } catch {
    assert(true, 'un fileId inexistente sigue lanzando error')
  }

  try { await deleteFile(carpeta.id!) } catch { /* limpieza best-effort */ }
  console.log(`\n=== RESULTADO: ${ok} OK, ${fail} FALLAS ===`)
  process.exit(fail > 0 ? 1 : 0)
}

main().catch(e => { console.error('ERROR INESPERADO:', e); process.exit(1) })

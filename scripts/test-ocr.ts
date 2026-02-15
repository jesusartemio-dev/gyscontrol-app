// ===================================================
// Script: test-ocr.ts
// Prueba la integración con Anthropic API (Claude Vision)
//
// Ejecutar:
//   npx dotenv -e .env.local -- npx tsx scripts/test-ocr.ts
//
// Con un comprobante real:
//   npx dotenv -e .env.local -- npx tsx scripts/test-ocr.ts ruta/a/factura.jpg
// ===================================================

import Anthropic from '@anthropic-ai/sdk'
import * as fs from 'fs'
import * as path from 'path'

// ── Colores para consola ─────────────────────────────────

const green = (s: string) => `\x1b[32m${s}\x1b[0m`
const red = (s: string) => `\x1b[31m${s}\x1b[0m`
const yellow = (s: string) => `\x1b[33m${s}\x1b[0m`
const cyan = (s: string) => `\x1b[36m${s}\x1b[0m`
const dim = (s: string) => `\x1b[2m${s}\x1b[0m`

const OK = green('✅')
const FAIL = red('❌')
const WARN = yellow('⚠️')

// ── Paso 1: Verificar variables de entorno ───────────────

async function checkEnvVars(): Promise<boolean> {
  console.log(cyan('\n═══ Paso 1: Verificar variables de entorno ═══\n'))

  const apiKey = process.env.ANTHROPIC_API_KEY
  const model = process.env.OCR_MODEL || 'claude-haiku-4-5-20251001'

  if (!apiKey) {
    console.log(`${FAIL} ANTHROPIC_API_KEY no está definida en .env.local`)
    return false
  }

  const masked = apiKey.substring(0, 12) + '...' + apiKey.substring(apiKey.length - 4)
  console.log(`${OK} ANTHROPIC_API_KEY: ${masked}`)
  console.log(`${OK} OCR_MODEL: ${model}`)

  const peruApiKey = process.env.PERU_API_KEY
  if (!peruApiKey) {
    console.log(`${WARN} PERU_API_KEY no definida ${dim('(validación SUNAT no disponible)')}`)
  } else {
    console.log(`${OK} PERU_API_KEY: configurada`)
  }

  return true
}

// ── Paso 2: Prueba básica de conexión (sin imagen) ──────

async function testBasicConnection(): Promise<boolean> {
  console.log(cyan('\n═══ Paso 2: Conexión básica a Anthropic API ═══\n'))

  const model = process.env.OCR_MODEL || 'claude-haiku-4-5-20251001'

  try {
    const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

    console.log(`   Enviando mensaje de prueba a ${model}...`)
    const start = Date.now()

    const message = await client.messages.create({
      model,
      max_tokens: 50,
      messages: [{ role: 'user', content: 'Responde únicamente con la palabra "OK" y nada más.' }],
    })

    const elapsed = Date.now() - start
    const text = message.content
      .filter((b): b is Anthropic.TextBlock => b.type === 'text')
      .map((b) => b.text)
      .join('')

    console.log(`${OK} Respuesta: "${text.trim()}" ${dim(`(${elapsed}ms)`)}`)
    console.log(`   Modelo: ${message.model}`)
    console.log(`   Tokens: input=${message.usage.input_tokens}, output=${message.usage.output_tokens}`)
    return true
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error)
    console.log(`${FAIL} Error de conexión: ${msg}`)
    return false
  }
}

// ── Paso 3: Prueba de visión con imagen ──────────────────

async function testVision(filePath?: string): Promise<boolean> {
  console.log(cyan('\n═══ Paso 3: Prueba de Claude Vision ═══\n'))

  const model = process.env.OCR_MODEL || 'claude-haiku-4-5-20251001'

  // Determinar archivo a usar
  const resolvedPath = filePath
    ? path.resolve(filePath)
    : path.resolve(__dirname, '..', 'public', 'logo.png')

  if (!fs.existsSync(resolvedPath)) {
    console.log(`${FAIL} Archivo no encontrado: ${resolvedPath}`)
    return false
  }

  const fileBuffer = fs.readFileSync(resolvedPath)
  const fileSizeKB = (fileBuffer.length / 1024).toFixed(1)
  const ext = path.extname(resolvedPath).toLowerCase()

  const mimeMap: Record<string, string> = {
    '.jpg': 'image/jpeg',
    '.jpeg': 'image/jpeg',
    '.png': 'image/png',
    '.gif': 'image/gif',
    '.webp': 'image/webp',
    '.pdf': 'application/pdf',
  }
  const mimeType = mimeMap[ext]
  if (!mimeType) {
    console.log(`${FAIL} Tipo de archivo no soportado: ${ext}`)
    return false
  }

  const isRealComprobante = !!filePath
  console.log(`   Archivo: ${path.basename(resolvedPath)} (${fileSizeKB} KB)`)
  console.log(`   MIME: ${mimeType}`)
  console.log(`   Modo: ${isRealComprobante ? 'Comprobante real' : dim('Imagen de prueba (logo)')}\n`)

  try {
    const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })
    const base64Data = fileBuffer.toString('base64')

    const isPdf = mimeType === 'application/pdf'
    const fileBlock: Anthropic.Messages.ContentBlockParam = isPdf
      ? {
          type: 'document',
          source: { type: 'base64', media_type: 'application/pdf', data: base64Data },
        }
      : {
          type: 'image',
          source: {
            type: 'base64',
            media_type: mimeType as 'image/jpeg' | 'image/png' | 'image/gif' | 'image/webp',
            data: base64Data,
          },
        }

    // Si es comprobante real, usar el prompt OCR completo
    const prompt = isRealComprobante
      ? `Analiza este comprobante de pago peruano y devuelve ÚNICAMENTE un JSON válido con esta estructura:
{
  "tipoComprobante": "factura|boleta|recibo|ticket|sin_comprobante",
  "numeroComprobante": "string o null",
  "proveedorRuc": "string de 11 dígitos o null",
  "proveedorNombre": "string o null",
  "fechaEmision": "YYYY-MM-DD o null",
  "montoTotal": number o null,
  "igv": number o null,
  "moneda": "PEN|USD",
  "descripcion": "resumen breve del concepto/detalle",
  "confianza": "alta|media|baja",
  "observaciones": "string si hay problemas de lectura, null si todo OK"
}
No incluyas markdown, backticks, ni texto adicional. Solo el JSON.`
      : 'Describe brevemente qué ves en esta imagen en una sola oración en español.'

    console.log(`   Enviando a Claude Vision...`)
    const start = Date.now()

    const message = await client.messages.create({
      model,
      max_tokens: 1024,
      messages: [
        {
          role: 'user',
          content: [fileBlock, { type: 'text', text: prompt }],
        },
      ],
    })

    const elapsed = Date.now() - start
    const text = message.content
      .filter((b): b is Anthropic.TextBlock => b.type === 'text')
      .map((b) => b.text)
      .join('')

    console.log(`${OK} Respuesta recibida ${dim(`(${elapsed}ms)`)}\n`)
    console.log(`   Tokens: input=${message.usage.input_tokens}, output=${message.usage.output_tokens}`)

    if (isRealComprobante) {
      // Intentar parsear como JSON
      let cleaned = text.trim()
      if (cleaned.startsWith('```')) {
        cleaned = cleaned.replace(/^```(?:json)?\s*/, '').replace(/\s*```$/, '')
      }
      try {
        const parsed = JSON.parse(cleaned)
        console.log(cyan('\n   ── Datos extraídos ──\n'))
        console.log(`   Tipo:        ${parsed.tipoComprobante || '-'}`)
        console.log(`   N° Comprob.: ${parsed.numeroComprobante || '-'}`)
        console.log(`   RUC:         ${parsed.proveedorRuc || '-'}`)
        console.log(`   Proveedor:   ${parsed.proveedorNombre || '-'}`)
        console.log(`   Fecha:       ${parsed.fechaEmision || '-'}`)
        console.log(`   Monto:       ${parsed.moneda || 'PEN'} ${parsed.montoTotal ?? '-'}`)
        console.log(`   IGV:         ${parsed.igv ?? '-'}`)
        console.log(`   Descripción: ${parsed.descripcion || '-'}`)
        console.log(`   Confianza:   ${parsed.confianza === 'alta' ? green(parsed.confianza) : parsed.confianza === 'media' ? yellow(parsed.confianza) : red(parsed.confianza)}`)
        if (parsed.observaciones) {
          console.log(`   Obs:         ${yellow(parsed.observaciones)}`)
        }
      } catch {
        console.log(`\n${WARN} Respuesta no es JSON válido. Respuesta cruda:`)
        console.log(dim(`   ${text.substring(0, 500)}`))
      }
    } else {
      console.log(`\n   Descripción: ${text.trim()}`)
    }

    // Estimación de costo
    const inputCost = (message.usage.input_tokens / 1_000_000) * 1.0 // haiku input
    const outputCost = (message.usage.output_tokens / 1_000_000) * 5.0 // haiku output
    const totalCost = inputCost + outputCost
    console.log(dim(`\n   Costo estimado: ~$${totalCost.toFixed(5)} USD`))

    return true
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error)
    console.log(`${FAIL} Error en Vision: ${msg}`)
    return false
  }
}

// ── Main ─────────────────────────────────────────────────

async function main() {
  console.log(cyan('\n🔬 Test de integración OCR - Anthropic Claude Vision\n'))
  console.log(dim('─'.repeat(55)))

  // Archivo opcional como argumento
  const customFile = process.argv[2]

  // Paso 1
  const envOk = await checkEnvVars()
  if (!envOk) {
    console.log(red('\n✘ Abortando: variables de entorno no configuradas\n'))
    process.exit(1)
  }

  // Paso 2
  const connOk = await testBasicConnection()
  if (!connOk) {
    console.log(red('\n✘ Abortando: no se pudo conectar a Anthropic API\n'))
    process.exit(1)
  }

  // Paso 3
  const visionOk = await testVision(customFile)
  if (!visionOk) {
    console.log(red('\n✘ Fallo en prueba de visión\n'))
    process.exit(1)
  }

  // Resumen
  console.log(cyan('\n═══ Resumen ═══\n'))
  console.log(`${OK} API Key válida`)
  console.log(`${OK} Conexión a Anthropic OK`)
  console.log(`${OK} Claude Vision funcional`)

  if (!customFile) {
    console.log(yellow(`\n💡 Para probar con un comprobante real:`))
    console.log(dim(`   npx dotenv -e .env.local -- npx tsx scripts/test-ocr.ts ruta/a/factura.jpg\n`))
  }
}

main()

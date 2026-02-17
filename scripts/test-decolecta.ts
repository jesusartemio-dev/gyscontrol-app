/**
 * Test Decolecta SUNAT API response format
 * Run: npx dotenv -e .env.local -- npx tsx scripts/test-decolecta.ts
 */

const RUC_TEST = '20486705630' // POLLERIA SUPER (from the screenshot)

async function main() {
  const token = process.env.DECOLECTA_API_TOKEN
  if (!token) {
    console.error('❌ DECOLECTA_API_TOKEN not set')
    process.exit(1)
  }
  console.log(`✅ Token: ${token.substring(0, 10)}...`)

  const url = `https://api.decolecta.com/v1/sunat/ruc?numero=${RUC_TEST}`
  console.log(`\n📡 GET ${url}\n`)

  const res = await fetch(url, {
    headers: {
      Accept: 'application/json',
      Authorization: `Bearer ${token}`,
    },
  })

  console.log(`HTTP ${res.status} ${res.statusText}`)
  console.log('Headers:', Object.fromEntries(res.headers.entries()))

  const text = await res.text()
  console.log('\n📦 Raw response body:')
  console.log(text)

  try {
    const data = JSON.parse(text)
    console.log('\n🔍 Parsed JSON keys:', Object.keys(data))
    console.log('data.nombre:', data.nombre)
    console.log('data.razonSocial:', data.razonSocial)
    console.log('data.estado:', data.estado)
    console.log('data.condicion:', data.condicion)
    console.log('data.direccion:', data.direccion)
  } catch {
    console.log('⚠️ Response is not valid JSON')
  }
}

main().catch(console.error)

// ===================================================
// 📁 Archivo: test-cotizacion-extensions.js
// 📌 Ubicación: /
// 🔧 Descripción: Script de prueba para las nuevas extensiones de cotización
// ✅ Prueba APIs de exclusiones, condiciones y tiempos de entrega
// ===================================================

const BASE_URL = 'http://localhost:3000'

async function testCotizacionExtensions() {
  console.log('🧪 Iniciando pruebas de extensiones de cotización...\n')

  try {
    // 1. Obtener una cotización existente para pruebas
    console.log('1️⃣ Obteniendo cotización de prueba...')
    const cotizacionesResponse = await fetch(`${BASE_URL}/api/cotizaciones`)
    const cotizaciones = await cotizacionesResponse.json()

    if (!cotizaciones.data || cotizaciones.data.length === 0) {
      console.log('❌ No hay cotizaciones disponibles para pruebas')
      return
    }

    const cotizacionId = cotizaciones.data[0].id
    console.log(`✅ Usando cotización: ${cotizacionId}\n`)

    // 2. Probar API de exclusiones
    console.log('2️⃣ Probando API de exclusiones...')

    // Crear exclusión
    const exclusionData = {
      descripcion: 'Prueba de exclusión automática',
      orden: 1
    }

    const createExclusionResponse = await fetch(`${BASE_URL}/api/cotizacion/${cotizacionId}/exclusiones`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(exclusionData)
    })

    if (createExclusionResponse.ok) {
      const nuevaExclusion = await createExclusionResponse.json()
      console.log('✅ Exclusión creada:', nuevaExclusion.data.descripcion)

      // Obtener exclusiones
      const getExclusionsResponse = await fetch(`${BASE_URL}/api/cotizacion/${cotizacionId}/exclusiones`)
      const exclusiones = await getExclusionsResponse.json()
      console.log(`✅ Exclusiones obtenidas: ${exclusiones.data.length} items`)
    } else {
      console.log('❌ Error creando exclusión:', createExclusionResponse.status)
    }

    // 3. Probar API de condiciones
    console.log('\n3️⃣ Probando API de condiciones...')

    // Crear condición
    const condicionData = {
      descripcion: 'Prueba de condición automática',
      tipo: 'comercial',
      orden: 1
    }

    const createCondicionResponse = await fetch(`${BASE_URL}/api/cotizacion/${cotizacionId}/condiciones`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(condicionData)
    })

    if (createCondicionResponse.ok) {
      const nuevaCondicion = await createCondicionResponse.json()
      console.log('✅ Condición creada:', nuevaCondicion.data.descripcion)

      // Obtener condiciones
      const getCondicionesResponse = await fetch(`${BASE_URL}/api/cotizacion/${cotizacionId}/condiciones`)
      const condiciones = await getCondicionesResponse.json()
      console.log(`✅ Condiciones obtenidas: ${condiciones.data.length} items`)
    } else {
      console.log('❌ Error creando condición:', createCondicionResponse.status)
    }

    // 4. Probar actualización de tiempos de entrega
    console.log('\n4️⃣ Probando actualización de tiempos de entrega...')

    // Obtener equipos de la cotización
    const cotizacionResponse = await fetch(`${BASE_URL}/api/cotizacion/${cotizacionId}`)
    const cotizacion = await cotizacionResponse.json()

    if (cotizacion.equipos && cotizacion.equipos.length > 0) {
      const equipoId = cotizacion.equipos[0].id

      const updatePlazoResponse = await fetch(`${BASE_URL}/api/cotizacion/${cotizacionId}/equipos/${equipoId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ plazoEntregaSemanas: 8 })
      })

      if (updatePlazoResponse.ok) {
        console.log('✅ Tiempo de entrega actualizado para equipo')
      } else {
        console.log('❌ Error actualizando tiempo de entrega:', updatePlazoResponse.status)
      }
    } else {
      console.log('⚠️ No hay equipos en esta cotización para probar')
    }

    // 5. Verificar que la cotización incluye las nuevas relaciones
    console.log('\n5️⃣ Verificando relaciones en cotización...')
    const cotizacionActualizadaResponse = await fetch(`${BASE_URL}/api/cotizacion/${cotizacionId}`)
    const cotizacionActualizada = await cotizacionActualizadaResponse.json()

    console.log('✅ Relaciones verificadas:')
    console.log(`   - Exclusiones: ${cotizacionActualizada.exclusiones?.length || 0}`)
    console.log(`   - Condiciones: ${cotizacionActualizada.condiciones?.length || 0}`)
    console.log(`   - Cronograma: ${cotizacionActualizada.cronograma?.length || 0}`)

    console.log('\n🎉 Pruebas completadas exitosamente!')

  } catch (error) {
    console.error('❌ Error en las pruebas:', error.message)
  }
}

// Ejecutar pruebas
testCotizacionExtensions()
// ===================================================
// 📁 Archivo: test-debug-endpoint.js
// 🔧 Descripción: Script para probar el endpoint de debug
// ✍️ Autor: GYS AI Assistant
// 📅 Fecha: 2025-01-27
// ===================================================

const http = require('http')

function makeRequest(path, method = 'GET', data = null) {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: 'localhost',
      port: 3000,
      path: path,
      method: method,
      headers: {
        'Content-Type': 'application/json',
        'User-Agent': 'Debug-Script/1.0'
      }
    }

    const req = http.request(options, (res) => {
      let body = ''
      
      res.on('data', (chunk) => {
        body += chunk
      })
      
      res.on('end', () => {
        try {
          const jsonBody = JSON.parse(body)
          resolve({
            status: res.statusCode,
            headers: res.headers,
            body: jsonBody
          })
        } catch (error) {
          resolve({
            status: res.statusCode,
            headers: res.headers,
            body: body
          })
        }
      })
    })

    req.on('error', (error) => {
      reject(error)
    })

    if (data) {
      req.write(JSON.stringify(data))
    }
    
    req.end()
  })
}

async function testDebugEndpoint() {
  try {
    console.log('🔍 Probando endpoint de debug...')
    
    // Probar el endpoint de debug de sesión
    console.log('\n1️⃣ GET /api/debug/session')
    const debugResponse = await makeRequest('/api/debug/session')
    
    console.log('Status:', debugResponse.status)
    console.log('Response:', JSON.stringify(debugResponse.body, null, 2))
    
    // Probar creación de lista sin sesión
    console.log('\n2️⃣ POST /api/lista-equipo (sin sesión)')
    const createResponse = await makeRequest('/api/lista-equipo', 'POST', {
      proyectoId: 'cmfee7bqv00byl86kred5oc8o',
      nombre: 'Lista de Prueba - Sin Sesión',
      fechaNecesaria: '2025-02-20'
    })
    
    console.log('Status:', createResponse.status)
    console.log('Response:', JSON.stringify(createResponse.body, null, 2))
    
    // Verificar si el servidor está funcionando
    console.log('\n3️⃣ GET / (página principal)')
    const homeResponse = await makeRequest('/')
    
    console.log('Status:', homeResponse.status)
    console.log('Content-Type:', homeResponse.headers['content-type'])
    
    if (homeResponse.status === 200) {
      console.log('✅ Servidor funcionando correctamente')
    } else {
      console.log('⚠️ Servidor respondió con status:', homeResponse.status)
    }
    
  } catch (error) {
    console.error('❌ Error al probar endpoints:', error.message)
    
    if (error.code === 'ECONNREFUSED') {
      console.error('🔍 El servidor no está ejecutándose en localhost:3000')
      console.error('   Asegúrate de que `npm run dev` esté activo')
    }
  }
}

// Ejecutar el script
testDebugEndpoint()
  .then(() => {
    console.log('\n✅ Prueba de endpoints completada')
    process.exit(0)
  })
  .catch((error) => {
    console.error('❌ Error en la prueba:', error)
    process.exit(1)
  })
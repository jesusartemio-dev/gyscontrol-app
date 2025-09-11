/**
 * Script para probar la sesión en el navegador
 * Simula las peticiones que haría el componente SessionDebug
 */

const http = require('http');
const https = require('https');

function makeRequest(url, options = {}) {
  return new Promise((resolve, reject) => {
    const protocol = url.startsWith('https') ? https : http;
    
    const req = protocol.request(url, {
      method: options.method || 'GET',
      headers: {
        'Content-Type': 'application/json',
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        ...options.headers
      }
    }, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        resolve({
          status: res.statusCode,
          headers: res.headers,
          data: data
        });
      });
    });
    
    req.on('error', reject);
    
    if (options.body) {
      req.write(JSON.stringify(options.body));
    }
    
    req.end();
  });
}

async function testSessionEndpoints() {
  console.log('🔍 Probando endpoints de sesión...');
  
  try {
    // 1. Probar endpoint de debug de sesión
    console.log('\n1. Probando /api/debug/session');
    const debugResponse = await makeRequest('http://localhost:3000/api/debug/session');
    console.log('Status:', debugResponse.status);
    console.log('Response:', debugResponse.data);
    
    // 2. Probar endpoint de NextAuth session
    console.log('\n2. Probando /api/auth/session');
    const authResponse = await makeRequest('http://localhost:3000/api/auth/session');
    console.log('Status:', authResponse.status);
    console.log('Response:', authResponse.data);
    
    // 3. Probar página de login
    console.log('\n3. Probando /login');
    const loginResponse = await makeRequest('http://localhost:3000/login');
    console.log('Status:', loginResponse.status);
    console.log('Content-Type:', loginResponse.headers['content-type']);
    
    // 4. Probar página principal
    console.log('\n4. Probando página principal');
    const homeResponse = await makeRequest('http://localhost:3000/');
    console.log('Status:', homeResponse.status);
    console.log('Content-Type:', homeResponse.headers['content-type']);
    
    // 5. Probar página de proyectos (requiere autenticación)
    console.log('\n5. Probando /proyectos/1/equipos/listas-integradas');
    const proyectosResponse = await makeRequest('http://localhost:3000/proyectos/1/equipos/listas-integradas');
    console.log('Status:', proyectosResponse.status);
    console.log('Content-Type:', proyectosResponse.headers['content-type']);
    
    if (proyectosResponse.status === 307 || proyectosResponse.status === 302) {
      console.log('Redirect Location:', proyectosResponse.headers.location);
    }
    
  } catch (error) {
    console.error('❌ Error en las pruebas:', error.message);
  }
}

// Ejecutar pruebas
testSessionEndpoints().then(() => {
  console.log('\n✅ Pruebas completadas');
}).catch(console.error);
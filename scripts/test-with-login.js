/**
 * Script para probar la creación de listas de equipos con login simulado
 * Simula el flujo completo: login -> crear lista -> verificar resultado
 */

const http = require('http');
const { PrismaClient } = require('@prisma/client');

// Crear instancia de Prisma
const prisma = new PrismaClient();

function makeRequest(url, options = {}) {
  return new Promise((resolve, reject) => {
    const req = http.request(url, {
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

async function testWithValidUser() {
  console.log('🔍 Probando creación de lista con usuario válido...');
  
  try {
    // Conectar a la base de datos
    await prisma.$connect();
    console.log('✅ Conectado a la base de datos');
    
    // 1. Verificar usuarios existentes
    console.log('\n1. Verificando usuarios en la base de datos:');
    const usuarios = await prisma.user.findMany({
      select: {
        id: true,
        name: true,
        email: true
      }
    });
    
    console.log(`Encontrados ${usuarios.length} usuarios:`);
    usuarios.forEach(user => {
      console.log(`  - ${user.name} (${user.email}) - ID: ${user.id}`);
    });
    
    if (usuarios.length === 0) {
      console.log('❌ No hay usuarios en la base de datos');
      return;
    }
    
    // 2. Verificar proyectos existentes
    console.log('\n2. Verificando proyectos:');
    const proyectos = await prisma.proyecto.findMany({
      select: {
        id: true,
        nombre: true,
        comercialId: true,
        gestorId: true
      },
      take: 3
    });
    
    console.log(`Encontrados ${proyectos.length} proyectos:`);
    proyectos.forEach(proyecto => {
      console.log(`  - ${proyecto.nombre} (ID: ${proyecto.id}) - Comercial: ${proyecto.comercialId} - Gestor: ${proyecto.gestorId}`);
    });
    
    if (proyectos.length === 0) {
      console.log('❌ No hay proyectos en la base de datos');
      return;
    }
    
    // 3. Probar creación directa en base de datos (simulando sesión válida)
    const usuarioTest = usuarios[0];
    const proyectoTest = proyectos[0];
    
    console.log(`\n3. Creando lista de equipo con usuario ${usuarioTest.name} y proyecto ${proyectoTest.nombre}:`);
    
    // Obtener el siguiente número de secuencia
    const ultimaLista = await prisma.listaEquipo.findFirst({
      where: { proyectoId: proyectoTest.id },
      orderBy: { numeroSecuencia: 'desc' }
    });
    
    const numeroSecuencia = (ultimaLista?.numeroSecuencia || 0) + 1;
    const codigoGenerado = `${proyectoTest.id.toString().padStart(3, '0')}-LE-${numeroSecuencia.toString().padStart(3, '0')}`;
    
    const nuevaLista = await prisma.listaEquipo.create({
      data: {
        proyectoId: proyectoTest.id,
        responsableId: usuarioTest.id,
        codigo: codigoGenerado,
        numeroSecuencia: numeroSecuencia,
        nombre: `Lista de Prueba ${numeroSecuencia}`,
        fechaNecesaria: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000) // 30 días desde hoy
      },
      include: {
        proyecto: {
          select: {
            id: true,
            nombre: true
          }
        },
        responsable: {
          select: {
            id: true,
            name: true,
            email: true
          }
        }
      }
    });
    
    console.log('✅ Lista creada exitosamente:');
    console.log(`  - ID: ${nuevaLista.id}`);
    console.log(`  - Código: ${nuevaLista.codigo}`);
    console.log(`  - Nombre: ${nuevaLista.nombre}`);
    console.log(`  - Proyecto: ${nuevaLista.proyecto.nombre}`);
    console.log(`  - Responsable: ${nuevaLista.responsable.name}`);
    console.log(`  - Fecha necesaria: ${nuevaLista.fechaNecesaria}`);
    
    // 4. Probar la API directamente con datos simulados
    console.log('\n4. Probando API /api/lista-equipo con datos simulados:');
    
    const payloadAPI = {
      proyectoId: proyectoTest.id,
      nombre: `Lista API Test ${Date.now()}`,
      fechaNecesaria: new Date(Date.now() + 45 * 24 * 60 * 60 * 1000).toISOString()
    };
    
    console.log('Payload:', JSON.stringify(payloadAPI, null, 2));
    
    const apiResponse = await makeRequest('http://localhost:3000/api/lista-equipo', {
      method: 'POST',
      body: payloadAPI,
      headers: {
        'Cookie': `next-auth.session-token=fake-token-for-user-${usuarioTest.id}`
      }
    });
    
    console.log('Status API:', apiResponse.status);
    console.log('Response API:', apiResponse.data);
    
    if (apiResponse.status !== 200 && apiResponse.status !== 201) {
      console.log('❌ La API falló como se esperaba (sin sesión válida)');
    }
    
  } catch (error) {
    console.error('❌ Error en las pruebas:', error.message);
    console.error('Stack:', error.stack);
  } finally {
    await prisma.$disconnect();
  }
}

// Ejecutar pruebas
testWithValidUser().then(() => {
  console.log('\n✅ Pruebas completadas');
}).catch(console.error);
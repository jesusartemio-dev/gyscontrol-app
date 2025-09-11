/**
 * 🧪 Setup Global para Tests E2E
 * 
 * @description Configuración inicial para todos los tests E2E
 * @author TRAE - Agente Senior Fullstack
 * @date 2025-01-27
 * @version 1.0.0
 */

import { chromium, FullConfig } from '@playwright/test';
import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

/**
 * 🔧 Setup global ejecutado antes de todos los tests
 */
async function globalSetup(config: FullConfig) {
  console.log('🚀 Iniciando setup global para tests E2E...');
  
  try {
    // 🗄️ Limpiar y preparar base de datos de test
    await setupTestDatabase();
    
    // 👤 Crear usuarios de prueba
    await createTestUsers();
    
    // 📊 Crear datos de prueba
    await createTestData();
    
    // 🔐 Configurar autenticación
    await setupAuthentication(config);
    
    console.log('✅ Setup global completado exitosamente');
  } catch (error) {
    console.error('❌ Error en setup global:', error);
    throw error;
  }
}

/**
 * 🗄️ Configurar base de datos de test
 */
async function setupTestDatabase() {
  console.log('📊 Configurando base de datos de test...');
  
  // Limpiar tablas en orden correcto (respetando foreign keys)
  const tablesToClean = [
    'EventoTrazabilidad',
    'ItemEntrega', 
    'Entrega',
    'Proyecto',
    'Usuario',
    'Equipo',
    'Cliente'
  ];
  
  for (const table of tablesToClean) {
    try {
      await prisma.$executeRawUnsafe(`DELETE FROM "${table}"`);
      console.log(`🧹 Tabla ${table} limpiada`);
    } catch (error) {
      console.warn(`⚠️ No se pudo limpiar tabla ${table}:`, error);
    }
  }
  
  console.log('✅ Base de datos de test configurada');
}

/**
 * 👤 Crear usuarios de prueba
 */
async function createTestUsers() {
  console.log('👤 Creando usuarios de prueba...');
  
  const testUsers = [
    {
      email: 'admin@gys.com',
      nombre: 'Admin Test',
      rol: 'admin',
      password: 'admin123'
    },
    {
      email: 'gerente@gys.com',
      nombre: 'Gerente Test',
      rol: 'gerente',
      password: 'gerente123'
    },
    {
      email: 'comercial@gys.com',
      nombre: 'Comercial Test',
      rol: 'comercial',
      password: 'comercial123'
    },
    {
      email: 'proyectos@gys.com',
      nombre: 'Proyectos Test',
      rol: 'proyectos',
      password: 'proyectos123'
    },
    {
      email: 'logistica@gys.com',
      nombre: 'Logística Test',
      rol: 'logistico',
      password: 'logistica123'
    }
  ];
  
  for (const user of testUsers) {
    const hashedPassword = await bcrypt.hash(user.password, 10);
    
    await prisma.user.upsert({
      where: { email: user.email },
      update: {},
      create: {
        email: user.email,
        name: user.nombre,
        role: user.rol as any,
        password: hashedPassword,
        emailVerified: new Date()
      }
    });
    
    console.log(`👤 Usuario ${user.email} creado`);
  }
  
  console.log('✅ Usuarios de prueba creados');
}

/**
 * 📊 Crear datos de prueba
 */
async function createTestData() {
  console.log('📊 Creando datos de prueba...');
  
  // 🏢 Crear clientes de prueba
  const clienteAlpha = await prisma.cliente.create({
    data: {
      nombre: 'Cliente Alpha Corp',
      correo: 'contacto@alpha.com',
      telefono: '+51-999-111-222',
      direccion: 'Av. Principal 123, Lima',
      ruc: '20123456789'
    }
  });
  
  const clienteBeta = await prisma.cliente.create({
    data: {
      nombre: 'Beta Industries',
      correo: 'info@beta.com',
      telefono: '+51-999-333-444',
      direccion: 'Jr. Comercio 456, Lima',
      ruc: '20987654321'
    }
  });
  
  // 👥 Obtener usuarios para asignar a proyectos
  const comercialUser = await prisma.user.findFirst({ where: { role: 'comercial' } });
  const gestorUser = await prisma.user.findFirst({ where: { role: 'gerente' } });
  
  if (!comercialUser || !gestorUser) {
    throw new Error('No se encontraron usuarios comercial o gerente para asignar a proyectos');
  }
  
  // 🏗️ Crear proyectos de prueba
  const proyectoAlpha = await prisma.proyecto.create({
    data: {
      nombre: 'Proyecto Alpha',
      codigo: 'PROJ-ALPHA-001',
      clienteId: clienteAlpha.id,
      comercialId: comercialUser.id,
      gestorId: gestorUser.id,
      fechaInicio: new Date('2025-01-01'),
      fechaFin: new Date('2025-06-30'),
        estado: 'activo'
    }
  });
  
  const proyectoBeta = await prisma.proyecto.create({
    data: {
      nombre: 'Proyecto Beta',
      codigo: 'PROJ-BETA-001',
      clienteId: clienteBeta.id,
      comercialId: comercialUser.id,
      gestorId: gestorUser.id,
      fechaInicio: new Date('2025-02-01'),
      fechaFin: new Date('2025-08-31'),
        estado: 'activo'
    }
  });
  
  // ✅ Datos básicos creados (clientes y proyectos)
  console.log(`📊 Cliente Alpha: ${clienteAlpha.id}`);
  console.log(`📊 Cliente Beta: ${clienteBeta.id}`);
  console.log(`🏗️ Proyecto Alpha: ${proyectoAlpha.id}`);
  console.log(`🏗️ Proyecto Beta: ${proyectoBeta.id}`);
  
  console.log('✅ Datos de prueba creados');
}

/**
 * 🔐 Configurar autenticación para tests
 */
async function setupAuthentication(config: FullConfig) {
  console.log('🔐 Configurando autenticación...');
  
  const { baseURL } = config.projects[0].use;
  const browser = await chromium.launch();
  const page = await browser.newPage();
  
  try {
    // Login como gerente (usuario principal para tests)
    await page.goto(`${baseURL}/login`);
    await page.fill('[data-testid="email-input"]', 'gerente@gys.com');
    await page.fill('[data-testid="password-input"]', 'gerente123');
    await page.click('[data-testid="login-button"]');
    
    // Esperar redirección exitosa
    await page.waitForURL('**/dashboard');
    
    // Guardar estado de autenticación
    await page.context().storageState({ path: 'playwright/.auth/user.json' });
    
    console.log('✅ Autenticación configurada');
  } catch (error) {
    console.error('❌ Error configurando autenticación:', error);
    throw error;
  } finally {
    await browser.close();
  }
}

export default globalSetup;

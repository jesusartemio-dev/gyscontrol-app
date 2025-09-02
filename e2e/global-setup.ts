/**
 * 🌐 Configuración Global de Playwright - Setup
 * 
 * Configuración inicial para tests E2E del Sistema GYS.
 * Incluye autenticación, base de datos de prueba y datos semilla.
 * 
 * @author TRAE - Agente Senior Fullstack
 * @version 1.0.0
 */

import { chromium, FullConfig } from '@playwright/test'
import path from 'path'

/**
 * 🔧 Setup global que se ejecuta antes de todos los tests
 */
async function globalSetup(config: FullConfig) {
  console.log('🚀 Iniciando configuración global de Playwright...')
  
  try {
    // 🔐 Setup de autenticación
    await setupAuthentication(config)
    
    // 🗄️ Setup de base de datos de prueba
    await setupTestDatabase()
    
    // 🌱 Crear datos semilla para tests
    await seedTestData()
    
    console.log('✅ Configuración global completada exitosamente')
  } catch (error) {
    console.error('❌ Error en configuración global:', error)
    throw error
  }
}

/**
 * 🔐 Configurar autenticación para diferentes roles
 */
async function setupAuthentication(config: FullConfig) {
  console.log('🔐 Configurando autenticación...')
  
  const browser = await chromium.launch()
  const baseURL = config.projects[0].use.baseURL || 'http://localhost:3000'
  
  // 👤 Crear sesiones para diferentes roles
  const roles = [
    { name: 'admin', email: 'admin@gys.com', password: 'admin123' },
    { name: 'gerente', email: 'gerente@gys.com', password: 'gerente123' },
    { name: 'comercial', email: 'comercial@gys.com', password: 'comercial123' },
    { name: 'logistica', email: 'logistica@gys.com', password: 'logistica123' },
    { name: 'finanzas', email: 'finanzas@gys.com', password: 'finanzas123' }
  ]
  
  for (const role of roles) {
    const context = await browser.newContext()
    const page = await context.newPage()
    
    try {
      // 📡 Ir a página de login
      await page.goto(`${baseURL}/auth/signin`)
      
      // 📝 Llenar formulario de login
      await page.fill('[data-testid="email-input"]', role.email)
      await page.fill('[data-testid="password-input"]', role.password)
      await page.click('[data-testid="signin-button"]')
      
      // ⏳ Esperar redirección exitosa
      await page.waitForURL(`${baseURL}/dashboard`, { timeout: 10000 })
      
      // 💾 Guardar estado de autenticación
      const storageState = await context.storageState()
      const authFile = path.join(__dirname, `auth-${role.name}.json`)
      
      await require('fs').promises.writeFile(
        authFile, 
        JSON.stringify(storageState, null, 2)
      )
      
      console.log(`✅ Autenticación configurada para rol: ${role.name}`)
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Error desconocido';
      console.warn(`⚠️ No se pudo configurar autenticación para ${role.name}:`, errorMessage)
    } finally {
      await context.close()
    }
  }
  
  await browser.close()
}

/**
 * 🗄️ Configurar base de datos de prueba
 */
async function setupTestDatabase() {
  console.log('🗄️ Configurando base de datos de prueba...')
  
  try {
    // 🔄 Reset de base de datos de prueba
    const { execSync } = require('child_process')
    
    // Usar variable de entorno para tests
    process.env.DATABASE_URL = process.env.TEST_DATABASE_URL || process.env.DATABASE_URL
    
    // 🧹 Limpiar y migrar base de datos
    execSync('npx prisma migrate reset --force --skip-seed', { 
      stdio: 'inherit',
      env: { ...process.env, DATABASE_URL: process.env.TEST_DATABASE_URL }
    })
    
    console.log('✅ Base de datos de prueba configurada')
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Error desconocido';
    console.warn('⚠️ Error configurando base de datos:', errorMessage)
  }
}

/**
 * 🌱 Crear datos semilla para tests E2E
 */
async function seedTestData() {
  console.log('🌱 Creando datos semilla...')
  
  try {
    const { PrismaClient } = require('@prisma/client')
    const prisma = new PrismaClient({
      datasources: {
        db: {
          url: process.env.TEST_DATABASE_URL || process.env.DATABASE_URL
        }
      }
    })
    
    // 👥 Crear usuarios de prueba
    await createTestUsers(prisma)
    
    // 🏢 Crear proveedores de prueba
    await createTestProveedores(prisma)
    
    // 📦 Crear equipos de prueba
    await createTestEquipos(prisma)
    
    // 📋 Crear proyectos de prueba
    await createTestProyectos(prisma)
    
    await prisma.$disconnect()
    console.log('✅ Datos semilla creados exitosamente')
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Error desconocido';
    console.warn('⚠️ Error creando datos semilla:', errorMessage)
  }
}

/**
 * 👥 Crear usuarios de prueba
 */
async function createTestUsers(prisma: any) {
  const bcrypt = require('bcryptjs')
  
  const users = [
    {
      email: 'admin@gys.com',
      name: 'Admin Test',
      password: await bcrypt.hash('admin123', 10),
      role: 'ADMIN'
    },
    {
      email: 'gerente@gys.com',
      name: 'Gerente Test',
      password: await bcrypt.hash('gerente123', 10),
      role: 'GERENTE'
    },
    {
      email: 'comercial@gys.com',
      name: 'Comercial Test',
      password: await bcrypt.hash('comercial123', 10),
      role: 'COMERCIAL'
    },
    {
      email: 'logistica@gys.com',
      name: 'Logística Test',
      password: await bcrypt.hash('logistica123', 10),
      role: 'LOGISTICA'
    },
    {
      email: 'finanzas@gys.com',
      name: 'Finanzas Test',
      password: await bcrypt.hash('finanzas123', 10),
      role: 'FINANZAS'
    }
  ]
  
  for (const user of users) {
    await prisma.user.upsert({
      where: { email: user.email },
      update: user,
      create: user
    })
  }
}

/**
 * 🏢 Crear proveedores de prueba
 */
async function createTestProveedores(prisma: any) {
  const proveedores = [
    {
      id: 'prov-test-001',
      nombre: 'Proveedor Test 1',
      ruc: '20123456789',
      email: 'proveedor1@test.com',
      telefono: '123456789',
      direccion: 'Av. Test 123',
      contacto: 'Juan Pérez',
      condicionesPago: '30 días',
      monedaPreferida: 'PEN',
      activo: true
    },
    {
      id: 'prov-test-002',
      nombre: 'Proveedor Test 2',
      ruc: '20987654321',
      email: 'proveedor2@test.com',
      telefono: '987654321',
      direccion: 'Jr. Test 456',
      contacto: 'María García',
      condicionesPago: '15 días',
      monedaPreferida: 'USD',
      activo: true
    }
  ]
  
  for (const proveedor of proveedores) {
    await prisma.proveedor.upsert({
      where: { id: proveedor.id },
      update: proveedor,
      create: proveedor
    })
  }
}

/**
 * 📦 Crear equipos de prueba
 */
async function createTestEquipos(prisma: any) {
  const equipos = [
    {
      id: 'equipo-test-001',
      nombre: 'Excavadora Test',
      categoria: 'MAQUINARIA',
      marca: 'Caterpillar',
      modelo: 'CAT-320',
      precioReferencial: 150000.00,
      moneda: 'USD',
      unidadMedida: 'UNIDAD',
      activo: true
    },
    {
      id: 'equipo-test-002',
      nombre: 'Cemento Test',
      categoria: 'MATERIAL',
      marca: 'Cemento Sol',
      modelo: 'Tipo I',
      precioReferencial: 25.50,
      moneda: 'PEN',
      unidadMedida: 'BOLSA',
      activo: true
    }
  ]
  
  for (const equipo of equipos) {
    await prisma.catalogoEquipo.upsert({
      where: { id: equipo.id },
      update: equipo,
      create: equipo
    })
  }
}

/**
 * 📋 Crear proyectos de prueba
 */
async function createTestProyectos(prisma: any) {
  const proyectos = [
    {
      id: 'proyecto-test-001',
      nombre: 'Proyecto Test 1',
      descripcion: 'Proyecto de prueba para E2E testing',
      fechaInicio: new Date('2025-01-01'),
      fechaFin: new Date('2025-12-31'),
      presupuesto: 1000000.00,
      moneda: 'PEN',
      estado: 'ACTIVO',
      clienteId: 'cliente-test-001'
    }
  ]
  
  for (const proyecto of proyectos) {
    await prisma.proyecto.upsert({
      where: { id: proyecto.id },
      update: proyecto,
      create: proyecto
    })
  }
}

export default globalSetup
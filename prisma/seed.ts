import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcryptjs'

const prisma = new PrismaClient()

async function main() {
  console.log('🌱 Iniciando seed de la base de datos...')

  // Hash de la contraseña por defecto
  const hashedPassword = await bcrypt.hash('admin123', 10)

  // Crear usuario administrador por defecto
  const adminUser = await prisma.user.upsert({
    where: { email: 'admin@gys.com' },
    update: {},
    create: {
      email: 'admin@gys.com',
      name: 'Administrador GYS',
      password: hashedPassword,
      role: 'admin'
    }
  })

  console.log('✅ Usuario administrador creado:', {
    id: adminUser.id,
    email: adminUser.email,
    name: adminUser.name,
    role: adminUser.role
  })

  // Crear usuario comercial de ejemplo
  const comercialUser = await prisma.user.upsert({
    where: { email: 'comercial@gys.com' },
    update: {},
    create: {
      email: 'comercial@gys.com',
      name: 'Usuario Comercial',
      password: hashedPassword,
      role: 'comercial'
    }
  })

  console.log('✅ Usuario comercial creado:', {
    id: comercialUser.id,
    email: comercialUser.email,
    name: comercialUser.name,
    role: comercialUser.role
  })

  // Crear usuario logístico de ejemplo
  const logisticoUser = await prisma.user.upsert({
    where: { email: 'logistico@gys.com' },
    update: {},
    create: {
      email: 'logistico@gys.com',
      name: 'Usuario Logístico',
      password: hashedPassword,
      role: 'logistico'
    }
  })

  console.log('✅ Usuario logístico creado:', {
    id: logisticoUser.id,
    email: logisticoUser.email,
    name: logisticoUser.name,
    role: logisticoUser.role
  })

  // Crear proveedores de ejemplo
  const proveedor1 = await prisma.proveedor.create({
    data: {
      nombre: 'Ferretería Industrial SAC',
      ruc: '20123456789'
    }
  })

  const proveedor2 = await prisma.proveedor.create({
    data: {
      nombre: 'Equipos y Maquinarias EIRL',
      ruc: '20987654321'
    }
  })

  const proveedor3 = await prisma.proveedor.create({
    data: {
      nombre: 'Suministros Técnicos SA',
      ruc: '20555666777'
    }
  })

  console.log('✅ Proveedores creados:', {
    proveedor1: { id: proveedor1.id, nombre: proveedor1.nombre },
    proveedor2: { id: proveedor2.id, nombre: proveedor2.nombre },
    proveedor3: { id: proveedor3.id, nombre: proveedor3.nombre }
  })

  // Crear categorías de servicio para el cronograma
  const categoria1 = await prisma.categoriaServicio.upsert({
    where: { nombre: 'Instalación Eléctrica' },
    update: {},
    create: {
      nombre: 'Instalación Eléctrica'
    }
  })

  const categoria2 = await prisma.categoriaServicio.upsert({
    where: { nombre: 'Montaje Estructural' },
    update: {},
    create: {
      nombre: 'Montaje Estructural'
    }
  })

  const categoria3 = await prisma.categoriaServicio.upsert({
    where: { nombre: 'Sistema de Control' },
    update: {},
    create: {
      nombre: 'Sistema de Control'
    }
  })

  const categoria4 = await prisma.categoriaServicio.upsert({
    where: { nombre: 'Puesta en Marcha' },
    update: {},
    create: {
      nombre: 'Puesta en Marcha'
    }
  })

  console.log('✅ Categorías de servicio creadas:', {
    categoria1: { id: categoria1.id, nombre: categoria1.nombre },
    categoria2: { id: categoria2.id, nombre: categoria2.nombre },
    categoria3: { id: categoria3.id, nombre: categoria3.nombre },
    categoria4: { id: categoria4.id, nombre: categoria4.nombre }
  })

  // Crear fases por defecto para el sistema de cronograma
  const fase1 = await (prisma as any).faseDefault.create({
    data: {
      nombre: 'Planificación',
      descripcion: 'Fase de planificación detallada del proyecto',
      orden: 1,
      porcentajeDuracion: 20,
      color: '#3b82f6',
      activo: true
    }
  })

  const fase2 = await (prisma as any).faseDefault.create({
    data: {
      nombre: 'Ejecución',
      descripcion: 'Fase de ejecución y montaje del proyecto',
      orden: 2,
      porcentajeDuracion: 60,
      color: '#10b981',
      activo: true
    }
  })

  const fase3 = await (prisma as any).faseDefault.create({
    data: {
      nombre: 'Cierre',
      descripcion: 'Fase de pruebas, documentación y entrega final',
      orden: 3,
      porcentajeDuracion: 20,
      color: '#f59e0b',
      activo: true
    }
  })

  console.log('✅ Fases por defecto creadas:', {
    fase1: { id: fase1.id, nombre: fase1.nombre, porcentaje: fase1.porcentajeDuracion },
    fase2: { id: fase2.id, nombre: fase2.nombre, porcentaje: fase2.porcentajeDuracion },
    fase3: { id: fase3.id, nombre: fase3.nombre, porcentaje: fase3.porcentajeDuracion }
  })

  console.log('🎉 Seed completado exitosamente!')
  console.log('\n📋 Credenciales de acceso:')
  console.log('Email: admin@gys.com | Contraseña: admin123 | Rol: admin')
  console.log('Email: comercial@gys.com | Contraseña: admin123 | Rol: comercial')
  console.log('Email: logistico@gys.com | Contraseña: admin123 | Rol: logistico')
}

main()
  .catch((e) => {
    console.error('❌ Error durante el seed:', e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
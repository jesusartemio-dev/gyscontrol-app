// ===================================================
// 📁 Archivo: scripts/create-test-user.ts
// 📌 Descripción: Script para crear usuario de prueba
// 🧠 Uso: Crear usuario con rol ADMIN para testing
// ✍️ Autor: Sistema GYS
// 📅 Fecha: 2025-01-21
// ===================================================

import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function createTestUser() {
  try {
    // 🔍 Verificar si ya existe un usuario admin
    const existingAdmin = await prisma.user.findFirst({
      where: {
        role: 'admin'
      }
    });

    if (existingAdmin) {
      console.log('✅ Ya existe un usuario ADMIN:', existingAdmin.email);
      return;
    }

    // 🔐 Crear contraseña hasheada
    const hashedPassword = await bcrypt.hash('admin123', 10);

    // 👤 Crear usuario admin de prueba
    const testUser = await prisma.user.create({
      data: {
        name: 'Administrador GYS',
        email: 'admin@gys.com',
        password: hashedPassword,
        role: 'admin'
      }
    });

    console.log('✅ Usuario de prueba creado exitosamente:');
    console.log('📧 Email:', testUser.email);
    console.log('🔑 Password: admin123');
    console.log('👤 Rol:', testUser.role);
    
  } catch (error) {
    console.error('❌ Error al crear usuario de prueba:', error);
  } finally {
    await prisma.$disconnect();
  }
}

createTestUser();
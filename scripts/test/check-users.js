// Script para verificar usuarios en la base de datos
const { PrismaClient } = require('@prisma/client')
const bcrypt = require('bcryptjs')

const prisma = new PrismaClient()

async function checkAndCreateUser() {
  try {
    console.log('🔍 Checking existing users...')
    
    const users = await prisma.user.findMany({
      select: {
        id: true,
        email: true,
        name: true,
        role: true
      }
    })
    
    console.log(`Found ${users.length} users:`, users)
    
    if (users.length === 0) {
      console.log('\n🔧 Creating test user...')
      
      const hashedPassword = await bcrypt.hash('admin123', 12)
      
      const newUser = await prisma.user.create({
        data: {
          email: 'admin@gys.com',
          name: 'Admin Test',
          password: hashedPassword,
          role: 'admin'
        }
      })
      
      console.log('✅ Test user created:', {
        id: newUser.id,
        email: newUser.email,
        name: newUser.name,
        role: newUser.role
      })
      
      console.log('\n🔑 Login credentials:')
      console.log('Email: admin@gys.com')
      console.log('Password: admin123')
    }
    
  } catch (error) {
    console.error('❌ Error:', error)
  } finally {
    await prisma.$disconnect()
  }
}

checkAndCreateUser()
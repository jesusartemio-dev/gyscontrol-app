import { PrismaClient } from '@prisma/client'
const prisma = new PrismaClient()

const NOMBRES = [
  'Carlos Sihuayro',
  'Jesús Mamani', 'Jesus Mamani',
  'Yony Apaza',
  'Miguel Cruz',
  'Piero Ríos', 'Piero Rios',
  'Alonso Piscoya',
  'Angel Palomino',
  'Tito Alvarez',
  'Diego Hendenmann', 'Diego Hedenmann',
  'Nelson Lontop',
  'Roly Segundo',
  'Benjamin Amesquita', 'Benjamín Amesquita',
  'Frank Valente',
]

async function main() {
  // Buscar por nombre en User (insensible a mayúsculas/tildes parcial)
  const keywords = ['Sihuayro','Mamani','Apaza','Cruz','Rios','Piscoya','Palomino','Alvarez','Hend','Lontop','Segundo','Amesquita','Valente']

  const users = await prisma.user.findMany({
    where: {
      OR: keywords.map(k => ({ name: { contains: k, mode: 'insensitive' as const } }))
    },
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
      empleado: {
        select: {
          documentoIdentidad: true,
          telefono: true,
          activo: true,
          cargo: { select: { nombre: true } },
          departamento: { select: { nombre: true } },
        }
      }
    },
    orderBy: { name: 'asc' },
  })

  console.log(`\nUsuarios encontrados: ${users.length}\n`)
  for (const u of users) {
    console.log(`Nombre:     ${u.name}`)
    console.log(`Email:      ${u.email}`)
    console.log(`Role:       ${u.role}`)
    const e = u.empleado
    if (e) {
      console.log(`DNI/Doc:    ${e.documentoIdentidad ?? 'null'}`)
      console.log(`Teléfono:   ${e.telefono ?? 'null'}`)
      console.log(`Cargo:      ${e.cargo?.nombre ?? 'null'}`)
      console.log(`Depto:      ${e.departamento?.nombre ?? 'null'}`)
      console.log(`Activo emp: ${e.activo}`)
    } else {
      console.log(`Empleado:   (sin registro)`)
    }
    console.log('---')
  }
}

main().catch(console.error).finally(() => prisma.$disconnect())

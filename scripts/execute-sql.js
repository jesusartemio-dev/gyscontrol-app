const { PrismaClient } = require('@prisma/client');

async function executeSQL() {
  const prisma = new PrismaClient();

  try {
    console.log('Ejecutando comandos SQL para crear tablas de calendario...');

    // Los enums ya existen, continuar con las tablas
    console.log('Enums ya existen, creando tablas...');

    // Crear tablas
    console.log('Creando tabla CalendarioLaboral...');
    await prisma.$executeRawUnsafe(`
      CREATE TABLE "CalendarioLaboral" (
          "id" TEXT NOT NULL,
          "nombre" TEXT NOT NULL,
          "descripcion" TEXT,
          "pais" TEXT,
          "empresa" TEXT,
          "activo" BOOLEAN NOT NULL DEFAULT true,
          "horasPorDia" DECIMAL(5,2) NOT NULL DEFAULT 8.0,
          "diasLaborables" "DiaSemana"[],
          "horaInicioManana" TEXT NOT NULL DEFAULT '08:00',
          "horaFinManana" TEXT NOT NULL DEFAULT '12:00',
          "horaInicioTarde" TEXT NOT NULL DEFAULT '13:00',
          "horaFinTarde" TEXT NOT NULL DEFAULT '17:00',
          "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
          "updatedAt" TIMESTAMP(3) NOT NULL,
          CONSTRAINT "CalendarioLaboral_pkey" PRIMARY KEY ("id")
      )
    `);

    console.log('Creando tabla DiaCalendario...');
    await prisma.$executeRawUnsafe(`
      CREATE TABLE "DiaCalendario" (
          "id" TEXT NOT NULL,
          "calendarioLaboralId" TEXT NOT NULL,
          "diaSemana" "DiaSemana" NOT NULL,
          "esLaborable" BOOLEAN NOT NULL DEFAULT true,
          "horaInicioManana" TEXT,
          "horaFinManana" TEXT,
          "horaInicioTarde" TEXT,
          "horaFinTarde" TEXT,
          "horasTotales" DECIMAL(5,2),
          "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
          "updatedAt" TIMESTAMP(3) NOT NULL,
          CONSTRAINT "DiaCalendario_pkey" PRIMARY KEY ("id")
      )
    `);

    console.log('Creando tabla ExcepcionCalendario...');
    await prisma.$executeRawUnsafe(`
      CREATE TABLE "ExcepcionCalendario" (
          "id" TEXT NOT NULL,
          "calendarioLaboralId" TEXT NOT NULL,
          "fecha" TIMESTAMP(3) NOT NULL,
          "tipo" "TipoExcepcion" NOT NULL,
          "nombre" TEXT NOT NULL,
          "descripcion" TEXT,
          "horaInicio" TEXT,
          "horaFin" TEXT,
          "horasTotales" DECIMAL(5,2),
          "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
          "updatedAt" TIMESTAMP(3) NOT NULL,
          CONSTRAINT "ExcepcionCalendario_pkey" PRIMARY KEY ("id")
      )
    `);

    console.log('Creando tabla ConfiguracionCalendario...');
    await prisma.$executeRawUnsafe(`
      CREATE TABLE "ConfiguracionCalendario" (
          "id" TEXT NOT NULL,
          "calendarioLaboralId" TEXT NOT NULL,
          "entidadTipo" TEXT NOT NULL,
          "entidadId" TEXT NOT NULL,
          "calendarioPredeterminado" BOOLEAN NOT NULL DEFAULT false,
          "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
          "updatedAt" TIMESTAMP(3) NOT NULL,
          CONSTRAINT "ConfiguracionCalendario_pkey" PRIMARY KEY ("id")
      )
    `);

    // Crear índices
    console.log('Creando índices...');
    await prisma.$executeRawUnsafe(`CREATE UNIQUE INDEX "CalendarioLaboral_nombre_key" ON "CalendarioLaboral"("nombre")`);
    await prisma.$executeRawUnsafe(`CREATE UNIQUE INDEX "DiaCalendario_calendarioLaboralId_diaSemana_key" ON "DiaCalendario"("calendarioLaboralId", "diaSemana")`);
    await prisma.$executeRawUnsafe(`CREATE UNIQUE INDEX "ExcepcionCalendario_calendarioLaboralId_fecha_key" ON "ExcepcionCalendario"("calendarioLaboralId", "fecha")`);
    await prisma.$executeRawUnsafe(`CREATE UNIQUE INDEX "ConfiguracionCalendario_entidadTipo_entidadId_key" ON "ConfiguracionCalendario"("entidadTipo", "entidadId")`);

    await prisma.$executeRawUnsafe(`CREATE INDEX "DiaCalendario_calendarioLaboralId_idx" ON "DiaCalendario"("calendarioLaboralId")`);
    await prisma.$executeRawUnsafe(`CREATE INDEX "ExcepcionCalendario_calendarioLaboralId_idx" ON "ExcepcionCalendario"("calendarioLaboralId")`);
    await prisma.$executeRawUnsafe(`CREATE INDEX "ConfiguracionCalendario_calendarioLaboralId_idx" ON "ConfiguracionCalendario"("calendarioLaboralId")`);

    // Crear claves foráneas
    console.log('Creando claves foráneas...');
    await prisma.$executeRawUnsafe(`ALTER TABLE "DiaCalendario" ADD CONSTRAINT "DiaCalendario_calendarioLaboralId_fkey" FOREIGN KEY ("calendarioLaboralId") REFERENCES "CalendarioLaboral"("id") ON DELETE CASCADE ON UPDATE CASCADE`);
    await prisma.$executeRawUnsafe(`ALTER TABLE "ExcepcionCalendario" ADD CONSTRAINT "ExcepcionCalendario_calendarioLaboralId_fkey" FOREIGN KEY ("calendarioLaboralId") REFERENCES "CalendarioLaboral"("id") ON DELETE CASCADE ON UPDATE CASCADE`);
    await prisma.$executeRawUnsafe(`ALTER TABLE "ConfiguracionCalendario" ADD CONSTRAINT "ConfiguracionCalendario_calendarioLaboralId_fkey" FOREIGN KEY ("calendarioLaboralId") REFERENCES "CalendarioLaboral"("id") ON DELETE CASCADE ON UPDATE CASCADE`);

    // Insertar datos de ejemplo
    console.log('Insertando datos de ejemplo...');
    await prisma.$executeRawUnsafe(`
      INSERT INTO "CalendarioLaboral" ("id", "nombre", "descripcion", "pais", "empresa", "activo", "horasPorDia", "diasLaborables", "horaInicioManana", "horaFinManana", "horaInicioTarde", "horaFinTarde", "createdAt", "updatedAt")
      VALUES ('cal-colombia-gys', 'Colombia - GYS Estándar', 'Calendario laboral estándar para Colombia', 'Colombia', 'GYS', true, 8.0, ARRAY['lunes'::"DiaSemana", 'martes'::"DiaSemana", 'miercoles'::"DiaSemana", 'jueves'::"DiaSemana", 'viernes'::"DiaSemana"], '08:00', '12:00', '13:00', '17:00', NOW(), NOW())
    `);

    console.log('✅ Tablas de calendario creadas exitosamente');

    // Verificar que las tablas se crearon
    const result = await prisma.$queryRaw`
      SELECT
        schemaname,
        tablename,
        tableowner
      FROM pg_tables
      WHERE schemaname = 'public'
      AND tablename IN ('CalendarioLaboral', 'DiaCalendario', 'ExcepcionCalendario', 'ConfiguracionCalendario')
      ORDER BY tablename
    `;

    console.log('Tablas creadas:');
    result.forEach(row => {
      console.log(`- ${row.tablename} (owner: ${row.tableowner})`);
    });

  } catch (error) {
    console.error('Error ejecutando SQL:', error);
  } finally {
    await prisma.$disconnect();
  }
}

executeSQL();
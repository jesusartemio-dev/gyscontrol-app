-- Crear tablas de calendario laboral manualmente
-- Ejecutar este script si Prisma no está creando las tablas correctamente

-- Crear enum para días de semana
CREATE TYPE "DiaSemana" AS ENUM ('lunes', 'martes', 'miercoles', 'jueves', 'viernes', 'sabado', 'domingo');

-- Crear enum para tipos de excepción
CREATE TYPE "TipoExcepcion" AS ENUM ('feriado', 'dia_laboral_extra', 'dia_no_laboral');

-- Crear tabla CalendarioLaboral
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
);

-- Crear tabla DiaCalendario
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
);

-- Crear tabla ExcepcionCalendario
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
);

-- Crear tabla ConfiguracionCalendario
CREATE TABLE "ConfiguracionCalendario" (
    "id" TEXT NOT NULL,
    "calendarioLaboralId" TEXT NOT NULL,
    "entidadTipo" TEXT NOT NULL,
    "entidadId" TEXT NOT NULL,
    "calendarioPredeterminado" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ConfiguracionCalendario_pkey" PRIMARY KEY ("id")
);

-- Crear índices únicos
CREATE UNIQUE INDEX "CalendarioLaboral_nombre_key" ON "CalendarioLaboral"("nombre");
CREATE UNIQUE INDEX "DiaCalendario_calendarioLaboralId_diaSemana_key" ON "DiaCalendario"("calendarioLaboralId", "diaSemana");
CREATE UNIQUE INDEX "ExcepcionCalendario_calendarioLaboralId_fecha_key" ON "ExcepcionCalendario"("calendarioLaboralId", "fecha");
CREATE UNIQUE INDEX "ConfiguracionCalendario_entidadTipo_entidadId_key" ON "ConfiguracionCalendario"("entidadTipo", "entidadId");

-- Crear índices de clave foránea
CREATE INDEX "DiaCalendario_calendarioLaboralId_idx" ON "DiaCalendario"("calendarioLaboralId");
CREATE INDEX "ExcepcionCalendario_calendarioLaboralId_idx" ON "ExcepcionCalendario"("calendarioLaboralId");
CREATE INDEX "ConfiguracionCalendario_calendarioLaboralId_idx" ON "ConfiguracionCalendario"("calendarioLaboralId");

-- Crear claves foráneas
ALTER TABLE "DiaCalendario" ADD CONSTRAINT "DiaCalendario_calendarioLaboralId_fkey" FOREIGN KEY ("calendarioLaboralId") REFERENCES "CalendarioLaboral"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ExcepcionCalendario" ADD CONSTRAINT "ExcepcionCalendario_calendarioLaboralId_fkey" FOREIGN KEY ("calendarioLaboralId") REFERENCES "CalendarioLaboral"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ConfiguracionCalendario" ADD CONSTRAINT "ConfiguracionCalendario_calendarioLaboralId_fkey" FOREIGN KEY ("calendarioLaboralId") REFERENCES "CalendarioLaboral"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Insertar datos de ejemplo
INSERT INTO "CalendarioLaboral" ("id", "nombre", "descripcion", "pais", "empresa", "activo", "horasPorDia", "diasLaborables", "horaInicioManana", "horaFinManana", "horaInicioTarde", "horaFinTarde", "createdAt", "updatedAt")
VALUES ('cal-colombia-gys', 'Colombia - GYS Estándar', 'Calendario laboral estándar para Colombia', 'Colombia', 'GYS', true, 8.0, ARRAY['lunes', 'martes', 'miercoles', 'jueves', 'viernes'], '08:00', '12:00', '13:00', '17:00', NOW(), NOW());

-- Insertar días calendario
INSERT INTO "DiaCalendario" ("id", "calendarioLaboralId", "diaSemana", "esLaborable", "createdAt", "updatedAt") VALUES
('dia-lunes', 'cal-colombia-gys', 'lunes', true, NOW(), NOW()),
('dia-martes', 'cal-colombia-gys', 'martes', true, NOW(), NOW()),
('dia-miercoles', 'cal-colombia-gys', 'miercoles', true, NOW(), NOW()),
('dia-jueves', 'cal-colombia-gys', 'jueves', true, NOW(), NOW()),
('dia-viernes', 'cal-colombia-gys', 'viernes', true, NOW(), NOW()),
('dia-sabado', 'cal-colombia-gys', 'sabado', false, NOW(), NOW()),
('dia-domingo', 'cal-colombia-gys', 'domingo', false, NOW(), NOW());

-- Insertar feriados colombianos de ejemplo
INSERT INTO "ExcepcionCalendario" ("id", "calendarioLaboralId", "fecha", "tipo", "nombre", "descripcion", "createdAt", "updatedAt") VALUES
('feriados-2025-01-01', 'cal-colombia-gys', '2025-01-01', 'feriado', 'Año Nuevo', 'Celebración del año nuevo', NOW(), NOW()),
('feriados-2025-01-06', 'cal-colombia-gys', '2025-01-06', 'feriado', 'Día de los Reyes Magos', 'Epifanía del Señor', NOW(), NOW()),
('feriados-2025-03-24', 'cal-colombia-gys', '2025-03-24', 'feriado', 'Día de San José', 'Celebración religiosa', NOW(), NOW()),
('feriados-2025-04-13', 'cal-colombia-gys', '2025-04-13', 'feriado', 'Jueves Santo', 'Semana Santa', NOW(), NOW()),
('feriados-2025-04-14', 'cal-colombia-gys', '2025-04-14', 'feriado', 'Viernes Santo', 'Semana Santa', NOW(), NOW()),
('feriados-2025-05-01', 'cal-colombia-gys', '2025-05-01', 'feriado', 'Día del Trabajo', 'Celebración internacional del trabajo', NOW(), NOW()),
('feriados-2025-05-12', 'cal-colombia-gys', '2025-05-12', 'feriado', 'Día de la Ascensión', 'Celebración religiosa', NOW(), NOW()),
('feriados-2025-06-02', 'cal-colombia-gys', '2025-06-02', 'feriado', 'Corpus Christi', 'Celebración religiosa', NOW(), NOW()),
('feriados-2025-06-23', 'cal-colombia-gys', '2025-06-23', 'feriado', 'Sagrado Corazón', 'Celebración religiosa', NOW(), NOW()),
('feriados-2025-07-20', 'cal-colombia-gys', '2025-07-20', 'feriado', 'Día de la Independencia', 'Grito de Independencia', NOW(), NOW()),
('feriados-2025-08-18', 'cal-colombia-gys', '2025-08-18', 'feriado', 'Asunción de la Virgen', 'Celebración religiosa', NOW(), NOW()),
('feriados-2025-09-15', 'cal-colombia-gys', '2025-09-15', 'feriado', 'Día de la Raza', 'Descubrimiento de América', NOW(), NOW()),
('feriados-2025-11-03', 'cal-colombia-gys', '2025-11-03', 'feriado', 'Todos los Santos', 'Celebración religiosa', NOW(), NOW()),
('feriados-2025-11-17', 'cal-colombia-gys', '2025-11-17', 'feriado', 'Independencia de Cartagena', 'Celebración histórica', NOW(), NOW()),
('feriados-2025-12-08', 'cal-colombia-gys', '2025-12-08', 'feriado', 'Inmaculada Concepción', 'Celebración religiosa', NOW(), NOW()),
('feriados-2025-12-25', 'cal-colombia-gys', '2025-12-25', 'feriado', 'Navidad', 'Nacimiento de Jesús', NOW(), NOW());

-- Configurar calendario como predeterminado para la empresa GYS
INSERT INTO "ConfiguracionCalendario" ("id", "calendarioLaboralId", "entidadTipo", "entidadId", "calendarioPredeterminado", "createdAt", "updatedAt")
VALUES ('config-gys-default', 'cal-colombia-gys', 'empresa', 'GYS', true, NOW(), NOW());
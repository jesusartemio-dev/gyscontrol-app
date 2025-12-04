-- =====================================================
-- CLEAN MIGRATION: Complete Database Restoration
-- Generated based on analysis of all 5 migrations
-- =====================================================

-- First, let's fix the problematic CRM migration
ALTER TABLE "public"."Cliente" 
ALTER COLUMN "estadoRelacion" SET DEFAULT 'prospecto';

-- Ensure all expected columns exist with proper defaults
UPDATE "public"."Cliente" 
SET estadoRelacion = 'prospecto' 
WHERE estadoRelacion IS NULL;

-- Recreate any missing tables from migrations

-- Tables from 20250918000731_cotizacion_extensiones
CREATE TABLE IF NOT EXISTS "public"."cotizacion_exclusion" (
    "id" TEXT NOT NULL,
    "cotizacionId" TEXT NOT NULL,
    "descripcion" TEXT NOT NULL,
    "orden" INTEGER DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "cotizacion_exclusion_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "public"."cotizacion_condicion" (
    "id" TEXT NOT NULL,
    "cotizacionId" TEXT NOT NULL,
    "tipo" TEXT,
    "descripcion" TEXT NOT NULL,
    "orden" INTEGER DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "cotizacion_condicion_pkey" PRIMARY KEY ("id")
);

-- Tables from 20250918043028_add_plantillas_cotizacion
CREATE TABLE IF NOT EXISTS "public"."plantilla_exclusion" (
    "id" TEXT NOT NULL,
    "nombre" TEXT NOT NULL,
    "descripcion" TEXT,
    "categoria" TEXT,
    "activo" BOOLEAN NOT NULL DEFAULT true,
    "orden" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "plantilla_exclusion_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "public"."plantilla_exclusion_item" (
    "id" TEXT NOT NULL,
    "plantillaExclusionId" TEXT NOT NULL,
    "descripcion" TEXT NOT NULL,
    "orden" INTEGER NOT NULL DEFAULT 0,
    "activo" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "plantilla_exclusion_item_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "public"."plantilla_condicion" (
    "id" TEXT NOT NULL,
    "nombre" TEXT NOT NULL,
    "descripcion" TEXT,
    "categoria" TEXT,
    "tipo" TEXT,
    "activo" BOOLEAN NOT NULL DEFAULT true,
    "orden" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "plantilla_condicion_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "public"."plantilla_condicion_item" (
    "id" TEXT NOT NULL,
    "plantillaCondicionId" TEXT NOT NULL,
    "descripcion" TEXT NOT NULL,
    "tipo" TEXT,
    "orden" INTEGER NOT NULL DEFAULT 0,
    "activo" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "plantilla_condicion_item_pkey" PRIMARY KEY ("id")
);

-- Tables from 20250919171819_add_crm_models
CREATE TABLE IF NOT EXISTS "public"."crm_oportunidad" (
    "id" TEXT NOT NULL,
    "clienteId" TEXT NOT NULL,
    "nombre" TEXT NOT NULL,
    "descripcion" TEXT,
    "valorEstimado" DOUBLE PRECISION,
    "probabilidad" INTEGER NOT NULL DEFAULT 0,
    "fechaCierreEstimada" TIMESTAMP(3),
    "fuente" TEXT,
    "estado" TEXT NOT NULL DEFAULT 'prospecto',
    "prioridad" TEXT NOT NULL DEFAULT 'media',
    "comercialId" TEXT,
    "responsableId" TEXT,
    "fechaUltimoContacto" TIMESTAMP(3),
    "notas" TEXT,
    "competencia" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "cotizacionId" TEXT,
    CONSTRAINT "crm_oportunidad_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "public"."crm_actividad" (
    "id" TEXT NOT NULL,
    "oportunidadId" TEXT NOT NULL,
    "tipo" TEXT NOT NULL,
    "descripcion" TEXT NOT NULL,
    "fecha" TIMESTAMP(3) NOT NULL,
    "resultado" TEXT,
    "notas" TEXT,
    "usuarioId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "crm_actividad_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "public"."crm_competidor_licitacion" (
    "id" TEXT NOT NULL,
    "cotizacionId" TEXT NOT NULL,
    "nombreEmpresa" TEXT NOT NULL,
    "contacto" TEXT,
    "telefono" TEXT,
    "email" TEXT,
    "propuestaEconomica" DOUBLE PRECISION,
    "propuestaTecnica" TEXT,
    "fortalezas" TEXT,
    "debilidades" TEXT,
    "precioVsNuestro" TEXT,
    "resultado" TEXT,
    "razonPerdida" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "crm_competidor_licitacion_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "public"."crm_contacto_cliente" (
    "id" TEXT NOT NULL,
    "clienteId" TEXT NOT NULL,
    "nombre" TEXT NOT NULL,
    "cargo" TEXT,
    "email" TEXT,
    "telefono" TEXT,
    "celular" TEXT,
    "esDecisionMaker" BOOLEAN NOT NULL DEFAULT false,
    "areasInfluencia" TEXT,
    "relacionComercial" TEXT,
    "fechaUltimoContacto" TIMESTAMP(3),
    "notas" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "crm_contacto_cliente_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "public"."crm_historial_proyecto" (
    "id" TEXT NOT NULL,
    "clienteId" TEXT NOT NULL,
    "proyectoId" TEXT,
    "cotizacionId" TEXT,
    "nombreProyecto" TEXT NOT NULL,
    "tipoProyecto" TEXT NOT NULL,
    "sector" TEXT,
    "complejidad" TEXT,
    "valorContrato" DOUBLE PRECISION,
    "margenObtenido" DOUBLE PRECISION,
    "duracionDias" INTEGER,
    "fechaInicio" TIMESTAMP(3),
    "fechaFin" TIMESTAMP(3),
    "fechaAdjudicacion" TIMESTAMP(3),
    "calificacionCliente" INTEGER,
    "retroalimentacion" TEXT,
    "exitos" TEXT,
    "problemas" TEXT,
    "recomendaciones" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "crm_historial_proyecto_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "public"."crm_metrica_comercial" (
    "id" TEXT NOT NULL,
    "usuarioId" TEXT NOT NULL,
    "periodo" TEXT NOT NULL,
    "cotizacionesGeneradas" INTEGER NOT NULL DEFAULT 0,
    "cotizacionesAprobadas" INTEGER NOT NULL DEFAULT 0,
    "proyectosCerrados" INTEGER NOT NULL DEFAULT 0,
    "valorTotalVendido" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "margenTotalObtenido" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "tiempoPromedioCierre" DOUBLE PRECISION,
    "tasaConversion" DOUBLE PRECISION,
    "valorPromedioProyecto" DOUBLE PRECISION,
    "llamadasRealizadas" INTEGER NOT NULL DEFAULT 0,
    "reunionesAgendadas" INTEGER NOT NULL DEFAULT 0,
    "propuestasEnviadas" INTEGER NOT NULL DEFAULT 0,
    "emailsEnviados" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "crm_metrica_comercial_pkey" PRIMARY KEY ("id")
);

-- Table from 20250919234235_add_cotizacion_versions
CREATE TABLE IF NOT EXISTS "public"."cotizacion_version" (
    "id" TEXT NOT NULL,
    "cotizacionId" TEXT NOT NULL,
    "version" INTEGER NOT NULL,
    "nombre" TEXT NOT NULL,
    "descripcion" TEXT,
    "estado" TEXT NOT NULL DEFAULT 'borrador',
    "snapshot" TEXT NOT NULL,
    "cambios" TEXT,
    "motivoCambio" TEXT,
    "usuarioId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "cotizacion_version_pkey" PRIMARY KEY ("id")
);

-- Add missing User fields
ALTER TABLE "public"."User" 
ADD COLUMN IF NOT EXISTS "metaMensual" Float DEFAULT 0,
ADD COLUMN IF NOT EXISTS "metaTrimestral" Float DEFAULT 0;

-- Create missing indexes
CREATE INDEX IF NOT EXISTS "cotizacion_exclusion_cotizacionId_orden_idx" ON "public"."cotizacion_exclusion"("cotizacionId", "orden");
CREATE INDEX IF NOT EXISTS "cotizacion_condicion_cotizacionId_orden_idx" ON "public"."cotizacion_condicion"("cotizacionId", "orden");
CREATE INDEX IF NOT EXISTS "plantilla_exclusion_categoria_activo_idx" ON "public"."plantilla_exclusion"("categoria", "activo");
CREATE INDEX IF NOT EXISTS "plantilla_exclusion_item_plantillaExclusionId_orden_idx" ON "public"."plantilla_exclusion_item"("plantillaExclusionId", "orden");
CREATE INDEX IF NOT EXISTS "plantilla_condicion_categoria_tipo_activo_idx" ON "public"."plantilla_condicion"("categoria", "tipo", "activo");
CREATE INDEX IF NOT EXISTS "plantilla_condicion_item_plantillaCondicionId_orden_idx" ON "public"."plantilla_condicion_item"("plantillaCondicionId", "orden");
CREATE INDEX IF NOT EXISTS "crm_oportunidad_clienteId_estado_idx" ON "public"."crm_oportunidad"("clienteId", "estado");
CREATE INDEX IF NOT EXISTS "crm_oportunidad_comercialId_fechaCierreEstimada_idx" ON "public"."crm_oportunidad"("comercialId", "fechaCierreEstimada");
CREATE INDEX IF NOT EXISTS "crm_actividad_oportunidadId_fecha_idx" ON "public"."crm_actividad"("oportunidadId", "fecha");
CREATE INDEX IF NOT EXISTS "crm_competidor_licitacion_cotizacionId_idx" ON "public"."crm_competidor_licitacion"("cotizacionId");
CREATE INDEX IF NOT EXISTS "crm_contacto_cliente_clienteId_esDecisionMaker_idx" ON "public"."crm_contacto_cliente"("clienteId", "esDecisionMaker");
CREATE INDEX IF NOT EXISTS "crm_historial_proyecto_clienteId_fechaInicio_idx" ON "public"."crm_historial_proyecto"("clienteId", "fechaInicio");
CREATE INDEX IF NOT EXISTS "crm_historial_proyecto_tipoProyecto_sector_idx" ON "public"."crm_historial_proyecto"("tipoProyecto", "sector");
CREATE INDEX IF NOT EXISTS "crm_metrica_comercial_periodo_idx" ON "public"."crm_metrica_comercial"("periodo");
CREATE INDEX IF NOT EXISTS "cotizacion_version_cotizacionId_version_idx" ON "public"."cotizacion_version"("cotizacionId", "version");
CREATE INDEX IF NOT EXISTS "cotizacion_version_estado_createdAt_idx" ON "public"."cotizacion_version"("estado", "createdAt");

-- Create missing unique indexes
CREATE UNIQUE INDEX IF NOT EXISTS "crm_oportunidad_cotizacionId_key" ON "public"."crm_oportunidad"("cotizacionId");
CREATE UNIQUE INDEX IF NOT EXISTS "crm_metrica_comercial_usuarioId_periodo_key" ON "public"."crm_metrica_comercial"("usuarioId", "periodo");
CREATE UNIQUE INDEX IF NOT EXISTS "cotizacion_version_cotizacionId_version_key" ON "public"."cotizacion_version"("cotizacionId", "version");

-- Add missing foreign key constraints
ALTER TABLE "public"."plantilla_exclusion_item" 
ADD CONSTRAINT "plantilla_exclusion_item_plantillaExclusionId_fkey" 
FOREIGN KEY ("plantillaExclusionId") REFERENCES "public"."plantilla_exclusion"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "public"."plantilla_condicion_item" 
ADD CONSTRAINT "plantilla_condicion_item_plantillaCondicionId_fkey" 
FOREIGN KEY ("plantillaCondicionId") REFERENCES "public"."plantilla_condicion"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "public"."cotizacion_exclusion" 
ADD CONSTRAINT "cotizacion_exclusion_cotizacionId_fkey" 
FOREIGN KEY ("cotizacionId") REFERENCES "public"."Cotizacion"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "public"."cotizacion_condicion" 
ADD CONSTRAINT "cotizacion_condicion_cotizacionId_fkey" 
FOREIGN KEY ("cotizacionId") REFERENCES "public"."Cotizacion"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "public"."crm_oportunidad" 
ADD CONSTRAINT "crm_oportunidad_clienteId_fkey" 
FOREIGN KEY ("clienteId") REFERENCES "public"."Cliente"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "public"."crm_oportunidad" 
ADD CONSTRAINT "crm_oportunidad_comercialId_fkey" 
FOREIGN KEY ("comercialId") REFERENCES "public"."User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "public"."crm_oportunidad" 
ADD CONSTRAINT "crm_oportunidad_responsableId_fkey" 
FOREIGN KEY ("responsableId") REFERENCES "public"."User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "public"."crm_oportunidad" 
ADD CONSTRAINT "crm_oportunidad_cotizacionId_fkey" 
FOREIGN KEY ("cotizacionId") REFERENCES "public"."Cotizacion"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "public"."crm_actividad" 
ADD CONSTRAINT "crm_actividad_usuarioId_fkey" 
FOREIGN KEY ("usuarioId") REFERENCES "public"."User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "public"."crm_actividad" 
ADD CONSTRAINT "crm_actividad_oportunidadId_fkey" 
FOREIGN KEY ("oportunidadId") REFERENCES "public"."crm_oportunidad"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "public"."crm_competidor_licitacion" 
ADD CONSTRAINT "crm_competidor_licitacion_cotizacionId_fkey" 
FOREIGN KEY ("cotizacionId") REFERENCES "public"."Cotizacion"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "public"."crm_contacto_cliente" 
ADD CONSTRAINT "crm_contacto_cliente_clienteId_fkey" 
FOREIGN KEY ("clienteId") REFERENCES "public"."Cliente"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "public"."crm_historial_proyecto" 
ADD CONSTRAINT "crm_historial_proyecto_clienteId_fkey" 
FOREIGN KEY ("clienteId") REFERENCES "public"."Cliente"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "public"."crm_historial_proyecto" 
ADD CONSTRAINT "crm_historial_proyecto_proyectoId_fkey" 
FOREIGN KEY ("proyectoId") REFERENCES "public"."Proyecto"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "public"."crm_historial_proyecto" 
ADD CONSTRAINT "crm_historial_proyecto_cotizacionId_fkey" 
FOREIGN KEY ("cotizacionId") REFERENCES "public"."Cotizacion"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "public"."crm_metrica_comercial" 
ADD CONSTRAINT "crm_metrica_comercial_usuarioId_fkey" 
FOREIGN KEY ("usuarioId") REFERENCES "public"."User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "public"."cotizacion_version" 
ADD CONSTRAINT "cotizacion_version_cotizacionId_fkey" 
FOREIGN KEY ("cotizacionId") REFERENCES "public"."Cotizacion"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "public"."cotizacion_version" 
ADD CONSTRAINT "cotizacion_version_usuarioId_fkey" 
FOREIGN KEY ("usuarioId") REFERENCES "public"."User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- =====================================================
-- MIGRATION COMPLETE
-- This migration ensures all tables, indexes, and constraints
-- are properly created and synced with the Prisma schema
-- =====================================================
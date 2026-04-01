-- Make proyectoServicioId optional in registro_horas
-- This allows timesheet registrations for internal projects without cotizaciones

ALTER TABLE "registro_horas" ALTER COLUMN "proyectoServicioId" DROP NOT NULL;

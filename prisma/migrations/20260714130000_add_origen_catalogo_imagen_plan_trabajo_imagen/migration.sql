-- AlterTable
ALTER TABLE "plan_trabajo_imagen" ADD COLUMN "origen" TEXT NOT NULL DEFAULT 'MANUAL';
ALTER TABLE "plan_trabajo_imagen" ADD COLUMN "catalogoImagenId" TEXT;

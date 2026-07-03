-- Agregar esBase a plantilla_organigrama
ALTER TABLE "plantilla_organigrama" ADD COLUMN "esBase" BOOLEAN NOT NULL DEFAULT false;

-- Agregar userId a plantilla_org_nodo (para que la plantilla base pueda tener usuarios por defecto)
ALTER TABLE "plantilla_org_nodo" ADD COLUMN "userId" TEXT;
ALTER TABLE "plantilla_org_nodo" ADD CONSTRAINT "plantilla_org_nodo_userId_fkey" FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- Resetear esFijoGys en todos los nodos existentes (ya no se usará para bloquear)
UPDATE "proyecto_org_nodo" SET "esFijoGys" = false;

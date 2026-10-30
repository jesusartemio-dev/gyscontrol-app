-- Catálogo único de puestos. Los organigramas venían escribiendo el mismo puesto
-- de hasta 6 formas distintas ("GESTOR DE PROYECTOS", "Gestor de Proyecto",
-- "Jefe de Proyectos", "Lider de Proyectos"…), lo que obligaba a emparejar por
-- palabras clave. `rolFuncional` separa el nombre que ve el cliente de la
-- responsabilidad que usa la derivación de responsables por EDT.
CREATE TABLE IF NOT EXISTS "puesto" (
    "id"           TEXT NOT NULL,
    "nombre"       TEXT NOT NULL,
    "rolFuncional" TEXT,
    "categoria"    TEXT,
    "vaACampo"     BOOLEAN NOT NULL DEFAULT false,
    "orden"        INTEGER NOT NULL DEFAULT 0,
    "activo"       BOOLEAN NOT NULL DEFAULT true,
    "createdAt"    TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt"    TIMESTAMP(3) NOT NULL,
    CONSTRAINT "puesto_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "puesto_nombre_key" ON "puesto"("nombre");

-- Columnas nullable: conviven con cargoLabel/rol hasta terminar el backfill.
ALTER TABLE "plantilla_org_nodo" ADD COLUMN IF NOT EXISTS "puestoId" TEXT;
ALTER TABLE "proyecto_org_nodo"  ADD COLUMN IF NOT EXISTS "puestoId" TEXT;
ALTER TABLE "personal_proyecto"  ADD COLUMN IF NOT EXISTS "puestoId" TEXT;

DO $$ BEGIN
    ALTER TABLE "plantilla_org_nodo" ADD CONSTRAINT "plantilla_org_nodo_puestoId_fkey"
        FOREIGN KEY ("puestoId") REFERENCES "puesto"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
    ALTER TABLE "proyecto_org_nodo" ADD CONSTRAINT "proyecto_org_nodo_puestoId_fkey"
        FOREIGN KEY ("puestoId") REFERENCES "puesto"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
    ALTER TABLE "personal_proyecto" ADD CONSTRAINT "personal_proyecto_puestoId_fkey"
        FOREIGN KEY ("puestoId") REFERENCES "puesto"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

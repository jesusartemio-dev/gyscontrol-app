-- Add desglosado state to EstadoEquipoItem enum
ALTER TYPE "EstadoEquipoItem" ADD VALUE IF NOT EXISTS 'desglosado';

-- Create DesgloseEquipoItem join table
CREATE TABLE IF NOT EXISTS "desglose_equipo_item" (
    "id" TEXT NOT NULL,
    "proyectoEquipoCotizadoItemId" TEXT NOT NULL,
    "listaEquipoId" TEXT NOT NULL,
    "nota" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "desglose_equipo_item_pkey" PRIMARY KEY ("id")
);

-- Unique constraint: one desglose per item-lista pair
CREATE UNIQUE INDEX IF NOT EXISTS "desglose_equipo_item_proyectoEquipoCotizadoItemId_listaEquipoId_key"
    ON "desglose_equipo_item"("proyectoEquipoCotizadoItemId", "listaEquipoId");

-- Foreign keys
ALTER TABLE "desglose_equipo_item"
    ADD CONSTRAINT "desglose_equipo_item_proyectoEquipoCotizadoItemId_fkey"
    FOREIGN KEY ("proyectoEquipoCotizadoItemId")
    REFERENCES "proyecto_equipo_cotizado_item"("id")
    ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "desglose_equipo_item"
    ADD CONSTRAINT "desglose_equipo_item_listaEquipoId_fkey"
    FOREIGN KEY ("listaEquipoId")
    REFERENCES "lista_equipo"("id")
    ON DELETE CASCADE ON UPDATE CASCADE;

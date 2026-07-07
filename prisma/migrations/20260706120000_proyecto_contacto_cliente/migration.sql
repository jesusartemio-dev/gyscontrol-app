CREATE TABLE "proyecto_contacto_cliente" (
    "id" TEXT NOT NULL,
    "proyectoId" TEXT NOT NULL,
    "crmContactoId" TEXT NOT NULL,
    "rolEnProyecto" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "proyecto_contacto_cliente_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "proyecto_contacto_cliente_proyectoId_crmContactoId_key"
    ON "proyecto_contacto_cliente"("proyectoId", "crmContactoId");

CREATE INDEX "proyecto_contacto_cliente_proyectoId_idx"
    ON "proyecto_contacto_cliente"("proyectoId");

ALTER TABLE "proyecto_contacto_cliente"
    ADD CONSTRAINT "proyecto_contacto_cliente_proyectoId_fkey"
    FOREIGN KEY ("proyectoId") REFERENCES "proyecto"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "proyecto_contacto_cliente"
    ADD CONSTRAINT "proyecto_contacto_cliente_crmContactoId_fkey"
    FOREIGN KEY ("crmContactoId") REFERENCES "crm_contacto_cliente"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- CreateTable
CREATE TABLE "configuracion_catalogo_columnas" (
    "id" TEXT NOT NULL,
    "columnas" JSONB NOT NULL,
    "permisos" JSONB NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "configuracion_catalogo_columnas_pkey" PRIMARY KEY ("id")
);

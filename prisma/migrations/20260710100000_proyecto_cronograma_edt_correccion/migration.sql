-- CreateTable
CREATE TABLE "proyecto_cronograma_edt_correccion" (
    "id" TEXT NOT NULL,
    "proyectoId" TEXT NOT NULL,
    "edtId" TEXT NOT NULL,
    "motivo" TEXT,
    "creadoPorId" TEXT NOT NULL,
    "creadoEn" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "proyecto_cronograma_edt_correccion_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "proyecto_cronograma_edt_correccion_proyectoId_edtId_key" ON "proyecto_cronograma_edt_correccion"("proyectoId", "edtId");

-- AddForeignKey
ALTER TABLE "proyecto_cronograma_edt_correccion" ADD CONSTRAINT "proyecto_cronograma_edt_correccion_proyectoId_fkey" FOREIGN KEY ("proyectoId") REFERENCES "proyecto"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "proyecto_cronograma_edt_correccion" ADD CONSTRAINT "proyecto_cronograma_edt_correccion_edtId_fkey" FOREIGN KEY ("edtId") REFERENCES "edt"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "proyecto_cronograma_edt_correccion" ADD CONSTRAINT "proyecto_cronograma_edt_correccion_creadoPorId_fkey" FOREIGN KEY ("creadoPorId") REFERENCES "user"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

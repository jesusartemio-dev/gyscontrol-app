/*
  Warnings:

  - The values [de_cotizacion,nuevo,reemplazo] on the enum `EstadoListaItem` will be removed. If these variants are still used in the database, this will fail.

*/
-- CreateEnum
CREATE TYPE "OrigenListaItem" AS ENUM ('cotizado', 'nuevo', 'reemplazo');

-- AlterEnum
BEGIN;
CREATE TYPE "EstadoListaItem_new" AS ENUM ('borrador', 'por_revisar', 'por_cotizar', 'por_validar', 'por_aprobar', 'aprobado', 'rechazado');
ALTER TABLE "ListaEquipoItem" ALTER COLUMN "estado" DROP DEFAULT;
ALTER TABLE "ListaEquipoItem" ALTER COLUMN "estado" TYPE "EstadoListaItem_new" USING ("estado"::text::"EstadoListaItem_new");
ALTER TYPE "EstadoListaItem" RENAME TO "EstadoListaItem_old";
ALTER TYPE "EstadoListaItem_new" RENAME TO "EstadoListaItem";
DROP TYPE "EstadoListaItem_old";
ALTER TABLE "ListaEquipoItem" ALTER COLUMN "estado" SET DEFAULT 'borrador';
COMMIT;

-- AlterTable
ALTER TABLE "ListaEquipoItem" ADD COLUMN     "origen" "OrigenListaItem" NOT NULL DEFAULT 'nuevo',
ALTER COLUMN "estado" SET DEFAULT 'borrador';

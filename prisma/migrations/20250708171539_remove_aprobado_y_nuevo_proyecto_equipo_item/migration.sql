/*
  Warnings:

  - You are about to drop the column `aprobado` on the `ProyectoEquipoItem` table. All the data in the column will be lost.
  - You are about to drop the column `nuevo` on the `ProyectoEquipoItem` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "ProyectoEquipoItem" DROP COLUMN "aprobado",
DROP COLUMN "nuevo";

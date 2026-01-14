import "server-only";
import { prisma } from '@/lib/prisma';

export async function getListaEquipoDetail(proyectoId: string, listaId: string) {
  const [lista, proyecto] = await Promise.all([
    // Get lista with simplified data to avoid Prisma client cache issues
    prisma.listaEquipo.findUnique({
      where: { id: listaId },
      include: {
        // 🏢 Basic project information
        proyecto: {
          select: {
            id: true,
            nombre: true,
            codigo: true,
            estado: true,
            fechaInicio: true,
            fechaFin: true,
            cliente: {
              select: {
                id: true,
                nombre: true
              }
            }
          }
        },
        // 👤 Basic responsible information
        responsable: {
          select: {
            id: true,
            name: true,
            email: true
          }
        },
        // 📋 Simplified items with basic relationships
        items: {
          include: {
            // 👤 Basic responsable information
            responsable: {
              select: {
                id: true,
                name: true,
                email: true
              }
            },
            // 🏪 Basic proveedor information
            proveedor: {
              select: {
                id: true,
                nombre: true
              }
            },
            // 💰 Simplified cotizaciones
            cotizaciones: {
              include: {
                cotizacion: {
                  select: {
                    id: true,
                    codigo: true,
                    estado: true,
                    proveedor: {
                      select: {
                        id: true,
                        nombre: true
                      }
                    }
                  }
                }
              },
              orderBy: {
                precioUnitario: 'asc'
              }
            },
            // 📦 Simplified pedidos
            pedidos: {
              include: {
                pedido: {
                  select: {
                    id: true,
                    codigo: true,
                    estado: true
                  }
                }
              }
            },
            // 🏗️ Basic proyecto equipo relationship
            proyectoEquipo: {
              select: {
                id: true,
                nombre: true
              }
            },
            // 📋 Basic proyecto equipo item relationship
            proyectoEquipoItem: {
              include: {
                proyectoEquipo: {
                  select: {
                    id: true,
                    nombre: true
                  }
                }
              }
            }
          },
          orderBy: {
            createdAt: 'asc'
          }
        }
      }
    }).catch((error) => {
      console.error('Error fetching lista detail:', error);
      return null;
    }),
    // Get proyecto information
    prisma.proyecto.findUnique({
      where: { id: proyectoId },
      include: {
        cliente: true,
        comercial: true,
        gestor: true,
        cotizacion: true
      }
    }).catch((error) => {
      console.error('Error fetching proyecto:', error);
      return null;
    })
  ]);

  return { lista, proyecto };
}
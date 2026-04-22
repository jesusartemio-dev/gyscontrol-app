import "server-only";
import { prisma } from '@/lib/prisma';

export async function getListaEquipoDetail(proyectoId: string, listaId: string) {
  const [listaRaw, proyecto] = await Promise.all([
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
        user: {
          select: {
            id: true,
            name: true,
            email: true
          }
        },
        // 📋 Simplified items with basic relationships
        listaEquipoItem: {
          include: {
            // 👤 Basic responsable information
            user: {
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
            // 👤 Auditoría de selección de cotización
            seleccionadoPor: {
              select: {
                id: true,
                name: true
              }
            },
            // 💰 Simplified cotizaciones
            cotizacionProveedorItems: {
              include: {
                cotizacionProveedor: {
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
            pedidoEquipoItem: {
              include: {
                pedidoEquipo: {
                  select: {
                    id: true,
                    codigo: true,
                    estado: true
                  }
                }
              }
            },
            // 🏗️ Basic proyecto equipo relationship
            proyectoEquipoCotizado: {
              select: {
                id: true,
                nombre: true
              }
            },
            // 📋 Basic proyecto equipo item relationship
            proyectoEquipoItem: {
              include: {
                proyectoEquipoCotizado: {
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
        },
        // 🕑 Eventos de trazabilidad (para el Timeline)
        eventosTrazabilidad: {
          orderBy: { fechaEvento: 'desc' },
          include: {
            user: { select: { id: true, name: true } },
          },
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

  // Map for frontend compatibility
  const lista = listaRaw ? {
    ...listaRaw,
    responsable: listaRaw.user,
    items: listaRaw.listaEquipoItem?.map((item: any) => ({
      ...item,
      responsable: item.user,
      cotizaciones: item.cotizacionProveedorItems?.map((cot: any) => ({
        ...cot,
        cotizacionProveedor: cot.cotizacionProveedor
      })),
      pedidos: item.pedidoEquipoItem?.map((ped: any) => ({
        ...ped,
        pedidoEquipo: ped.pedidoEquipo
      })),
      proyectoEquipo: item.proyectoEquipoCotizado
    }))
  } : null;

  return { lista, proyecto };
}
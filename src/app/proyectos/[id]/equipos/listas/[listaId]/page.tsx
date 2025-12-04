/**
 * 📋 Lista de Equipos Detail Page
 *
 * Página de detalle para gestión específica de una lista de equipos.
 * Incluye vista completa de items, edición, historial y configuraciones.
 *
 * @author GYS Team
 * @version 1.0.0
 */

import React, { Suspense } from 'react';
import { notFound } from 'next/navigation';
import { Skeleton } from '@/components/ui/skeleton';
import ListaEquipoDetailView from '@/components/proyectos/ListaEquipoDetailView';
import DetailErrorBoundary from '@/components/common/DetailErrorBoundary';
import { prisma } from '@/lib/prisma';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { validateRouteParams, RouteValidationError } from '@/lib/validators/routeParams';
import { ListaEquipoItem } from '@/types/modelos';

interface ListaEquipoDetailPageProps {
  params: Promise<{
    id: string; // proyectoId
    listaId: string;
  }>;
}

// ✅ Loading component for the detail view
const DetailViewSkeleton = () => (
  <div className="space-y-6">
    <div className="flex items-center gap-4">
      <Skeleton className="h-10 w-10" />
      <div className="space-y-2">
        <Skeleton className="h-4 w-64" />
        <Skeleton className="h-3 w-48" />
      </div>
    </div>
    <Skeleton className="h-32 w-full" />
    <Skeleton className="h-96 w-full" />
  </div>
);

const ListaEquipoDetailPage: React.FC<ListaEquipoDetailPageProps> = async ({ params }) => {
  const resolvedParams = await params;

  try {
    // ✅ Validate route parameters
    const validatedParams = validateRouteParams.listaEquipoDetail(resolvedParams);
    const { id: proyectoId, listaId } = validatedParams;

    // 🔐 Check authentication
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      notFound();
    }

    // 🎯 Server-side data fetching with Prisma directly
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

    // Extract items from lista
    const items = lista?.items || [];

    // ✅ Handle not found cases
    if (!lista || !proyecto) {
      notFound();
    }

    // 🔄 Transform dates to strings for compatibility
    const transformedLista = {
      ...lista,
      createdAt: lista.createdAt.toISOString(),
      updatedAt: lista.updatedAt.toISOString(),
      fechaAprobacionFinal: lista.fechaAprobacionFinal?.toISOString(),
      fechaAprobacionRevision: lista.fechaAprobacionRevision?.toISOString(),
      fechaEnvioLogistica: lista.fechaEnvioLogistica?.toISOString(),
      fechaEnvioRevision: lista.fechaEnvioRevision?.toISOString(),
      fechaFinCotizacion: lista.fechaFinCotizacion?.toISOString(),
      fechaInicioCotizacion: lista.fechaInicioCotizacion?.toISOString(),
      fechaNecesaria: lista.fechaNecesaria?.toISOString(),
      fechaValidacion: lista.fechaValidacion?.toISOString(),
    };

    // 🔄 Transform items dates to strings for compatibility
    const transformedItems = items.map(item => {
      // ✅ Compute cotizacionSeleccionada from cotizaciones array and cotizacionSeleccionadaId
      const cotizacionSeleccionada = item.cotizacionSeleccionadaId
        ? item.cotizaciones.find(cot => cot.id === item.cotizacionSeleccionadaId) || null
        : null;

      const transformedItem = {
        ...item,
        createdAt: item.createdAt.toISOString(),
        updatedAt: item.updatedAt.toISOString(),
        // Convert null to undefined for compatibility with TypeScript types
        proyectoEquipoItemId: item.proyectoEquipoItemId ?? undefined,
        proyectoEquipoId: item.proyectoEquipoId ?? undefined,
        reemplazaProyectoEquipoCotizadoItemId: item.reemplazaProyectoEquipoCotizadoItemId ?? undefined,
        proveedorId: item.proveedorId ?? undefined,
        cotizacionSeleccionadaId: item.cotizacionSeleccionadaId ?? undefined,
        cotizacionSeleccionada: cotizacionSeleccionada || undefined,
        comentarioRevision: item.comentarioRevision ?? undefined,
        presupuesto: item.presupuesto ?? undefined,
        precioElegido: item.precioElegido ?? undefined,
        costoElegido: item.costoElegido ?? undefined,
        costoPedido: item.costoPedido ?? undefined,
        costoReal: item.costoReal ?? undefined,
        cantidadPedida: item.cantidadPedida ?? undefined,
        cantidadEntregada: item.cantidadEntregada ?? undefined,
        tiempoEntrega: item.tiempoEntrega ?? undefined,
        tiempoEntregaDias: item.tiempoEntregaDias ?? undefined,
        cotizaciones: item.cotizaciones.map(cot => ({
          ...cot,
          createdAt: cot.createdAt.toISOString(),
          updatedAt: cot.updatedAt.toISOString(),
          cotizacion: {
            ...cot.cotizacion
          }
        })),
        pedidos: item.pedidos.map(ped => ({
          ...ped,
          createdAt: ped.createdAt.toISOString(),
          updatedAt: ped.updatedAt.toISOString(),
          pedido: {
            ...ped.pedido
          }
        }))
      };
      return transformedItem as any;
    });

    return (
      <DetailErrorBoundary>
        <div className="container mx-auto py-6">
          <Suspense fallback={<DetailViewSkeleton />}>
            <ListaEquipoDetailView
              proyectoId={proyectoId}
              listaId={listaId}
              initialLista={transformedLista as any}
              initialItems={transformedItems as any}
              initialProyecto={proyecto as any}
            />
          </Suspense>
        </div>
      </DetailErrorBoundary>
    );
  } catch (error) {
    console.error('Error loading detail page:', error);

    // Handle validation errors specifically
    if (error instanceof RouteValidationError) {
      notFound();
    }

    // Re-throw other errors to be caught by error boundary
    throw error;
  }
};

export default ListaEquipoDetailPage;
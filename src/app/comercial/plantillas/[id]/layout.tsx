// src/app/comercial/plantillas/[id]/layout.tsx

export default function PlantillaLayout({
    children,
    params,
  }: {
    children: React.ReactNode
    params: Promise<{ id: string }>
  }) {
    return (
      <div className="p-6">
        {/* Aquí podrías mostrar información general de la plantilla o tabs si deseas */}
        {children}
      </div>
    )
  }
  
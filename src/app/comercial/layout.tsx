// src/app/comercial/layout.tsx
export default function ComercialLayout({ children }: { children: React.ReactNode }) {
    return (
      <div className="space-y-4">
        <h1 className="text-xl font-bold">Área Comercial</h1>
        <div>{children}</div>
      </div>
    )
  }
  
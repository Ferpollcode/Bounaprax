import { BuonapraxLogo } from '@/components/BuonapraxLogo'

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen flex">
      {/* Left panel — branding */}
      <div className="hidden lg:flex lg:w-[46%] relative flex-col justify-between p-12 overflow-hidden"
        style={{ background: 'linear-gradient(145deg, #0D1220 0%, #0A1628 50%, #0E1A2E 100%)' }}>
        {/* Decorative grid */}
        <div className="absolute inset-0 opacity-[0.04]"
          style={{
            backgroundImage: 'linear-gradient(#3EC9C9 1px, transparent 1px), linear-gradient(90deg, #3EC9C9 1px, transparent 1px)',
            backgroundSize: '40px 40px'
          }} />
        {/* Glows */}
        <div className="absolute top-1/4 -left-24 w-72 h-72 rounded-full"
          style={{ background: 'radial-gradient(circle, rgba(62,201,201,0.12) 0%, transparent 70%)' }} />
        <div className="absolute bottom-1/3 right-0 w-56 h-56 rounded-full"
          style={{ background: 'radial-gradient(circle, rgba(245,166,35,0.08) 0%, transparent 70%)' }} />

        {/* Logo */}
        <div className="relative z-10">
          <img src="/logo.png" alt="Buonaprax" style={{ height: 44, width: 'auto', objectFit: 'contain' }} />
        </div>

        {/* Center content */}
        <div className="relative z-10 space-y-8">
          <div className="space-y-4">
            <h1 className="text-4xl font-bold leading-tight"
              style={{ color: 'var(--foreground)', fontFamily: 'var(--font-display)', lineHeight: 1.2 }}>
              Tu consultorio,<br/>
              <span style={{ color: 'var(--primary)' }}>siempre contigo.</span>
            </h1>
            <p className="text-base leading-relaxed max-w-xs" style={{ color: 'var(--muted-foreground)' }}>
              Gestión completa de pacientes para profesionales de la salud.
              Accedé desde cualquier dispositivo, en cualquier momento.
            </p>
          </div>

          {/* Feature bullets */}
          <div className="space-y-3">
            {[
              { icon: '◆', label: 'Historia clínica digital completa' },
              { icon: '◆', label: 'Seguimiento de sesiones y evolución' },
              { icon: '◆', label: 'Gestión de pagos y asistencias' },
              { icon: '◆', label: 'Multi-consultorio, un solo login' },
            ].map((f) => (
              <div key={f.label} className="flex items-center gap-3">
                <span className="text-xs" style={{ color: 'var(--primary)' }}>{f.icon}</span>
                <span className="text-sm" style={{ color: 'var(--muted-foreground)' }}>{f.label}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Bottom */}
        <div className="relative z-10">
          <p className="text-xs" style={{ color: 'var(--text-subtle)' }}>
            Datos seguros · Sincronización en tiempo real
          </p>
        </div>
      </div>

      {/* Right panel — form */}
      <div className="flex-1 flex items-center justify-center p-8"
        style={{ background: 'var(--background)' }}>
        {children}
      </div>
    </div>
  )
}

import { BounapraxLogo } from '@/components/BounapraxLogo'

const features = [
  { label: 'Historia clínica digital completa',    color: '#A8D8EA' }, // azul pastel
  { label: 'Seguimiento de sesiones y evolución',  color: '#B5EAD7' }, // verde pastel
  { label: 'Gestión de pagos y asistencias',       color: '#FFDAC1' }, // naranja pastel
  { label: 'Multi-consultorio, un solo login',     color: '#C7CEEA' }, // morado pastel
]

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen flex">
      {/* Left panel — branding */}
      <div className="hidden lg:flex lg:w-[46%] relative flex-col justify-between p-12 overflow-hidden"
        style={{ background: 'linear-gradient(155deg, #FFF9F0 0%, #F0F7FF 50%, #F5F0FF 100%)' }}>

        {/* Blobs decorativos pastel */}
        <div className="absolute top-[-80px] left-[-80px] w-80 h-80 rounded-full opacity-40"
          style={{ background: 'radial-gradient(circle, #FFDAC1 0%, transparent 70%)' }} />
        <div className="absolute top-1/3 right-[-60px] w-64 h-64 rounded-full opacity-35"
          style={{ background: 'radial-gradient(circle, #C7CEEA 0%, transparent 70%)' }} />
        <div className="absolute bottom-[-60px] left-1/3 w-72 h-72 rounded-full opacity-35"
          style={{ background: 'radial-gradient(circle, #B5EAD7 0%, transparent 70%)' }} />
        <div className="absolute bottom-1/3 left-[-40px] w-48 h-48 rounded-full opacity-30"
          style={{ background: 'radial-gradient(circle, #FFD6D6 0%, transparent 70%)' }} />

        {/* Logo */}
        <div className="relative z-10 flex justify-start">
          <BounapraxLogo variant="authHero" />
        </div>

        {/* Center content */}
        <div className="relative z-10 space-y-8">
          <div className="space-y-4">
            <h1 className="text-4xl font-bold leading-tight"
              style={{ color: '#2D2D3A', fontFamily: 'var(--font-display)', lineHeight: 1.2 }}>
              Tu consultorio,<br/>
              <span style={{ color: '#7B68EE' }}>siempre contigo.</span>
            </h1>
            <p className="text-base leading-relaxed max-w-xs" style={{ color: '#6B6B80' }}>
              Gestión completa de pacientes para profesionales de la salud.
              Accedé desde cualquier dispositivo, en cualquier momento.
            </p>
          </div>

          {/* Feature pills */}
          <div className="space-y-3">
            {features.map((f) => (
              <div key={f.label} className="flex items-center gap-3">
                <div className="w-2.5 h-2.5 rounded-full flex-shrink-0"
                  style={{ background: f.color, boxShadow: `0 0 8px ${f.color}` }} />
                <span className="text-sm font-medium" style={{ color: '#3D3D50' }}>{f.label}</span>
              </div>
            ))}
          </div>

          {/* Color strip */}
          <div className="flex gap-2 pt-2">
            {['#FFD6D6', '#FFDAC1', '#FFF3B0', '#B5EAD7', '#A8D8EA', '#C7CEEA'].map((c) => (
              <div key={c} className="h-1.5 flex-1 rounded-full" style={{ background: c }} />
            ))}
          </div>
        </div>

        {/* Bottom */}
        <div className="relative z-10">
          <p className="text-xs font-medium" style={{ color: '#9999AA' }}>
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

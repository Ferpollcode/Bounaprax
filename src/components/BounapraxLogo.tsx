import Image from 'next/image'

type LogoVariant = 'authHero' | 'authMobile' | 'sidebarDesktop' | 'sidebarMobile'

const variantStyles: Record<LogoVariant, {
  wrapper: React.CSSProperties
  image: React.CSSProperties
  width: number
  height: number
}> = {
  authHero: {
    wrapper: {
      width: '100%',
      maxWidth: 760,
      minHeight: 222,
      padding: '8px 10px',
      borderRadius: 28,
    },
    image: {
      width: '100%',
      maxWidth: 724,
      height: 'auto',
      maxHeight: 186,
    },
    width: 1448,
    height: 372,
  },
  authMobile: {
    wrapper: {
      width: '100%',
      maxWidth: 448,
      minHeight: 132,
      padding: '4px 6px',
      borderRadius: 22,
    },
    image: {
      width: '100%',
      maxWidth: 424,
      height: 'auto',
      maxHeight: 108,
    },
    width: 848,
    height: 216,
  },
  sidebarDesktop: {
    wrapper: {
      width: '100%',
      minHeight: 170,
      padding: '4px 4px',
      borderRadius: 22,
    },
    image: {
      width: '100%',
      maxWidth: 236,
      height: 'auto',
      maxHeight: 126,
    },
    width: 472,
    height: 252,
  },
  sidebarMobile: {
    wrapper: {
      width: 248,
      minHeight: 74,
      padding: '2px 4px',
      borderRadius: 16,
    },
    image: {
      width: '100%',
      maxWidth: 236,
      height: 'auto',
      maxHeight: 64,
    },
    width: 472,
    height: 128,
  },
}

export function BounapraxLogo({
  variant = 'authHero',
  className = '',
  style = {},
}: {
  variant?: LogoVariant
  className?: string
  style?: React.CSSProperties
}) {
  const current = variantStyles[variant]

  return (
    <div
      className={`relative flex items-center justify-center ${className}`}
      style={{
        background: 'var(--logo-surface)',
        border: '1px solid var(--logo-border)',
        boxShadow: 'var(--logo-shadow)',
        ...current.wrapper,
        ...style,
      }}
    >
      <Image
        src="/logo-clean.png"
        alt="Bounaprax"
        width={current.width}
        height={current.height}
        priority={variant === 'authHero' || variant === 'authMobile'}
        className="block object-contain"
        style={{
          ...current.image,
          filter: 'var(--logo-filter)',
        }}
      />
    </div>
  )
}

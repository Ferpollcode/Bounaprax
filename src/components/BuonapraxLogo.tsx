const LETTERS = 'Buonaprax'.split('')
const PURPLE = '#9333EA'
const ORANGE = '#F97316'

export function BuonapraxLogo({
  className = '',
  style = {},
}: {
  className?: string
  style?: React.CSSProperties
}) {
  return (
    <span className={className} style={{ fontFamily: 'var(--font-display)', ...style }}>
      {LETTERS.map((letter, i) => (
        <span key={i} style={{ color: i % 2 === 0 ? PURPLE : ORANGE }}>
          {letter}
        </span>
      ))}
    </span>
  )
}

// LogoMark.jsx — The Edge brand logo mark
// Usage: <LogoMark size={32} /> or <LogoMark size={48} variant="light" />

export default function LogoMark({ size = 32, variant = 'dark' }) {
  const bg = variant === 'light' ? '#0078D4' : '#1B2A4A'
  const gColor = variant === 'light' ? '#FFFFFF' : '#0078D4'

  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 80 80"
      xmlns="http://www.w3.org/2000/svg"
      aria-label="The Edge logo"
    >
      <rect x="2" y="2" width="76" height="76" rx="18" fill={bg} />
      <text
        x="22" y="52"
        textAnchor="middle"
        fontFamily="Inter, system-ui, sans-serif"
        fontSize="32"
        fontWeight="700"
        fill="#FFFFFF"
      >D</text>
      <rect x="37" y="12" width="3" height="56" rx="1.5" fill="#F97316" />
      <text
        x="58" y="52"
        textAnchor="middle"
        fontFamily="Inter, system-ui, sans-serif"
        fontSize="32"
        fontWeight="700"
        fill={gColor}
      >G</text>
    </svg>
  )
}

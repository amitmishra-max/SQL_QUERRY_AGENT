import logoUrl from '../../../logo.png'

function AppLogo({
  size = 32,
  alt = 'SQL Query Agent logo',
  className = '',
  style = {},
}) {
  return (
    <img
      src={logoUrl}
      alt={alt}
      className={className}
      style={{
        width: size,
        height: size,
        objectFit: 'contain',
        ...style,
      }}
    />
  )
}

export default AppLogo

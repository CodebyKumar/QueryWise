export function Container({ children, maxWidth = 'lg', className = '' }) {
  const widths = {
    sm: 'max-w-2xl',
    md: 'max-w-3xl',
    lg: 'max-w-5xl',
    xl: 'max-w-7xl',
    full: 'max-w-full',
  };

  return (
    <div className={`${widths[maxWidth]} mx-auto px-6 ${className}`}>
      {children}
    </div>
  );
}

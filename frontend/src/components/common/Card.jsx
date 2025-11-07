export function Card({ children, hover = false, padding = 'md', shadow = true, className = '' }) {
  const paddings = {
    sm: 'p-4',
    md: 'p-6',
    lg: 'p-8',
  };

  return (
    <div 
      className={`bg-white border border-gray-200 rounded-lg ${paddings[padding]} ${shadow ? 'shadow-sm' : ''} ${hover ? 'hover:shadow-md hover:border-gray-300 transition-all duration-200' : ''} ${className}`}
    >
      {children}
    </div>
  );
}

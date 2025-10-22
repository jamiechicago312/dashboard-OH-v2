interface BadgeProps {
  children: React.ReactNode;
  variant?: 'community' | 'overdue' | 'needs-response' | 'default';
  className?: string;
}

export default function Badge({ children, variant = 'default', className = '' }: BadgeProps) {
  const variants = {
    community: 'bg-blue-100 text-blue-800',
    overdue: 'bg-red-100 text-red-800',
    'needs-response': 'bg-yellow-100 text-yellow-800',
    default: 'bg-gray-100 text-gray-800',
  };

  return (
    <span className={`
      inline-flex items-center px-2 py-1 rounded-full text-xs font-medium
      ${variants[variant]} ${className}
    `}>
      {children}
    </span>
  );
}
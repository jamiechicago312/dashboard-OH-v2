interface KpiCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  trend?: 'up' | 'down' | 'neutral';
  className?: string;
}

export default function KpiCard({ title, value, subtitle, trend, className = '' }: KpiCardProps) {
  const trendColors = {
    up: 'text-green-600',
    down: 'text-red-600',
    neutral: 'text-gray-600',
  };

  const formatValue = (val: string | number) => {
    if (typeof val === 'number') {
      if (val < 1 && val > 0) {
        return `${Math.round(val * 100)}%`;
      }
      return val.toLocaleString();
    }
    return val;
  };

  return (
    <div className={`bg-white border border-gray-200 rounded-lg p-6 shadow-sm ${className}`}>
      <h3 className="text-sm font-medium text-gray-500 uppercase tracking-wide mb-2">
        {title}
      </h3>
      <div className="flex items-baseline">
        <div className="text-3xl font-bold text-gray-900">
          {formatValue(value)}
        </div>
        {trend && (
          <div className={`ml-2 text-sm ${trendColors[trend]}`}>
            {trend === 'up' && '↗'}
            {trend === 'down' && '↘'}
            {trend === 'neutral' && '→'}
          </div>
        )}
      </div>
      {subtitle && (
        <p className="text-sm text-gray-600 mt-1">
          {subtitle}
        </p>
      )}
    </div>
  );
}
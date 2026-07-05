import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { LucideIcon } from 'lucide-react';

interface KPICardProps {
  label: string;
  value: string | number;
  delta?: number;
  icon: LucideIcon;
  tint: string; // e.g., 'text-emerald-600'
  bg: string;   // e.g., 'bg-emerald-50'
}

const KPICard: React.FC<KPICardProps> = ({
  label,
  value,
  delta,
  icon: Icon,
  tint,
  bg,
}) => {
  return (
    <Card className="hover:shadow-lg transition-shadow">
      <CardContent className="p-6">
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <p className="text-xs text-muted-foreground uppercase tracking-wider">{label}</p>
            <p className="text-2xl font-bold text-foreground mt-2">{value}</p>
            {delta !== undefined && (
              <p className={`text-xs mt-2 ${delta >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                {delta >= 0 ? '↑' : '↓'} {Math.abs(delta)}%
              </p>
            )}
          </div>
          <div className={`p-3 rounded-lg ${bg}`}>
            <Icon className={`w-5 h-5 ${tint}`} />
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default KPICard;

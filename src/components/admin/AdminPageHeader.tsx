import React from 'react';
import { Button } from '@/components/ui/button';
import { LucideIcon } from 'lucide-react';
import { Link } from 'react-router-dom';

interface AdminPageHeaderProps {
  title: string;
  description?: string;
  category?: string;
  actions?: Array<{
    label: string;
    icon: LucideIcon;
    href?: string;
    onClick?: () => void;
    variant?: 'primary' | 'secondary' | 'outline';
  }>;
}

const AdminPageHeader: React.FC<AdminPageHeaderProps> = ({
  title,
  description,
  category,
  actions = [],
}) => {
  return (
    <header className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-3">
      <div>
        {category && (
          <p className="text-xs text-muted-foreground uppercase tracking-wider">{category}</p>
        )}
        <h1 className="font-heading text-2xl md:text-3xl text-foreground mt-1">{title}</h1>
        {description && (
          <p className="text-sm text-muted-foreground mt-1">{description}</p>
        )}
      </div>
      
      {actions.length > 0 && (
        <div className="flex items-center gap-2 flex-wrap">
          {actions.map((action, idx) => {
            const content = (
              <>
                <action.icon className="w-4 h-4 ml-1" />
                {action.label}
              </>
            );

            const buttonClass =
              action.variant === 'primary'
                ? 'bg-gradient-to-r from-pink-500 to-rose-500 hover:from-pink-600 hover:to-rose-600 text-white shadow-lg transition-all duration-300 hover:scale-[1.03] rounded-xl'
                : action.variant === 'secondary'
                ? 'bg-gradient-to-r from-emerald-500 to-green-500 hover:from-emerald-600 hover:to-green-600 text-white shadow-lg transition-all duration-300 hover:scale-[1.03] rounded-xl'
                : 'bg-white border border-pink-200 text-pink-500 hover:bg-pink-50 shadow-sm transition-all duration-300 hover:scale-[1.03] rounded-xl';

            if (action.href) {
              return (
                <Button
                  key={idx}
                  asChild
                  size="sm"
                  className={`px-4 ${buttonClass}`}
                >
                  <Link to={action.href}>{content}</Link>
                </Button>
              );
            }

            return (
              <Button
                key={idx}
                onClick={action.onClick}
                size="sm"
                className={`px-4 ${buttonClass}`}
              >
                {content}
              </Button>
            );
          })}
        </div>
      )}
    </header>
  );
};

export default AdminPageHeader;

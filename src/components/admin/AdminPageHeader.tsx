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
        <div className="flex items-center gap-3 flex-wrap">
          {actions.map((action, idx) => {
            const Icon = action.icon;

            const content = (
              <>
                <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-white/20">
                  <Icon className="w-4 h-4" />
                </span>

                <span>{action.label}</span>
              </>
            );

            const buttonClass =
              action.variant === "primary"
                ? `
                  bg-gradient-to-r from-pink-500 via-pink-500 to-rose-500
                  text-white
                  shadow-md shadow-pink-500/20
                  hover:shadow-lg hover:shadow-pink-500/30
                  hover:-translate-y-0.5
                  rounded-2xl
                `
                : action.variant === "secondary"
                ? `
                  bg-gradient-to-r from-emerald-500 to-green-500
                  text-white
                  shadow-md shadow-emerald-500/20
                  hover:-translate-y-0.5
                  rounded-2xl
                `
                : `
                  bg-background
                  border border-border
                  text-foreground
                  hover:bg-pink-50
                  hover:border-pink-200
                  hover:text-pink-600
                  shadow-sm
                  hover:-translate-y-0.5
                  rounded-2xl
                `;

            const className = `
              h-11
              px-5
              gap-2
              font-medium
              transition-all
              duration-300
              flex
              items-center
              ${buttonClass}
            `;

            if (action.href) {
              return (
                <Button
                  key={idx}
                  asChild
                  className={className}
                >
                  <Link to={action.href}>
                    {content}
                  </Link>
                </Button>
              );
            }

            return (
              <Button
                key={idx}
                onClick={action.onClick}
                className={className}
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

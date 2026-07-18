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
  <header className="bg-card border border-border rounded-3xl p-6 md:p-8 shadow-sm">
    <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-6">
      <div className="space-y-3">
        {category && (
          <div className="inline-flex items-center px-3 py-1 rounded-full bg-pink-500/10 text-pink-600 text-xs font-medium">
            {category}
          </div>
        )}
        <div>
          <h1 className="font-heading text-3xl md:text-4xl font-semibold text-foreground tracking-tight">
            {title}
          </h1>
          {description && (
            <p className="text-sm md:text-base text-muted-foreground mt-2">
              {description}
            </p>
          )}
        </div>
      </div>

      {actions.length > 0 && (
        <div className="flex items-center gap-3 flex-wrap">
          {actions.map((action, idx) => {
            const Icon = action.icon;

            const content = (
              <>
                <span className="flex items-center justify-center w-8 h-8 rounded-xl bg-white/20">
                  <Icon className="w-4 h-4" />
                </span>
                <span>{action.label}</span>
              </>
            );

            const className = `
              h-12
              px-6
              rounded-2xl
              flex
              items-center
              gap-2
              font-medium
              transition-all
              duration-300
              shadow-sm
              hover:-translate-y-1
              ${
                action.variant === "primary"
                  ? "bg-gradient-to-r from-pink-500 to-rose-500 text-white shadow-pink-500/20 hover:shadow-lg"
                  : action.variant === "secondary"
                  ? "bg-gradient-to-r from-emerald-500 to-green-500 text-white"
                  : "bg-background border border-border hover:border-pink-300 hover:text-pink-600"
              }
            `;

            if (action.href) {
              return (
                <Button key={idx} asChild className={className}>
                  <Link to={action.href}>
                    {content}
                  </Link>
                </Button>
              );
            }

            return (
              <Button key={idx} onClick={action.onClick} className={className}>
                {content}
              </Button>
            );
          })}
        </div>
      )}
    </div>
  </header>
);
};

export default AdminPageHeader;

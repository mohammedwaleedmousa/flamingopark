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
    variant?: 'primary' | 'secondary' | 'outline' | 'destructive';
  }>;
}

const AdminPageHeader: React.FC<AdminPageHeaderProps> = ({
  title,
  description,
  category,
  actions = [],
}) => {
  return (
  <header className="border-b border-border pb-6">
    <div className="flex flex-col gap-5 md:flex-row md:items-end md:justify-between">
      <div className="space-y-2">
        {category && (
          <div className="inline-flex items-center border border-primary/20 bg-primary/5 px-2.5 py-1 text-[11px] font-medium text-primary">
            {category}
          </div>
        )}
        <div>
          <h1 className="font-heading text-2xl font-semibold text-foreground md:text-3xl">
            {title}
          </h1>
          {description && (
            <p className="mt-2 max-w-2xl text-sm text-muted-foreground">
              {description}
            </p>
          )}
        </div>
      </div>

      {actions.length > 0 && (
        <div className="flex flex-wrap items-center gap-2">
          {actions.map((action, idx) => {
            const Icon = action.icon;

            const content = (
              <>
                <Icon className="h-4 w-4" />
                <span>{action.label}</span>
              </>
            );

            const className = `
              h-10
              px-4
              flex
              items-center
              gap-2
              font-medium
              transition-colors
              ${
                action.variant === "primary"
                  ? "bg-primary text-primary-foreground hover:bg-primary/90"
                  : action.variant === "secondary"
                  ? "bg-emerald-600 text-white hover:bg-emerald-700"
                  : action.variant === "destructive"
                  ? "bg-red-500 text-white hover:bg-red-600"
                  : "border border-border bg-card text-foreground hover:bg-muted"
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

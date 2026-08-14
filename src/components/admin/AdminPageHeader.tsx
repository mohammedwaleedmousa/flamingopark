import React from "react";
import { Link } from "react-router-dom";
import { LucideIcon } from "lucide-react";

import { cn } from "@/lib/utils";

interface AdminPageHeaderProps {
  title: string;
  description?: string;
  category?: string;
  actions?: Array<{
    label: string;
    icon: LucideIcon;
    href?: string;
    onClick?: () => void;
    variant?: "primary" | "secondary" | "outline" | "destructive";
  }>;
}

const AdminPageHeader: React.FC<AdminPageHeaderProps> = ({ title, description, category, actions = [] }) => {
  return (
    <header dir="rtl" className="mb-5 flex w-full flex-col gap-4 border-b border-[#E5E8ED] pb-4 sm:flex-row sm:items-end sm:justify-between">
      <div className="min-w-0 flex-1 text-right">
        {category && (
          <div className="mb-[7px] flex items-center gap-[7px]">
            <span className="h-[6px] w-[6px] rounded-full bg-[#675CBA]" />
            <span className="text-[8px] font-semibold text-[#8E96A1]">{category}</span>
          </div>
        )}

        <h1 className="font-heading text-[22px] font-bold leading-tight tracking-[-0.45px] text-[#20242D] md:text-[25px]">{title}</h1>

        {description && <p className="mt-[6px] max-w-[680px] text-[10.5px] font-medium leading-[1.75] text-[#8E96A1] md:text-[11px]">{description}</p>}
      </div>

      {actions.length > 0 && (
        <div className="flex w-full flex-wrap items-center gap-[7px] sm:w-auto sm:justify-end">
          {actions.map((action, index) => (
            <AdminHeaderAction key={`${action.label}-${index}`} action={action} />
          ))}
        </div>
      )}
    </header>
  );
};

const AdminHeaderAction = ({ action }: { action: NonNullable<AdminPageHeaderProps["actions"]>[number] }) => {
  const Icon = action.icon;

  const className = cn(
    "inline-flex h-[38px] items-center justify-center gap-[7px] rounded-[10px] border px-[12px] text-[10px] font-semibold transition-colors duration-150",
    action.variant === "primary" && "border-[#675CBA] bg-[#675CBA] text-white hover:border-[#594FAB] hover:bg-[#594FAB]",
    action.variant === "secondary" && "border-[#D9E3F3] bg-[#EFF4FC] text-[#506A91] hover:bg-[#E8F0FA]",
    action.variant === "destructive" && "border-[#F0D5D1] bg-[#FFF3F1] text-[#C15F56] hover:bg-[#FFEDEA]",
    (!action.variant || action.variant === "outline") && "border-[#E2E6EB] bg-white text-[#5E6671] hover:border-[#D6DBE2] hover:bg-[#F8FAFC] hover:text-[#343B44]",
  );

  const content = (
    <>
      <Icon className="h-[12px] w-[12px] shrink-0" strokeWidth={1.8} />
      <span className="whitespace-nowrap">{action.label}</span>
    </>
  );

  if (action.href) {
    return (
      <Link to={action.href} className={className}>
        {content}
      </Link>
    );
  }

  return (
    <button type="button" onClick={action.onClick} className={className}>
      {content}
    </button>
  );
};

export default AdminPageHeader;
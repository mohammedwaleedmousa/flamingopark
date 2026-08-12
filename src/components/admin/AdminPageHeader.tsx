import React from "react";
import { Link } from "react-router-dom";
import { LucideIcon } from "lucide-react";

import { Button } from "@/components/ui/button";
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

const AdminPageHeader: React.FC<AdminPageHeaderProps> = ({
  title,
  description,
  category,
  actions = [],
}) => {
  return (
    <header
      dir="rtl"
      className="
        flex
        min-h-[92px]
        w-full
        flex-col
        justify-center
        gap-4
        border-b
        border-[#ECEDEF]
        bg-white
        px-5
        py-4

        md:min-h-[96px]
        md:flex-row
        md:items-center
        md:justify-between
        md:px-6
        md:py-0
      "
    >
      {/* =====================================================
          PAGE INFO
      ====================================================== */}

      <div className="min-w-0 text-right">
        <div className="flex flex-wrap items-center gap-2">
          <h1
            className="
              font-heading
              text-[22px]
              font-bold
              leading-tight
              tracking-[-0.4px]
              text-[#18181B]

              md:text-[25px]
            "
          >
            {title}
          </h1>

          {category && (
            <span
              className="
                inline-flex
                h-[24px]
                items-center
                rounded-[7px]
                border
                border-[#F2D6E0]
                bg-[#FFF3F7]
                px-2.5
                text-[10px]
                font-semibold
                text-[#D83770]
              "
            >
              {category}
            </span>
          )}
        </div>

        {description && (
          <p
            className="
              mt-1.5
              max-w-[620px]
              text-[12px]
              font-medium
              leading-[1.7]
              text-[#99999F]

              md:text-[13px]
            "
          >
            {description}
          </p>
        )}
      </div>

      {/* =====================================================
          ACTIONS
      ====================================================== */}

      {actions.length > 0 && (
        <div
          className="
            flex
            w-full
            flex-wrap
            items-center
            gap-2

            md:w-auto
            md:justify-end
          "
        >
          {actions.map((action, index) => {
            const Icon = action.icon;

            const content = (
              <>
                <Icon className="h-[15px] w-[15px] shrink-0 stroke-[1.8]" />

                <span className="whitespace-nowrap">
                  {action.label}
                </span>
              </>
            );

            const buttonClassName = cn(
              `
                h-[40px]
                rounded-[10px]
                px-4
                text-[12px]
                font-semibold
                shadow-none
                transition-all
                duration-150
              `,

              action.variant === "primary" &&
                `
                  border
                  border-[#E63B78]
                  bg-[#E63B78]
                  text-white
                  hover:bg-[#D9326D]
                  hover:text-white
                `,

              action.variant === "secondary" &&
                `
                  border
                  border-[#E5E6E8]
                  bg-white
                  text-[#303036]
                  hover:bg-[#F8F8F9]
                  hover:text-[#18181B]
                `,

              action.variant === "destructive" &&
                `
                  border
                  border-[#F4C9CE]
                  bg-[#FFF4F5]
                  text-[#D1434D]
                  hover:bg-[#FDEBED]
                  hover:text-[#C83540]
                `,

              (!action.variant || action.variant === "outline") &&
                `
                  border
                  border-[#E4E5E8]
                  bg-white
                  text-[#44444A]
                  hover:bg-[#F7F7F8]
                  hover:text-[#202024]
                `,
            );

            if (action.href) {
              return (
                <Button
                  key={`${action.label}-${index}`}
                  asChild
                  className={buttonClassName}
                >
                  <Link
                    to={action.href}
                    className="
                      inline-flex
                      items-center
                      gap-2
                    "
                  >
                    {content}
                  </Link>
                </Button>
              );
            }

            return (
              <Button
                key={`${action.label}-${index}`}
                type="button"
                onClick={action.onClick}
                className={cn(
                  buttonClassName,
                  "inline-flex items-center gap-2",
                )}
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
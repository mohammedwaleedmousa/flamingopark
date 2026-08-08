import { ArrowLeft } from "lucide-react";
import { Link } from "react-router-dom";

type StoreSectionHeaderProps = { eyebrow?: string; title: string; description?: string; href?: string; action?: string; align?: "start" | "center" };

export default function StoreSectionHeader({ eyebrow, title, description, href, action = "عرض الكل", align = "start" }: StoreSectionHeaderProps) {
  const centered = align === "center";

  return <div className={`mb-7 flex gap-5 ${centered ? "flex-col items-center text-center md:mb-10" : "items-end justify-between"}`}>
    <div className={centered ? "max-w-xl" : "max-w-xl"}>
      {eyebrow && <p className="mb-2 text-[10px] font-semibold tracking-[0.16em] text-primary">{eyebrow}</p>}
      <h2 className="font-heading text-2xl leading-tight text-foreground sm:text-3xl md:text-4xl">{title}</h2>
      {description && <p className="mt-3 text-sm leading-7 text-muted-foreground">{description}</p>}
    </div>
    {href && <Link to={href} className="group mb-1 inline-flex shrink-0 items-center gap-2 text-sm font-medium text-foreground transition-colors hover:text-primary"><span className="border-b border-current pb-1">{action}</span><ArrowLeft className="h-4 w-4 transition-transform duration-200 group-hover:-translate-x-1" /></Link>}
  </div>;
}

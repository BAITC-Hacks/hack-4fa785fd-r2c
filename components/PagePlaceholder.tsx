import type { ReactNode } from "react";
import { Badge } from "@/components/ui/badge";

interface PagePlaceholderProps {
  eyebrow: string;
  title: string;
  description: string;
  children: ReactNode;
  action?: ReactNode;
}

export function PagePlaceholder({ eyebrow, title, description, children, action }: PagePlaceholderProps) {
  return (
    <div className="space-y-8">
      <header className="flex items-end justify-between gap-8">
        <div className="max-w-3xl space-y-3">
          <div className="flex items-center gap-3"><p className="eyebrow">{eyebrow}</p><Badge variant="outline">Заглушка страницы</Badge></div>
          <h1 className="text-4xl font-semibold tracking-tight">{title}</h1>
          <p className="max-w-2xl text-base leading-7 text-muted-foreground">{description}</p>
        </div>
        {action}
      </header>
      {children}
    </div>
  );
}

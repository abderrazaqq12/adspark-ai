import { ReactNode } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

interface SectionCardProps {
  title: string;
  description?: string;
  icon?: LucideIcon;
  actions?: ReactNode;
  children: ReactNode;
  className?: string;
  noPadding?: boolean;
}

/**
 * SectionCard - Unified card component for content sections
 * Use for grouping related content within pages
 */
export function SectionCard({ 
  title, 
  description, 
  icon: Icon, 
  actions, 
  children, 
  className,
  noPadding = false 
}: SectionCardProps) {
  return (
    <Card className={cn("bg-card border-border", className)}>
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-start gap-3">
            {Icon && (
              <div className="w-8 h-8 rounded-md bg-primary/10 flex items-center justify-center shrink-0">
                <Icon className="w-4 h-4 text-primary" />
              </div>
            )}
            <div>
              <CardTitle className="text-base font-medium text-foreground">{title}</CardTitle>
              {description && (
                <CardDescription className="text-sm text-muted-foreground mt-0.5">
                  {description}
                </CardDescription>
              )}
            </div>
          </div>
          {actions && <div className="flex items-center gap-2 shrink-0">{actions}</div>}
        </div>
      </CardHeader>
      <CardContent className={cn(noPadding && "p-0")}>
        {children}
      </CardContent>
    </Card>
  );
}

interface StatCardProps {
  label: string;
  value: string | number;
  icon?: LucideIcon;
  trend?: { value: string; positive?: boolean };
  className?: string;
}

/**
 * StatCard - Unified statistics card
 * Use for displaying key metrics
 */
export function StatCard({ label, value, icon: Icon, trend, className }: StatCardProps) {
  return (
    <Card className={cn("bg-card border-border", className)}>
      <CardContent className="pt-4 pb-4">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm text-muted-foreground">{label}</p>
            <p className="text-2xl font-semibold text-foreground mt-1">{value}</p>
            {trend && (
              <p className="text-xs text-muted-foreground mt-1">
                {trend.value}
              </p>
            )}
          </div>
          {Icon && (
            <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
              <Icon className="w-5 h-5 text-primary" />
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

interface InfoRowProps {
  label: string;
  value: ReactNode;
  className?: string;
}

/**
 * InfoRow - Simple key-value display row
 * Use within cards for displaying labeled information
 */
export function InfoRow({ label, value, className }: InfoRowProps) {
  return (
    <div className={cn("flex items-center justify-between py-2", className)}>
      <span className="text-sm text-muted-foreground">{label}</span>
      <span className="text-sm font-medium text-foreground">{value}</span>
    </div>
  );
}

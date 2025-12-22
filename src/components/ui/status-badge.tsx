import { CheckCircle2, AlertCircle, XCircle, Clock } from "lucide-react";
import { cn } from "@/lib/utils";

type StatusType = "healthy" | "warning" | "error" | "inactive" | "pending";

interface StatusBadgeProps {
  status: StatusType;
  label?: string;
  showIcon?: boolean;
  size?: "sm" | "md";
}

const statusConfig: Record<StatusType, { icon: typeof CheckCircle2; className: string; defaultLabel: string }> = {
  healthy: {
    icon: CheckCircle2,
    className: "bg-success/10 text-success border-success/20",
    defaultLabel: "Healthy",
  },
  warning: {
    icon: AlertCircle,
    className: "bg-warning/10 text-warning border-warning/20",
    defaultLabel: "Warning",
  },
  error: {
    icon: XCircle,
    className: "bg-destructive/10 text-destructive border-destructive/20",
    defaultLabel: "Error",
  },
  inactive: {
    icon: Clock,
    className: "bg-muted text-muted-foreground border-border",
    defaultLabel: "Inactive",
  },
  pending: {
    icon: Clock,
    className: "bg-primary/10 text-primary border-primary/20",
    defaultLabel: "Pending",
  },
};

/**
 * StatusBadge - Unified status indicator
 * Use for displaying health, state, or status information
 */
export function StatusBadge({ status, label, showIcon = true, size = "sm" }: StatusBadgeProps) {
  const config = statusConfig[status];
  const Icon = config.icon;
  const displayLabel = label || config.defaultLabel;

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border font-medium",
        config.className,
        size === "sm" ? "px-2 py-0.5 text-xs" : "px-3 py-1 text-sm"
      )}
    >
      {showIcon && <Icon className={size === "sm" ? "w-3 h-3" : "w-4 h-4"} />}
      {displayLabel}
    </span>
  );
}

interface StatusDotProps {
  status: StatusType;
  size?: "sm" | "md";
}

/**
 * StatusDot - Simple colored dot indicator
 * Use inline with text for subtle status indication
 */
export function StatusDot({ status, size = "sm" }: StatusDotProps) {
  const colorMap: Record<StatusType, string> = {
    healthy: "bg-success",
    warning: "bg-warning",
    error: "bg-destructive",
    inactive: "bg-muted-foreground",
    pending: "bg-primary",
  };

  return (
    <span
      className={cn(
        "inline-block rounded-full",
        colorMap[status],
        size === "sm" ? "w-2 h-2" : "w-3 h-3"
      )}
    />
  );
}

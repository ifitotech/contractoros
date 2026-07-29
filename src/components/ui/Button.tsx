import { cn } from "@/lib/utils";
import { ButtonHTMLAttributes, forwardRef } from "react";

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "primary" | "secondary" | "danger" | "ghost" | "outline";
  size?: "sm" | "md" | "lg";
  loading?: boolean;
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      className,
      variant = "primary",
      size = "md",
      loading,
      disabled,
      children,
      ...props
    },
    ref
  ) => {
    const variants = {
      primary:
        "bg-brand-600 text-white hover:bg-brand-700 active:bg-brand-800 shadow-sm",
      secondary:
        "bg-slate-100 text-slate-900 hover:bg-slate-200 active:bg-slate-300",
      danger:
        "bg-red-600 text-white hover:bg-red-700 active:bg-red-800",
      ghost: "bg-transparent text-slate-700 hover:bg-slate-100",
      outline:
        "bg-transparent border border-slate-200 text-slate-700 hover:bg-slate-50",
    };

    const sizes = {
      sm: "min-h-9 px-3 py-1.5 text-xs rounded-xl",
      md: "min-h-10 px-4 py-2.5 text-sm rounded-xl",
      lg: "px-6 py-3.5 text-base rounded-xl",
    };

    return (
      <button
        ref={ref}
        disabled={disabled || loading}
        className={cn(
          "inline-flex items-center justify-center gap-2 font-semibold transition active:scale-[.98] focus:outline-none focus:ring-2 focus:ring-brand-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed",
          variants[variant],
          sizes[size],
          className
        )}
        {...props}
      >
        {loading && (
          <svg
            className="animate-spin h-4 w-4"
            viewBox="0 0 24 24"
            fill="none"
          >
            <circle
              className="opacity-25"
              cx="12"
              cy="12"
              r="10"
              stroke="currentColor"
              strokeWidth="4"
            />
            <path
              className="opacity-75"
              fill="currentColor"
              d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
            />
          </svg>
        )}
        {children}
      </button>
    );
  }
);

Button.displayName = "Button";

import { cn } from "@/lib/utils";
import { InputHTMLAttributes, forwardRef } from "react";

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ className, label, error, id, ...props }, ref) => {
    return (
      <div className="w-full">
        {label && (
          <label
            htmlFor={id}
            className="text-xs font-semibold text-slate-500 uppercase tracking-wide block mb-1.5"
          >
            {label}
          </label>
        )}
        <input
          ref={ref}
          id={id}
          className={cn(
            "w-full border border-slate-200 rounded-xl px-4 py-3 text-sm bg-white",
            "focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent",
            "placeholder:text-slate-400 disabled:bg-slate-50 disabled:text-slate-500",
            error && "border-red-300 focus:ring-red-500",
            className
          )}
          {...props}
        />
        {error && <p className="text-xs text-red-600 mt-1">{error}</p>}
      </div>
    );
  }
);

Input.displayName = "Input";

"use client";

import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";
import { CheckCircle, XCircle, AlertTriangle, X } from "lucide-react";

type ToastType = "success" | "error" | "warning";

interface ToastMessage {
  id: number;
  type: ToastType;
  message: string;
}

let toastId = 0;
const listeners: Array<(toasts: ToastMessage[]) => void> = [];
let memory: ToastMessage[] = [];

function emit() {
  listeners.forEach((l) => l([...memory]));
}

export function toast(message: string, type: ToastType = "success") {
  const id = ++toastId;
  memory = [...memory, { id, type, message }];
  emit();
  setTimeout(() => {
    memory = memory.filter((t) => t.id !== id);
    emit();
  }, 4000);
}

export function ToastContainer() {
  const [toasts, setToasts] = useState<ToastMessage[]>([]);

  useEffect(() => {
    listeners.push(setToasts);
    return () => {
      const idx = listeners.indexOf(setToasts);
      if (idx >= 0) listeners.splice(idx, 1);
    };
  }, []);

  if (toasts.length === 0) return null;

  const icons = {
    success: CheckCircle,
    error: XCircle,
    warning: AlertTriangle,
  };

  const colors = {
    success: "bg-green-600",
    error: "bg-red-600",
    warning: "bg-amber-600",
  };

  return (
    <div className="fixed bottom-20 md:bottom-6 left-4 right-4 md:left-auto md:right-6 z-50 flex flex-col gap-2 md:w-80">
      {toasts.map((t) => {
        const Icon = icons[t.type];
        return (
          <div
            key={t.id}
            className={cn(
              "flex items-center gap-3 text-white px-4 py-3 rounded-xl shadow-lg animate-in slide-in-from-bottom",
              colors[t.type]
            )}
          >
            <Icon className="w-5 h-5 flex-shrink-0" />
            <p className="text-sm font-medium flex-1">{t.message}</p>
            <button
              onClick={() => {
                memory = memory.filter((x) => x.id !== t.id);
                emit();
              }}
              className="opacity-70 hover:opacity-100"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        );
      })}
    </div>
  );
}

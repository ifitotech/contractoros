// Purchase Order status machine
// Enforces valid transitions according to business rules

import type { POStatus } from "@/types/database";

/** Valid transitions from each status */
export const PO_TRANSITIONS: Record<POStatus, POStatus[]> = {
  open: ["pending_document", "cancelled"],
  pending_document: [
    "document_uploaded",
    "exception_requested",
    "cancelled",
  ],
  document_uploaded: ["pending_review", "completed", "cancelled"],
  pending_review: ["completed", "pending_document", "cancelled"],
  completed: [], // terminal
  cancelled: [], // terminal
  exception_requested: [
    "exception_approved",
    "exception_rejected",
    "pending_document",
  ],
  exception_approved: ["cancelled"], // does NOT complete the PO
  exception_rejected: ["pending_document", "cancelled"],
};

export function canTransition(from: POStatus, to: POStatus): boolean {
  return PO_TRANSITIONS[from]?.includes(to) ?? false;
}

export function requiresDocument(status: POStatus): boolean {
  return status === "pending_document" || status === "open";
}

export function isTerminal(status: POStatus): boolean {
  return status === "completed" || status === "cancelled";
}

export const PO_STATUS_LABELS: Record<POStatus, string> = {
  open: "Abierto",
  pending_document: "Pendiente de documento",
  document_uploaded: "Documento recibido",
  pending_review: "Pendiente de revisión",
  completed: "Completado",
  cancelled: "Cancelado",
  exception_requested: "Excepción solicitada",
  exception_approved: "Excepción aprobada",
  exception_rejected: "Excepción rechazada",
};

export const PO_STATUS_COLORS: Record<
  POStatus,
  "default" | "success" | "warning" | "danger" | "info"
> = {
  open: "warning",
  pending_document: "danger",
  document_uploaded: "info",
  pending_review: "info",
  completed: "success",
  cancelled: "default",
  exception_requested: "warning",
  exception_approved: "default",
  exception_rejected: "danger",
};

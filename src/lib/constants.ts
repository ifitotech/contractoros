export const DEFAULT_EXPENSE_CATEGORIES = [
  "Materiales",
  "Herramientas",
  "Combustible",
  "Permisos",
  "Subcontratistas",
  "Equipos",
  "Alquiler",
  "Comidas",
  "Transporte",
  "Oficina",
  "Otros",
] as const;

export const PROJECT_STATUSES = [
  { value: "lead", label: "Lead" },
  { value: "quoted", label: "Cotizado" },
  { value: "approved", label: "Aprobado" },
  { value: "active", label: "Activo" },
  { value: "on_hold", label: "En pausa" },
  { value: "completed", label: "Completado" },
  { value: "cancelled", label: "Cancelado" },
] as const;

export const QUOTE_STATUSES = [
  { value: "draft", label: "Borrador" },
  { value: "sent", label: "Enviado" },
  { value: "pending", label: "Pendiente" },
  { value: "approved", label: "Aprobado" },
  { value: "rejected", label: "Rechazado" },
  { value: "expired", label: "Expirado" },
  { value: "cancelled", label: "Cancelado" },
] as const;

export const BUSINESS_TYPES = [
  { value: "electrical", label: "Electricista" },
  { value: "hvac", label: "HVAC" },
  { value: "plumbing", label: "Plomería" },
  { value: "remodeling", label: "Remodelación" },
  { value: "construction", label: "Construcción" },
  { value: "roofing", label: "Roofing" },
  { value: "painting", label: "Pintura" },
  { value: "general", label: "General Contractor" },
  { value: "maintenance", label: "Mantenimiento" },
  { value: "other", label: "Otro" },
] as const;

export const APP_NAME = "ContractorOS";
export const APP_TAGLINE = "El sistema operativo de tu empresa";

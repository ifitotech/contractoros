import { Button } from "@/components/ui/Button";
import { Check } from "lucide-react";

const plans = [
  {
    name: "Free",
    price: "$0",
    description: "Para probar de verdad",
    features: [
      "3 proyectos activos",
      "3 empleados",
      "3 quotes / mes",
      "Dashboard básico",
      "Presupuesto vs gastos",
    ],
    cta: "Plan actual",
    current: true,
  },
  {
    name: "Pro",
    price: "$49",
    period: "/mes",
    description: "El plan principal",
    features: [
      "Proyectos ilimitados",
      "Empleados ilimitados",
      "Quotes ilimitados",
      "Exportación PDF / Excel",
      "Reportes avanzados",
      "Notificaciones",
      "Categorías personalizadas",
    ],
    cta: "Actualizar a Pro",
    highlighted: true,
  },
  {
    name: "Ultra",
    price: "$99",
    period: "/mes",
    description: "Próximamente con IA",
    features: [
      "Todo de Pro",
      "Asistente IA",
      "OCR de invoices",
      "Reportes inteligentes",
      "Integración QuickBooks",
    ],
    cta: "Próximamente",
    disabled: true,
  },
];

export function PlanCards() {
  return (
    <div className="grid md:grid-cols-3 gap-4">
      {plans.map((plan) => (
        <div
          key={plan.name}
          className={`rounded-xl border p-5 flex flex-col ${
            plan.highlighted
              ? "border-brand-500 ring-2 ring-brand-500/20 bg-brand-50/30"
              : "border-slate-200 bg-white"
          }`}
        >
          <div className="mb-4">
            <h3 className="font-bold text-lg">{plan.name}</h3>
            <p className="text-xs text-slate-500 mt-0.5">{plan.description}</p>
            <p className="mt-3">
              <span className="text-2xl font-bold">{plan.price}</span>
              {plan.period && (
                <span className="text-sm text-slate-500">{plan.period}</span>
              )}
            </p>
          </div>
          <ul className="space-y-2 mb-6 flex-1">
            {plan.features.map((f) => (
              <li key={f} className="flex items-start gap-2 text-sm">
                <Check className="w-4 h-4 text-green-600 flex-shrink-0 mt-0.5" />
                <span>{f}</span>
              </li>
            ))}
          </ul>
          <Button
            variant={plan.highlighted ? "primary" : "outline"}
            className="w-full"
            disabled={plan.disabled || plan.current}
          >
            {plan.cta}
          </Button>
        </div>
      ))}
    </div>
  );
}

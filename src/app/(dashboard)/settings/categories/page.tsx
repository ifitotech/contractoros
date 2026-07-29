"use client";

import { useState } from "react";
import Link from "next/link";
import { ArrowLeft, Plus, GripVertical } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { toast } from "@/components/ui/Toast";
import { useI18n } from "@/lib/i18n/provider";

const initial = [
  { id: "1", name: "Materiales", isSystem: true, active: true },
  { id: "2", name: "Herramientas", isSystem: true, active: true },
  { id: "3", name: "Combustible", isSystem: true, active: true },
  { id: "4", name: "Permisos", isSystem: true, active: true },
  { id: "5", name: "Subcontratistas", isSystem: true, active: true },
  { id: "6", name: "Equipos", isSystem: true, active: true },
  { id: "7", name: "Alquiler", isSystem: true, active: true },
  { id: "8", name: "Comidas", isSystem: true, active: true },
  { id: "9", name: "Transporte", isSystem: true, active: true },
  { id: "10", name: "Oficina", isSystem: true, active: true },
  { id: "11", name: "Otros", isSystem: true, active: true },
];

export default function CategoriesPage() {
  const { t } = useI18n();
  const [categories, setCategories] = useState(initial);
  const [newName, setNewName] = useState("");

  function addCategory() {
    if (!newName.trim()) return;
    setCategories((prev) => [
      ...prev,
      { id: String(Date.now()), name: newName.trim(), isSystem: false, active: true },
    ]);
    setNewName("");
    toast(t("save"), "success");
  }

  function toggle(id: string) {
    setCategories((prev) =>
      prev.map((c) => (c.id === id ? { ...c, active: !c.active } : c))
    );
  }

  return (
    <div className="p-4 md:p-8 max-w-lg mx-auto">
      <div className="flex items-center gap-3 mb-6">
        <Link
          href="/settings"
          className="w-9 h-9 rounded-full bg-slate-100 flex items-center justify-center"
        >
          <ArrowLeft className="w-4 h-4" />
        </Link>
        <h1 className="text-lg font-bold">{t("expenseCategories")}</h1>
      </div>

      <div className="flex gap-2 mb-4">
        <input
          type="text"
          value={newName}
          onChange={(e) => setNewName(e.target.value)}
          placeholder="..."
          className="flex-1 border border-slate-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
          onKeyDown={(e) => e.key === "Enter" && addCategory()}
        />
        <Button onClick={addCategory} size="md">
          <Plus className="w-4 h-4" />
        </Button>
      </div>

      <div className="bg-white rounded-xl border border-slate-200 divide-y divide-slate-50">
        {categories.map((cat) => (
          <div key={cat.id} className="flex items-center gap-3 px-4 py-3">
            <GripVertical className="w-4 h-4 text-slate-300" />
            <span className={`flex-1 text-sm ${!cat.active ? "text-slate-400 line-through" : ""}`}>
              {cat.name}
            </span>
            <button
              onClick={() => toggle(cat.id)}
              className={`text-xs font-medium px-2.5 py-1 rounded-lg ${
                cat.active ? "bg-green-50 text-green-700" : "bg-slate-100 text-slate-500"
              }`}
            >
              {cat.active ? t("active") : t("inactive")}
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}

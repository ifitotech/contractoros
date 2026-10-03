"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { Building2, CalendarPlus, FileText, PackagePlus, Plus, Receipt, Send, ShoppingCart, Upload, UserPlus, Users, X } from "lucide-react";
import { useI18n } from "@/lib/i18n/provider";
import { usePermissions } from "@/lib/permissions-context";

type Action = { href: string; label: string; icon: typeof Plus };
const UUID_PATH = "[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}";

export function FloatingCreateButton() {
  const { t } = useI18n();
  const pathname = usePathname();
  const { isManagerOrAbove, isOwner, permissions } = usePermissions();
  const [open, setOpen] = useState(false);
  useEffect(() => setOpen(false), [pathname]);

  // Every possible action, already filtered by what this person may do.
  const can = {
    project: isManagerOrAbove, material: permissions.can_request_material, proposal: isManagerOrAbove,
    expense: isManagerOrAbove || permissions.can_upload_documents, quotes: isManagerOrAbove || permissions.can_create_pricing_request,
    library: permissions.can_manage_library, invoice: isManagerOrAbove, team: isOwner,
  };
  const A = {
    project: { href: "/projects/new", label: t("newProject"), icon: CalendarPlus },
    client: { href: "/clients/new", label: t("newClient"), icon: Users },
    material: { href: "/material", label: t("navMaterial"), icon: ShoppingCart },
    proposal: { href: "/quotes/new", label: t("createProposal"), icon: FileText },
    expense: { href: "/expenses/new", label: t("newExpense"), icon: Receipt },
    quotes: { href: "/pricing/new", label: t("newPricingRequest"), icon: Send },
    supplier: { href: "/suppliers#new-supplier", label: t("addSupplier"), icon: Building2 },
    item: { href: "/materials?add=1", label: t("addItem"), icon: PackagePlus },
    importList: { href: "/materials?import=1", label: t("importCsv"), icon: Upload },
    invoice: { href: "/invoices/new", label: t("newInvoice"), icon: Receipt },
    invite: { href: "/employees/invite", label: t("inviteEmployee"), icon: UserPlus },
  } satisfies Record<string, Action>;
  const pick = (list: [boolean, Action][]) => list.filter(([ok]) => ok).map(([, a]) => a);

  // The button follows the page: what you can start from where you are.
  let actions: Action[];
  let hidden = false;
  const detail = pathname.match(new RegExp(`^/projects/(${UUID_PATH})/?$`));
  const projectLists = pathname.match(new RegExp(`^/projects/(${UUID_PATH})/materials/?$`));
  if (/\/(new|edit|invite)\/?$/.test(pathname) || /^\/(settings|feedback|accounting|reports|more|notifications|supply)/.test(pathname)) hidden = true;
  if (hidden) actions = [];
  else if (detail) actions = pick([[can.material, { href: `/projects/${detail[1]}/materials/new`, label: t("newMaterialRequest"), icon: ShoppingCart }], [can.expense, A.expense]]);
  else if (projectLists) actions = pick([[can.material, { href: `/projects/${projectLists[1]}/materials/new`, label: t("newMaterialRequest"), icon: ShoppingCart }]]);
  else if (pathname.startsWith("/projects")) actions = pick([[can.project, A.project], [can.project, A.client]]);
  else if (pathname.startsWith("/clients")) actions = pick([[can.project, A.client], [can.project, A.project], [can.proposal, A.proposal]]);
  else if (pathname.startsWith("/quotes")) actions = pick([[can.proposal, A.proposal], [can.project, A.client]]);
  else if (pathname.startsWith("/suppliers")) actions = pick([[isManagerOrAbove, A.supplier], [can.quotes, A.quotes], [can.material, A.material]]);
  else if (pathname.startsWith("/pricing")) actions = pick([[can.quotes, A.quotes], [can.material, A.material]]);
  else if (pathname.startsWith("/pos")) actions = pick([[can.material, A.material], [can.quotes, A.quotes]]);
  else if (pathname.startsWith("/materials")) actions = pick([[can.library, A.item], [can.library, A.importList], [can.material, A.material]]);
  else if (pathname.startsWith("/material")) actions = pick([[can.quotes, A.quotes]]);
  else if (pathname.startsWith("/expenses")) actions = pick([[can.expense, A.expense]]);
  else if (pathname.startsWith("/invoices")) actions = pick([[can.invoice, A.invoice], [can.project, A.proposal]]);
  else if (pathname.startsWith("/employees")) actions = pick([[can.team, A.invite]]);
  else actions = pick([[can.project, A.project], [can.material, A.material], [can.proposal, A.proposal], [can.expense, A.expense]]);
  if (actions.length === 0) return null;

  return <div className="fixed bottom-[calc(6rem+env(safe-area-inset-bottom,0px))] right-4 z-50 md:bottom-6 md:right-6">
    {open && <div className="absolute bottom-16 right-0 w-64 rounded-2xl border border-slate-200 bg-white p-2 shadow-2xl shadow-slate-900/15">
      <p className="px-3 py-2 text-[10px] font-bold uppercase tracking-[0.16em] text-slate-400">{t("create")}</p>
      {actions.map((action) => <Link key={action.href} href={action.href} onClick={() => setOpen(false)} className="flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-slate-700 transition hover:bg-brand-50 hover:text-brand-700"><action.icon className="h-4 w-4 text-brand-600" />{action.label}</Link>)}
    </div>}
    <button type="button" onClick={() => setOpen((value) => !value)} aria-label={t("create")} aria-expanded={open} className="flex h-14 w-14 items-center justify-center rounded-full bg-brand-600 text-white shadow-xl shadow-brand-600/30 transition hover:bg-brand-700 active:scale-95">
      {open ? <X className="h-6 w-6" /> : <Plus className="h-6 w-6" />}
    </button>
  </div>;
}

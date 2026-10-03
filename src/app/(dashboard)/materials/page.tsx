import { redirect } from "next/navigation";
import { getActionContext } from "@/lib/action-context";
import { getMaterials, getSavedLists } from "@/lib/services/materials";
import MaterialsClient from "./MaterialsClient";
import { logged, logError } from "@/lib/log";

export const dynamic = "force-dynamic";

export default async function MaterialsPage() {
  const c = await getActionContext().catch(logged("/materials", null));
  if (!c || !c.perms.can_manage_library) redirect("/dashboard");
  try {
    const [items, lists] = await Promise.all([getMaterials(c.companyId), getSavedLists(c.companyId)]);
    return <MaterialsClient items={items} lists={lists} canViewCosts={c.perms.can_view_costs || c.role === "owner"} />;
  } catch (error) {
    logError("/materials", error);
    return <MaterialsClient items={[]} lists={[]} error />;
  }
}

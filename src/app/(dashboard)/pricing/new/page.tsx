import { redirect } from "next/navigation";
import { getActionContext } from "@/lib/action-context";
import { getProjects } from "@/lib/services/projects";
import { getConvertibleMaterialRequests } from "@/lib/services/pricing-requests";
import NewPricingForm from "./NewPricingForm";
import { logged } from "@/lib/log";

export const dynamic = "force-dynamic";
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export default async function NewPricingPage({ searchParams }: { searchParams: Promise<{ from?: string }> }) {
  const { from } = await searchParams;
  const c = await getActionContext().catch(logged("/pricing/new", null));
  if (!c || !c.perms.can_create_pricing_request) redirect("/dashboard");
  const isReviewer = c.role === "owner" || c.role === "manager";
  const [projects, requests] = await Promise.all([
    getProjects(c.companyId).catch(logged("/pricing/new", [])),
    // Only owners/managers see other people's Material Requests (RLS); others start from pasted lines.
    isReviewer ? getConvertibleMaterialRequests(c.companyId).catch(logged("/pricing/new", [])) : Promise.resolve([]),
  ]);
  return <NewPricingForm projects={projects.map((p) => ({ id: p.id, name: p.name }))} requests={requests} initialFrom={from && UUID.test(from) ? from : ""} />;
}

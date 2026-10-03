import { getCurrentMember } from "@/lib/auth";
import { getInvoices } from "@/lib/services/invoices";
import { getCompanyToday } from "@/lib/services/companies";
import { effectiveInvoiceStatus } from "@/lib/invoice-status";
import { readProjectFilter } from "@/lib/project-filter";
import { ProjectFilter } from "@/components/shared/ProjectFilter";
import InvoicesClient from "./InvoicesClient";
import { logError } from "@/lib/log";

export const dynamic = "force-dynamic";

export default async function InvoicesPage({ searchParams }: { searchParams: Promise<{ projectId?: string }> }) {
  const { projectId } = await searchParams;
  try {
    const member = await getCurrentMember();
    if (!member?.company_id) throw new Error("no_company");
    const companyId = member.company_id as string;
    const project = await readProjectFilter(companyId, projectId);
    const today = await getCompanyToday(companyId);
    return <>
      {project && <ProjectFilter name={project.name} clearHref="/invoices" />}
      <InvoicesClient invoices={(await getInvoices(companyId, project?.id)).map((i: { status: string; due_date?: string | null; total: number; amount_paid?: number }) => ({ ...i, status: effectiveInvoiceStatus(i.status, i.due_date, Number(i.total), Number(i.amount_paid ?? 0), today) })) as never} />
    </>;
  } catch (error) {
    logError("/invoices", error);
    return <InvoicesClient invoices={[]} error />;
  }
}

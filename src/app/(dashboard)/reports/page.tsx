import { getCurrentMember } from "@/lib/auth";
import { getDashboardMetrics } from "@/lib/services/dashboard";
import { getProjects } from "@/lib/services/projects";
import { getQuotes } from "@/lib/services/quotes";
import { getInvoices } from "@/lib/services/invoices";
import { getExpenses } from "@/lib/services/expenses";
import ReportsClient from "./ReportsClient";

export default async function ReportsPage() { try { const member = await getCurrentMember(); if (member?.company_id) { const companyId = member.company_id as string; const [metrics, projects, quotes, invoices, expenses] = await Promise.all([getDashboardMetrics(companyId), getProjects(companyId), getQuotes(companyId), getInvoices(companyId), getExpenses(companyId)]); return <ReportsClient metrics={metrics} projects={projects} quotes={quotes} invoices={invoices} expenses={expenses} />; } } catch {} return <ReportsClient demo />; }

import { redirect } from "next/navigation";
import { getActionContext } from "@/lib/action-context";
import { searchEverything } from "@/lib/services/search";
import SearchClient from "./SearchClient";
import { logged } from "@/lib/log";

export const dynamic = "force-dynamic";

export default async function SearchPage({ searchParams }: { searchParams: Promise<{ q?: string }> }) {
  const { q = "" } = await searchParams;
  const c = await getActionContext().catch(logged("/search", null));
  if (!c) redirect("/dashboard");
  const hits = await searchEverything(c, q).catch(logged("/search", []));
  return <SearchClient query={q.slice(0, 60)} hits={hits} />;
}

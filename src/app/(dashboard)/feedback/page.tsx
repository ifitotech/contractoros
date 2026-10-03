import { redirect } from "next/navigation";
import { getActionContext } from "@/lib/action-context";
import { createClient } from "@/lib/supabase/server";
import FeedbackClient from "./FeedbackClient";
import { logged } from "@/lib/log";

export const dynamic = "force-dynamic";

export default async function FeedbackPage({ searchParams }: { searchParams: Promise<{ from?: string }> }) {
  const c = await getActionContext().catch(logged("/feedback", null));
  if (!c) redirect("/dashboard");
  const { from } = await searchParams;
  const supabase = await createClient();
  const { data } = await supabase.from("feedback").select("id, message, page, created_at").eq("user_id", c.userId).order("created_at", { ascending: false }).limit(10);
  return <FeedbackClient from={typeof from === "string" ? from.slice(0, 200) : ""} previous={data ?? []} />;
}

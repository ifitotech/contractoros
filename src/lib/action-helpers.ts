import { getCurrentMember, requireAuth } from "@/lib/auth";

/** Server actions never return raw messages (they would arrive in one language, often English from the database);
 *  the client translates the code. */
export function errCodeOf(err: unknown): string {
  const m = err instanceof Error ? err.message : "";
  if (m.includes("NEXT_REDIRECT")) throw err;
  if (m === "no_company" || m.includes("Unauthorized")) return "errNoCompany";
  return "errGeneric";
}

/** Who is acting: user, company and role. Throws "no_company" when the user has none. */
export async function getContext() {
  const user = await requireAuth();
  const member = await getCurrentMember();
  if (!member?.company_id) throw new Error("no_company");
  return { userId: user.id, companyId: member.company_id as string, role: member.role as string };
}

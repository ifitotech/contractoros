import { getCurrentMember } from "@/lib/auth";
import { getPurchaseOrders } from "@/lib/services/purchase-orders";
import POsClient from "./POsClient";

export default async function POsPage() {
  try { const member = await getCurrentMember(); if (member?.company_id) return <POsClient orders={await getPurchaseOrders(member.company_id as string)} />; } catch {}
  return <POsClient demo />;
}

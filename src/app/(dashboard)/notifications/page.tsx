import { getCurrentMember } from "@/lib/auth";
import { getNotifications } from "@/lib/services/notifications";
import NotificationsClient from "./NotificationsClient";

export default async function NotificationsPage() { try { const member = await getCurrentMember(); if (member?.company_id) return <NotificationsClient items={await getNotifications(member.user_id as string, member.company_id as string)} />; } catch {} return <NotificationsClient demo />; }

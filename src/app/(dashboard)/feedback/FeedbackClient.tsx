"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/Button";
import { PageHeader } from "@/components/shared/PageHeader";
import { LocalDateTime } from "@/components/shared/LocalDateTime";
import { useI18n } from "@/lib/i18n/provider";
import { sendFeedbackAction } from "./actions";

export default function FeedbackClient({ from, previous }: { from: string; previous: { id: string; message: string; page: string | null; created_at: string }[] }) {
  const { t, locale } = useI18n();
  const router = useRouter();
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);
  const [note, setNote] = useState<{ ok: boolean; text: string } | null>(null);

  async function send(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setNote(null);
    const r = await sendFeedbackAction(text, from || null).catch(() => ({ errorCode: "errGeneric" } as { errorCode: string; success?: undefined }));
    setBusy(false);
    if (r.success) { setText(""); setNote({ ok: true, text: t("feedbackThanks") }); router.refresh(); }
    else setNote({ ok: false, text: t((r.errorCode ?? "errGeneric") as never) });
  }

  return <div className="mx-auto max-w-lg p-4 md:p-8">
    <PageHeader title={t("feedbackTitle")} subtitle={t("feedbackHint")} />
    <form onSubmit={send} className="space-y-3 rounded-xl border border-slate-200 bg-white p-4">
      <textarea value={text} onChange={(e) => setText(e.target.value)} rows={5} maxLength={2000} aria-label={t("feedbackTitle")} placeholder={t("feedbackPh")} className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-base outline-none focus:border-brand-500" />
      {note && <p role={note.ok ? "status" : "alert"} className={`text-sm ${note.ok ? "text-green-700" : "text-red-600"}`}>{note.text}</p>}
      <Button type="submit" className="w-full" loading={busy} disabled={!text.trim()}>{t("feedbackSend")}</Button>
    </form>
    {previous.length > 0 && <section className="mt-6"><h2 className="mb-2 text-sm font-semibold text-slate-500">{t("feedbackMine")}</h2>
      <ul className="space-y-2">{previous.map((f) => <li key={f.id} className="rounded-xl border border-slate-200 bg-white p-3 text-sm"><p className="whitespace-pre-wrap">{f.message}</p><p className="mt-1 text-xs text-slate-400"><LocalDateTime value={f.created_at} />{f.page ? ` · ${f.page}` : ""}</p></li>)}</ul></section>}
  </div>;
}

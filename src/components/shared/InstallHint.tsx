"use client";

import { useEffect, useState } from "react";
import { Download, Share } from "lucide-react";
import { useI18n } from "@/lib/i18n/provider";

type InstallEvent = Event & { prompt: () => Promise<void> };

/** Offers to install the app: a button where the browser allows it (Android, desktop), and the steps on iPhone/iPad. Hidden once installed. */
export function InstallHint() {
  const { t } = useI18n();
  const [event, setEvent] = useState<InstallEvent | null>(null);
  const [ios, setIos] = useState(false);
  const [installed, setInstalled] = useState(true);

  useEffect(() => {
    const standalone = window.matchMedia("(display-mode: standalone)").matches || (navigator as Navigator & { standalone?: boolean }).standalone === true;
    setInstalled(standalone);
    setIos(/iphone|ipad|ipod/i.test(navigator.userAgent) || (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1));
    const onPrompt = (e: Event) => { e.preventDefault(); setEvent(e as InstallEvent); };
    const onInstalled = () => setInstalled(true);
    window.addEventListener("beforeinstallprompt", onPrompt);
    window.addEventListener("appinstalled", onInstalled);
    return () => { window.removeEventListener("beforeinstallprompt", onPrompt); window.removeEventListener("appinstalled", onInstalled); };
  }, []);

  if (installed || (!event && !ios)) return null;
  return <section aria-label={t("installTitle")} className="mb-5 rounded-xl border border-brand-200 bg-brand-50 p-4 text-sm">
    <p className="font-semibold">{t("installTitle")}</p>
    {event ? <>
      <p className="mt-1 text-slate-600">{t("installHint")}</p>
      <button type="button" onClick={async () => { await event.prompt(); setEvent(null); }} className="mt-3 inline-flex min-h-11 items-center gap-2 rounded-xl bg-brand-600 px-4 font-semibold text-white"><Download className="h-4 w-4" />{t("installButton")}</button>
    </> : <p className="mt-1 flex flex-wrap items-center gap-1 text-slate-600">{t("installIos")} <Share className="inline h-4 w-4" /></p>}
  </section>;
}

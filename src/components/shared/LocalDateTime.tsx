"use client";

import { useEffect, useState } from "react";
import { useI18n } from "@/lib/i18n/provider";

/**
 * A date and time in the viewer's own locale and time zone. The server cannot know them, so it renders the UTC date
 * and the browser replaces it after loading (this avoids a mismatch between the two renders).
 */
export function LocalDateTime({ value }: { value: string }) {
  const { locale } = useI18n();
  const [text, setText] = useState(() => value.slice(0, 10));
  useEffect(() => { setText(new Date(value).toLocaleString(locale)); }, [value, locale]);
  return <time dateTime={value}>{text}</time>;
}

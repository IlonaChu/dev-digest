/* Route error boundary — catches render errors below the root layout, so the intl
   provider is still mounted. Data errors stay inline (each page's ErrorState). */
"use client";

import { useEffect } from "react";
import { useTranslations } from "next-intl";
import { ErrorState } from "@devdigest/ui";

export default function RouteError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  const t = useTranslations("common");
  useEffect(() => {
    console.error(error);
  }, [error]);
  return <ErrorState fullScreen title={t("routeError.title")} body={t("routeError.body")} onRetry={reset} />;
}

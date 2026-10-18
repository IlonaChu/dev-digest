"use client";

import React from "react";
import { useTranslations } from "next-intl";
import { Badge } from "@devdigest/ui";
import type { SkillType } from "@devdigest/shared";
import { TYPE_COLOR } from "./constants";

/** Mono type pill (rubric / convention / security / custom) used on every skill surface. */
export function SkillTypeBadge({ type }: { type: SkillType }) {
  const t = useTranslations("skills");
  const color = TYPE_COLOR[type];
  return (
    <Badge color={color} bg={`color-mix(in srgb, ${color} 14%, transparent)`} mono>
      {t(`type.${type}`)}
    </Badge>
  );
}

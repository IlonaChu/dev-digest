/* Delete a skill after a confirm. Shared by the skill cards (sidebar, grid) and the
   editor header so the confirm text and the redirect live in one place. */
"use client";

import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import type { Skill } from "@devdigest/shared";
import { useDeleteSkill } from "@/lib/hooks/skills";

export function useDeleteSkillAction({
  openId,
  onDeleted,
}: {
  /** Id of the skill open in the editor; deleting it sends the user back to /skills. */
  openId?: string;
  onDeleted?: (id: string) => void;
} = {}) {
  const t = useTranslations("skills");
  const router = useRouter();
  const del = useDeleteSkill();

  const remove = (skill: Pick<Skill, "id" | "name">) => {
    if (!window.confirm(t("editor.deleteConfirm", { name: skill.name }))) return;
    del.mutate(skill.id, {
      onSuccess: () => {
        onDeleted?.(skill.id);
        if (skill.id === openId) router.push("/skills");
      },
    });
  };

  return { remove, isPending: del.isPending };
}

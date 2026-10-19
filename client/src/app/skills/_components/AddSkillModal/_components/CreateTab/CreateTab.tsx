/* CreateTab — write a skill from scratch: name, description, type, Markdown body.
   Your own text needs no safety check, so it is saved ENABLED and opened in the editor. */
"use client";

import React from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { Button, FormField, SelectInput, TextInput, Textarea } from "@devdigest/ui";
import type { SkillType } from "@devdigest/shared";
import { useCreateSkill } from "@/lib/hooks/skills";
import { useToast } from "@/lib/toast";
import { DEFAULT_SKILL_TYPE, SKILL_TYPES } from "@/app/skills/constants";
import { BODY_ROWS } from "./constants";
import { s } from "./styles";

export function CreateTab({ onDone }: { onDone: () => void }) {
  const t = useTranslations("skills");
  const router = useRouter();
  const toast = useToast();
  const create = useCreateSkill();
  const [name, setName] = React.useState("");
  const [description, setDescription] = React.useState("");
  const [type, setType] = React.useState<SkillType>(DEFAULT_SKILL_TYPE);
  const [body, setBody] = React.useState("");
  const canCreate = name.trim() !== "" && body.trim() !== "";

  const submit = () =>
    create.mutate(
      { name: name.trim(), description, type, body, enabled: true },
      {
        onSuccess: (skill) => {
          toast.success(t("add.createdToast"));
          onDone();
          router.push(`/skills/${skill.id}?tab=config`);
        },
      },
    );

  return (
    <div>
      <FormField label={t("config.name")}>
        <TextInput value={name} onChange={setName} placeholder={t("config.namePlaceholder")} mono aria-label={t("config.name")} />
      </FormField>
      <FormField label={t("config.description")}>
        <TextInput
          value={description}
          onChange={setDescription}
          placeholder={t("config.descriptionPlaceholder")}
          aria-label={t("config.description")}
        />
      </FormField>
      <FormField label={t("config.type")}>
        <SelectInput
          value={type}
          onChange={(v) => setType(v as SkillType)}
          options={SKILL_TYPES.map((v) => ({ value: v, label: t(`typeLabel.${v}`) }))}
        />
      </FormField>
      <FormField label={t("add.body")}>
        <Textarea value={body} onChange={setBody} placeholder={t("add.bodyPlaceholder")} rows={BODY_ROWS} mono />
      </FormField>
      <Button
        kind="primary"
        size="lg"
        full
        onClick={submit}
        disabled={!canCreate || create.isPending}
        loading={create.isPending}
        style={s.cta}
      >
        {create.isPending ? t("config.saving") : t("add.submit")}
      </Button>
    </div>
  );
}

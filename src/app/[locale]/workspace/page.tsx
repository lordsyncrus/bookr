"use client";
import { use } from "react";
import { useUser } from "@hexclave/next";
import { EditorWorkspace } from "@/components/editor/editor-workspace";
export default function WorkspacePage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  use(params);
  const user = useUser({ or: "redirect" });
  return (
    <EditorWorkspace
      key={user.id}
      userId={user.id}
      displayName={user.displayName || ""}
    />
  );
}

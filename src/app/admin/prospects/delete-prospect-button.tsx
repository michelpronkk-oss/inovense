"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { deleteProspect } from "./actions";

export default function DeleteProspectButton({
  id,
  variant = "default",
}: {
  id: string;
  variant?: "default" | "subtle";
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  function handleDelete() {
    if (!window.confirm("Delete this prospect record for cleanup only? This cannot be undone.")) {
      return;
    }

    startTransition(async () => {
      const result = await deleteProspect(id);
      if (!result.success) {
        window.alert(result.error ?? "Failed to delete prospect.");
        return;
      }
      router.refresh();
    });
  }

  const className =
    variant === "subtle"
      ? "inline-flex h-6 items-center text-[10px] uppercase tracking-[0.08em] text-red-400/65 transition-colors hover:text-red-300 disabled:cursor-wait disabled:opacity-60"
      : "inline-flex h-7 items-center rounded-md border border-red-900/30 px-2.5 text-[10px] uppercase tracking-[0.08em] text-red-400/70 transition-colors hover:border-red-800/45 hover:bg-red-950/20 hover:text-red-300 disabled:cursor-wait disabled:opacity-60";

  return (
    <button
      type="button"
      onClick={handleDelete}
      disabled={isPending}
      className={className}
    >
      {isPending ? "Deleting..." : "Delete cleanup"}
    </button>
  );
}

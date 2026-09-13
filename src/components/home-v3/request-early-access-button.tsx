"use client";

import type { ButtonHTMLAttributes } from "react";
import type { EarlyAccessPlan } from "@/lib/early-access/validation";
import EarlyAccessProvider, { useEarlyAccess, useOptionalEarlyAccess } from "@/components/early-access/early-access-provider";

type Props = Omit<ButtonHTMLAttributes<HTMLButtonElement>, "children" | "onClick"> & {
  plan?: EarlyAccessPlan | null;
};

function Button({ plan, ...props }: Props) {
  const { openEarlyAccess, hasSubmitted } = useEarlyAccess();
  return (
    <button
      {...props}
      type={props.type ?? "button"}
      className={props.className ?? "btn btn-a"}
      onClick={(event) => openEarlyAccess({ plan, trigger: event.currentTarget })}
    >
      {hasSubmitted ? "Request received" : "Request early access"}
    </button>
  );
}

export default function RequestEarlyAccessButton(props: Props) {
  const context = useOptionalEarlyAccess();
  return context ? <Button {...props} /> : <EarlyAccessProvider><Button {...props} /></EarlyAccessProvider>;
}

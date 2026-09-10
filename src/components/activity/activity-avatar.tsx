import Image from "next/image";
import { operatorAvatarPath, OPERATOR_ASSETS } from "@/lib/operator-assets";
import { operatorInitials } from "@/lib/activity/presentation";
import type { OperatorKey } from "@/lib/operators/registry";

export function ActivityAvatar({ operatorKey, size = 22 }: { operatorKey: string | null; size?: number }) {
  const isOperator = Boolean(operatorKey && Object.prototype.hasOwnProperty.call(OPERATOR_ASSETS, operatorKey));
  const avatar = isOperator ? operatorAvatarPath(operatorKey as OperatorKey) : null;

  return (
    <span
      className="activity-row-avatar"
      aria-hidden="true"
      style={{ width: size, height: size, overflow: "hidden", padding: 0 }}
    >
      {avatar ? (
        <Image src={avatar} alt="" width={size} height={size} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
      ) : (
        operatorInitials(operatorKey)
      )}
    </span>
  );
}

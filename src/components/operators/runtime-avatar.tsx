import Image from "next/image";

const operatorImages = {
  revenue: "/operators/revenue-operator.png",
  client_flow: "/operators/client-flow-operator.png",
  operations: "/operators/operations-operator.png",
  support: "/operators/support-operator.png",
} as const;

const operatorNames = {
  revenue: "Revenue Operator",
  client_flow: "Client Flow Operator",
  operations: "Operations Operator",
  support: "Support Operator",
} as const;

export function OperatorRuntimeAvatar({ operatorKey }: { operatorKey: keyof typeof operatorImages }) {
  return <div className="operator-runtime-avatar"><Image src={operatorImages[operatorKey]} alt={`${operatorNames[operatorKey]} profile`} width={56} height={56} priority /></div>;
}

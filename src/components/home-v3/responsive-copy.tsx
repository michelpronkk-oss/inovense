import type { ReactNode } from "react";

type ResponsiveCopyProps = {
  desktop: ReactNode;
  mobile?: ReactNode;
};

/**
 * Keeps one semantic text element in the calling component while allowing the
 * phone copy to be written for a smaller canvas. The inactive span is display:
 * none, so assistive technology reads one version only.
 */
export function ResponsiveCopy({ desktop, mobile }: ResponsiveCopyProps) {
  if (!mobile) return <>{desktop}</>;

  return <>
    <span className="responsive-copy-desktop">{desktop}</span>
    <span className="responsive-copy-mobile">{mobile}</span>
  </>;
}

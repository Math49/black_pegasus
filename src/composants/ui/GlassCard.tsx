import type { ElementType, HTMLAttributes, ReactNode } from "react";
import { cx } from "@/lib/classes";

export type VarianteVerre = "site" | "admin" | "modal" | "fantome";

const CLASSES: Record<VarianteVerre, string> = {
  site: "glass-site",
  admin: "glass-admin",
  modal: "glass-modal",
  fantome: "bp-fantome",
};

/** Panneau de verre (recettes HANDOFF § 2). */
export function GlassCard({
  variante = "site",
  as: Element = "div",
  className,
  children,
  ...reste
}: HTMLAttributes<HTMLElement> & {
  variante?: VarianteVerre;
  as?: ElementType;
  children?: ReactNode;
}) {
  return (
    <Element className={cx(CLASSES[variante], className)} {...reste}>
      {children}
    </Element>
  );
}

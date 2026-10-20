import { cx } from "@/lib/classes";

/** Filet or en dégradé (décoratif). */
export function Rule({ className }: { className?: string }) {
  return <div className={cx("filet-or", className)} aria-hidden="true" />;
}

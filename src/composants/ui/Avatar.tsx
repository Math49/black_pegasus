import { cx } from "@/lib/classes";

/** Avatar Discord, ou initiales sur dégradé neutre. Décoratif : le nom s'affiche à côté. */
export function Avatar({
  nom,
  url,
  taille = 40,
  anneau = false,
  className,
}: {
  nom: string;
  url?: string | null;
  taille?: number;
  anneau?: boolean;
  className?: string;
}) {
  const initiales = nom
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((m) => m[0]!.toUpperCase())
    .join("");
  return (
    <span
      aria-hidden="true"
      className={cx("bp-avatar", anneau && "bp-avatar--anneau", className)}
      style={{ width: taille, height: taille, fontSize: Math.round(taille * 0.36) }}
    >
      {url ? (
        // Avatars servis par le CDN Discord : pas d'optimisation next/image nécessaire.
        // eslint-disable-next-line @next/next/no-img-element
        <img src={url} alt="" width={taille} height={taille} />
      ) : (
        initiales
      )}
    </span>
  );
}

import { useId } from "react";
import { formaterDollars } from "@/domaine/argent";
import { formaterMilliers, type PointCourbe } from "@/domaine/solde";
import { cx } from "@/lib/classes";

// Géométrie de la maquette 12 : viewBox 520 × 170, points de x = 10 à 508, solde le plus
// haut à y = 16,3 et le plus bas à y = 146,1, ligne de base à 150.
const X0 = 10;
const X1 = 508;
const Y_HAUT = 16.3;
const Y_BAS = 146.1;
const BASE = 150;

const NOMS_JOURS: Record<string, string> = {
  "Ouv.": "ouverture",
  Lun: "lundi",
  Mar: "mardi",
  Mer: "mercredi",
  Jeu: "jeudi",
  Ven: "vendredi",
  Sam: "samedi",
  Dim: "dimanche",
};

/** Courbe du solde de la semaine (ouverture puis fin de chaque jour), maquette 12. */
export function CourbeSolde({ points }: { points: readonly PointCourbe[] }) {
  const id = useId();
  const valeurs = points.map((p) => p.solde);
  const min = Math.min(...valeurs);
  const max = Math.max(...valeurs);
  // Les points écoulés occupent toute la largeur, comme la maquette un samedi.
  const pas = (X1 - X0) / Math.max(1, points.length - 1);
  const coord = points.map((p, i) => ({
    x: X0 + i * pas,
    y:
      max === min
        ? (Y_HAUT + Y_BAS) / 2
        : Y_BAS - ((p.solde - min) / (max - min)) * (Y_BAS - Y_HAUT),
  }));
  const trace = coord
    .map((c, i) => `${i ? "L" : "M"}${c.x.toFixed(1)} ${c.y.toFixed(1)}`)
    .join(" ");
  const dernier = coord[coord.length - 1];
  const description = points
    .map((p) => `${NOMS_JOURS[p.libelle] ?? p.libelle} ${formaterDollars(p.solde)}`)
    .join(", ");

  return (
    <figure className="m-0 flex max-w-[540px] flex-[1_1_340px] flex-col gap-1.5">
      <svg
        viewBox="0 0 520 170"
        role="img"
        aria-label={`Évolution du solde cette semaine : ${description}.`}
        className="h-auto w-full overflow-visible"
      >
        <defs>
          <linearGradient id={`${id}-aire`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="var(--bp-gold-2)" stopOpacity=".28" />
            <stop offset="1" stopColor="var(--bp-gold-2)" stopOpacity="0" />
          </linearGradient>
          <linearGradient id={`${id}-ligne`} x1="0" y1="0" x2="1" y2="0">
            <stop offset="0" stopColor="var(--bp-gold-1)" />
            <stop offset=".6" stopColor="var(--bp-gold-2)" />
            <stop offset="1" stopColor="var(--bp-gold-3)" />
          </linearGradient>
        </defs>
        <path d={`M${X0} ${BASE} H510`} stroke="var(--bp-trait-12)" strokeWidth="1" />
        <path
          d={`M${X0} 80 H510`}
          stroke="var(--bp-trait-6)"
          strokeWidth="1"
          strokeDasharray="3 5"
        />
        {coord.length > 1 && (
          <>
            <path
              d={`${trace} L${dernier.x.toFixed(1)} ${BASE} L${X0} ${BASE} Z`}
              fill={`url(#${id}-aire)`}
            />
            <path
              d={trace}
              fill="none"
              stroke={`url(#${id}-ligne)`}
              strokeWidth="2.4"
              strokeLinejoin="round"
              strokeLinecap="round"
            />
          </>
        )}
        {coord.map((c, i) =>
          points[i].courant ? (
            <circle key={i} cx={c.x} cy={c.y} r="5" fill="var(--bp-gold-2)" />
          ) : (
            <circle
              key={i}
              cx={c.x}
              cy={c.y}
              r="3.5"
              fill="var(--bp-black)"
              stroke={i === 0 ? "var(--bp-silver-1)" : "var(--bp-gold-3)"}
              strokeWidth="1.5"
            />
          ),
        )}
        <text x={X0} y={coord[0].y - 9.6} fill="var(--bp-text-muted)" fontSize="11">
          {formaterMilliers(points[0].solde)}
        </text>
        {coord.length > 1 && (
          <text
            x={dernier.x - 8}
            y={Math.max(8, dernier.y - 8.3)}
            fill="var(--bp-gold-text)"
            fontSize="11.5"
            fontWeight="800"
            textAnchor="end"
          >
            {formaterMilliers(points[points.length - 1].solde)}
          </text>
        )}
      </svg>
      <div aria-hidden="true" className="flex justify-between text-[11.5px] text-texte-attenue">
        {points.map((p) => (
          <span key={p.libelle} className={cx(p.courant && "font-extrabold text-or-texte")}>
            {p.libelle}
          </span>
        ))}
      </div>
    </figure>
  );
}

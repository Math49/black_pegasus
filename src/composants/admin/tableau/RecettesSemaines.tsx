import { formaterDollars } from "@/domaine/argent";
import type { RecetteSemaine } from "@/domaine/comptabilite";
import { formaterMilliers, graduation } from "@/domaine/solde";
import { cx } from "@/lib/classes";

/** Barres des recettes des 8 dernières semaines, semaine en cours en or (maquette 11). */
export function RecettesSemaines({ semaines }: { semaines: readonly RecetteSemaine[] }) {
  const axe = graduation(Math.max(...semaines.map((s) => s.recettes)));
  const haut = axe[axe.length - 1];
  const description = semaines
    .map(
      (s) =>
        `${s.libelle} ${formaterDollars(s.recettes)}${s.courante ? " (semaine en cours)" : ""}`,
    )
    .join(", ");

  return (
    <figure
      role="img"
      aria-label={`Recettes hebdomadaires : ${description}.`}
      className="m-0 flex flex-col gap-2"
    >
      <div className="relative flex h-[250px] items-end gap-2.5 pl-10">
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 flex flex-col justify-between"
        >
          {[...axe].reverse().map((v) => (
            <div key={v} className="flex items-center gap-2">
              <span className="w-8 text-right text-[11px] chiffres text-texte-attenue">
                {v === 0 ? "0" : formaterMilliers(v)}
              </span>
              <span
                className={cx(
                  "h-px flex-1",
                  v === 0 ? "bg-[var(--bp-trait-14)]" : "bg-[var(--bp-voile-8)]",
                )}
              />
            </div>
          ))}
        </div>
        {semaines.map((s) => (
          <div
            key={s.libelle}
            aria-hidden="true"
            className="relative flex flex-1 flex-col items-center"
            style={{ height: `${haut ? (s.recettes / haut) * 100 : 0}%` }}
          >
            <span
              className={cx(
                "absolute -top-5 chiffres whitespace-nowrap",
                s.courante
                  ? "text-[11.5px] font-extrabold text-or-texte"
                  : "text-[11px] text-texte-attenue",
              )}
            >
              {formaterMilliers(s.recettes)}
            </span>
            <div className={cx("bp-histo", s.courante && "bp-histo--courante")} />
          </div>
        ))}
      </div>
      <div aria-hidden="true" className="flex gap-2.5 pl-10">
        {semaines.map((s) => (
          <span
            key={s.libelle}
            className={cx(
              "flex-1 text-center text-[11.5px]",
              s.courante ? "font-extrabold text-or-texte" : "text-texte-attenue",
            )}
          >
            {s.libelle}
          </span>
        ))}
      </div>
    </figure>
  );
}

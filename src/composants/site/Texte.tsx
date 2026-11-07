import Link from "next/link";
import { Fragment } from "react";
import { decouperTitre, segmenterTexte, type ContexteTextes } from "@/domaine/textes";
import { lireBlocs, lireEnLigne, type Bloc } from "@/lib/texteRiche";
import { Icon } from "../ui/Icon";

// Rendu des textes éditables : variables remplacées, gras, liens, blocs du règlement.

/** Une ligne : variables ({{telephone}} en or), **gras** et [liens](/…). */
export function TexteEnLigne({ texte, ctx }: { texte: string; ctx: ContexteTextes }) {
  return (
    <>
      {segmenterTexte(texte, ctx).map((s, i) =>
        s.type === "telephone" ? (
          <strong key={i} className="font-bold text-or-texte">
            {s.valeur}
          </strong>
        ) : (
          <Fragment key={i}>
            {lireEnLigne(s.valeur).map((m, j) =>
              m.type === "gras" ? (
                <strong key={j} className="font-bold text-texte">
                  {m.texte}
                </strong>
              ) : m.type === "lien" ? (
                <Link
                  key={j}
                  href={m.href.replace(/^\/(flotte|reglement)(?=[/?#]|$)/, "/location/$1")}
                  className="font-bold text-or-texte hover:text-texte"
                >
                  {m.texte}
                </Link>
              ) : (
                <Fragment key={j}>{m.texte}</Fragment>
              ),
            )}
          </Fragment>
        ),
      )}
    </>
  );
}

/** Titre dont le passage entre astérisques est en or. */
export function TitreAccent({
  titre,
  classeAccent = "font-bold",
}: {
  titre: string;
  classeAccent?: string;
}) {
  return (
    <>
      {decouperTitre(titre).map((p, i) =>
        p.accent ? (
          <span key={i} className={`texte-or ${classeAccent}`}>
            {p.texte}
          </span>
        ) : (
          <Fragment key={i}>{p.texte}</Fragment>
        ),
      )}
    </>
  );
}

function RenduBloc({ bloc, ctx }: { bloc: Bloc; ctx: ContexteTextes }) {
  switch (bloc.type) {
    case "clause":
      return (
        <div className="grid grid-cols-[52px_minmax(0,1fr)] gap-3 text-base leading-[1.75] text-texte-doux">
          <span className="pt-0.5 text-sm font-extrabold text-or-texte">{bloc.numero}</span>
          <p className="m-0">
            <TexteEnLigne texte={bloc.texte} ctx={ctx} />
          </p>
        </div>
      );
    case "encadre":
      return (
        <div className="glass-site flex items-start gap-4 rounded-[18px] border-[var(--bp-or-30)] px-[22px] py-5">
          <Icon nom="information" taille={24} trait={1.5} className="text-or-icone" />
          <span className="text-[15.5px] leading-[1.6] whitespace-pre-line text-texte">
            <TexteEnLigne texte={bloc.texte} ctx={ctx} />
          </span>
        </div>
      );
    case "tableau":
      return (
        <div className="glass-site overflow-x-auto rounded-[18px]">
          <table className="w-full border-collapse text-[15px]">
            <thead>
              <tr>
                {bloc.entetes.map((e, i) => (
                  <th
                    key={i}
                    scope="col"
                    className="border-b border-[var(--bp-trait-10)] px-5 py-3.5 text-left libelle tracking-[0.2em]"
                  >
                    {e}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {bloc.lignes.map((ligne, i) => (
                <tr key={i} className="border-b border-[var(--bp-trait-6)] last:border-b-0">
                  {ligne.map((c, j) => (
                    <td
                      key={j}
                      className={`px-5 py-4 align-top text-texte ${j > 0 ? "font-bold" : ""}`}
                    >
                      <TexteEnLigne texte={c} ctx={ctx} />
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      );
    case "titre":
      return (
        <h3 className="m-0 titre text-[22px] font-semibold">
          <TexteEnLigne texte={bloc.texte} ctx={ctx} />
        </h3>
      );
    case "paragraphe":
      return (
        <p className="m-0 text-base leading-[1.8] text-texte-doux">
          <TexteEnLigne texte={bloc.texte} ctx={ctx} />
        </p>
      );
  }
}

/** Blocs déjà lus (voir lireBlocs). */
export function Blocs({ blocs, ctx }: { blocs: readonly Bloc[]; ctx: ContexteTextes }) {
  return (
    <>
      {blocs.map((b, i) => (
        <RenduBloc key={i} bloc={b} ctx={ctx} />
      ))}
    </>
  );
}

/** Texte multi-blocs (article du règlement…). */
export const TexteRiche = ({ source, ctx }: { source: string; ctx: ContexteTextes }) => (
  <Blocs blocs={lireBlocs(source)} ctx={ctx} />
);

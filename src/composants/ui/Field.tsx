import {
  useId,
  type InputHTMLAttributes,
  type ReactNode,
  type SelectHTMLAttributes,
  type TextareaHTMLAttributes,
} from "react";
import { cx } from "@/lib/classes";
import { Icon, type NomIcone } from "./Icon";

export type VarianteChamp = "site" | "panel";

type Habillage = {
  label: ReactNode;
  variante?: VarianteChamp;
  aide?: ReactNode;
  erreur?: ReactNode;
  className?: string;
};

/** Libellé + contrôle + aide / erreur. Le libellé englobe le contrôle (clic sur le texte). */
function Cadre({
  label,
  variante,
  aide,
  erreur,
  className,
  idAide,
  idErreur,
  children,
}: Habillage & { idAide: string; idErreur: string; children: ReactNode }) {
  return (
    <div className={cx("flex flex-col gap-2", className)}>
      <label className={cx("bp-label-champ", `bp-label-champ--${variante}`)}>
        {label}
        {children}
      </label>
      {aide && !erreur && (
        <span id={idAide} className="bp-aide">
          {aide}
        </span>
      )}
      {erreur && (
        <span id={idErreur} className="bp-erreur" role="alert">
          <Icon nom="alerte" taille={14} />
          {erreur}
        </span>
      )}
    </div>
  );
}

function useDescription(aide: ReactNode, erreur: ReactNode) {
  const id = useId();
  const idAide = `${id}-aide`;
  const idErreur = `${id}-erreur`;
  const decrit = erreur ? idErreur : aide ? idAide : undefined;
  return { idAide, idErreur, decrit };
}

/** Champ texte (`.fld` du panel, `.field` du site), icône facultative à gauche. */
export function Field({
  label,
  variante = "panel",
  aide,
  erreur,
  className,
  icone,
  ...input
}: Habillage & { icone?: NomIcone } & Omit<InputHTMLAttributes<HTMLInputElement>, "className">) {
  const { idAide, idErreur, decrit } = useDescription(aide, erreur);
  return (
    <Cadre {...{ label, variante, aide, erreur, className, idAide, idErreur }}>
      <span className="bp-champ-cadre">
        {icone && <Icon nom={icone} taille={15} />}
        <input
          {...input}
          aria-invalid={erreur ? true : undefined}
          aria-describedby={decrit}
          className={cx("bp-fld", `bp-fld--${variante}`, icone && "bp-fld--avec-icone")}
        />
      </span>
    </Cadre>
  );
}

export function TextArea({
  label,
  variante = "panel",
  aide,
  erreur,
  className,
  ...textarea
}: Habillage & Omit<TextareaHTMLAttributes<HTMLTextAreaElement>, "className">) {
  const { idAide, idErreur, decrit } = useDescription(aide, erreur);
  return (
    <Cadre {...{ label, variante, aide, erreur, className, idAide, idErreur }}>
      <textarea
        {...textarea}
        aria-invalid={erreur ? true : undefined}
        aria-describedby={decrit}
        className={cx("bp-fld", `bp-fld--${variante}`)}
      />
    </Cadre>
  );
}

export type OptionSelect = { valeur: string; libelle: string; desactivee?: boolean };

/** Liste déroulante native, habillée comme un champ. */
export function Select({
  label,
  variante = "panel",
  aide,
  erreur,
  className,
  options,
  ...select
}: Habillage & { options: readonly OptionSelect[] } & Omit<
    SelectHTMLAttributes<HTMLSelectElement>,
    "className"
  >) {
  const { idAide, idErreur, decrit } = useDescription(aide, erreur);
  return (
    <Cadre {...{ label, variante, aide, erreur, className, idAide, idErreur }}>
      <span className="bp-champ-cadre">
        <select
          {...select}
          aria-invalid={erreur ? true : undefined}
          aria-describedby={decrit}
          className={cx("bp-fld", `bp-fld--${variante}`)}
        >
          {options.map((o) => (
            <option key={o.valeur} value={o.valeur} disabled={o.desactivee}>
              {o.libelle}
            </option>
          ))}
        </select>
        <Icon nom="chevronBas" taille={16} className="bp-select-chevron" />
      </span>
    </Cadre>
  );
}

/** Case à cocher native, couleur or. */
export function Checkbox({
  label,
  className,
  ...input
}: { label: ReactNode; className?: string } & Omit<
  InputHTMLAttributes<HTMLInputElement>,
  "type" | "className"
>) {
  return (
    <label className={cx("bp-case", className)}>
      <input type="checkbox" {...input} />
      {label}
    </label>
  );
}

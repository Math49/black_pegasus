"use client";

import { useState } from "react";
import {
  actionEnregistrerReglement,
  actionEnregistrerTextes,
} from "@/app/admin/(panel)/parametres/actions";
import { deplacer } from "@/domaine/parametres";
import { Button, IconButton } from "../../ui/Button";
import { Field, TextArea } from "../../ui/Field";
import { SectionParametres, useEnregistrement } from "./Section";

export type Textes = {
  accroche: { titre: string; texte: string };
  maison: { titre: string; texte: string; points: string[] };
  etapes: { titre: string; texte: string }[];
};
export type Reglement = {
  dateMiseAJour: string | null;
  introduction: string;
  articles: { titre: string; contenu: string }[];
};

const VARIABLES =
  "Variables : {{telephone}}, {{horaires}}, {{toleranceRetardMin}}, {{majorationRetardPourcent}}, {{seuilDefautRestitutionHeures}}, {{forfait:Libellé exact}}.";

export function FormulaireTextes({ initial }: { initial: Textes }) {
  const [t, setT] = useState(initial);
  const [points, setPoints] = useState(initial.maison.points.join("\n"));
  const { enregistrer, enCours, etat } = useEnregistrement(actionEnregistrerTextes);
  const etape = (i: number, cle: "titre" | "texte", v: string) =>
    setT({ ...t, etapes: t.etapes.map((e, j) => (j === i ? { ...e, [cle]: v } : e)) });

  return (
    <SectionParametres
      id="textes"
      titre="Textes du site"
      description={`Accroche de l’accueil, présentation « La maison » et étapes « Comment louer ». Entourez un mot d’astérisques (*mot*) pour l’afficher en or dans un titre. ${VARIABLES}`}
      onEnregistrer={() =>
        enregistrer({
          ...t,
          maison: {
            ...t.maison,
            points: points
              .split("\n")
              .map((p) => p.trim())
              .filter(Boolean),
          },
        })
      }
      enCours={enCours}
      etat={etat}
    >
      <div className="grid grid-cols-2 gap-4 max-md:grid-cols-1">
        <Field
          label="Accroche · titre"
          required
          value={t.accroche.titre}
          onChange={(e) => setT({ ...t, accroche: { ...t.accroche, titre: e.target.value } })}
        />
        <Field
          label="La maison · titre"
          required
          value={t.maison.titre}
          onChange={(e) => setT({ ...t, maison: { ...t.maison, titre: e.target.value } })}
        />
        <TextArea
          label="Accroche · texte"
          rows={4}
          required
          value={t.accroche.texte}
          onChange={(e) => setT({ ...t, accroche: { ...t.accroche, texte: e.target.value } })}
        />
        <TextArea
          label="La maison · texte"
          rows={4}
          required
          value={t.maison.texte}
          onChange={(e) => setT({ ...t, maison: { ...t.maison, texte: e.target.value } })}
        />
      </div>
      <TextArea
        label="La maison · points forts"
        aide="Un point par ligne."
        rows={3}
        value={points}
        onChange={(e) => setPoints(e.target.value)}
      />
      <fieldset className="m-0 grid grid-cols-3 gap-4 border-0 p-0 max-lg:grid-cols-1">
        <legend className="bp-label-champ bp-label-champ--panel mb-2 p-0">Comment louer</legend>
        {t.etapes.map((e, i) => (
          <div
            key={i}
            className="flex flex-col gap-3 rounded-[14px] border border-[var(--bp-trait-8)] bg-[var(--bp-voile-3)] p-4"
          >
            <Field
              label={`Étape ${i + 1} · titre`}
              required
              value={e.titre}
              onChange={(x) => etape(i, "titre", x.target.value)}
            />
            <TextArea
              label={`Étape ${i + 1} · texte`}
              rows={3}
              required
              value={e.texte}
              onChange={(x) => etape(i, "texte", x.target.value)}
            />
          </div>
        ))}
      </fieldset>
    </SectionParametres>
  );
}

export function FormulaireReglement({ initial }: { initial: Reglement }) {
  const [date, setDate] = useState(initial.dateMiseAJour ?? "");
  const [introduction, setIntroduction] = useState(initial.introduction);
  const [articles, setArticles] = useState(
    initial.articles.map((a, i) => ({ ...a, cle: `a${i}` })),
  );
  const { enregistrer, enCours, etat } = useEnregistrement(actionEnregistrerReglement);
  const modifier = (cle: string, champ: "titre" | "contenu", v: string) =>
    setArticles(articles.map((a) => (a.cle === cle ? { ...a, [champ]: v } : a)));

  return (
    <SectionParametres
      id="reglement"
      titre="Règlement des locations"
      description={`La page publique « Règlement » est générée à partir de ces articles, dans cet ordre. Mise en forme : **gras**, « **1.1** » en début de ligne pour une clause, « > » pour un encadré, « | » pour un tableau, « ## » pour un intertitre. ${VARIABLES}`}
      onEnregistrer={() =>
        enregistrer({
          dateMiseAJour: date || null,
          introduction,
          articles: articles.map(({ titre, contenu }) => ({ titre, contenu })),
        })
      }
      enCours={enCours}
      etat={etat}
      libelleBouton="Enregistrer le règlement"
    >
      <div className="grid grid-cols-[220px_minmax(0,1fr)] gap-4 max-md:grid-cols-1">
        <Field
          label="Mise à jour le"
          type="date"
          value={date}
          onChange={(e) => setDate(e.target.value)}
        />
        <TextArea
          label="Introduction"
          rows={2}
          value={introduction}
          onChange={(e) => setIntroduction(e.target.value)}
        />
      </div>
      <ol className="m-0 flex list-none flex-col gap-3 p-0">
        {articles.map((a, i) => (
          <li
            key={a.cle}
            className="flex flex-col gap-3 rounded-[14px] border border-[var(--bp-trait-8)] bg-[var(--bp-voile-3)] p-4"
          >
            <div className="flex items-end gap-2.5">
              <Field
                label={`Article ${i + 1} · titre`}
                required
                className="flex-1"
                value={a.titre}
                onChange={(e) => modifier(a.cle, "titre", e.target.value)}
              />
              <IconButton
                libelle={`Monter l’article ${i + 1}`}
                icone="chevronGauche"
                className="rotate-90"
                disabled={i === 0}
                onClick={() => setArticles(deplacer(articles, i, -1))}
              />
              <IconButton
                libelle={`Descendre l’article ${i + 1}`}
                icone="chevronDroite"
                className="rotate-90"
                disabled={i === articles.length - 1}
                onClick={() => setArticles(deplacer(articles, i, 1))}
              />
              <IconButton
                libelle={`Supprimer l’article ${i + 1}`}
                icone="corbeille"
                variante="danger"
                disabled={articles.length === 1}
                onClick={() => setArticles(articles.filter((x) => x.cle !== a.cle))}
              />
            </div>
            <TextArea
              label={`Article ${i + 1} · contenu`}
              rows={6}
              required
              value={a.contenu}
              onChange={(e) => modifier(a.cle, "contenu", e.target.value)}
            />
          </li>
        ))}
      </ol>
      <Button
        type="button"
        variante="verre"
        taille="panel-petit"
        icone="plus"
        className="self-start"
        onClick={() =>
          setArticles([...articles, { cle: `n${Date.now()}`, titre: "", contenu: "" }])
        }
      >
        Ajouter un article
      </Button>
    </SectionParametres>
  );
}

"use client";

import {
  closestCenter,
  DndContext,
  KeyboardSensor,
  PointerSensor,
  pointerWithin,
  useSensor,
  useSensors,
  type Announcements,
  type CollisionDetection,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  arrayMove,
  rectSortingStrategy,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { useState, useTransition, type ReactNode } from "react";
import {
  actionAjusterStock,
  actionDeplacerCarte,
  actionEnregistrerCategorie,
  actionOrdonnerCartes,
  actionOrdonnerCategories,
  actionSupprimerCarte,
  actionSupprimerCategorie,
} from "@/app/admin/(panel)/cards/actions";
import { formaterDollars } from "@/domaine/argent";
import {
  etatCarte,
  filtrerCatalogue,
  filtresActifs,
  FILTRES_PAR_DEFAUT,
  type FiltresCatalogue,
} from "@/domaine/cards";
import { Button, IconButton } from "@/composants/ui/Button";
import { Field, Select } from "@/composants/ui/Field";
import { GlassCard } from "@/composants/ui/GlassCard";
import { Icon } from "@/composants/ui/Icon";
import { Modal } from "@/composants/ui/Modal";
import { MessageEtat, useEnregistrement } from "@/composants/admin/parametres/Section";
import { cx } from "@/lib/classes";
import type { Resultat } from "@/lib/resultat";
import { FormulaireCarte } from "./FormulaireCarte";

export type CategorieCards = { id: string; nom: string; ordre: number; cartes: number };
export type CarteAdmin = {
  id: string;
  categorieId: string;
  nom: string;
  prix: number;
  stock: number;
  ordre: number;
  visible: boolean;
  photoUrl: string | null;
  categorie: { nom: string };
};

type Etat = { ok: boolean; texte: string } | null;

const trierParOrdre = <T extends { ordre: number; nom: string }>(l: readonly T[]) =>
  [...l].sort((a, b) => a.ordre - b.ordre || a.nom.localeCompare(b.nom, "fr"));

// ── Glisser-déposer : collisions, annonces au lecteur d'écran ──────────────

/** Une catégorie ne se dépose que sur une catégorie ; une carte, sur une carte ou une catégorie. */
const collisions: CollisionDetection = (args) => {
  const type = args.active.data.current?.type;
  if (type === "categorie") {
    return closestCenter({
      ...args,
      droppableContainers: args.droppableContainers.filter(
        (c) => c.data.current?.type === "categorie",
      ),
    });
  }
  const sousPointeur = pointerWithin(args).filter(
    (c) => args.droppableContainers.find((d) => d.id === c.id)?.data.current?.type === "categorie",
  );
  if (sousPointeur.length > 0) return sousPointeur;
  return closestCenter({
    ...args,
    droppableContainers: args.droppableContainers.filter((c) => c.data.current?.type === "carte"),
  });
};

const nomDe = (d: { data: { current?: Record<string, unknown> } } | null | undefined) =>
  String(d?.data.current?.nom ?? "");

const annonces: Announcements = {
  onDragStart: ({ active }) => `${nomDe(active)} saisie.`,
  onDragOver: ({ active, over }) =>
    over ? `${nomDe(active)} au-dessus de ${nomDe(over)}.` : `${nomDe(active)} hors zone.`,
  onDragEnd: ({ active, over }) =>
    over ? `${nomDe(active)} déposée sur ${nomDe(over)}.` : `${nomDe(active)} reposée.`,
  onDragCancel: ({ active }) => `Déplacement de ${nomDe(active)} annulé.`,
};

const instructions = {
  draggable:
    "Pour déplacer, appuyez sur Espace, utilisez les flèches, puis Espace pour déposer ou Échap pour annuler.",
};

// ── Catégories ──────────────────────────────────────────────────────────────

function LigneCategorie({
  categorie,
  active,
  triable,
  onChoisir,
  onModifier,
}: {
  categorie: CategorieCards;
  active: boolean;
  triable: boolean;
  onChoisir: () => void;
  onModifier: () => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging, isOver } =
    useSortable({
      id: categorie.id,
      data: { type: "categorie", nom: categorie.nom },
      disabled: { draggable: !triable, droppable: false },
    });
  return (
    <li
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition: transition }}
      className={cx(
        "flex items-center gap-1 rounded-[12px] border border-transparent",
        active && "border-[var(--bp-trait-18)] bg-[var(--bp-voile-6)]",
        isOver && "border-[var(--bp-or-45)]",
        isDragging && "relative z-10 opacity-80",
      )}
    >
      {triable && (
        <button
          type="button"
          {...attributes}
          {...listeners}
          aria-label={`Déplacer la catégorie ${categorie.nom}`}
          className="flex size-11 flex-none cursor-grab items-center justify-center rounded-[10px] border-0 bg-transparent text-texte-attenue hover:text-texte"
        >
          <Icon nom="poignee" taille={16} />
        </button>
      )}
      <button
        type="button"
        onClick={onChoisir}
        aria-current={active ? "true" : undefined}
        className={cx(
          "flex min-h-11 min-w-0 flex-1 cursor-pointer items-center justify-between gap-2 rounded-[10px] border-0 bg-transparent py-2 text-left font-[inherit] text-texte",
          !triable && "pl-3",
        )}
      >
        <span className="truncate text-sm font-bold">{categorie.nom}</span>
        <span className="flex-none rounded-full bg-[var(--bp-voile-6)] px-2 py-0.5 text-xs chiffres text-texte-doux">
          {categorie.cartes}
        </span>
      </button>
      <IconButton
        icone="crayon"
        taille="tableau"
        libelle={`Renommer ou supprimer la catégorie ${categorie.nom}`}
        onClick={onModifier}
      />
    </li>
  );
}

function ModaleCategorie({ categorie, fermer }: { categorie: CategorieCards; fermer: () => void }) {
  const [nom, setNom] = useState(categorie.nom);
  const avecFermeture =
    <D,>(action: (d: D) => Promise<Resultat<unknown>>) =>
    async (d: D) => {
      const r = await action(d);
      if (r.ok) fermer();
      return r;
    };
  const renommer = useEnregistrement(
    avecFermeture((n: string) => actionEnregistrerCategorie(categorie.id, { nom: n })),
  );
  const supprimer = useEnregistrement(avecFermeture(actionSupprimerCategorie));
  const enCours = renommer.enCours || supprimer.enCours;
  return (
    <Modal ouvert onFermer={fermer} titre={`Catégorie ${categorie.nom}`} largeur={520}>
      <form
        className="flex flex-col gap-4"
        onSubmit={(e) => {
          e.preventDefault();
          renommer.enregistrer(nom);
        }}
      >
        <Field
          label="Nom de la catégorie"
          required
          minLength={2}
          maxLength={100}
          value={nom}
          onChange={(e) => setNom(e.target.value)}
        />
        <p className="m-0 text-xs text-texte-doux">
          {categorie.cartes > 0
            ? `${categorie.cartes} carte${categorie.cartes > 1 ? "s" : ""} : suppression impossible tant qu’elle n’est pas vide.`
            : "Catégorie vide : elle peut être supprimée."}
        </p>
        <MessageEtat etat={renommer.etat ?? supprimer.etat} />
        <div className="flex flex-wrap justify-between gap-3">
          <Button
            variante="danger"
            taille="panel"
            icone="corbeille"
            disabled={categorie.cartes > 0 || enCours}
            onClick={() => supprimer.enregistrer(categorie.id)}
          >
            Supprimer
          </Button>
          <Button type="submit" taille="panel" disabled={enCours || nom.trim() === categorie.nom}>
            Renommer
          </Button>
        </div>
      </form>
    </Modal>
  );
}

function NouvelleCategorie() {
  const [nom, setNom] = useState("");
  const { enregistrer, enCours, etat } = useEnregistrement(async (n: string) => {
    const r = await actionEnregistrerCategorie(null, { nom: n });
    if (r.ok) setNom("");
    return r;
  });
  return (
    <form
      aria-label="Nouvelle catégorie de cartes"
      className="flex flex-col gap-2 border-t border-[var(--bp-trait-8)] pt-4"
      onSubmit={(e) => {
        e.preventDefault();
        enregistrer(nom, "Catégorie ajoutée en fin de liste.");
      }}
    >
      <Field
        label="Nouvelle catégorie"
        required
        minLength={2}
        maxLength={100}
        value={nom}
        onChange={(e) => setNom(e.target.value)}
      />
      <Button
        type="submit"
        variante="verre"
        taille="panel"
        icone="plus"
        disabled={enCours || nom.trim().length < 2}
      >
        Ajouter
      </Button>
      <MessageEtat etat={etat} />
    </form>
  );
}

// ── Cartes ──────────────────────────────────────────────────────────────────

function TuileCarte({
  carte,
  triable,
  avecCategorie,
  enCours,
  onStock,
  onModifier,
  onRetirer,
  extra,
}: {
  carte: CarteAdmin;
  triable: boolean;
  avecCategorie: boolean;
  enCours: boolean;
  onStock: (delta: 1 | -1) => void;
  onModifier: () => void;
  onRetirer: () => void;
  extra?: ReactNode;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: carte.id,
    data: { type: "carte", nom: carte.nom, categorieId: carte.categorieId },
    disabled: !triable,
  });
  const etat = etatCarte(carte.stock);
  return (
    <li
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition: transition }}
      aria-label={carte.nom}
      className={cx(
        "flex min-w-0 flex-col gap-3 rounded-[16px] border border-[var(--bp-trait-8)] bg-[var(--bp-voile-3)] p-3",
        isDragging && "relative z-10 border-[var(--bp-or-45)] opacity-90",
      )}
    >
      <div className="flex items-start gap-3">
        <Image
          src={carte.photoUrl ?? "/images/logos/bp-cards.webp"}
          // Original privé (session du panel) : pas d'optimisation côté serveur.
          unoptimized={carte.photoUrl !== null}
          alt=""
          width={56}
          height={78}
          className="h-[78px] w-14 flex-none rounded-[6px] bg-noir object-cover"
        />
        <div className="flex min-w-0 flex-1 flex-col gap-1">
          <span className="line-clamp-2 text-sm leading-tight font-bold">{carte.nom}</span>
          {avecCategorie && (
            <span className="truncate text-xs text-texte-attenue">{carte.categorie.nom}</span>
          )}
          <span className="text-sm font-extrabold chiffres text-or-texte">
            {formaterDollars(carte.prix)}
          </span>
          {!carte.visible && <span className="bp-tag self-start text-[11px]">Masquée</span>}
          {extra}
        </div>
        <div className="flex flex-none flex-col items-center gap-1">
          {triable && (
            <button
              type="button"
              {...attributes}
              {...listeners}
              aria-label={`Déplacer ${carte.nom}`}
              className="flex size-11 cursor-grab items-center justify-center rounded-[10px] border-0 bg-transparent text-texte-attenue hover:text-texte"
            >
              <Icon nom="poignee" taille={16} />
            </button>
          )}
          <IconButton
            icone="crayon"
            taille="tableau"
            libelle={`Modifier ${carte.nom}`}
            onClick={onModifier}
          />
          <IconButton
            icone="corbeille"
            taille="tableau"
            variante="danger"
            libelle={`Retirer ${carte.nom}`}
            onClick={onRetirer}
          />
        </div>
      </div>
      <div className="flex items-center justify-between gap-2 border-t border-[var(--bp-trait-8)] pt-2">
        <div
          className="flex w-full items-center justify-between gap-1"
          role="group"
          aria-label={`Stock de ${carte.nom}`}
        >
          <IconButton
            icone="moins"
            taille="tableau"
            libelle={`Retirer un exemplaire de ${carte.nom}`}
            disabled={enCours || carte.stock === 0}
            onClick={() => onStock(-1)}
          />
          <span
            className={cx(
              "min-w-[74px] text-center text-xs font-bold chiffres",
              etat.epuisee ? "text-texte-attenue" : "text-texte",
            )}
          >
            {etat.libelle}
          </span>
          <IconButton
            icone="plus"
            taille="tableau"
            libelle={`Ajouter un exemplaire de ${carte.nom}`}
            disabled={enCours}
            onClick={() => onStock(1)}
          />
        </div>
      </div>
    </li>
  );
}

// ── Écran ───────────────────────────────────────────────────────────────────

/**
 * Catalogue Cards à gros volume (REFONTE-ADMIN § 3) : catégories à gauche, cartes de la
 * catégorie choisie à droite, ordre par glisser-déposer (souris ou clavier).
 */
export function GestionCards({
  categories: categoriesServeur,
  cartes: cartesServeur,
}: {
  categories: CategorieCards[];
  cartes: CarteAdmin[];
}) {
  const router = useRouter();
  const [enCours, demarrer] = useTransition();
  const [etat, setEtat] = useState<Etat>(null);

  // État local optimiste, recalé à chaque nouvelle donnée du serveur.
  const [source, setSource] = useState({ categoriesServeur, cartesServeur });
  const [categories, setCategories] = useState(categoriesServeur);
  const [cartes, setCartes] = useState(cartesServeur);
  if (source.categoriesServeur !== categoriesServeur || source.cartesServeur !== cartesServeur) {
    setSource({ categoriesServeur, cartesServeur });
    setCategories(categoriesServeur);
    setCartes(cartesServeur);
  }

  const [choisie, setChoisie] = useState<string | null>(categoriesServeur[0]?.id ?? null);
  const categorie = categories.find((c) => c.id === choisie) ?? categories[0] ?? null;
  const [filtres, setFiltres] = useState<FiltresCatalogue>(FILTRES_PAR_DEFAUT);
  const recherche = filtres.q.trim() !== "";
  const triable = !filtresActifs(filtres);

  const [edition, setEdition] = useState<CarteAdmin | null | undefined>(undefined);
  const [suppression, setSuppression] = useState<CarteAdmin | null>(null);
  const [categorieModifiee, setCategorieModifiee] = useState<CategorieCards | null>(null);

  // Une recherche porte sur tout le catalogue ; sinon, la catégorie choisie.
  const affichees = filtrerCatalogue(
    recherche ? cartes : trierParOrdre(cartes.filter((c) => c.categorieId === categorie?.id)),
    filtres,
  );

  const executer = (action: () => Promise<Resultat<unknown>>, succes?: string) =>
    demarrer(async () => {
      setEtat(null);
      const r = await action();
      if (!r.ok) setEtat({ ok: false, texte: r.erreur });
      else if (succes) setEtat({ ok: true, texte: succes });
      router.refresh();
    });

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  const finGlisser = ({ active, over }: DragEndEvent) => {
    if (!over || active.id === over.id) return;
    const type = active.data.current?.type;
    const cible = over.data.current?.type;
    if (type === "categorie" && cible === "categorie") {
      const ids = categories.map((c) => c.id);
      const nouvel = arrayMove(ids, ids.indexOf(String(active.id)), ids.indexOf(String(over.id)));
      setCategories(nouvel.map((id) => categories.find((c) => c.id === id)!));
      executer(() => actionOrdonnerCategories(nouvel), "Ordre des catégories enregistré.");
    } else if (type === "carte" && cible === "carte" && categorie) {
      const ids = affichees.map((c) => c.id);
      const nouvel = arrayMove(ids, ids.indexOf(String(active.id)), ids.indexOf(String(over.id)));
      setCartes(
        cartes.map((c) => (nouvel.includes(c.id) ? { ...c, ordre: nouvel.indexOf(c.id) + 1 } : c)),
      );
      executer(() => actionOrdonnerCartes(categorie.id, nouvel), "Ordre des cartes enregistré.");
    } else if (type === "carte" && cible === "categorie") {
      const vers = categories.find((c) => c.id === over.id);
      const carte = cartes.find((c) => c.id === active.id);
      if (!vers || !carte || carte.categorieId === vers.id) return;
      setCartes(
        cartes.map((c) =>
          c.id === carte.id
            ? { ...c, categorieId: vers.id, ordre: Number.MAX_SAFE_INTEGER, categorie: vers }
            : c,
        ),
      );
      setCategories(
        categories.map((c) =>
          c.id === vers.id
            ? { ...c, cartes: c.cartes + 1 }
            : c.id === carte.categorieId
              ? { ...c, cartes: c.cartes - 1 }
              : c,
        ),
      );
      executer(
        () => actionDeplacerCarte(carte.id, vers.id),
        `« ${carte.nom} » déplacée dans ${vers.nom}.`,
      );
    }
  };

  const ajusterStock = (carte: CarteAdmin, delta: 1 | -1) => {
    setCartes(cartes.map((c) => (c.id === carte.id ? { ...c, stock: c.stock + delta } : c)));
    executer(() => actionAjusterStock(carte.id, delta));
  };

  const retirer = useEnregistrement(async (id: string) => {
    const r = await actionSupprimerCarte(id);
    if (r.ok) setSuppression(null);
    return r;
  });

  return (
    <DndContext
      // Identifiant fixe : évite un décalage d'hydratation des attributs ARIA de dnd-kit.
      id="catalogue-cartes"
      sensors={sensors}
      collisionDetection={collisions}
      onDragEnd={finGlisser}
      accessibility={{ announcements: annonces, screenReaderInstructions: instructions }}
    >
      <div className="grid grid-cols-[300px_minmax(0,1fr)] items-start gap-5">
        <GlassCard
          as="section"
          variante="admin"
          aria-labelledby="titre-categories-cartes"
          className="sticky top-5 flex max-h-[calc(100dvh-40px)] flex-col gap-4 overflow-y-auto p-4"
        >
          <div className="flex flex-col gap-1 px-1">
            <h2 id="titre-categories-cartes" className="m-0 titre text-lg font-semibold">
              Catégories
            </h2>
            <span className="text-xs text-texte-attenue">
              Glissez une catégorie pour l’ordonner, ou une carte sur une catégorie pour l’y
              déplacer.
            </span>
          </div>
          {categories.length === 0 ? (
            <p className="m-0 text-sm text-texte-doux">Aucune catégorie.</p>
          ) : (
            <SortableContext
              items={categories.map((c) => c.id)}
              strategy={verticalListSortingStrategy}
            >
              <ul
                aria-label="Catégories de cartes"
                className="m-0 flex list-none flex-col gap-1 p-0"
              >
                {categories.map((c) => (
                  <LigneCategorie
                    key={c.id}
                    categorie={c}
                    active={!recherche && c.id === categorie?.id}
                    triable
                    onChoisir={() => {
                      setChoisie(c.id);
                      setFiltres({ ...filtres, q: "" });
                    }}
                    onModifier={() => setCategorieModifiee(c)}
                  />
                ))}
              </ul>
            </SortableContext>
          )}
          <NouvelleCategorie />
        </GlassCard>

        <GlassCard
          as="section"
          variante="admin"
          aria-labelledby="titre-cartes"
          className="flex min-w-0 flex-col gap-5 p-6"
        >
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div className="flex flex-col gap-1">
              <h2 id="titre-cartes" className="m-0 titre text-xl font-semibold">
                {recherche ? `Recherche « ${filtres.q.trim()} »` : (categorie?.nom ?? "Cartes")}
              </h2>
              <span className="text-[13px] text-texte-attenue">
                {affichees.length} carte{affichees.length > 1 ? "s" : ""}
                {recherche ? " dans tout le catalogue" : ""} · {cartes.length} au total
              </span>
            </div>
            <Button
              taille="panel"
              icone="plus"
              disabled={categories.length === 0}
              onClick={() => setEdition(null)}
            >
              Ajouter une carte
            </Button>
          </div>

          <div className="grid grid-cols-[minmax(0,1.6fr)_minmax(0,1fr)_minmax(0,1fr)] items-end gap-3">
            <Field
              label="Rechercher dans tout le catalogue"
              type="search"
              value={filtres.q}
              maxLength={80}
              onChange={(e) => setFiltres({ ...filtres, q: e.target.value })}
            />
            <Select
              label="Visibilité"
              value={filtres.visibilite}
              onChange={(e) =>
                setFiltres({
                  ...filtres,
                  visibilite: e.target.value as FiltresCatalogue["visibilite"],
                })
              }
              options={[
                { valeur: "toutes", libelle: "Toutes" },
                { valeur: "visibles", libelle: "Visibles sur le site" },
                { valeur: "masquees", libelle: "Masquées" },
              ]}
            />
            <Select
              label="Stock"
              value={filtres.stock}
              onChange={(e) =>
                setFiltres({ ...filtres, stock: e.target.value as FiltresCatalogue["stock"] })
              }
              options={[
                { valeur: "tous", libelle: "Tous" },
                { valeur: "enStock", libelle: "En stock" },
                { valeur: "epuisees", libelle: "Épuisées" },
              ]}
            />
          </div>

          {!triable && (
            <p className="m-0 flex items-center gap-2 text-[13px] text-texte-doux">
              <Icon nom="information" taille={16} className="text-argent-1" />
              Le glisser-déposer est désactivé pendant une recherche ou un filtre.
              <button
                type="button"
                className="bp-nav-lien cursor-pointer border-0 bg-transparent font-[inherit]"
                onClick={() => setFiltres(FILTRES_PAR_DEFAUT)}
              >
                Effacer les filtres
              </button>
            </p>
          )}
          <MessageEtat etat={etat} />

          {affichees.length === 0 ? (
            <p className="m-0 text-texte-doux">
              {categories.length === 0
                ? "Créez une catégorie avant d’ajouter une carte."
                : "Aucune carte à afficher."}
            </p>
          ) : (
            <SortableContext items={affichees.map((c) => c.id)} strategy={rectSortingStrategy}>
              <ul
                aria-label="Cartes"
                className="m-0 grid list-none grid-cols-[repeat(auto-fill,minmax(220px,1fr))] gap-3 p-0"
              >
                {affichees.map((c) => (
                  <TuileCarte
                    key={c.id}
                    carte={c}
                    triable={triable}
                    avecCategorie={recherche}
                    enCours={enCours}
                    onStock={(delta) => ajusterStock(c, delta)}
                    onModifier={() => setEdition(c)}
                    onRetirer={() => {
                      retirer.effacer();
                      setSuppression(c);
                    }}
                  />
                ))}
              </ul>
            </SortableContext>
          )}
        </GlassCard>
      </div>

      <Modal
        ouvert={edition !== undefined}
        onFermer={() => setEdition(undefined)}
        titre={edition ? `Modifier ${edition.nom}` : "Ajouter une carte"}
        largeur={720}
      >
        {edition !== undefined && (
          <FormulaireCarte
            key={edition?.id ?? "nouvelle"}
            carte={edition}
            categories={categories}
            categorieParDefaut={categorie?.id}
            fermer={() => setEdition(undefined)}
          />
        )}
      </Modal>
      {categorieModifiee && (
        <ModaleCategorie
          key={categorieModifiee.id}
          categorie={categorieModifiee}
          fermer={() => setCategorieModifiee(null)}
        />
      )}
      <Modal
        ouvert={suppression !== null}
        onFermer={() => {
          if (!retirer.enCours) setSuppression(null);
        }}
        titre="Retirer la carte"
        icone="alerte"
        actions={
          <>
            <Button
              variante="verre"
              taille="panel"
              disabled={retirer.enCours}
              onClick={() => setSuppression(null)}
            >
              Conserver la carte
            </Button>
            <Button
              variante="danger"
              taille="panel"
              icone="corbeille"
              disabled={retirer.enCours}
              onClick={() => suppression && retirer.enregistrer(suppression.id)}
            >
              Retirer la carte
            </Button>
          </>
        }
      >
        <p className="m-0 leading-relaxed">
          « {suppression?.nom} » sera retirée du catalogue et du site. Ses ventes restent lisibles.
        </p>
        <MessageEtat etat={retirer.etat} />
      </Modal>
    </DndContext>
  );
}

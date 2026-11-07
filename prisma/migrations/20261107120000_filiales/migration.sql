-- Filiales du groupe Black Pégasus Compagnie (docs/CONCEPTION-FILIALES.md, phase F-1).
-- Reprise sans perte : le contact de l'agence devient celui de Black Pégasus Location ;
-- les mouvements existants lui sont rattachés (impôts : « Groupe ») ; la numérotation des
-- contrats continue sous le préfixe BPL.

-- Filiales
CREATE TYPE "CodeFiliale" AS ENUM ('BPL', 'BPF', 'BPC');

CREATE TABLE "Filiale" (
    "code" "CodeFiliale" NOT NULL,
    "slug" TEXT NOT NULL,
    "nom" TEXT NOT NULL,
    "accroche" TEXT NOT NULL DEFAULT '',
    "logo" TEXT NOT NULL,
    "telephone" TEXT NOT NULL,
    "horaires" TEXT NOT NULL,
    "ordre" INTEGER NOT NULL DEFAULT 0,
    "visible" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "Filiale_pkey" PRIMARY KEY ("code")
);
CREATE UNIQUE INDEX "Filiale_slug_key" ON "Filiale"("slug");

-- Formation et Cards démarrent masquées (sections du site livrées en F-3 et F-4) ; leur
-- contact reprend celui de l'agence en attendant leurs paramètres.
INSERT INTO "Filiale" ("code", "slug", "nom", "accroche", "logo", "telephone", "horaires", "ordre", "visible")
SELECT f.code::"CodeFiliale", f.slug, f.nom, f.accroche, f.logo, p."telephoneAgence", p."horaires", f.ordre, f.visible
FROM "Parametres" p
CROSS JOIN (VALUES
  ('BPL', 'location', 'Black Pégasus Location', 'Location d’avions, d’hélicoptères et de bateaux', '/images/logos/bp-location.png', 1, true),
  ('BPF', 'formation', 'Black Pégasus Formation', 'Centre de formation au pilotage et à la navigation, agréé par l’État', '/images/logos/bp-formation.webp', 2, false),
  ('BPC', 'cards', 'Black Pégasus Cards', 'Cartes TCG à l’unité', '/images/logos/bp-cards.webp', 3, false)
) AS f(code, slug, nom, accroche, logo, ordre, visible)
WHERE p."id" = 1;

-- Groupe
ALTER TABLE "Parametres" DROP COLUMN "horaires",
DROP COLUMN "telephoneAgence",
ALTER COLUMN "nomEntreprise" SET DEFAULT 'Black Pégasus Compagnie';
UPDATE "Parametres" SET "nomEntreprise" = 'Black Pégasus Compagnie'
WHERE "nomEntreprise" = 'Black Pégasus – American Transports';

-- Nouvelles catégories (utilisables à partir de la migration suivante uniquement)
ALTER TYPE "CategorieMouvement" ADD VALUE 'FORMATION';
ALTER TYPE "CategorieMouvement" ADD VALUE 'VENTE_CARTES';
ALTER TYPE "CategorieMouvement" ADD VALUE 'ACHAT_STOCK';

-- Mouvements : filiale (null = Groupe)
ALTER TABLE "Mouvement" ADD COLUMN "filiale" "CodeFiliale";
UPDATE "Mouvement" SET "filiale" = 'BPL' WHERE "categorie" <> 'IMPOTS';

-- Contrats : n° de licence facultatif ; numérotation BPL dans la continuité de CTR
ALTER TABLE "Contrat" ADD COLUMN "numeroLicence" TEXT;
INSERT INTO "Compteur" ("cle", "valeur")
SELECT 'BPL-' || substring("cle" FROM 5), "valeur" FROM "Compteur" WHERE "cle" LIKE 'CTR-%'
ON CONFLICT ("cle") DO NOTHING;

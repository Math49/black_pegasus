#!/bin/sh
# Restauration d'une sauvegarde (base + fichiers), depuis le service « sauvegarde » :
#   docker compose stop app
#   docker compose run --rm -v black-pegasus_fichiers:/cible/fichiers \
#     --entrypoint /bin/sh sauvegarde /usr/local/bin/restaurer.sh <horodatage>
#   docker compose start app
# Refuse d'écraser une base qui contient déjà des mouvements, sauf avec FORCER=1.

set -eu

HORODATAGE="${1:-}"
DESTINATION="${DESTINATION:-/sauvegardes}"
CIBLE_FICHIERS="${CIBLE_FICHIERS:-/cible/fichiers}"

dire() {
	echo "[$(date -u '+%Y-%m-%d %H:%M:%SZ')] $*"
}

rater() {
	echo "$*" >&2
	exit 1
}

if [ -z "${HORODATAGE}" ]; then
	echo 'usage : restaurer.sh <horodatage>' >&2
	echo '' >&2
	echo 'sauvegardes disponibles :' >&2
	ls -1 "${DESTINATION}" 2>/dev/null | grep '\.dump$' | sed 's/\.dump$//' | sort -u >&2
	exit 2
fi

archive_base="${DESTINATION}/${HORODATAGE}.dump"
archive_fichiers="${DESTINATION}/${HORODATAGE}.fichiers.tar.gz"

[ -f "${archive_base}" ] || rater "introuvable : ${archive_base}"
[ -f "${archive_fichiers}" ] || rater "introuvable : ${archive_fichiers}"

dire "restauration de ${HORODATAGE}"

mouvements=$(psql --tuples-only --no-align --command \
	'SELECT count(*) FROM "Mouvement"' 2>/dev/null || echo 0)

if [ "${mouvements}" != "0" ] && [ "${FORCER:-0}" != "1" ]; then
	rater "la base contient ${mouvements} mouvements — relancer avec FORCER=1 pour les écraser"
fi

dire 'restauration de la base'

pg_restore --clean --if-exists --no-owner --no-privileges \
	--dbname="${PGDATABASE}" "${archive_base}"

dire 'restauration du volume de fichiers'
mkdir -p "${CIBLE_FICHIERS}"

rm -rf "${CIBLE_FICHIERS:?}"/*
tar -xzf "${archive_fichiers}" -C "${CIBLE_FICHIERS}"

restaures=$(psql --tuples-only --no-align --command 'SELECT count(*) FROM "Mouvement"')
dire "base restaurée — ${restaures} mouvements"

# Cohérence : chaque fichier cité par la base (photo, justificatif, PDF de contrat,
# déclaration archivée) doit exister dans le volume.
manquants=0
attendus=0
for cle in $(psql --tuples-only --no-align --command '
	SELECT photo FROM "Vehicule" WHERE photo IS NOT NULL
	UNION SELECT justificatif FROM "Mouvement" WHERE justificatif IS NOT NULL
	UNION SELECT pdf FROM "Contrat" WHERE pdf IS NOT NULL
	UNION SELECT "declarationPdf" FROM "Semaine" WHERE "declarationPdf" IS NOT NULL'); do
	attendus=$((attendus + 1))
	if [ ! -f "${CIBLE_FICHIERS}/${cle}" ]; then
		manquants=$((manquants + 1))
		dire "manquant : ${cle}"
	fi
done

dire "volume restauré — ${attendus} fichiers attendus, ${manquants} manquants"

if [ "${manquants}" != "0" ]; then
	rater 'ÉCART entre la base et le volume — restauration à reprendre'
fi

dire 'restauration cohérente.'

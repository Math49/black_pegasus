"use client";

import Link from "next/link";
import { useEffect, useId, useRef, useState } from "react";
import type { Notification } from "@/domaine/notifications";
import { Icon, type NomIcone } from "../ui/Icon";

const ICONES: Record<Notification["type"], NomIcone> = {
  retard: "alerte",
  semaine: "cadenasOuvert",
  justificatif: "trombone",
  formation: "contrat",
};

/** Cloche de l'en-tête (CONCEPTION § 9.3) : liste déroulante des alertes. */
export function Cloche({ notifications }: { notifications: Notification[] }) {
  const [ouvert, setOuvert] = useState(false);
  const zone = useRef<HTMLDivElement>(null);
  const id = useId();
  const n = notifications.length;

  useEffect(() => {
    if (!ouvert) return;
    const fermer = (e: MouseEvent | KeyboardEvent) => {
      if (
        e instanceof KeyboardEvent ? e.key === "Escape" : !zone.current?.contains(e.target as Node)
      )
        setOuvert(false);
    };
    document.addEventListener("mousedown", fermer);
    document.addEventListener("keydown", fermer);
    return () => {
      document.removeEventListener("mousedown", fermer);
      document.removeEventListener("keydown", fermer);
    };
  }, [ouvert]);

  return (
    <div ref={zone} className="relative">
      <button
        type="button"
        className="bp-ibtn bp-ibtn--verre bp-ibtn--panel relative"
        aria-label={
          n ? `Notifications, ${n} alerte${n > 1 ? "s" : ""}` : "Notifications, aucune alerte"
        }
        aria-expanded={ouvert}
        aria-controls={id}
        onClick={() => setOuvert(!ouvert)}
      >
        <Icon nom="cloche" taille={18} />
        {n > 0 && (
          <span
            aria-hidden="true"
            className="absolute top-2.5 right-[11px] size-2 rounded-full bg-alerte shadow-[0_0_0_2px_var(--bp-surface)]"
          />
        )}
      </button>
      {ouvert && (
        <div
          id={id}
          className="glass-modal absolute top-[calc(100%+10px)] right-0 z-40 flex w-[360px] flex-col gap-1 rounded-[18px] p-3"
        >
          <span className="px-2 pt-1 pb-2 libelle text-[10.5px] tracking-[0.2em]">
            Notifications
          </span>
          {n === 0 ? (
            <p className="m-0 px-2 pb-2 text-sm text-texte-doux">Aucune alerte en cours.</p>
          ) : (
            <ul className="m-0 flex list-none flex-col gap-1 p-0">
              {notifications.map((notif) => (
                <li key={notif.cle}>
                  <Link
                    href={notif.href}
                    onClick={() => setOuvert(false)}
                    className="flex min-h-11 items-start gap-3 rounded-controle px-2 py-2.5 text-[13.5px] leading-[1.45] text-texte hover:bg-[var(--bp-voile-6)]"
                  >
                    <Icon
                      nom={ICONES[notif.type]}
                      taille={16}
                      className={
                        notif.type === "retard"
                          ? "mt-0.5 text-alerte-texte"
                          : "mt-0.5 text-argent-1"
                      }
                    />
                    {notif.message}
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}

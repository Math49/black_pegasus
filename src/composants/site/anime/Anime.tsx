"use client";

import {
  animate,
  motion,
  MotionConfig,
  useInView,
  useMotionValue,
  useMotionValueEvent,
  useReducedMotion,
  useScroll,
  useSpring,
  useTransform,
  type MotionValue,
} from "motion/react";
import { useEffect, useRef, useState, type ReactNode } from "react";
import { cx } from "@/lib/classes";

/** Courbe commune du site : départ vif, arrivée douce. */
export const COURBE = [0.22, 1, 0.36, 1] as const;

/** Respecte « réduire les animations » du système pour tout le site public. */
export function FournisseurAnimations({ children }: { children: ReactNode }) {
  return <MotionConfig reducedMotion="user">{children}</MotionConfig>;
}

/** Barre de progression de lecture, en haut de l'écran. */
export function ProgressionLecture() {
  const { scrollYProgress } = useScroll();
  const echelle = useSpring(scrollYProgress, { stiffness: 140, damping: 30, mass: 0.3 });
  return (
    <motion.div
      aria-hidden="true"
      className="fixed inset-x-0 top-0 z-50 h-[2px] origin-left fond-or"
      style={{ scaleX: echelle }}
    />
  );
}

/** Fondu + glissement à l'entrée dans l'écran. */
export function Apparition({
  children,
  className,
  delai = 0,
  decalage = 28,
  as = "div",
}: {
  children: ReactNode;
  className?: string;
  delai?: number;
  decalage?: number;
  as?: "div" | "li" | "section" | "article" | "span";
}) {
  const Composant = motion[as];
  const reduit = useReducedMotion();
  return (
    <Composant
      className={className}
      initial={reduit ? false : { opacity: 0, y: decalage }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "0px 0px -12% 0px" }}
      transition={{ duration: 0.9, ease: COURBE, delay: delai }}
    >
      {children}
    </Composant>
  );
}

const variantesCascade = {
  cache: {},
  visible: { transition: { staggerChildren: 0.11, delayChildren: 0.05 } },
};
const variantesElement = {
  cache: { opacity: 0, y: 32 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.85, ease: COURBE } },
};

/** Conteneur dont les enfants `ElementCascade` apparaissent l'un après l'autre. */
export function Cascade({
  children,
  className,
  as = "div",
  immediat = false,
}: {
  children: ReactNode;
  className?: string;
  as?: "div" | "ol" | "ul";
  /** Joue l'animation au chargement (haut de page) plutôt qu'au défilement. */
  immediat?: boolean;
}) {
  const Composant = motion[as];
  const reduit = useReducedMotion();
  // Haut de page : animation CSS, visible dès le rendu serveur (sans attendre l'hydratation).
  if (immediat) {
    const Element = as;
    return <Element className={cx("bp-entree", className)}>{children}</Element>;
  }
  return (
    <Composant
      className={className}
      variants={variantesCascade}
      initial={reduit ? false : "cache"}
      whileInView="visible"
      viewport={{ once: true, margin: "0px 0px -10% 0px" }}
    >
      {children}
    </Composant>
  );
}

export function ElementCascade({
  children,
  className,
  as = "div",
  filiale,
}: {
  children: ReactNode;
  className?: string;
  as?: "div" | "li" | "span" | "p";
  /** Applique l'accent d'une filiale (attribut data-filiale). */
  filiale?: string;
}) {
  const Composant = motion[as];
  return (
    <Composant className={className} variants={variantesElement} data-filiale={filiale}>
      {children}
    </Composant>
  );
}

/** Titre révélé par un masque qui remonte (animation CSS : visible sans JavaScript). */
export function Revelation({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <span className={cx("bp-revelation block overflow-hidden pb-[0.08em]", className)}>
      <span className="block">{children}</span>
    </span>
  );
}

/** Décale verticalement son contenu au défilement (fonds, visuels). */
export function Parallaxe({
  children,
  className,
  amplitude = 120,
}: {
  children: ReactNode;
  className?: string;
  amplitude?: number;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const reduit = useReducedMotion();
  const { scrollYProgress } = useScroll({ target: ref, offset: ["start end", "end start"] });
  const y = useTransform(scrollYProgress, [0, 1], [-amplitude / 2, amplitude / 2]);
  return (
    <div ref={ref} className={cx("absolute inset-0 overflow-hidden", className)}>
      <motion.div
        className="absolute inset-x-0"
        style={{
          y: reduit ? 0 : y,
          top: -amplitude / 2,
          bottom: -amplitude / 2,
        }}
      >
        {children}
      </motion.div>
    </div>
  );
}

/** Carte qui s'incline vers le pointeur (souris uniquement). */
export function Inclinable({
  children,
  className,
  intensite = 8,
}: {
  children: ReactNode;
  className?: string;
  intensite?: number;
}) {
  const reduit = useReducedMotion();
  const x = useMotionValue(0.5);
  const y = useMotionValue(0.5);
  const ressort = { stiffness: 180, damping: 20 };
  const rotateX = useSpring(useTransform(y, [0, 1], [intensite, -intensite]), ressort);
  const rotateY = useSpring(useTransform(x, [0, 1], [-intensite, intensite]), ressort);
  const lueurX = useTransform(x, (v) => `${v * 100}%`);
  const lueurY = useTransform(y, (v) => `${v * 100}%`);
  return (
    <motion.div
      className={cx("group/incline relative [transform-style:preserve-3d]", className)}
      style={reduit ? undefined : { rotateX, rotateY, transformPerspective: 1100 }}
      onPointerMove={(e) => {
        if (e.pointerType !== "mouse") return;
        const r = e.currentTarget.getBoundingClientRect();
        x.set((e.clientX - r.left) / r.width);
        y.set((e.clientY - r.top) / r.height);
      }}
      onPointerLeave={() => {
        x.set(0.5);
        y.set(0.5);
      }}
    >
      {children}
      <Lueur x={lueurX} y={lueurY} />
    </motion.div>
  );
}

function Lueur({ x, y }: { x: MotionValue<string>; y: MotionValue<string> }) {
  const fond = useTransform(
    [x, y],
    ([a, b]) => `radial-gradient(420px circle at ${a} ${b}, var(--bp-or-10), transparent 60%)`,
  );
  return (
    <motion.span
      aria-hidden="true"
      className="pointer-events-none absolute inset-0 rounded-[inherit] opacity-0 transition-opacity duration-500 group-hover/incline:opacity-100"
      style={{ background: fond }}
    />
  );
}

/** Nombre qui défile jusqu'à sa valeur quand il entre dans l'écran. */
export function Compteur({ valeur, className }: { valeur: number; className?: string }) {
  const ref = useRef<HTMLSpanElement>(null);
  const visible = useInView(ref, { once: true, margin: "0px 0px -10% 0px" });
  const reduit = useReducedMotion();
  useEffect(() => {
    const el = ref.current;
    if (!el || !visible || reduit) return;
    const controle = animate(0, valeur, {
      duration: 1.6,
      ease: COURBE,
      onUpdate: (v) => (el.textContent = Math.round(v).toLocaleString("fr-FR")),
    });
    return () => controle.stop();
  }, [visible, reduit, valeur]);
  // Rendu serveur : la valeur finale, lisible sans JavaScript.
  return (
    <span ref={ref} className={cx("chiffres", className)}>
      {valeur.toLocaleString("fr-FR")}
    </span>
  );
}

/** Paragraphe dont les mots s'éclairent au fil du défilement. */
export function TexteEclaire({ texte, className }: { texte: string; className?: string }) {
  const ref = useRef<HTMLParagraphElement>(null);
  const { scrollYProgress } = useScroll({ target: ref, offset: ["start 85%", "end 45%"] });
  const mots = texte.split(/\s+/).filter(Boolean);
  return (
    <p ref={ref} className={className}>
      {mots.map((mot, i) => (
        <Mot
          key={i}
          progression={scrollYProgress}
          debut={i / mots.length}
          fin={(i + 1) / mots.length}
        >
          {mot}
        </Mot>
      ))}
    </p>
  );
}

function Mot({
  children,
  progression,
  debut,
  fin,
}: {
  children: string;
  progression: MotionValue<number>;
  debut: number;
  fin: number;
}) {
  const reduit = useReducedMotion();
  // Opacité minimale 0,55 : le contraste reste ≥ 4,5:1 avant l'éclairage.
  const opacite = useTransform(progression, [debut, fin], [0.55, 1]);
  return (
    <>
      <motion.span style={{ opacity: reduit ? 1 : opacite }}>{children}</motion.span>{" "}
    </>
  );
}

/** En-tête collant : se retire quand on descend, revient dès qu'on remonte. */
export function EnTeteFlottant({ children }: { children: ReactNode }) {
  const { scrollY } = useScroll();
  const [cache, setCache] = useState(false);
  useMotionValueEvent(scrollY, "change", (y) => {
    const avant = scrollY.getPrevious() ?? 0;
    setCache(y > avant && y > 420);
  });
  return (
    <motion.header
      className="sticky top-0 z-30 mx-auto w-full max-w-[1280px] px-[clamp(16px,4vw,56px)] pt-6"
      animate={{ y: cache ? "-130%" : 0 }}
      transition={{ duration: 0.45, ease: COURBE }}
      onFocusCapture={() => setCache(false)}
    >
      {children}
    </motion.header>
  );
}

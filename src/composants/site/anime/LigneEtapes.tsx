"use client";

import { motion } from "motion/react";
import { COURBE } from "./Anime";

/** Filet qui se trace derrière les étapes quand elles entrent dans l'écran (grand écran). */
export function LigneEtapes() {
  return (
    <motion.div
      aria-hidden="true"
      className="bp-ligne-etapes absolute top-[68px] right-[8%] left-[8%] max-lg:hidden"
      initial={{ scaleX: 0 }}
      whileInView={{ scaleX: 1 }}
      viewport={{ once: true, margin: "0px 0px -20% 0px" }}
      transition={{ duration: 1.6, ease: COURBE, delay: 0.2 }}
    />
  );
}

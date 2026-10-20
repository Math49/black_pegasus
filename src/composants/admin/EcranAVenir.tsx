import { GlassCard } from "../ui/GlassCard";
import { Icon } from "../ui/Icon";

/** Contenu provisoire d'un écran livré dans une phase ultérieure (docs/PLAN.md). */
export function EcranAVenir({ phase, contenu }: { phase: number; contenu: string }) {
  return (
    <GlassCard variante="admin" className="flex items-start gap-4 rounded-[24px] p-8">
      <Icon nom="information" className="mt-0.5 text-or-icone" />
      <div className="flex flex-col gap-1.5">
        <span className="font-bold">Écran prévu en phase {phase}</span>
        <span className="text-sm text-texte-doux">{contenu}</span>
      </div>
    </GlassCard>
  );
}

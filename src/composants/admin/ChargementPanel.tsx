/** Squelette d'une page du panel pendant le chargement des données. */
export function ChargementPanel() {
  return (
    <div role="status" aria-busy="true" className="flex flex-col gap-5">
      <span className="sr-only">Chargement…</span>
      <div aria-hidden="true" className="bp-fantome h-[76px] animate-pulse rounded-[24px]" />
      <div
        aria-hidden="true"
        className="grid grid-cols-[repeat(auto-fit,minmax(min(220px,100%),1fr))] gap-4"
      >
        {[0, 1, 2, 3].map((i) => (
          <div key={i} className="bp-fantome h-[132px] animate-pulse rounded-[20px]" />
        ))}
      </div>
      <div aria-hidden="true" className="bp-fantome h-[420px] animate-pulse rounded-[24px]" />
    </div>
  );
}

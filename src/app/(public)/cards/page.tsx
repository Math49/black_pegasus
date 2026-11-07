import { Suspense } from "react";
import { PresentationFiliale } from "@/composants/site/PresentationFiliale";

export const metadata = { title: "Cards" };
export default function PageCards() {
  return (
    <Suspense fallback={null}>
      <PresentationFiliale code="BPC" />
    </Suspense>
  );
}

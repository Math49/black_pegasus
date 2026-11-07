import { Suspense } from "react";
import { PresentationFiliale } from "@/composants/site/PresentationFiliale";

export const metadata = { title: "Formation" };
export default function PageFormation() {
  return (
    <Suspense fallback={null}>
      <PresentationFiliale code="BPF" />
    </Suspense>
  );
}

/** Concatène des classes en ignorant les valeurs vides. */
export const cx = (...classes: (string | false | null | undefined)[]) =>
  classes.filter(Boolean).join(" ");

import { NextResponse, type NextRequest } from "next/server";

// Premier filtre du panel : sans cookie de session, redirection vers la connexion.
// La vraie vérification (session en base, compte actif, rôle) a lieu dans chaque page
// et chaque Server Action (lib/garde.ts).
const COOKIES_SESSION = ["authjs.session-token", "__Secure-authjs.session-token"];
const PUBLIQUES = ["/admin/connexion", "/admin/acces-refuse", "/admin/dev"];

export function proxy(requete: NextRequest) {
  const { pathname } = requete.nextUrl;
  if (PUBLIQUES.some((p) => pathname === p || pathname.startsWith(`${p}/`)))
    return NextResponse.next();
  if (COOKIES_SESSION.some((nom) => requete.cookies.has(nom))) return NextResponse.next();
  const connexion = new URL("/admin/connexion", requete.url);
  return NextResponse.redirect(connexion);
}

export const config = { matcher: ["/admin", "/admin/:chemin*"] };

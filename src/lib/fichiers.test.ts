import { describe, expect, it } from "vitest";
import { detecterTypeImage, TAILLE_MAX_FICHIER, verifierImage } from "./fichiers";

const octets = (...v: number[]) => new Uint8Array([...v, ...new Array(16).fill(0)]);
const PNG = octets(0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a);
const JPG = octets(0xff, 0xd8, 0xff, 0xe0);
const WEBP = new TextEncoder().encode("RIFF\0\0\0\0WEBPVP8 ");

describe("type réel des images", () => {
  it("reconnaît PNG, JPG, WEBP", () => {
    expect(detecterTypeImage(PNG)?.extension).toBe("png");
    expect(detecterTypeImage(JPG)?.extension).toBe("jpg");
    expect(detecterTypeImage(WEBP)?.mime).toBe("image/webp");
  });

  it("refuse le reste, même renommé", () => {
    expect(detecterTypeImage(new TextEncoder().encode("%PDF-1.7"))).toBeNull();
    expect(detecterTypeImage(new TextEncoder().encode("<svg xmlns=..."))).toBeNull();
    expect(detecterTypeImage(octets(0x47, 0x49, 0x46, 0x38))).toBeNull(); // GIF
    expect(verifierImage(new TextEncoder().encode("MZ\x90\0"))).toMatch(/PNG, JPG ou WEBP/);
  });

  it("taille", () => {
    expect(verifierImage(new Uint8Array())).toBe("Fichier vide.");
    const lourd = new Uint8Array(TAILLE_MAX_FICHIER + 1);
    lourd.set([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
    expect(verifierImage(lourd)).toMatch(/10 Mo/);
    expect(verifierImage(PNG)).toBeNull();
  });
});

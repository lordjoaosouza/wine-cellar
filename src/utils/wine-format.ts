import type { Wine } from "@/types/wine";

const UPPERCASE_ABBREVIATION_PATTERN = /^[A-Z0-9.]{2,5}$/;

export function toDisplayCase(value: string | null | undefined) {
  if (!value) {
    return null;
  }

  return value
    .trim()
    .replace(/_/g, " ")
    .replace(/\s*\/\s*/g, " / ")
    .replace(/\s+/g, " ")
    .split(" ")
    .map((word) => {
      if (word === "/") {
        return word;
      }
      if (UPPERCASE_ABBREVIATION_PATTERN.test(word)) {
        return word;
      }
      return (
        word.charAt(0).toLocaleUpperCase("en-US") +
        word.slice(1).toLocaleLowerCase("en-US")
      );
    })
    .join(" ");
}

export function normalizedTextKey(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim()
    .toLocaleLowerCase("en-US");
}

export function wineVintageDetails(wine: Pick<Wine, "type" | "vintage">) {
  return (
    [toDisplayCase(wine.type), wine.vintage].filter(Boolean).join(" \u00b7 ") ||
    "Vintage not listed"
  );
}

export function wineOrigin(wine: Pick<Wine, "winery" | "region" | "country">) {
  return (
    [wine.winery, wine.region, wine.country].filter(Boolean).join(" \u00b7 ") ||
    "Producer not listed"
  );
}

/** "R$ 189,90" for BRL, "$24.99" / "€25.00" for stores abroad. */
export function formatOfferAmount(amount: number, currency: string) {
  try {
    return new Intl.NumberFormat(currency === "BRL" ? "pt-BR" : "en-US", {
      currency,
      style: "currency",
    }).format(amount);
  } catch {
    return `${currency} ${amount.toFixed(2)}`;
  }
}

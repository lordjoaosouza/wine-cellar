const FULL_BODIED_GRAPES = [
  "tannat",
  "cabernet sauvignon",
  "malbec",
  "touriga nacional",
  "syrah",
  "carmenère",
  "sangiovese",
];

export function servingNotesFor(type: string | null): string | null {
  if (!type) {
    return null;
  }
  const lower = type.toLowerCase();
  if (lower.includes("sparkling") || lower.includes("champagne")) {
    return "Serve well chilled, around 6–8°C, in a tulip glass or flute to preserve the bubbles.";
  }
  if (lower.includes("fortified")) {
    return "Serve slightly cool, around 16–18°C, in a small glass — a little goes a long way.";
  }
  if (lower.includes("dessert") || lower.includes("sweet")) {
    return "Serve well chilled, around 6–8°C, in a small glass — its sweetness shows best served cold.";
  }
  if (
    lower.includes("white") ||
    lower.includes("rosé") ||
    lower.includes("rose")
  ) {
    return "Serve chilled, around 8–10°C, to keep its acidity and aromatics crisp.";
  }
  if (lower.includes("orange")) {
    return "Serve lightly chilled, around 12–14°C — cooler than a red, but not as cold as a crisp white.";
  }
  return "Serve at cool room temperature, around 16–18°C; decanting for 30 minutes can help open up the aromas.";
}

export function agingNotesFor(
  type: string | null,
  grapes: string[]
): string | null {
  if (!type) {
    return null;
  }
  const lower = type.toLowerCase();
  if (lower.includes("sparkling") || lower.includes("champagne")) {
    return "Best enjoyed young — most sparkling wine is made to showcase fresh, lively fruit rather than to cellar.";
  }
  if (lower.includes("fortified")) {
    return "Fortified wines are built to last — many styles can continue developing in the bottle for a decade or more.";
  }
  if (lower.includes("dessert")) {
    return "Many dessert wines age gracefully thanks to their sugar and acidity — some hold for a decade or more, though they're just as enjoyable young.";
  }
  if (
    lower.includes("white") ||
    lower.includes("rosé") ||
    lower.includes("rose") ||
    lower.includes("sweet")
  ) {
    return "A wine to enjoy young, typically within 1 to 3 years of the vintage, while its fruit and acidity are freshest.";
  }
  if (lower.includes("orange")) {
    return "Best enjoyed within a few years of release, while its skin-contact texture and aromatics are at their most vibrant.";
  }
  const isFullBodied = grapes.some((grape) =>
    FULL_BODIED_GRAPES.includes(grape.toLowerCase())
  );
  return isFullBodied
    ? "This wine's structure gives it real aging potential — many examples reward 5 to 10 years resting in the cellar."
    : "Approachable now, though it can hold pleasantly for another 2 to 5 years in the cellar.";
}

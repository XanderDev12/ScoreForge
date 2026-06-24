const MUSIC_STEP_PATTERN = /^[A-G]$/i;
const MIN_OCTAVE = 0;
const MAX_OCTAVE = 9;

export function sanitizeMusicXml(xml) {
  if (typeof xml !== "string" || xml.length === 0) {
    return xml;
  }

  return normalizeElementValues(
    normalizeElementValues(
      normalizeElementValues(
        normalizeElementValues(xml, "display-step", normalizeStep),
        "step",
        normalizeStep,
      ),
      "display-octave",
      normalizeOctave,
    ),
    "octave",
    normalizeOctave,
  );
}

function normalizeElementValues(xml, elementName, normalizeValue) {
  const elementPattern = new RegExp(
    `(<${elementName}(?:\\s[^>]*)?>)([^<]*)(<\\/${elementName}>)`,
    "gi",
  );

  return xml.replace(elementPattern, (element, openingTag, value, closingTag) => {
    const normalizedValue = normalizeValue(value.trim());
    return normalizedValue === value.trim()
      ? element
      : `${openingTag}${normalizedValue}${closingTag}`;
  });
}

function normalizeStep(value) {
  return MUSIC_STEP_PATTERN.test(value) ? value.toUpperCase() : "C";
}

function normalizeOctave(value) {
  const octave = Number.parseInt(value, 10);
  return Number.isInteger(octave) && octave >= MIN_OCTAVE && octave <= MAX_OCTAVE
    ? String(octave)
    : "4";
}

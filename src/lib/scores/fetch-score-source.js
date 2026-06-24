const DEFAULT_MAX_SOURCE_BYTES = 16 * 1024 * 1024;

export async function fetchScoreSource(
  url,
  { maxBytes = DEFAULT_MAX_SOURCE_BYTES, signal } = {},
) {
  const response = await fetch(url, { signal });

  if (!response.ok) {
    throw new ScoreSourceError(
      "missing",
      `Unable to load score source (${response.status})`,
    );
  }

  const contentLength = Number(response.headers.get("content-length"));

  if (Number.isFinite(contentLength) && contentLength > maxBytes) {
    throw new ScoreSourceError("too-large", "Score source is too large");
  }

  const data = await response.arrayBuffer();

  if (data.byteLength === 0) {
    throw new ScoreSourceError("empty", "Score source is empty");
  }

  if (data.byteLength > maxBytes) {
    throw new ScoreSourceError("too-large", "Score source is too large");
  }

  const isCompressed = isZipData(data);

  if (!isCompressed && !isMusicXmlData(data)) {
    throw new ScoreSourceError("invalid", "Score source is not MusicXML");
  }

  return { data, isCompressed };
}

export class ScoreSourceError extends Error {
  constructor(code, message) {
    super(message);
    this.name = "ScoreSourceError";
    this.code = code;
  }
}

function isZipData(data) {
  const bytes = new Uint8Array(data, 0, Math.min(data.byteLength, 4));
  return bytes[0] === 0x50 && bytes[1] === 0x4b;
}

function isMusicXmlData(data) {
  const preview = new TextDecoder().decode(
    new Uint8Array(data, 0, Math.min(data.byteLength, 1024)),
  );

  return /<(?:\?xml\b|score-(?:partwise|timewise)\b)/i.test(preview)
    && !/<(?:!doctype\s+html|html)\b/i.test(preview);
}

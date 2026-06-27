import { extractMxlMusicXml } from "./extract-mxl-musicxml.js";

const MAX_UPLOAD_BYTES = 12 * 1024 * 1024;
const MUSICXML_EXTENSIONS = [".musicxml", ".xml", ".mxl"];

export async function createUploadedScore(file) {
  validateFile(file);

  const uploadedFile = await normalizeUploadedFile(file);
  const xml = await uploadedFile.file.text();
  const document = new DOMParser().parseFromString(xml, "application/xml");
  const rootName = document.documentElement?.localName;

  if (
    document.querySelector("parsererror")
    || (rootName !== "score-partwise" && rootName !== "score-timewise")
  ) {
    throw new Error("Choose a valid MusicXML score file.");
  }

  const objectUrl = URL.createObjectURL(uploadedFile.file);

  return {
    id: createUploadId(),
    isUploaded: true,
    songName: getScoreTitle(document, uploadedFile.file.name),
    composer: getComposer(document),
    genre: "Personal score",
    complexity: null,
    popularity: { favorites: 0, rating: 0, views: 0 },
    paths: { metadata: "", pdf: "", xml: objectUrl },
    upload: {
      fileName: uploadedFile.file.name,
      objectUrl,
      originalFileName: uploadedFile.originalFileName,
      extractedPath: uploadedFile.extractedPath,
      sourceFile: uploadedFile.file,
      size: uploadedFile.file.size,
    },
  };
}

async function normalizeUploadedFile(file) {
  if (file.name.toLowerCase().endsWith(".mxl")) {
    return extractMxlMusicXml(file);
  }

  return {
    file,
    originalFileName: file.name,
    extractedPath: "",
  };
}

function validateFile(file) {
  if (!(file instanceof File)) {
    throw new Error("Choose a MusicXML or MXL file to upload.");
  }

  const normalizedName = file.name.toLowerCase();

  if (!MUSICXML_EXTENSIONS.some((extension) => normalizedName.endsWith(extension))) {
    throw new Error("Forge currently accepts .musicxml, .xml, and .mxl files.");
  }

  if (file.size === 0) {
    throw new Error("The selected score file is empty.");
  }

  if (file.size > MAX_UPLOAD_BYTES) {
    throw new Error("Score uploads must be 12 MB or smaller.");
  }
}

function getScoreTitle(document, fileName) {
  const title = document.querySelector("work-title")?.textContent?.trim()
    || document.querySelector("movement-title")?.textContent?.trim();

  if (title) {
    return title;
  }

  const titleCredit = [...document.querySelectorAll("credit-words")]
    .filter((credit) => credit.textContent?.trim())
    .sort((first, second) => getFontSize(second) - getFontSize(first))[0]
    ?.textContent?.trim();

  return titleCredit || fileName.replace(/\.(?:musicxml|xml)$/i, "");
}

function getComposer(document) {
  const creators = [...document.querySelectorAll("identification creator")];
  const composer = creators.find((creator) => {
    return creator.getAttribute("type")?.toLowerCase() === "composer";
  });

  if (composer?.textContent?.trim()) {
    return composer.textContent.trim();
  }

  const composerCredit = [...document.querySelectorAll("credit-words")].find((credit) => {
    return (
      credit.getAttribute("justify")?.toLowerCase() === "right"
      && credit.textContent?.trim()
    );
  });

  return composerCredit?.textContent?.trim() || "Unknown composer";
}

function getFontSize(element) {
  const fontSize = Number(element.getAttribute("font-size"));
  return Number.isFinite(fontSize) ? fontSize : 0;
}

function createUploadId() {
  return `upload-${globalThis.crypto?.randomUUID?.() ?? `${Date.now()}-${Math.random()}`}`;
}

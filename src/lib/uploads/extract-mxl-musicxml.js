const CENTRAL_DIRECTORY_SIGNATURE = 0x02014b50;
const LOCAL_FILE_SIGNATURE = 0x04034b50;
const END_OF_CENTRAL_DIRECTORY_SIGNATURE = 0x06054b50;
const ZIP64_LOCATOR_SIGNATURE = 0x07064b50;
const COMPRESSION_STORE = 0;
const COMPRESSION_DEFLATE = 8;
const MAX_EXTRACTED_XML_BYTES = 24 * 1024 * 1024;
const CONTAINER_PATH = "META-INF/container.xml";

const textDecoder = new TextDecoder("utf-8");

export async function extractMxlMusicXml(file) {
  const archive = await file.arrayBuffer();
  const entries = readZipEntries(archive);

  const containerEntry = entries.find((entry) => {
    return normalizePath(entry.name).toLowerCase() === CONTAINER_PATH.toLowerCase();
  });

  let scorePath = "";

  if (containerEntry) {
    const containerXml = await readEntryText(archive, containerEntry);
    scorePath = getRootFilePath(containerXml);
  }

  const scoreEntry = findScoreEntry(entries, scorePath);

  if (!scoreEntry) {
    throw new Error("The MXL archive does not contain a MusicXML score.");
  }

  const xmlBytes = await readEntryBytes(archive, scoreEntry);
  const xml = textDecoder.decode(xmlBytes);
  const fileName = makeMusicXmlFileName(scoreEntry.name, file.name);

  return {
    file: new File([xml], fileName, { type: "application/vnd.recordare.musicxml+xml" }),
    originalFileName: file.name,
    extractedPath: scoreEntry.name,
  };
}

function readZipEntries(archive) {
  const view = new DataView(archive);
  const eocdOffset = findEndOfCentralDirectory(view);

  if (eocdOffset === -1) {
    throw new Error("Choose a valid compressed MXL archive.");
  }

  const zip64LocatorOffset = eocdOffset - 20;

  if (
    zip64LocatorOffset >= 0
    && view.getUint32(zip64LocatorOffset, true) === ZIP64_LOCATOR_SIGNATURE
  ) {
    throw new Error("Zip64 MXL archives are not supported yet.");
  }

  const entryCount = view.getUint16(eocdOffset + 10, true);
  const centralDirectoryOffset = view.getUint32(eocdOffset + 16, true);

  if (entryCount === 0xffff || centralDirectoryOffset === 0xffffffff) {
    throw new Error("Zip64 MXL archives are not supported yet.");
  }

  const entries = [];
  let cursor = centralDirectoryOffset;

  for (let index = 0; index < entryCount; index += 1) {
    if (cursor + 46 > view.byteLength) {
      throw new Error("The MXL archive directory is invalid.");
    }

    if (view.getUint32(cursor, true) !== CENTRAL_DIRECTORY_SIGNATURE) {
      throw new Error("The MXL archive directory is invalid.");
    }

    const generalPurposeBitFlag = view.getUint16(cursor + 8, true);
    const compressionMethod = view.getUint16(cursor + 10, true);
    const compressedSize = view.getUint32(cursor + 20, true);
    const uncompressedSize = view.getUint32(cursor + 24, true);
    const fileNameLength = view.getUint16(cursor + 28, true);
    const extraFieldLength = view.getUint16(cursor + 30, true);
    const fileCommentLength = view.getUint16(cursor + 32, true);
    const localHeaderOffset = view.getUint32(cursor + 42, true);
    const nameStart = cursor + 46;
    const nameEnd = nameStart + fileNameLength;

    if (nameEnd + extraFieldLength + fileCommentLength > view.byteLength) {
      throw new Error("The MXL archive directory is invalid.");
    }

    const name = textDecoder.decode(new Uint8Array(archive, nameStart, fileNameLength));

    entries.push({
      compressedSize,
      compressionMethod,
      encrypted: Boolean(generalPurposeBitFlag & 0x1),
      localHeaderOffset,
      name,
      uncompressedSize,
    });

    cursor = nameEnd + extraFieldLength + fileCommentLength;
  }

  return entries;
}

function findEndOfCentralDirectory(view) {
  const minOffset = Math.max(0, view.byteLength - 0xffff - 22);

  for (let offset = view.byteLength - 22; offset >= minOffset; offset -= 1) {
    if (view.getUint32(offset, true) === END_OF_CENTRAL_DIRECTORY_SIGNATURE) {
      return offset;
    }
  }

  return -1;
}

async function readEntryText(archive, entry) {
  const bytes = await readEntryBytes(archive, entry);
  return textDecoder.decode(bytes);
}

async function readEntryBytes(archive, entry) {
  if (entry.encrypted) {
    throw new Error("Encrypted MXL archives are not supported.");
  }

  if (entry.uncompressedSize > MAX_EXTRACTED_XML_BYTES) {
    throw new Error("The MusicXML inside this MXL archive is too large.");
  }

  const view = new DataView(archive);
  const localHeaderOffset = entry.localHeaderOffset;

  if (view.getUint32(localHeaderOffset, true) !== LOCAL_FILE_SIGNATURE) {
    throw new Error("The MXL archive file entry is invalid.");
  }

  const fileNameLength = view.getUint16(localHeaderOffset + 26, true);
  const extraFieldLength = view.getUint16(localHeaderOffset + 28, true);
  const dataOffset = localHeaderOffset + 30 + fileNameLength + extraFieldLength;

  if (dataOffset + entry.compressedSize > archive.byteLength) {
    throw new Error("The MXL archive file entry is invalid.");
  }

  const compressedBytes = new Uint8Array(archive, dataOffset, entry.compressedSize);

  if (entry.compressionMethod === COMPRESSION_STORE) {
    return compressedBytes;
  }

  if (entry.compressionMethod === COMPRESSION_DEFLATE) {
    return inflateRaw(compressedBytes);
  }

  throw new Error("This MXL compression method is not supported yet.");
}

async function inflateRaw(compressedBytes) {
  if (!("DecompressionStream" in globalThis)) {
    throw new Error("This browser cannot decompress MXL archives yet.");
  }

  const inflated = await decompress(compressedBytes, "deflate-raw")
    .catch(() => decompress(compressedBytes, "deflate"));

  if (inflated.byteLength > MAX_EXTRACTED_XML_BYTES) {
    throw new Error("The MusicXML inside this MXL archive is too large.");
  }

  return new Uint8Array(inflated);
}

async function decompress(compressedBytes, format) {
  const stream = new Blob([compressedBytes])
    .stream()
    .pipeThrough(new DecompressionStream(format));

  return new Response(stream).arrayBuffer();
}

function getRootFilePath(containerXml) {
  const document = new DOMParser().parseFromString(containerXml, "application/xml");
  const rootFile = [...document.getElementsByTagName("*")].find((element) => {
    return element.localName === "rootfile" && element.hasAttribute("full-path");
  });

  if (document.querySelector("parsererror") || !rootFile) {
    return "";
  }

  return rootFile.getAttribute("full-path")?.trim() ?? "";
}

function findScoreEntry(entries, scorePath) {
  const normalizedScorePath = normalizePath(scorePath).toLowerCase();

  if (normalizedScorePath) {
    const scoreEntry = entries.find((entry) => {
      return normalizePath(entry.name).toLowerCase() === normalizedScorePath;
    });

    if (scoreEntry) {
      return scoreEntry;
    }
  }

  return entries.find((entry) => {
    const normalizedName = normalizePath(entry.name).toLowerCase();
    return (
      !normalizedName.startsWith("meta-inf/")
      && (normalizedName.endsWith(".musicxml") || normalizedName.endsWith(".xml"))
    );
  });
}

function makeMusicXmlFileName(scorePath, fallbackName) {
  const extractedName = normalizePath(scorePath).split("/").pop() || fallbackName;

  if (/\.(?:musicxml|xml)$/i.test(extractedName)) {
    return extractedName;
  }

  return fallbackName.replace(/\.mxl$/i, ".musicxml");
}

function normalizePath(path) {
  return path.replaceAll("\\", "/").replace(/^\/+/, "");
}

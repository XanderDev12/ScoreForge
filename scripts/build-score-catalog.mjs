import { createReadStream } from "node:fs";
import { mkdir, stat, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { createInterface } from "node:readline";

const DEFAULT_INPUT = "MusicData/PDMX.csv";
const DEFAULT_OUTPUT = "src/data/scores/scores.json";
const DEFAULT_LIMIT = 500;

const FIELD_NAMES = {
  metadataPath: "metadata",
  xmlPath: "mxl",
  pdfPath: "pdf",
  songName: "song_name",
  composer: "composer_name",
  genre: "genres",
  complexity: "complexity",
  views: "n_views",
  favorites: "n_favorites",
  rating: "rating",
};

async function main() {
  const options = parseArgs(process.argv.slice(2));
  const inputPath = resolve(options.input ?? DEFAULT_INPUT);
  const outputPath = resolve(options.output ?? DEFAULT_OUTPUT);
  const limit = options.limit ?? DEFAULT_LIMIT;

  const scores = await buildScoreCatalog(inputPath, limit);

  await mkdir(dirname(outputPath), { recursive: true });
  await writeFile(outputPath, `${JSON.stringify(scores, null, 2)}\n`);

  console.log(`Wrote ${scores.length} scores to ${outputPath}`);
}

async function buildScoreCatalog(inputPath, limit) {
  const lines = createInterface({
    input: createReadStream(inputPath, { encoding: "utf8" }),
    crlfDelay: Infinity,
  });

  let headers;
  const scores = [];

  for await (const line of lines) {
    if (!headers) {
      headers = parseCsvLine(line);
      continue;
    }

    if (!line.trim()) {
      continue;
    }

    const row = rowFromValues(headers, parseCsvLine(line));
    const score = scoreFromRow(row);

    if (score) {
      scores.push(score);
    }
  }

  const sortedScores = scores.sort((firstScore, secondScore) => {
    return secondScore.popularity.views - firstScore.popularity.views;
  });

  const requestedScoreCount = limit === "all" ? Number.POSITIVE_INFINITY : limit;
  return selectLocallyAvailableScores(
    sortedScores,
    dirname(inputPath),
    requestedScoreCount,
  );
}

async function selectLocallyAvailableScores(scores, dataRoot, limit) {
  const availableScores = [];
  let skippedScores = 0;

  for (const score of scores) {
    if (await scoreAssetsAreLocal(score, dataRoot)) {
      availableScores.push(score);

      if (availableScores.length >= limit) {
        break;
      }
    } else {
      skippedScores += 1;
    }
  }

  if (skippedScores > 0) {
    console.warn(
      `Skipped ${skippedScores} scores with missing or offloaded local assets`,
    );
  }

  return availableScores;
}

async function scoreAssetsAreLocal(score, dataRoot) {
  const assetPaths = [score.paths.metadata, score.paths.xml, score.paths.pdf];

  try {
    const assetStats = await Promise.all(
      assetPaths.map((assetPath) => {
        return stat(resolve(dataRoot, assetPath.replace(/^\.\//, "")));
      }),
    );

    return assetStats.every((assetStat) => {
      const hasLocalContent = assetStat.blocks === undefined || assetStat.blocks > 0;
      return assetStat.isFile() && assetStat.size > 0 && hasLocalContent;
    });
  } catch {
    return false;
  }
}

function scoreFromRow(row) {
  const metadataPath = cleanValue(row[FIELD_NAMES.metadataPath]);
  const xmlPath = cleanValue(row[FIELD_NAMES.xmlPath]);
  const pdfPath = cleanValue(row[FIELD_NAMES.pdfPath]);

  if (!metadataPath || !xmlPath || !pdfPath) {
    return null;
  }

  return {
    id: createScoreId(xmlPath),
    songName: cleanValue(row[FIELD_NAMES.songName]),
    composer: cleanContributorName(row[FIELD_NAMES.composer]),
    genre: cleanValue(row[FIELD_NAMES.genre]),
    complexity: parseNullableNumber(row[FIELD_NAMES.complexity]),
    popularity: {
      views: parseNumber(row[FIELD_NAMES.views]),
      favorites: parseNumber(row[FIELD_NAMES.favorites]),
      rating: parseNumber(row[FIELD_NAMES.rating]),
    },
    paths: {
      metadata: metadataPath,
      xml: xmlPath,
      pdf: pdfPath,
    },
  };
}

function rowFromValues(headers, values) {
  return headers.reduce((row, header, index) => {
    row[header] = values[index] ?? "";
    return row;
  }, {});
}

function parseCsvLine(line) {
  const values = [];
  let value = "";
  let inQuotes = false;

  for (let index = 0; index < line.length; index += 1) {
    const char = line[index];
    const nextChar = line[index + 1];

    if (char === '"' && inQuotes && nextChar === '"') {
      value += '"';
      index += 1;
      continue;
    }

    if (char === '"') {
      inQuotes = !inQuotes;
      continue;
    }

    if (char === "," && !inQuotes) {
      values.push(value);
      value = "";
      continue;
    }

    value += char;
  }

  values.push(value);
  return values;
}

function cleanValue(value) {
  if (!value || value === "NA") {
    return "";
  }

  return value.trim();
}

function cleanContributorName(value) {
  return cleanValue(value)
    .replace(/([a-z)])(Arranged by|Composed by|Lyrics by)/g, "$1, $2")
    .replace(/\s+/g, " ");
}

function createScoreId(xmlPath) {
  return xmlPath
    .split("/")
    .pop()
    .replace(/\.[^.]+$/, "");
}

function parseNumber(value) {
  const parsedValue = Number.parseFloat(value);
  return Number.isNaN(parsedValue) ? 0 : parsedValue;
}

function parseNullableNumber(value) {
  const parsedValue = Number.parseFloat(value);
  return Number.isNaN(parsedValue) ? null : parsedValue;
}

function parseArgs(args) {
  const options = {};

  for (let index = 0; index < args.length; index += 1) {
    const arg = args[index];
    const nextArg = args[index + 1];

    if (arg === "--input") {
      options.input = nextArg;
      index += 1;
      continue;
    }

    if (arg === "--output") {
      options.output = nextArg;
      index += 1;
      continue;
    }

    if (arg === "--limit") {
      options.limit = nextArg === "all" ? "all" : Number.parseInt(nextArg, 10);
      index += 1;
    }
  }

  if (Number.isNaN(options.limit) || options.limit <= 0) {
    throw new Error("--limit must be a positive number or 'all'");
  }

  return options;
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});

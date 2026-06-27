import { supabase } from "./supabase-client.js";

const USER_SCORES_BUCKET = "user-scores";
const SIGNED_URL_SECONDS = 60 * 60;

export async function fetchUserScores(userId) {
  const { data, error } = await supabase
    .from("scores")
    .select("id, owner_id, title, composer, source_type, storage_path, is_public, created_at, updated_at")
    .eq("owner_id", userId)
    .order("updated_at", { ascending: false });

  if (error) {
    throw error;
  }

  return Promise.all((data ?? []).map(createScoreFromRow));
}

export async function persistUploadedScore({ score, sourceFile, userId }) {
  const scoreId = globalThis.crypto?.randomUUID?.() ?? score.id.replace(/^upload-/, "");
  const storagePath = `users/${userId}/scores/${scoreId}/source.musicxml`;

  const { error: uploadError } = await supabase.storage
    .from(USER_SCORES_BUCKET)
    .upload(storagePath, sourceFile, {
      contentType: "application/vnd.recordare.musicxml+xml",
      upsert: true,
    });

  if (uploadError) {
    throw new Error(`Storage upload failed: ${uploadError.message}`);
  }

  const row = {
    id: scoreId,
    owner_id: userId,
    title: score.songName || "Untitled score",
    composer: score.composer || null,
    source_type: "upload",
    storage_path: storagePath,
    is_public: false,
  };

  const { data, error: insertError } = await supabase
    .from("scores")
    .insert(row)
    .select("id, owner_id, title, composer, source_type, storage_path, is_public, created_at, updated_at")
    .single();

  if (insertError) {
    await supabase.storage.from(USER_SCORES_BUCKET).remove([storagePath]);
    throw new Error(`Score row insert failed: ${insertError.message}`);
  }

  return createScoreFromRow(data);
}

export async function deleteUserScore({ scoreId, storagePath, userId }) {
  const expectedPathPrefix = `users/${userId}/scores/${scoreId}/`;

  if (
    !scoreId
    || !storagePath
    || !userId
    || !storagePath.startsWith(expectedPathPrefix)
  ) {
    throw new Error("This score has an invalid storage path and was not deleted.");
  }

  const { error: storageError } = await supabase.storage
    .from(USER_SCORES_BUCKET)
    .remove([storagePath]);

  if (storageError) {
    throw new Error(`Score file deletion failed: ${storageError.message}`);
  }

  const { data: deletedRows, error: rowError } = await supabase
    .from("scores")
    .delete()
    .eq("id", scoreId)
    .eq("owner_id", userId)
    .select("id");

  if (rowError) {
    throw new Error(`Score row deletion failed: ${rowError.message}`);
  }

  if (deletedRows?.length !== 1) {
    throw new Error("Score row deletion was not permitted. Check the scores DELETE policy.");
  }
}

async function createScoreFromRow(row) {
  const { data, error } = await supabase.storage
    .from(USER_SCORES_BUCKET)
    .createSignedUrl(row.storage_path, SIGNED_URL_SECONDS);

  if (error) {
    throw new Error(`Signed URL failed: ${error.message}`);
  }

  return {
    id: row.id,
    isUploaded: true,
    songName: row.title,
    composer: row.composer || "Unknown composer",
    genre: row.source_type === "created" ? "Created score" : "Personal score",
    complexity: null,
    popularity: { favorites: 0, rating: 0, views: 0 },
    paths: { metadata: "", pdf: "", xml: data.signedUrl },
    upload: {
      fileName: `${slugify(row.title)}.musicxml`,
      objectUrl: "",
      sourceType: row.source_type,
      storagePath: row.storage_path,
      updatedAt: row.updated_at,
    },
  };
}

function slugify(value) {
  return String(value || "score")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "") || "score";
}

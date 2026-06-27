import { supabase } from "./supabase-client.js";

export async function fetchSavedScoreIds(userId) {
  const { data, error } = await supabase
    .from("saved_scores")
    .select("score_id")
    .eq("user_id", userId)
    .order("created_at", { ascending: false });

  if (error) {
    throw new Error(`Saved scores fetch failed: ${error.message}`);
  }

  return (data ?? []).map((row) => row.score_id);
}

export async function saveScoreReference({ scoreId, userId }) {
  const { error } = await supabase
    .from("saved_scores")
    .upsert(
      { score_id: scoreId, user_id: userId },
      { ignoreDuplicates: true, onConflict: "user_id,score_id" },
    );

  if (error) {
    throw new Error(`Saving score failed: ${error.message}`);
  }
}

export async function removeSavedScoreReference({ scoreId, userId }) {
  const { data, error } = await supabase
    .from("saved_scores")
    .delete()
    .eq("score_id", scoreId)
    .eq("user_id", userId)
    .select("score_id");

  if (error) {
    throw new Error(`Removing saved score failed: ${error.message}`);
  }

  if (data?.length !== 1) {
    throw new Error("Removing saved score was not permitted.");
  }
}

import { supabase } from "./supabase-client.js";

const PENDING_PROFILE_PREFIX = "scoreforge:pending-profile:";

export async function fetchProfile(userId) {
  const { data, error } = await supabase
    .from("profiles")
    .select("id, display_name, primary_instrument, skill_level, instruments, preferred_genres")
    .eq("id", userId)
    .maybeSingle();

  if (error) {
    throw new Error(`Profile fetch failed: ${error.message}`);
  }

  return data;
}

export async function upsertProfile(profile) {
  const { data, error } = await supabase
    .from("profiles")
    .upsert(profile, { onConflict: "id" })
    .select("id, display_name, primary_instrument, skill_level, instruments, preferred_genres")
    .single();

  if (error) {
    throw new Error(`Profile save failed: ${error.message}`);
  }

  return data;
}

export async function ensureProfileFromUser(user) {
  if (!user) {
    return null;
  }

  const metadata = user.user_metadata ?? {};
  const pendingProfile = loadPendingProfile(user.email);
  const existingProfile = await fetchProfile(user.id);
  const metadataProfile = {
    id: user.id,
    display_name:
      pendingProfile?.display_name
      || metadata.display_name
      || user.email?.split("@")[0]
      || null,
    primary_instrument: pendingProfile?.primary_instrument || metadata.primary_instrument || null,
    skill_level: pendingProfile?.skill_level || metadata.skill_level || null,
    instruments: normalizeArray(pendingProfile?.instruments ?? metadata.instruments),
    preferred_genres: normalizeArray(
      pendingProfile?.preferred_genres ?? metadata.preferred_genres,
    ),
  };

  if (existingProfile) {
    const mergedProfile = {
      ...existingProfile,
      display_name: existingProfile.display_name || metadataProfile.display_name,
      primary_instrument: existingProfile.primary_instrument || metadataProfile.primary_instrument,
      skill_level: existingProfile.skill_level || metadataProfile.skill_level,
      instruments: existingProfile.instruments?.length
        ? existingProfile.instruments
        : metadataProfile.instruments,
      preferred_genres: existingProfile.preferred_genres?.length
        ? existingProfile.preferred_genres
        : metadataProfile.preferred_genres,
    };

    if (profilesMatch(existingProfile, mergedProfile)) {
      return existingProfile;
    }

    const updatedProfile = await upsertProfile(mergedProfile);
    clearPendingProfile(user.email);
    return updatedProfile;
  }

  const createdProfile = await upsertProfile(metadataProfile);
  clearPendingProfile(user.email);
  return createdProfile;
}

export function savePendingProfile(email, profile) {
  if (!email) {
    return;
  }

  localStorage.setItem(getPendingProfileKey(email), JSON.stringify(profile));
}

function normalizeArray(value) {
  if (Array.isArray(value)) {
    return value.filter(Boolean);
  }

  return [];
}

function loadPendingProfile(email) {
  if (!email) {
    return null;
  }

  try {
    const profile = JSON.parse(localStorage.getItem(getPendingProfileKey(email)) ?? "null");
    return profile && typeof profile === "object" ? profile : null;
  } catch {
    return null;
  }
}

function clearPendingProfile(email) {
  if (email) {
    localStorage.removeItem(getPendingProfileKey(email));
  }
}

function getPendingProfileKey(email) {
  return `${PENDING_PROFILE_PREFIX}${email.toLowerCase()}`;
}

function profilesMatch(firstProfile, secondProfile) {
  return (
    firstProfile.display_name === secondProfile.display_name
    && firstProfile.primary_instrument === secondProfile.primary_instrument
    && firstProfile.skill_level === secondProfile.skill_level
    && arraysMatch(
      normalizeArray(firstProfile.instruments),
      normalizeArray(secondProfile.instruments),
    )
    && arraysMatch(
      normalizeArray(firstProfile.preferred_genres),
      normalizeArray(secondProfile.preferred_genres),
    )
  );
}

function arraysMatch(firstArray, secondArray) {
  return (
    firstArray.length === secondArray.length
    && firstArray.every((value, index) => value === secondArray[index])
  );
}

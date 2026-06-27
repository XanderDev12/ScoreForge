import { useState } from "react";
import { upsertProfile } from "../../lib/supabase/profiles.js";
import {
  createProfileValues,
  INSTRUMENT_OPTIONS,
  ProfileFields,
} from "./profile-fields.jsx";

export function ProfileSettingsDialog({ onClose, onProfileSaved, profile, user }) {
  const initialPrimaryInstrument = profile?.primary_instrument || INSTRUMENT_OPTIONS[0];
  const [displayName, setDisplayName] = useState(
    profile?.display_name || user.email?.split("@")[0] || "",
  );
  const [primaryInstrument, setPrimaryInstrument] = useState(initialPrimaryInstrument);
  const [skillLevel, setSkillLevel] = useState(profile?.skill_level || "beginner");
  const [instruments, setInstruments] = useState(() => {
    return (profile?.instruments ?? []).filter((instrument) => {
      return instrument !== initialPrimaryInstrument;
    });
  });
  const [preferredGenres, setPreferredGenres] = useState(
    profile?.preferred_genres ?? [],
  );
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(event) {
    event.preventDefault();
    setError("");
    setMessage("");
    setIsSubmitting(true);

    try {
      const updatedProfile = await upsertProfile({
        id: user.id,
        ...createProfileValues({
          displayName,
          fallbackDisplayName: user.email?.split("@")[0] || "ScoreForge user",
          instruments,
          preferredGenres,
          primaryInstrument,
          skillLevel,
        }),
      });

      onProfileSaved(updatedProfile);
      setMessage("Settings saved.");
    } catch (saveError) {
      setError(
        saveError instanceof Error
          ? saveError.message
          : "Unable to save settings.",
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="auth-dialog-backdrop" role="presentation">
      <section
        className="auth-dialog profile-step"
        aria-labelledby="settings-title"
        aria-modal="true"
        role="dialog"
      >
        <div className="auth-dialog-header">
          <div>
            <p className="catalog-kicker">ScoreForge Account</p>
            <h2 id="settings-title">Settings</h2>
          </div>
          <button type="button" onClick={onClose} aria-label="Close settings">
            X
          </button>
        </div>

        <form className="auth-form" onSubmit={handleSubmit}>
          <ProfileFields
            autoFocusDisplayName
            displayName={displayName}
            instruments={instruments}
            preferredGenres={preferredGenres}
            primaryInstrument={primaryInstrument}
            setDisplayName={setDisplayName}
            setInstruments={setInstruments}
            setPreferredGenres={setPreferredGenres}
            setPrimaryInstrument={setPrimaryInstrument}
            setSkillLevel={setSkillLevel}
            skillLevel={skillLevel}
          />

          {error ? <p className="auth-error" role="alert">{error}</p> : null}
          {message ? <p className="auth-message" role="status">{message}</p> : null}

          <div className="auth-form-actions">
            <button type="button" onClick={onClose}>
              Cancel
            </button>
            <button type="submit" disabled={isSubmitting}>
              {isSubmitting ? "Saving..." : "Save changes"}
            </button>
          </div>
        </form>
      </section>
    </div>
  );
}

import { useState } from "react";
import { savePendingProfile, upsertProfile } from "../../lib/supabase/profiles.js";
import { supabase } from "../../lib/supabase/supabase-client.js";

const SKILL_LEVELS = [
  { label: "Beginner", value: "beginner" },
  { label: "Intermediate", value: "intermediate" },
  { label: "Advanced", value: "advanced" },
];

const INSTRUMENT_OPTIONS = [
  "Piano",
  "Violin",
  "Viola",
  "Cello",
  "Guitar",
  "Voice",
  "Flute",
  "Clarinet",
  "Trumpet",
  "Percussion",
];

const GENRE_OPTIONS = [
  "Baroque",
  "Classical",
  "Romantic",
  "Modern",
  "Folk",
  "Jazz",
  "Sacred",
  "Opera",
  "Chamber",
  "Orchestral",
];

export function AuthDialog({ mode, onClose }) {
  const [authMode, setAuthMode] = useState(mode);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [primaryInstrument, setPrimaryInstrument] = useState(INSTRUMENT_OPTIONS[0]);
  const [skillLevel, setSkillLevel] = useState("beginner");
  const [instruments, setInstruments] = useState([]);
  const [preferredGenres, setPreferredGenres] = useState([]);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const isSignUp = authMode === "sign-up";

  async function handleSubmit(event) {
    event.preventDefault();
    setError("");
    setMessage("");
    setIsSubmitting(true);

    const profileDraft = createProfileDraft({
      displayName,
      email,
      instruments,
      preferredGenres,
      primaryInstrument,
      skillLevel,
    });

    if (isSignUp) {
      savePendingProfile(email, profileDraft);
    }

    const authRequest = isSignUp
      ? supabase.auth.signUp({
          email,
          password,
          options: {
            data: {
              display_name: profileDraft.display_name,
              instruments: profileDraft.instruments,
              preferred_genres: profileDraft.preferred_genres,
              primary_instrument: profileDraft.primary_instrument,
              skill_level: profileDraft.skill_level,
            },
          },
        })
      : supabase.auth.signInWithPassword({ email, password });

    const { data, error: authError } = await authRequest;

    if (authError) {
      setIsSubmitting(false);
      setError(authError.message);
      return;
    }

    if (isSignUp) {
      if (data.session?.user) {
        try {
          await upsertProfile({
            id: data.session.user.id,
            ...profileDraft,
          });
        } catch (profileError) {
          setIsSubmitting(false);
          setError(
            profileError instanceof Error
              ? profileError.message
              : "Your account was created, but the profile could not be saved.",
          );
          return;
        }
      }

      setIsSubmitting(false);
      setMessage("Check your email to confirm your ScoreForge account.");
      return;
    }

    setIsSubmitting(false);
    onClose();
  }

  return (
    <div className="auth-dialog-backdrop" role="presentation">
      <section
        className="auth-dialog"
        aria-labelledby="auth-dialog-title"
        aria-modal="true"
        role="dialog"
      >
        <div className="auth-dialog-header">
          <div>
            <p className="catalog-kicker">ScoreForge Account</p>
            <h2 id="auth-dialog-title">{isSignUp ? "Create account" : "Sign in"}</h2>
          </div>
          <button type="button" onClick={onClose} aria-label="Close account dialog">
            X
          </button>
        </div>

        <form className="auth-form" onSubmit={handleSubmit}>
          <label>
            Email
            <input
              autoComplete="email"
              required
              type="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
            />
          </label>

          <label>
            Password
            <input
              autoComplete={isSignUp ? "new-password" : "current-password"}
              minLength={6}
              required
              type="password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
            />
          </label>

          {isSignUp ? (
            <div className="auth-profile-fields" aria-label="Profile details">
              <label>
                Display name
                <input
                  autoComplete="nickname"
                  required
                  type="text"
                  value={displayName}
                  onChange={(event) => setDisplayName(event.target.value)}
                />
              </label>

              <label>
                Primary instrument
                <select
                  required
                  value={primaryInstrument}
                  onChange={(event) => {
                    setPrimaryInstrument(event.target.value);
                    setInstruments((currentInstruments) => {
                      return currentInstruments.filter((instrument) => {
                        return instrument !== event.target.value;
                      });
                    });
                  }}
                >
                  {INSTRUMENT_OPTIONS.map((instrument) => (
                    <option key={instrument} value={instrument}>
                      {instrument}
                    </option>
                  ))}
                </select>
              </label>

              <label>
                Skill level
                <select
                  required
                  value={skillLevel}
                  onChange={(event) => setSkillLevel(event.target.value)}
                >
                  {SKILL_LEVELS.map((level) => (
                    <option key={level.value} value={level.value}>
                      {level.label}
                    </option>
                  ))}
                </select>
              </label>

              <CheckboxGroup
                legend="Other instruments"
                options={INSTRUMENT_OPTIONS.filter((instrument) => {
                  return instrument !== primaryInstrument;
                })}
                selectedValues={instruments}
                onChange={setInstruments}
              />

              <CheckboxGroup
                legend="Preferred genres"
                options={GENRE_OPTIONS}
                selectedValues={preferredGenres}
                onChange={setPreferredGenres}
              />
            </div>
          ) : null}

          {error ? <p className="auth-error" role="alert">{error}</p> : null}
          {message ? <p className="auth-message" role="status">{message}</p> : null}

          <button type="submit" disabled={isSubmitting}>
            {isSubmitting ? "Working..." : isSignUp ? "Sign up" : "Sign in"}
          </button>
        </form>

        <button
          className="auth-mode-switch"
          type="button"
          onClick={() => {
            setAuthMode(isSignUp ? "sign-in" : "sign-up");
            setError("");
            setMessage("");
          }}
        >
          {isSignUp ? "Already have an account? Sign in" : "Need an account? Sign up"}
        </button>
      </section>
    </div>
  );
}

function CheckboxGroup({ legend, onChange, options, selectedValues }) {
  return (
    <fieldset className="auth-checkbox-group">
      <legend>{legend}</legend>
      <div>
        {options.map((option) => (
          <label key={option}>
            <input
              checked={selectedValues.includes(option)}
              type="checkbox"
              value={option}
              onChange={(event) => {
                onChange(toggleValue(selectedValues, event.target.value, event.target.checked));
              }}
            />
            <span>{option}</span>
          </label>
        ))}
      </div>
    </fieldset>
  );
}

function createProfileDraft({
  displayName,
  email,
  instruments,
  preferredGenres,
  primaryInstrument,
  skillLevel,
}) {
  const trimmedPrimaryInstrument = primaryInstrument.trim();

  return {
    display_name: displayName.trim() || email.split("@")[0],
    primary_instrument: trimmedPrimaryInstrument,
    skill_level: skillLevel,
    instruments: uniqueValues([trimmedPrimaryInstrument, ...instruments]),
    preferred_genres: uniqueValues(preferredGenres),
  };
}

function toggleValue(values, value, isSelected) {
  if (isSelected) {
    return uniqueValues([...values, value]);
  }

  return values.filter((currentValue) => currentValue !== value);
}

function uniqueValues(values) {
  return [...new Set(values.filter(Boolean))];
}

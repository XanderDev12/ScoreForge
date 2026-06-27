import { useState } from "react";
import { savePendingProfile, upsertProfile } from "../../lib/supabase/profiles.js";
import { supabase } from "../../lib/supabase/supabase-client.js";
import {
  createProfileValues,
  INSTRUMENT_OPTIONS,
  ProfileFields,
} from "./profile-fields.jsx";

const SIGN_UP_STEPS = [
  { id: "email", label: "Email" },
  { id: "password", label: "Password" },
  { id: "confirm", label: "Confirm" },
  { id: "profile", label: "Profile" },
];

export function AuthDialog({ mode, onClose }) {
  const [authMode, setAuthMode] = useState(mode);
  const [signUpStep, setSignUpStep] = useState(0);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [passwordConfirmation, setPasswordConfirmation] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [primaryInstrument, setPrimaryInstrument] = useState(INSTRUMENT_OPTIONS[0]);
  const [skillLevel, setSkillLevel] = useState("beginner");
  const [instruments, setInstruments] = useState([]);
  const [preferredGenres, setPreferredGenres] = useState([]);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const isSignUp = authMode === "sign-up";
  const isComplete = isSignUp && Boolean(message);

  async function handleSubmit(event) {
    event.preventDefault();
    setError("");
    setMessage("");

    if (isSignUp && signUpStep < SIGN_UP_STEPS.length - 1) {
      if (signUpStep === 2 && password !== passwordConfirmation) {
        setError("Passwords do not match.");
        return;
      }

      setSignUpStep((currentStep) => currentStep + 1);
      return;
    }

    setIsSubmitting(true);

    if (isSignUp) {
      const profileDraft = createProfileValues({
        displayName,
        fallbackDisplayName: email.split("@")[0],
        instruments,
        preferredGenres,
        primaryInstrument,
        skillLevel,
      });

      savePendingProfile(email, profileDraft);

      const { data, error: authError } = await supabase.auth.signUp({
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
      });

      if (authError) {
        setIsSubmitting(false);
        setError(authError.message);
        return;
      }

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

    const { error: authError } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (authError) {
      setIsSubmitting(false);
      setError(authError.message);
      return;
    }

    setIsSubmitting(false);
    onClose();
  }

  function changeAuthMode() {
    setAuthMode(isSignUp ? "sign-in" : "sign-up");
    setSignUpStep(0);
    setPassword("");
    setPasswordConfirmation("");
    setError("");
    setMessage("");
  }

  function goToPreviousStep() {
    setSignUpStep((currentStep) => Math.max(0, currentStep - 1));
    setError("");
    setMessage("");
  }

  return (
    <div className="auth-dialog-backdrop" role="presentation">
      <section
        className={
          isSignUp && signUpStep === SIGN_UP_STEPS.length - 1
            ? "auth-dialog profile-step"
            : "auth-dialog"
        }
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

        {isSignUp ? (
          <nav className="auth-step-navigation" aria-label="Sign-up progress">
            <ol>
              {SIGN_UP_STEPS.map((step, index) => (
                <li
                  className={index <= signUpStep ? "active" : ""}
                  key={step.id}
                >
                  <button
                    aria-current={index === signUpStep ? "step" : undefined}
                    disabled={index > signUpStep || isSubmitting || isComplete}
                    type="button"
                    onClick={() => {
                      setSignUpStep(index);
                      setError("");
                      setMessage("");
                    }}
                  >
                    <span>{index + 1}</span>
                    {step.label}
                  </button>
                </li>
              ))}
            </ol>
          </nav>
        ) : null}

        <form className="auth-form" onSubmit={handleSubmit}>
          {!isSignUp ? (
            <>
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
                  autoComplete="current-password"
                  minLength={6}
                  required
                  type="password"
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                />
              </label>
            </>
          ) : (
            <SignUpStep
              displayName={displayName}
              email={email}
              instruments={instruments}
              password={password}
              passwordConfirmation={passwordConfirmation}
              preferredGenres={preferredGenres}
              primaryInstrument={primaryInstrument}
              setDisplayName={setDisplayName}
              setEmail={setEmail}
              setInstruments={setInstruments}
              setPassword={setPassword}
              setPasswordConfirmation={setPasswordConfirmation}
              setPreferredGenres={setPreferredGenres}
              setPrimaryInstrument={setPrimaryInstrument}
              setSkillLevel={setSkillLevel}
              signUpStep={signUpStep}
              skillLevel={skillLevel}
            />
          )}

          {error ? <p className="auth-error" role="alert">{error}</p> : null}
          {message ? <p className="auth-message" role="status">{message}</p> : null}

          <div className="auth-form-actions">
            {isSignUp && signUpStep > 0 ? (
              <button
                type="button"
                disabled={isSubmitting || isComplete}
                onClick={goToPreviousStep}
              >
                Back
              </button>
            ) : null}
            <button type="submit" disabled={isSubmitting || isComplete}>
              {getSubmitLabel({ isSignUp, isSubmitting, signUpStep })}
            </button>
          </div>
        </form>

        <button
          className="auth-mode-switch"
          type="button"
          onClick={changeAuthMode}
        >
          {isSignUp ? "Already have an account? Sign in" : "Need an account? Sign up"}
        </button>
      </section>
    </div>
  );
}

function SignUpStep({
  displayName,
  email,
  instruments,
  password,
  passwordConfirmation,
  preferredGenres,
  primaryInstrument,
  setDisplayName,
  setEmail,
  setInstruments,
  setPassword,
  setPasswordConfirmation,
  setPreferredGenres,
  setPrimaryInstrument,
  setSkillLevel,
  signUpStep,
  skillLevel,
}) {
  if (signUpStep === 0) {
    return (
      <label>
        Email
        <input
          autoComplete="email"
          autoFocus
          required
          type="email"
          value={email}
          onChange={(event) => setEmail(event.target.value)}
        />
      </label>
    );
  }

  if (signUpStep === 1) {
    return (
      <label>
        Create password
        <input
          autoComplete="new-password"
          autoFocus
          minLength={6}
          required
          type="password"
          value={password}
          onChange={(event) => setPassword(event.target.value)}
        />
      </label>
    );
  }

  if (signUpStep === 2) {
    return (
      <label>
        Confirm password
        <input
          autoComplete="new-password"
          autoFocus
          minLength={6}
          required
          type="password"
          value={passwordConfirmation}
          onChange={(event) => setPasswordConfirmation(event.target.value)}
        />
      </label>
    );
  }

  return (
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
  );
}

function getSubmitLabel({ isSignUp, isSubmitting, signUpStep }) {
  if (isSubmitting) {
    return "Working...";
  }

  if (!isSignUp) {
    return "Sign in";
  }

  return signUpStep === SIGN_UP_STEPS.length - 1 ? "Create account" : "Continue";
}

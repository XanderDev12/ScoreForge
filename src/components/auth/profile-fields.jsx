export const SKILL_LEVELS = [
  { label: "Beginner", value: "beginner" },
  { label: "Intermediate", value: "intermediate" },
  { label: "Advanced", value: "advanced" },
];

export const INSTRUMENT_OPTIONS = [
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

export const GENRE_OPTIONS = [
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

export function ProfileFields({
  autoFocusDisplayName = false,
  displayName,
  instruments,
  preferredGenres,
  primaryInstrument,
  setDisplayName,
  setInstruments,
  setPreferredGenres,
  setPrimaryInstrument,
  setSkillLevel,
  skillLevel,
}) {
  return (
    <div className="auth-profile-fields" aria-label="Profile details">
      <label>
        Display name
        <input
          autoComplete="nickname"
          autoFocus={autoFocusDisplayName}
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
  );
}

export function createProfileValues({
  displayName,
  fallbackDisplayName = "",
  instruments,
  preferredGenres,
  primaryInstrument,
  skillLevel,
}) {
  const trimmedPrimaryInstrument = primaryInstrument.trim();

  return {
    display_name: displayName.trim() || fallbackDisplayName,
    primary_instrument: trimmedPrimaryInstrument,
    skill_level: skillLevel,
    instruments: uniqueValues([trimmedPrimaryInstrument, ...instruments]),
    preferred_genres: uniqueValues(preferredGenres),
  };
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

function toggleValue(values, value, isSelected) {
  if (isSelected) {
    return uniqueValues([...values, value]);
  }

  return values.filter((currentValue) => currentValue !== value);
}

function uniqueValues(values) {
  return [...new Set(values.filter(Boolean))];
}

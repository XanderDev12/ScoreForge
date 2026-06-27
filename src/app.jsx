import { useEffect, useMemo, useRef, useState } from "react";
import { AuthDialog } from "./components/auth/auth-dialog.jsx";
import { ProfileSettingsDialog } from "./components/auth/profile-settings-dialog.jsx";
import { Catalog } from "./components/catalog/catalog.jsx";
import { Home } from "./components/home/home.jsx";
import { AppShell } from "./components/layout/app-shell.jsx";
import { Learn } from "./components/learn/learn.jsx";
import { ScoreViewer } from "./components/score-viewer/score-viewer.jsx";
import { Uploads } from "./components/uploads/uploads.jsx";
import scores from "./data/scores/scores.json";
import { getRecommendedScores } from "./lib/recommendations/score-recommendations.js";
import { ensureProfileFromUser } from "./lib/supabase/profiles.js";
import {
  fetchSavedScoreIds,
  removeSavedScoreReference,
  saveScoreReference,
} from "./lib/supabase/saved-scores.js";
import { supabase } from "./lib/supabase/supabase-client.js";
import {
  deleteUserScore,
  fetchUserScores,
  persistUploadedScore,
} from "./lib/supabase/user-scores.js";
import { createUploadedScore } from "./lib/uploads/create-uploaded-score.js";

const SAVED_SCORES_STORAGE_KEY = "scoreforge:saved-scores";
const RECENT_SCORES_STORAGE_KEY = "scoreforge:recently-opened-scores";
const HOME_SCORE_LIMIT = 12;
const RECENT_SCORE_LIMIT = HOME_SCORE_LIMIT;
const CATALOG_SCORES_BY_ID = new Map(scores.map((score) => [score.id, score]));

export function App() {
  const [activeTab, setActiveTab] = useState("home");
  const [searchQuery, setSearchQuery] = useState("");
  const [savedScores, setSavedScores] = useState(() => loadSavedScores());
  const [recentlyViewedScoreIds, setRecentlyViewedScoreIds] = useState(
    loadRecentlyViewedScoreIds,
  );
  const [uploadedScores, setUploadedScores] = useState([]);
  const [user, setUser] = useState(null);
  const [isSessionReady, setIsSessionReady] = useState(false);
  const [profile, setProfile] = useState(null);
  const [accountDialogMode, setAccountDialogMode] = useState(null);
  const [forgeStatus, setForgeStatus] = useState("");
  const [forgeError, setForgeError] = useState("");
  const [profileError, setProfileError] = useState("");
  const [savedScoresError, setSavedScoresError] = useState("");
  const [pendingSavedScoreIds, setPendingSavedScoreIds] = useState(() => new Set());
  const uploadedObjectUrlsRef = useRef(new Set());
  const [selectedScore, setSelectedScore] = useState(null);

  useEffect(() => {
    const uploadedObjectUrls = uploadedObjectUrlsRef.current;

    return () => {
      uploadedObjectUrls.forEach((objectUrl) => URL.revokeObjectURL(objectUrl));
      uploadedObjectUrls.clear();
    };
  }, []);

  useEffect(() => {
    let isMounted = true;

    async function loadSession() {
      const { data } = await supabase.auth.getSession();

      if (isMounted) {
        setUser(data.session?.user ?? null);
        setIsSessionReady(true);
      }
    }

    loadSession();

    const { data } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
      setIsSessionReady(true);
      setAccountDialogMode(null);
    });

    return () => {
      isMounted = false;
      data.subscription.unsubscribe();
    };
  }, []);

  useEffect(() => {
    let isCurrent = true;

    async function loadSavedScoresForSession() {
      if (!isSessionReady) {
        return;
      }

      setSavedScoresError("");

      if (!user) {
        setSavedScores(loadSavedScores());
        return;
      }

      try {
        const savedScoreIds = await fetchSavedScoreIds(user.id);

        if (isCurrent) {
          setSavedScores(
            savedScoreIds
              .map((scoreId) => CATALOG_SCORES_BY_ID.get(scoreId))
              .filter(Boolean),
          );
        }
      } catch (error) {
        if (isCurrent) {
          setSavedScores([]);
          setSavedScoresError(
            error instanceof Error ? error.message : "Unable to load saved scores.",
          );
        }
      }
    }

    loadSavedScoresForSession();

    return () => {
      isCurrent = false;
    };
  }, [isSessionReady, user]);

  useEffect(() => {
    let isCurrent = true;

    async function loadProfile() {
      if (!user) {
        setProfile(null);
        setProfileError("");
        return;
      }

      try {
        const userProfile = await ensureProfileFromUser(user);

        if (isCurrent) {
          setProfile(userProfile);
          setProfileError("");
        }
      } catch (error) {
        if (isCurrent) {
          setProfile(null);
          setProfileError(error instanceof Error ? error.message : "Unable to load profile.");
        }
      }
    }

    loadProfile();

    return () => {
      isCurrent = false;
    };
  }, [user]);

  useEffect(() => {
    let isCurrent = true;

    async function loadUserScores() {
      if (!user) {
        setUploadedScores((currentScores) => {
          return currentScores.filter((score) => {
            if (!score.upload?.storagePath) {
              return true;
            }

            const objectUrl = score.upload.objectUrl;

            if (objectUrl) {
              URL.revokeObjectURL(objectUrl);
              uploadedObjectUrlsRef.current.delete(objectUrl);
            }

            return false;
          });
        });
        setForgeStatus("");
        setForgeError("");
        return;
      }

      setForgeStatus("Loading your Forge scores...");
      setForgeError("");

      try {
        const userScores = await fetchUserScores(user.id);

        if (isCurrent) {
          setUploadedScores((currentScores) => mergeUploadedScores(userScores, currentScores));
          setForgeStatus("");
        }
      } catch (error) {
        if (isCurrent) {
          setForgeStatus("");
          setForgeError(error instanceof Error ? error.message : "Unable to load Forge scores.");
        }
      }
    }

    loadUserScores();

    return () => {
      isCurrent = false;
    };
  }, [user]);

  const visibleScores = useMemo(() => {
    const normalizedQuery = searchQuery.trim().toLowerCase();

    if (!normalizedQuery) {
      return scores;
    }

    return scores.filter((score) => {
      const songName = score.songName?.toLowerCase() ?? "";
      const composer = score.composer?.toLowerCase() ?? "";
      return songName.includes(normalizedQuery) || composer.includes(normalizedQuery);
    });
  }, [searchQuery]);

  const savedScoreIds = useMemo(() => {
    return new Set(savedScores.map((score) => score.id));
  }, [savedScores]);

  const recommendedScores = useMemo(() => {
    return getRecommendedScores({
      account: user && profile ? { profile } : null,
      limit: HOME_SCORE_LIMIT,
      scores,
    });
  }, [profile, user]);

  const recentlyViewedScores = useMemo(() => {
    return recentlyViewedScoreIds
      .map((scoreId) => CATALOG_SCORES_BY_ID.get(scoreId))
      .filter(Boolean);
  }, [recentlyViewedScoreIds]);

  function handleTabChange(nextTab) {
    setActiveTab(nextTab);
    setSelectedScore(null);
  }

  function handleHome() {
    setActiveTab("home");
    setSelectedScore(null);
  }

  function handleSearchSubmit() {
    setActiveTab("catalog");
    setSelectedScore(null);
  }

  function handleSelectScore(score) {
    setSelectedScore(score);

    if (CATALOG_SCORES_BY_ID.has(score.id)) {
      setRecentlyViewedScoreIds((currentScoreIds) => {
        const nextScoreIds = [
          score.id,
          ...currentScoreIds.filter((scoreId) => scoreId !== score.id),
        ].slice(0, RECENT_SCORE_LIMIT);

        localStorage.setItem(
          RECENT_SCORES_STORAGE_KEY,
          JSON.stringify(nextScoreIds),
        );
        return nextScoreIds;
      });
    }
  }

  async function handleUploadScore(file) {
    const uploadedScore = await createUploadedScore(file);
    uploadedObjectUrlsRef.current.add(uploadedScore.upload.objectUrl);

    if (!user) {
      setUploadedScores((currentScores) => [uploadedScore, ...currentScores]);
      setSelectedScore(uploadedScore);
      setForgeStatus("Temporary upload opened. Sign in, then upload again to save it to Supabase.");
      setForgeError("");
      return;
    }

    setForgeStatus("Saving score to your account...");
    setForgeError("");

    try {
      const persistedScore = await persistUploadedScore({
        score: uploadedScore,
        sourceFile: uploadedScore.upload.sourceFile,
        userId: user.id,
      });
      const viewScore = {
        ...persistedScore,
        paths: uploadedScore.paths,
        upload: {
          ...persistedScore.upload,
          fileName: uploadedScore.upload.fileName,
          objectUrl: uploadedScore.upload.objectUrl,
          originalFileName: uploadedScore.upload.originalFileName,
        },
      };

      setUploadedScores((currentScores) => [viewScore, ...currentScores]);
      setSelectedScore(viewScore);
      setForgeStatus("");
    } catch (error) {
      URL.revokeObjectURL(uploadedScore.upload.objectUrl);
      uploadedObjectUrlsRef.current.delete(uploadedScore.upload.objectUrl);
      setForgeStatus("");
      setForgeError(error instanceof Error ? error.message : "Unable to save score.");
    }
  }

  async function handleDeleteUploadedScore(score) {
    const storagePath = score.upload?.storagePath;

    setForgeStatus(`Deleting ${score.songName || "score"}...`);
    setForgeError("");

    try {
      if (storagePath) {
        if (!user) {
          throw new Error("Sign in again before deleting this saved score.");
        }

        await deleteUserScore({
          scoreId: score.id,
          storagePath,
          userId: user.id,
        });
      }

      const objectUrl = score.upload?.objectUrl;

      if (objectUrl) {
        URL.revokeObjectURL(objectUrl);
        uploadedObjectUrlsRef.current.delete(objectUrl);
      }

      setUploadedScores((currentScores) => {
        return currentScores.filter((currentScore) => currentScore.id !== score.id);
      });
      setSelectedScore((currentScore) => {
        return currentScore?.id === score.id ? null : currentScore;
      });
      setForgeStatus("");
    } catch (error) {
      setForgeStatus("");
      setForgeError(error instanceof Error ? error.message : "Unable to delete score.");
      throw error;
    }
  }

  async function handleToggleSavedScore(score) {
    if (pendingSavedScoreIds.has(score.id)) {
      return;
    }

    const wasSaved = savedScoreIds.has(score.id);
    const nextSavedScores = wasSaved
      ? savedScores.filter((savedScore) => savedScore.id !== score.id)
      : [...savedScores, score];

    setSavedScores(nextSavedScores);
    setSavedScoresError("");

    if (!user) {
      localStorage.setItem(
        SAVED_SCORES_STORAGE_KEY,
        JSON.stringify(nextSavedScores.map((savedScore) => savedScore.id)),
      );
      return;
    }

    setPendingSavedScoreIds((currentIds) => new Set(currentIds).add(score.id));

    try {
      if (wasSaved) {
        await removeSavedScoreReference({ scoreId: score.id, userId: user.id });
      } else {
        await saveScoreReference({ scoreId: score.id, userId: user.id });
      }
    } catch (error) {
      setSavedScores((currentScores) => {
        if (wasSaved) {
          return currentScores.some((savedScore) => savedScore.id === score.id)
            ? currentScores
            : [...currentScores, score];
        }

        return currentScores.filter((savedScore) => savedScore.id !== score.id);
      });
      setSavedScoresError(
        error instanceof Error ? error.message : "Unable to update saved scores.",
      );
    } finally {
      setPendingSavedScoreIds((currentIds) => {
        const nextIds = new Set(currentIds);
        nextIds.delete(score.id);
        return nextIds;
      });
    }
  }

  async function handleSignOut() {
    await supabase.auth.signOut();
    setSelectedScore(null);
  }

  return (
    <>
      <AppShell
        activeTab={activeTab}
        isHomeView={activeTab === "home" && !selectedScore}
        onOpenAccount={setAccountDialogMode}
        onSignOut={handleSignOut}
        onTabChange={handleTabChange}
        onHome={handleHome}
        onToggleSavedScore={handleToggleSavedScore}
        pendingSavedScoreIds={pendingSavedScoreIds}
        savedScores={savedScores}
        savedScoresError={savedScoresError}
        searchQuery={searchQuery}
        onSearchQueryChange={setSearchQuery}
        onSearchSubmit={handleSearchSubmit}
        uploadedScores={uploadedScores}
        onSelectScore={handleSelectScore}
        profile={profile}
        user={user}
      >
        {selectedScore ? (
          <ScoreViewer
            backLabel={activeTab === "uploads" ? "Back to Forge" : "Back to catalog"}
            isSaved={savedScoreIds.has(selectedScore.id)}
            isSavePending={pendingSavedScoreIds.has(selectedScore.id)}
            onDeleteScore={
              selectedScore.isUploaded ? handleDeleteUploadedScore : undefined
            }
            onToggleSavedScore={
              selectedScore.isUploaded ? undefined : handleToggleSavedScore
            }
            savedScoresError={savedScoresError}
            score={selectedScore}
            onBack={() => {
              setSelectedScore(null);
            }}
          />
        ) : activeTab === "catalog" ? (
          <Catalog
            scores={visibleScores}
            totalScoreCount={scores.length}
            savedScoreIds={savedScoreIds}
            pendingSavedScoreIds={pendingSavedScoreIds}
            savedScoresError={savedScoresError}
            onToggleSavedScore={handleToggleSavedScore}
            onViewScore={handleSelectScore}
          />
        ) : activeTab === "home" ? (
          <Home
            onViewScore={handleSelectScore}
            onToggleSavedScore={handleToggleSavedScore}
            pendingSavedScoreIds={pendingSavedScoreIds}
            profile={profile}
            recentlyViewedScores={recentlyViewedScores}
            recommendedScores={recommendedScores}
            onOpenCatalog={() => handleTabChange("catalog")}
            savedScoreIds={savedScoreIds}
            savedScoresError={savedScoresError}
            user={user}
          />
        ) : activeTab === "learn" ? (
          <Learn />
        ) : (
          <Uploads
            forgeError={forgeError}
            forgeStatus={forgeStatus}
            isSignedIn={Boolean(user)}
            profileError={profileError}
            signedInEmail={user?.email ?? ""}
            onDeleteScore={handleDeleteUploadedScore}
            onUploadScore={handleUploadScore}
            onViewScore={handleSelectScore}
            uploadedScores={uploadedScores}
          />
        )}
      </AppShell>

      {accountDialogMode === "settings" && user ? (
        <ProfileSettingsDialog
          onClose={() => setAccountDialogMode(null)}
          onProfileSaved={(updatedProfile) => {
            setProfile(updatedProfile);
            setProfileError("");
          }}
          profile={profile}
          user={user}
        />
      ) : accountDialogMode ? (
        <AuthDialog
          mode={accountDialogMode}
          onClose={() => setAccountDialogMode(null)}
        />
      ) : null}
    </>
  );
}

function mergeUploadedScores(accountScores, sessionScores) {
  const accountScoreIds = new Set(accountScores.map((score) => score.id));
  const unsavedSessionScores = sessionScores.filter((score) => {
    return (
      score.upload?.objectUrl
      && !score.upload?.storagePath
      && !accountScoreIds.has(score.id)
    );
  });

  return [...accountScores, ...unsavedSessionScores];
}

function loadSavedScores() {
  try {
    const savedScores = JSON.parse(
      localStorage.getItem(SAVED_SCORES_STORAGE_KEY) ?? "[]",
    );

    if (!Array.isArray(savedScores)) {
      return [];
    }

    return savedScores
      .map((savedScore) => {
        const scoreId = typeof savedScore === "string" ? savedScore : savedScore?.id;
        return CATALOG_SCORES_BY_ID.get(scoreId);
      })
      .filter(Boolean);
  } catch {
    return [];
  }
}

function loadRecentlyViewedScoreIds() {
  try {
    const scoreIds = JSON.parse(
      localStorage.getItem(RECENT_SCORES_STORAGE_KEY) ?? "[]",
    );

    if (!Array.isArray(scoreIds)) {
      return [];
    }

    return scoreIds
      .filter((scoreId) => typeof scoreId === "string")
      .filter((scoreId) => CATALOG_SCORES_BY_ID.has(scoreId))
      .slice(0, RECENT_SCORE_LIMIT);
  } catch {
    return [];
  }
}

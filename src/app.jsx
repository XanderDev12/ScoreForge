import { useEffect, useMemo, useRef, useState } from "react";
import { AuthDialog } from "./components/auth/auth-dialog.jsx";
import { Catalog } from "./components/catalog/catalog.jsx";
import { Home } from "./components/home/home.jsx";
import { AppShell } from "./components/layout/app-shell.jsx";
import { Learn } from "./components/learn/learn.jsx";
import { ScoreViewer } from "./components/score-viewer/score-viewer.jsx";
import { Uploads } from "./components/uploads/uploads.jsx";
import scores from "./data/scores/scores.json";
import { getRecommendedScores } from "./lib/recommendations/score-recommendations.js";
import { ensureProfileFromUser } from "./lib/supabase/profiles.js";
import { supabase } from "./lib/supabase/supabase-client.js";
import {
  deleteUserScore,
  fetchUserScores,
  persistUploadedScore,
} from "./lib/supabase/user-scores.js";
import { createUploadedScore } from "./lib/uploads/create-uploaded-score.js";

const SAVED_SCORES_STORAGE_KEY = "scoreforge:saved-scores";

export function App() {
  const [activeTab, setActiveTab] = useState("home");
  const [searchQuery, setSearchQuery] = useState("");
  const [savedScores, setSavedScores] = useState(() => loadSavedScores());
  const [uploadedScores, setUploadedScores] = useState([]);
  const [user, setUser] = useState(null);
  const [profile, setProfile] = useState(null);
  const [authDialogMode, setAuthDialogMode] = useState(null);
  const [forgeStatus, setForgeStatus] = useState("");
  const [forgeError, setForgeError] = useState("");
  const [profileError, setProfileError] = useState("");
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
    localStorage.setItem(SAVED_SCORES_STORAGE_KEY, JSON.stringify(savedScores));
  }, [savedScores]);

  useEffect(() => {
    let isMounted = true;

    async function loadSession() {
      const { data } = await supabase.auth.getSession();

      if (isMounted) {
        setUser(data.session?.user ?? null);
      }
    }

    loadSession();

    const { data } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
      setAuthDialogMode(null);
    });

    return () => {
      isMounted = false;
      data.subscription.unsubscribe();
    };
  }, []);

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
      account: null,
      scores,
    });
  }, []);

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
      setForgeStatus("");
    } catch (error) {
      setForgeStatus("");
      setForgeError(error instanceof Error ? error.message : "Unable to delete score.");
      throw error;
    }
  }

  function handleToggleSavedScore(score) {
    setSavedScores((currentSavedScores) => {
      const isSaved = currentSavedScores.some((savedScore) => savedScore.id === score.id);

      if (isSaved) {
        return currentSavedScores.filter((savedScore) => savedScore.id !== score.id);
      }

      return [...currentSavedScores, score];
    });
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
        onOpenAuth={setAuthDialogMode}
        onSignOut={handleSignOut}
        onTabChange={handleTabChange}
        onHome={handleHome}
        savedScores={savedScores}
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
            onToggleSavedScore={handleToggleSavedScore}
            onViewScore={handleSelectScore}
          />
        ) : activeTab === "home" ? (
          <Home
            onViewScore={handleSelectScore}
            recommendedScores={recommendedScores}
            onOpenCatalog={() => handleTabChange("catalog")}
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

      {authDialogMode ? (
        <AuthDialog mode={authDialogMode} onClose={() => setAuthDialogMode(null)} />
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

    const catalogScoresById = new Map(scores.map((score) => [score.id, score]));

    return savedScores
      .map((savedScore) => catalogScoresById.get(savedScore.id))
      .filter(Boolean);
  } catch {
    return [];
  }
}

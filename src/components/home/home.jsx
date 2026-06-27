import { useEffect, useRef, useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { ScoreCard } from "../scores/score-card.jsx";

export function Home({
  onOpenCatalog,
  onToggleSavedScore,
  onViewScore,
  pendingSavedScoreIds,
  profile,
  recentlyViewedScores,
  recommendedScores,
  savedScoreIds,
  savedScoresError,
  user,
}) {
  const isSignedIn = Boolean(user);
  const displayName = profile?.display_name || user?.email?.split("@")[0] || "there";

  return (
    <main className="home-page app-view">
      <section className="home-hero" aria-labelledby="home-title">
        <div>
          <p className="catalog-kicker">ScoreForge</p>
          <h1 id="home-title">
            {isSignedIn
              ? `Welcome back, ${displayName}.`
              : "Shape public domain scores into something playable."}
          </h1>
          <p>
            {isSignedIn
              ? getProfileSummary(profile)
              : "Browse the library, prepare uploads in the Forge, and build toward practice tools that keep the music close at hand."}
          </p>
        </div>

        <button className="home-primary-action" type="button" onClick={onOpenCatalog}>
          Browse catalog
        </button>
      </section>

      <HomeScoreSection
        emptyText={
          isSignedIn
            ? "Recommendations will appear as your profile preferences grow."
            : "Popular scores will appear here as the catalog grows."
        }
        heading={isSignedIn ? "Recommended for you" : "Popular scores"}
        onToggleSavedScore={onToggleSavedScore}
        onViewScore={onViewScore}
        pendingSavedScoreIds={pendingSavedScoreIds}
        savedScoreIds={savedScoreIds}
        scores={recommendedScores}
      />
      {savedScoresError ? (
        <p className="catalog-save-error" role="alert">{savedScoresError}</p>
      ) : null}

      <HomeScoreSection
        emptyText="Scores you open from the catalog will appear here."
        heading="Recently opened"
        onToggleSavedScore={onToggleSavedScore}
        onViewScore={onViewScore}
        pendingSavedScoreIds={pendingSavedScoreIds}
        savedScoreIds={savedScoreIds}
        scores={recentlyViewedScores}
      />
    </main>
  );
}

function getProfileSummary(profile) {
  const focus = [profile?.skill_level, profile?.primary_instrument]
    .filter(Boolean)
    .join(" ");

  return focus
    ? `Your ${focus} workspace is ready whenever you are.`
    : "Your scores and practice workspace are ready whenever you are.";
}

function HomeScoreSection({
  emptyText,
  heading,
  onToggleSavedScore,
  onViewScore,
  pendingSavedScoreIds,
  savedScoreIds,
  scores,
}) {
  const carouselRef = useRef(null);
  const dragStateRef = useRef(null);
  const suppressClickRef = useRef(false);
  const [canScrollBack, setCanScrollBack] = useState(false);
  const [canScrollForward, setCanScrollForward] = useState(false);

  useEffect(() => {
    const carousel = carouselRef.current;

    if (!carousel) {
      return undefined;
    }

    function updateScrollButtons() {
      const maxScrollLeft = carousel.scrollWidth - carousel.clientWidth;
      setCanScrollBack(carousel.scrollLeft > 1);
      setCanScrollForward(maxScrollLeft - carousel.scrollLeft > 1);
    }

    updateScrollButtons();
    carousel.addEventListener("scroll", updateScrollButtons, { passive: true });

    const observer = new ResizeObserver(updateScrollButtons);
    observer.observe(carousel);

    return () => {
      carousel.removeEventListener("scroll", updateScrollButtons);
      observer.disconnect();
    };
  }, [scores]);

  function scrollCarousel(direction) {
    const carousel = carouselRef.current;

    if (!carousel) {
      return;
    }

    carousel.scrollBy({
      behavior: "smooth",
      left: direction * Math.max(272, carousel.clientWidth * 0.8),
    });
  }

  function handlePointerDown(event) {
    const carousel = carouselRef.current;

    if (
      !carousel
      || event.button !== 0
      || event.target.closest(".score-card-actions")
    ) {
      return;
    }

    dragStateRef.current = {
      pointerId: event.pointerId,
      startScrollLeft: carousel.scrollLeft,
      startX: event.clientX,
    };
    carousel.setPointerCapture(event.pointerId);
    carousel.classList.add("dragging");
  }

  function handlePointerMove(event) {
    const carousel = carouselRef.current;
    const dragState = dragStateRef.current;

    if (!carousel || !dragState || dragState.pointerId !== event.pointerId) {
      return;
    }

    const distance = event.clientX - dragState.startX;

    if (Math.abs(distance) > 5) {
      suppressClickRef.current = true;
    }

    carousel.scrollLeft = dragState.startScrollLeft - distance;
  }

  function finishPointerDrag(event) {
    const carousel = carouselRef.current;
    const dragState = dragStateRef.current;

    if (!carousel || !dragState || dragState.pointerId !== event.pointerId) {
      return;
    }

    if (carousel.hasPointerCapture(event.pointerId)) {
      carousel.releasePointerCapture(event.pointerId);
    }

    carousel.classList.remove("dragging");
    dragStateRef.current = null;

    window.setTimeout(() => {
      suppressClickRef.current = false;
    }, 0);
  }

  function handleClickCapture(event) {
    if (suppressClickRef.current) {
      event.preventDefault();
      event.stopPropagation();
      suppressClickRef.current = false;
    }
  }

  return (
    <section className="home-score-section" aria-labelledby={`home-${toId(heading)}`}>
      <div className="home-section-header">
        <h2 id={`home-${toId(heading)}`}>{heading}</h2>
        <div className="home-section-actions">
          <span>{scores.length}</span>
          <button
            type="button"
            disabled={!canScrollBack}
            onClick={() => scrollCarousel(-1)}
            aria-label={`Show previous ${heading.toLowerCase()}`}
          >
            <ChevronLeft aria-hidden="true" size={18} strokeWidth={2} />
          </button>
          <button
            type="button"
            disabled={!canScrollForward}
            onClick={() => scrollCarousel(1)}
            aria-label={`Show more ${heading.toLowerCase()}`}
          >
            <ChevronRight aria-hidden="true" size={18} strokeWidth={2} />
          </button>
        </div>
      </div>

      {scores.length > 0 ? (
        <div
          className="score-card-grid home-score-carousel"
          ref={carouselRef}
          onClickCapture={handleClickCapture}
          onPointerCancel={finishPointerDrag}
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={finishPointerDrag}
        >
          {scores.map((score) => (
            <ScoreCard
              isSaved={savedScoreIds.has(score.id)}
              isSavePending={pendingSavedScoreIds.has(score.id)}
              key={score.id}
              onToggleSavedScore={onToggleSavedScore}
              onViewScore={onViewScore}
              score={score}
            />
          ))}
        </div>
      ) : (
        <p className="home-score-empty">{emptyText}</p>
      )}
    </section>
  );
}

function toId(value) {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, "-");
}

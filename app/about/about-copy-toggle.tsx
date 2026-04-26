"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Languages as LanguagesIcon } from "lucide-react";
import { Button } from "@/components/ui/button";

const FR_PARAGRAPHS = [
  "Chaque caractère est généré indépendamment, dans un processus où l'intention et la détermination s'érodent de concert, laissant le message s'altérer à mesure qu'il prend forme.",
  "À considérer, éventuellement, comme une épreuve : seules les formulations portées par une foi inébranlable parviennent à être exprimées.",
  "À l'instar de messagers d'antan, c'est par la force du dessein qu'un chemin se trace dans l'adversité.",
];

const EN_PARAGRAPHS = [
  "Each character is generated independently, through a process where intention and resolve erode together, allowing the message to alter itself as it takes shape.",
  "It may, perhaps, be regarded as a trial: only formulations carried by unwavering faith manage to be expressed.",
  "Like messengers of old, it is through the force of purpose that a path is carved through adversity.",
];

const TEXT_CLASS_NAME = "text-[0.98rem] leading-7";

type ActiveTransition = {
  paragraphIndex: number;
  sourceText: string;
  targetText: string;
  cursor: number;
};

export function AboutCopyToggle() {
  const [isEnglish, setIsEnglish] = useState(false);
  const [isAnimating, setIsAnimating] = useState(false);
  const [displayedParagraphs, setDisplayedParagraphs] = useState(FR_PARAGRAPHS);
  const [activeTransition, setActiveTransition] = useState<ActiveTransition | null>(
    null,
  );

  const animationFrameRef = useRef<number | null>(null);
  const runIdRef = useRef(0);

  const clearAnimationHandles = useCallback(() => {
    if (animationFrameRef.current !== null) {
      window.cancelAnimationFrame(animationFrameRef.current);
      animationFrameRef.current = null;
    }
  }, []);

  useEffect(() => {
    return () => {
      clearAnimationHandles();
    };
  }, [clearAnimationHandles]);

  const handleToggleLanguage = useCallback(() => {
    if (isAnimating) {
      return;
    }

    const targetParagraphs = isEnglish ? FR_PARAGRAPHS : EN_PARAGRAPHS;
    const currentParagraphs = displayedParagraphs;
    const runId = runIdRef.current + 1;

    setIsAnimating(true);
    setIsEnglish((prev) => !prev);
    runIdRef.current = runId;
    clearAnimationHandles();

    const animateParagraph = (targetText: string, paragraphIndex: number) => {
      const sourceText = currentParagraphs[paragraphIndex] ?? "";
      const totalSteps = Math.max(sourceText.length, targetText.length);
      const durationMs = Math.min(780, Math.max(320, totalSteps * 5));

      return new Promise<void>((resolve) => {
        let startTime = -1;
        let previousCursor = -1;
        const easeOutSine = (t: number) => Math.sin((t * Math.PI) / 2);

        const tick = (now: number) => {
          if (runIdRef.current !== runId) {
            animationFrameRef.current = null;
            resolve();
            return;
          }

          if (startTime < 0) {
            startTime = now;
            setActiveTransition({
              paragraphIndex,
              sourceText,
              targetText,
              cursor: 0,
            });
          }

          const elapsed = now - startTime;
          const progress = Math.min(1, elapsed / durationMs);
          const cursor = Math.round(totalSteps * easeOutSine(progress));

          if (cursor !== previousCursor) {
            setActiveTransition({
              paragraphIndex,
              sourceText,
              targetText,
              cursor,
            });
            previousCursor = cursor;
          }

          if (progress < 1) {
            animationFrameRef.current = window.requestAnimationFrame(tick);
            return;
          }

          setDisplayedParagraphs((prev) => {
            const next = [...prev];
            next[paragraphIndex] = targetText;
            return next;
          });
          setActiveTransition(null);
          animationFrameRef.current = null;
          resolve();
        };

        animationFrameRef.current = window.requestAnimationFrame(tick);
      });
    };

    void (async () => {
      for (const [paragraphIndex, targetText] of targetParagraphs.entries()) {
        await animateParagraph(targetText, paragraphIndex);
        if (runIdRef.current !== runId) {
          return;
        }
      }

      setDisplayedParagraphs(targetParagraphs);
      setActiveTransition(null);
      setIsAnimating(false);
      clearAnimationHandles();
    })();
  }, [clearAnimationHandles, displayedParagraphs, isAnimating, isEnglish]);

  return (
    <section className="relative space-y-4 pr-10 sm:pr-0">
      <Button
        type="button"
        variant="ghost"
        size="icon"
        onClick={handleToggleLanguage}
        disabled={isAnimating}
        className="absolute right-0 top-0 size-8 text-muted-foreground sm:-right-10"
        title={isEnglish ? "Passer en français" : "Switch to English"}
        aria-label={isEnglish ? "Passer en français" : "Switch to English"}
      >
        <LanguagesIcon className="size-4" aria-hidden="true" />
      </Button>

      {displayedParagraphs.map((paragraph, index) => {
        const isActive = activeTransition?.paragraphIndex === index;

        return (
          <p key={index} className={TEXT_CLASS_NAME}>
            {isActive ? (
              <>
                {activeTransition.targetText.slice(0, activeTransition.cursor)}
                <span className="text-muted-foreground/60 transition-colors">
                  {activeTransition.sourceText.slice(activeTransition.cursor)}
                </span>
              </>
            ) : (
              paragraph
            )}
          </p>
        );
      })}
    </section>
  );
}

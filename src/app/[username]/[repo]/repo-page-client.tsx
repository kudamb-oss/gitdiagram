"use client";

import {
  type KeyboardEvent,
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react";
import dynamic from "next/dynamic";
import { Key } from "lucide-react";
import { toast } from "sonner";
import type { DiagramStateResponse } from "~/features/diagram/types";
import MainCard from "~/components/main-card";
import Loading from "~/components/loading";
import { GenerationAuditPanel } from "~/components/generation-audit-panel";
import { Eli5Panel } from "~/components/eli5-panel";
import { useDiagram } from "~/hooks/useDiagram";
import { ApiKeyDialog } from "~/components/api-key-dialog";
import { useStarReminder } from "~/hooks/useStarReminder";
import { SponsorSlot } from "~/components/sponsor-slot";
import { Button } from "~/components/ui/button";
import { Toaster } from "~/components/ui/sonner";
import { TooltipProvider } from "~/components/ui/tooltip";

const loadMermaidChart = () => import("~/components/mermaid-diagram");
const MermaidChart = dynamic(loadMermaidChart, {
  // The default diagram is not shown in the zoom viewer, so rendering that
  // frame while this chunk loads causes a misleading flash on cold visits.
  loading: () => null,
});

type RepoView = "diagram" | "eli5";
const repoViews: readonly RepoView[] = ["diagram", "eli5"];

type RepoPageClientProps = {
  username: string;
  repo: string;
  initialState?: DiagramStateResponse | null;
  initialStateIsAuthoritative?: boolean;
};

export default function RepoPageClient({
  username,
  repo,
  initialState = null,
  initialStateIsAuthoritative = false,
}: RepoPageClientProps) {
  const [zoomingEnabled, setZoomingEnabled] = useState(false);
  const [diagramRendered, setDiagramRendered] = useState(false);
  const [activeView, setActiveView] = useState<RepoView>("diagram");
  const viewTabRefs = useRef<Record<RepoView, HTMLButtonElement | null>>({
    diagram: null,
    eli5: null,
  });

  useStarReminder();

  const normalizedUsername = username.toLowerCase();
  const normalizedRepo = repo.toLowerCase();

  const {
    diagram,
    error,
    loading,
    lastGenerated,
    showApiKeyDialog,
    handleCopy,
    handleApiKeySaved,
    handleCloseApiKeyDialog,
    handleOpenApiKeyDialog,
    handleExportImage,
    handleRegenerate,
    handleDiagramRenderError,
    state,
  } = useDiagram(
    normalizedUsername,
    normalizedRepo,
    initialState,
    initialStateIsAuthoritative,
  );

  const hasDiagram = Boolean(diagram);
  const hasEli5Data = Boolean(
    state.explanation?.trim() || state.graph?.nodes.length,
  );
  const showViewTabs = hasDiagram && hasEli5Data;
  const hasError = Boolean(error || state.error);
  // Offer the personal-key escape hatch on any rate-limited generation, not
  // only when the error text happens to mention an API key.
  const showApiKeyCta =
    state.errorCode === "RATE_LIMITED" ||
    Boolean(error?.includes("API key")) ||
    Boolean(state.error?.includes("API key"));

  useEffect(() => {
    if (hasDiagram || loading) {
      void loadMermaidChart();
    }
  }, [hasDiagram, loading]);

  const handleDiagramRenderComplete = useCallback(() => {
    setDiagramRendered(true);
  }, []);

  useEffect(() => {
    if (!hasEli5Data) {
      setActiveView("diagram");
    }
  }, [hasEli5Data]);

  useEffect(() => {
    setDiagramRendered(false);
  }, [diagram]);

  useEffect(() => {
    if (!state.persistenceWarning) {
      return;
    }

    toast.warning("Diagram generated, but not saved", {
      description: state.persistenceWarning,
      duration: 8_000,
    });
  }, [state.persistenceWarning]);

  const handleViewKeyDown = useCallback(
    (event: KeyboardEvent<HTMLButtonElement>, currentView: RepoView) => {
      if (event.key !== "ArrowLeft" && event.key !== "ArrowRight") {
        return;
      }

      event.preventDefault();
      const currentIndex = repoViews.indexOf(currentView);
      const offset = event.key === "ArrowRight" ? 1 : -1;
      const nextIndex =
        (currentIndex + offset + repoViews.length) % repoViews.length;
      const nextView = repoViews[nextIndex];
      if (!nextView) {
        return;
      }
      setActiveView(nextView);
      viewTabRefs.current[nextView]?.focus();
    },
    [],
  );

  return (
    <TooltipProvider delayDuration={500} skipDelayDuration={300}>
      <main className="flex flex-col items-center p-4">
        <div className="flex w-full justify-center pt-8">
          <MainCard
            isHome={false}
            username={normalizedUsername}
            repo={normalizedRepo}
            hasDiagram={hasDiagram}
            onCopy={handleCopy}
            lastGenerated={lastGenerated}
            costSummary={state.costSummary}
            onExportImage={handleExportImage}
            onRegenerate={handleRegenerate}
            zoomingEnabled={zoomingEnabled}
            onZoomToggle={() => setZoomingEnabled((prev) => !prev)}
            loading={loading}
          />
        </div>
        <div className="mt-8 flex w-full flex-col items-center gap-8">
          {loading ? (
            <Loading
              costSummary={state.costSummary}
              status={state.status}
              message={state.message}
              explanation={state.explanation}
              graph={state.graph}
              graphAttempts={state.graphAttempts}
              validationError={state.validationError}
              diagram={state.diagram}
            />
          ) : (
            <div className="flex w-full flex-col items-center gap-8">
              {(hasDiagram || hasEli5Data) && (
                <>
                  {showViewTabs && (
                    <div
                      role="tablist"
                      aria-label="リポジトリの表示方法"
                      className="flex border-2 border-black bg-background p-1 shadow-[3px_3px_0_0_#000]"
                    >
                      <button
                        id="diagram-tab"
                        ref={(element) => {
                          viewTabRefs.current.diagram = element;
                        }}
                        type="button"
                        role="tab"
                        aria-controls="diagram-panel"
                        aria-selected={activeView === "diagram"}
                        tabIndex={activeView === "diagram" ? 0 : -1}
                        onClick={() => setActiveView("diagram")}
                        onKeyDown={(event) =>
                          handleViewKeyDown(event, "diagram")
                        }
                        className={`px-4 py-2 text-sm font-black focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-yellow-400 sm:text-base ${
                          activeView === "diagram"
                            ? "bg-yellow-300 text-black"
                            : "hover:bg-muted"
                        }`}
                      >
                        図解
                      </button>
                      <button
                        id="eli5-tab"
                        ref={(element) => {
                          viewTabRefs.current.eli5 = element;
                        }}
                        type="button"
                        role="tab"
                        aria-controls="eli5-panel"
                        aria-selected={activeView === "eli5"}
                        tabIndex={activeView === "eli5" ? 0 : -1}
                        onClick={() => setActiveView("eli5")}
                        onKeyDown={(event) => handleViewKeyDown(event, "eli5")}
                        className={`px-4 py-2 text-sm font-black focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-yellow-400 sm:text-base ${
                          activeView === "eli5"
                            ? "bg-yellow-300 text-black"
                            : "hover:bg-muted"
                        }`}
                      >
                        やさしく見る
                      </button>
                    </div>
                  )}
                  {hasDiagram && (
                    <div
                      id="diagram-panel"
                      role={showViewTabs ? "tabpanel" : undefined}
                      aria-labelledby={showViewTabs ? "diagram-tab" : undefined}
                      hidden={showViewTabs && activeView !== "diagram"}
                      className="flex w-full justify-center px-4"
                    >
                      <MermaidChart
                        chart={diagram}
                        zoomingEnabled={zoomingEnabled}
                        onRenderError={handleDiagramRenderError}
                        onRenderComplete={handleDiagramRenderComplete}
                      />
                    </div>
                  )}
                  {hasEli5Data && (
                    <div
                      id="eli5-panel"
                      role={showViewTabs ? "tabpanel" : undefined}
                      aria-labelledby={showViewTabs ? "eli5-tab" : undefined}
                      hidden={showViewTabs && activeView !== "eli5"}
                      className="w-full"
                    >
                      <Eli5Panel
                        explanation={state.explanation}
                        graph={state.graph}
                      />
                    </div>
                  )}
                  {hasDiagram &&
                    diagramRendered &&
                    (!showViewTabs || activeView === "diagram") && (
                      <SponsorSlot
                        surface="diagram"
                        className="mx-4 mb-8 max-w-5xl sm:mb-12"
                      />
                    )}
                </>
              )}
              {hasError && (
                <div className="w-full max-w-5xl text-center">
                  <GenerationAuditPanel
                    audit={state.latestSessionAudit}
                    error={error || state.error}
                  />
                  {showApiKeyCta && (
                    <div className="mt-8 flex flex-col items-center gap-2">
                      <Button
                        onClick={handleOpenApiKeyDialog}
                        className="neo-button px-4 py-2"
                      >
                        <Key className="mr-2 h-5 w-5" />
                        Use Your AI Key
                      </Button>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </div>

        <ApiKeyDialog
          isOpen={showApiKeyDialog}
          onClose={handleCloseApiKeyDialog}
          onSaved={handleApiKeySaved}
        />
        <Toaster />
      </main>
    </TooltipProvider>
  );
}

"use client";

import { useMemo, useState } from "react";

import type { DiagramGraph } from "~/features/diagram/graph";
import { buildEli5ViewModel } from "~/features/diagram/eli5";

interface Eli5PanelProps {
  explanation?: string | null;
  graph?: DiagramGraph | null;
}

export function Eli5Panel({ explanation, graph }: Eli5PanelProps) {
  const viewModel = useMemo(
    () => buildEli5ViewModel({ explanation, graph }),
    [explanation, graph],
  );
  const [selectedPartId, setSelectedPartId] = useState<string | null>(null);

  if (!viewModel) {
    return null;
  }

  const selectedPart =
    viewModel.parts.find((part) => part.id === selectedPartId) ??
    viewModel.parts[0];

  return (
    <article
      data-testid="eli5-panel"
      className="mx-auto w-full max-w-5xl space-y-6 px-4 pb-8 text-left"
      aria-label="初心者向けのやさしい解説"
    >
      <header className="border-2 border-black bg-yellow-100 p-5 shadow-[4px_4px_0_0_#000] sm:p-6 dark:bg-yellow-950">
        <p className="text-sm font-bold uppercase tracking-wider">
          ELI5 Lite
        </p>
        <h2 className="mt-1 text-2xl font-black sm:text-3xl">
          このリポジトリをやさしく見る
        </h2>
        <p className="mt-2 text-sm sm:text-base">
          すでに作られた説明と図のデータを、身近な言葉に並べ替えて表示しています。
        </p>
      </header>

      {viewModel.summary && (
        <section
          className="border-2 border-black bg-background p-5 shadow-[4px_4px_0_0_#000] sm:p-6"
          aria-labelledby="eli5-summary-heading"
        >
          <h3 id="eli5-summary-heading" className="text-xl font-black">
            ひとことで言うと
          </h3>
          <p className="mt-3 text-base leading-7 sm:text-lg">
            {viewModel.summary}
          </p>
        </section>
      )}

      {viewModel.parts.length > 0 && (
        <section aria-labelledby="eli5-parts-heading">
          <h3 id="eli5-parts-heading" className="text-xl font-black">
            主な登場人物
          </h3>
          <p className="mt-1 text-sm text-muted-foreground">
            気になる部品を選ぶと、役割を詳しく確認できます。
          </p>
          <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {viewModel.parts.map((part) => {
              const isSelected = selectedPart?.id === part.id;
              return (
                <button
                  key={part.id}
                  type="button"
                  aria-pressed={isSelected}
                  onClick={() => setSelectedPartId(part.id)}
                  className={`border-2 border-black p-4 text-left transition-transform focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-yellow-400 ${
                    isSelected
                      ? "-translate-y-1 bg-cyan-100 shadow-[4px_4px_0_0_#000] dark:bg-cyan-950"
                      : "bg-background hover:-translate-y-0.5 hover:shadow-[3px_3px_0_0_#000]"
                  }`}
                >
                  <span className="block font-black">{part.name}</span>
                  {part.analogy && (
                    <span className="mt-2 block text-sm">たとえると：{part.analogy}</span>
                  )}
                  <span className="mt-2 block text-xs text-muted-foreground">
                    {part.type}
                  </span>
                </button>
              );
            })}
          </div>

          {selectedPart && (
            <div
              className="mt-4 border-l-4 border-black bg-muted p-4"
              aria-live="polite"
            >
              <p className="font-black">{selectedPart.name}の役割</p>
              <p className="mt-1 leading-7">{selectedPart.description}</p>
            </div>
          )}
        </section>
      )}

      {viewModel.flow.length > 0 && (
        <section aria-labelledby="eli5-flow-heading">
          <h3 id="eli5-flow-heading" className="text-xl font-black">
            何が起きるの？
          </h3>
          <ol className="mt-4 space-y-3">
            {viewModel.flow.map((step, index) => (
              <li key={step.id} className="flex items-start gap-3">
                <span
                  className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border-2 border-black bg-pink-200 font-black dark:bg-pink-950"
                  aria-hidden="true"
                >
                  {index + 1}
                </span>
                <p className="pt-1 leading-7">{step.text}</p>
              </li>
            ))}
          </ol>
          <p className="mt-3 text-xs text-muted-foreground">
            代表的なつながりを表示しています。実際の処理順とは異なる場合があります。
          </p>
        </section>
      )}

      {viewModel.glossary.length > 0 && (
        <section aria-labelledby="eli5-glossary-heading">
          <h3 id="eli5-glossary-heading" className="text-xl font-black">
            ことばをやさしく
          </h3>
          <dl className="mt-4 grid gap-3 sm:grid-cols-2">
            {viewModel.glossary.map((entry) => (
              <div key={entry.term} className="border-2 border-black bg-background p-4">
                <dt className="font-black">{entry.term}</dt>
                <dd className="mt-1 text-sm leading-6">{entry.explanation}</dd>
              </div>
            ))}
          </dl>
        </section>
      )}

      {viewModel.originalExplanation && (
        <details className="border-2 border-black bg-background p-4">
          <summary className="cursor-pointer font-black">
            元の技術的な説明
          </summary>
          <p className="mt-4 whitespace-pre-wrap text-sm leading-6 text-muted-foreground">
            {viewModel.originalExplanation}
          </p>
        </details>
      )}
    </article>
  );
}

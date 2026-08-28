import { describe, expect, it } from "vitest";

import type { DiagramGraph } from "~/features/diagram/graph";
import { buildEli5ViewModel } from "~/features/diagram/eli5";

function node(
  id: string,
  label: string,
  type: string,
  description: string | null = null,
) {
  return {
    id,
    label,
    type,
    description,
    groupId: null,
    path: null,
    shape: null,
  } as const;
}

function graphFixture(): DiagramGraph {
  return {
    groups: [],
    nodes: [
      node("browser", "Browser UI", "frontend"),
      node("api", "Generation API", "API route"),
      node("planner", "Graph Planner", "AI model"),
      node("store", "Artifact Store", "R2 storage"),
    ],
    edges: [
      {
        from: "browser",
        to: "api",
        label: "repository URL",
        description: null,
        style: null,
      },
      {
        from: "api",
        to: "planner",
        label: "architecture explanation",
        description: null,
        style: null,
      },
      {
        from: "planner",
        to: "store",
        label: "validated AST",
        description: null,
        style: null,
      },
    ],
  };
}

describe("buildEli5ViewModel", () => {
  it("builds a deterministic beginner view from explanation and graph", () => {
    const graph = graphFixture();
    const params = {
      explanation:
        "## Overview\nGitDiagram turns a GitHub repository into a Mermaid architecture diagram. It stores the validated AST in R2.",
      graph,
    };

    const first = buildEli5ViewModel(params);
    const second = buildEli5ViewModel(params);

    expect(first).toEqual(second);
    expect(first).toMatchObject({
      summary:
        "Overview GitDiagram turns a GitHub repository into a Mermaid architecture diagram.",
      originalExplanation:
        "## Overview\nGitDiagram turns a GitHub repository into a Mermaid architecture diagram. It stores the validated AST in R2.",
    });
    expect(first?.parts).toHaveLength(4);
    expect(first?.parts[0]).toMatchObject({
      id: "api",
      analogy: "お願いを受け取る受付窓口",
    });
    expect(first?.flow.map((step) => step.from)).toEqual([
      "Browser UI",
      "Generation API",
      "Graph Planner",
    ]);
    expect(first?.glossary.map((entry) => entry.term)).toEqual([
      "API",
      "AST",
      "Mermaid",
      "R2",
      "フロントエンド",
    ]);
  });

  it("bounds parts, flow steps, glossary entries, and summary length", () => {
    const nodes = Array.from({ length: 9 }, (_, index) =>
      node(`node_${index}`, `Node ${index}`, "API database cache queue frontend"),
    );
    const graph: DiagramGraph = {
      groups: [],
      nodes,
      edges: nodes.slice(1).map((current, index) => ({
        from: nodes[index]!.id,
        to: current.id,
        label: "next",
        description: null,
        style: null,
      })),
    };
    const explanation = `${"A".repeat(400)}. API AST Mermaid DOMPurify Redis R2 backend`;

    const result = buildEli5ViewModel({ explanation, graph });

    expect(result?.summary?.length).toBeLessThanOrEqual(280);
    expect(result?.parts).toHaveLength(6);
    expect(result?.flow).toHaveLength(5);
    expect(result?.glossary).toHaveLength(6);
  });

  it("uses only the first Japanese sentence without requiring whitespace", () => {
    const result = buildEli5ViewModel({
      explanation: "コードから構成図を作ります。次に説明を表示します。",
    });

    expect(result?.summary).toBe("コードから構成図を作ります。");
  });

  it("supports explanation-only artifacts", () => {
    const result = buildEli5ViewModel({
      explanation: "A small command-line tool. It reads local files.",
    });

    expect(result).toMatchObject({
      summary: "A small command-line tool.",
      parts: [],
      flow: [],
      glossary: [],
    });
  });

  it("supports graph-only artifacts without inventing unknown analogies", () => {
    const graph: DiagramGraph = {
      groups: [],
      nodes: [node("engine", "Rules Engine", "domain orchestrator")],
      edges: [],
    };

    const result = buildEli5ViewModel({ graph });

    expect(result?.summary).toBeUndefined();
    expect(result?.parts).toEqual([
      {
        id: "engine",
        name: "Rules Engine",
        type: "domain orchestrator",
        description:
          "「Rules Engine」は、domain orchestratorとしてほかの部品と連携します。",
      },
    ]);
  });

  it("ignores dangling edges and handles cycles without throwing", () => {
    const graph: DiagramGraph = {
      groups: [],
      nodes: [node("a", "A", "service"), node("b", "B", "worker")],
      edges: [
        {
          from: "a",
          to: "b",
          label: null,
          description: null,
          style: null,
        },
        {
          from: "b",
          to: "a",
          label: null,
          description: null,
          style: null,
        },
        {
          from: "missing",
          to: "a",
          label: null,
          description: null,
          style: null,
        },
      ],
    };

    const result = buildEli5ViewModel({ graph });

    expect(result?.flow).toHaveLength(2);
    expect(result?.flow.every((step) => !step.text.includes("missing"))).toBe(
      true,
    );
  });

  it("returns null when neither usable input exists", () => {
    expect(
      buildEli5ViewModel({ explanation: "  ", graph: null }),
    ).toBeNull();
  });

  it("does not mutate the input graph", () => {
    const graph = graphFixture();
    const before = structuredClone(graph);

    buildEli5ViewModel({ explanation: "Overview.", graph });

    expect(graph).toEqual(before);
  });
});

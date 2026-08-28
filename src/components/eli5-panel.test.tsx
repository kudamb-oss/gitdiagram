import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";

import { Eli5Panel } from "~/components/eli5-panel";
import type { DiagramGraph } from "~/features/diagram/graph";

function graphFixture(): DiagramGraph {
  return {
    groups: [],
    nodes: [
      {
        id: "browser",
        label: "Browser UI",
        type: "frontend",
        description: "The screen a visitor uses.",
        groupId: null,
        path: null,
        shape: null,
      },
      {
        id: "store",
        label: "Artifact Store",
        type: "R2 storage",
        description: "Keeps completed diagrams.",
        groupId: null,
        path: null,
        shape: null,
      },
    ],
    edges: [
      {
        from: "browser",
        to: "store",
        label: "diagram",
        description: null,
        style: null,
      },
    ],
  };
}

describe("Eli5Panel", () => {
  afterEach(() => {
    cleanup();
  });

  it("renders the available beginner sections and original explanation", () => {
    render(
      <Eli5Panel
        explanation="This app uses an API and stores Mermaid diagrams in R2."
        graph={graphFixture()}
      />,
    );

    expect(
      screen.getByRole("heading", { name: "ひとことで言うと" }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("heading", { name: "主な登場人物" }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("heading", { name: "何が起きるの？" }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("heading", { name: "ことばをやさしく" }),
    ).toBeInTheDocument();
    expect(screen.getByText("元の技術的な説明")).toBeInTheDocument();
  });

  it("lets a reader select a component without requesting new data", () => {
    render(
      <Eli5Panel explanation="A repository overview." graph={graphFixture()} />,
    );

    const storeButton = screen.getByRole("button", {
      name: /Artifact Store/,
    });
    fireEvent.click(storeButton);

    expect(storeButton).toHaveAttribute("aria-pressed", "true");
    expect(screen.getByText("Artifact Storeの役割")).toBeInTheDocument();
    expect(screen.getByText("Keeps completed diagrams.")).toBeInTheDocument();
  });

  it("renders HTML-like input as text instead of executable elements", () => {
    const graph = graphFixture();
    graph.nodes[0] = {
      ...graph.nodes[0]!,
      label: "<script>alert('unsafe')</script>",
    };
    const { container } = render(
      <Eli5Panel
        explanation={'<img src="x" onerror="alert(1)">.'}
        graph={graph}
      />,
    );

    expect(container.querySelector("script")).toBeNull();
    expect(container.querySelector("img")).toBeNull();
    expect(
      screen.getAllByText("<script>alert('unsafe')</script>").length,
    ).toBeGreaterThan(0);
    expect(
      screen.getAllByText('<img src="x" onerror="alert(1)">.').length,
    ).toBeGreaterThan(0);
  });

  it("omits graph sections when only an explanation is available", () => {
    render(<Eli5Panel explanation="A small command-line tool." />);

    expect(
      screen.getByRole("heading", { name: "ひとことで言うと" }),
    ).toBeInTheDocument();
    expect(
      screen.queryByRole("heading", { name: "主な登場人物" }),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByRole("heading", { name: "何が起きるの？" }),
    ).not.toBeInTheDocument();
  });

  it("renders nothing when neither input is usable", () => {
    const { container } = render(<Eli5Panel explanation="  " graph={null} />);

    expect(container).toBeEmptyDOMElement();
  });
});

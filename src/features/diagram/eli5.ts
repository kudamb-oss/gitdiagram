import type {
  DiagramGraph,
  DiagramGraphEdge,
  DiagramGraphNode,
} from "~/features/diagram/graph";

const MAX_SUMMARY_LENGTH = 280;
const MAX_PARTS = 6;
const MAX_FLOW_STEPS = 5;
const MAX_GLOSSARY_ENTRIES = 6;

interface AnalogyDefinition {
  patterns: readonly RegExp[];
  analogy: string;
}

interface GlossaryDefinition {
  term: string;
  pattern: RegExp;
  explanation: string;
}

const analogyDefinitions: readonly AnalogyDefinition[] = [
  {
    patterns: [/\bauth(?:entication|orization)?\b/iu, /\bsecurity\b/iu],
    analogy: "入場を確認する警備員",
  },
  {
    patterns: [/\bapi\b/iu, /\broute\b/iu, /\bgateway\b/iu, /\bcontroller\b/iu],
    analogy: "お願いを受け取る受付窓口",
  },
  {
    patterns: [/\bdatabase\b/iu, /\bdb\b/iu, /\bstorage\b/iu, /\br2\b/iu, /\bs3\b/iu],
    analogy: "情報をしまう倉庫",
  },
  {
    patterns: [/\bcache\b/iu, /\bredis\b/iu],
    analogy: "すぐ見返せる共有メモ",
  },
  {
    patterns: [/\bqueue\b/iu, /\bevent\b/iu, /\bbroker\b/iu],
    analogy: "順番を守る待ち列",
  },
  {
    patterns: [/\bfrontend\b/iu, /\bclient\b/iu, /\bui\b/iu, /\bbrowser\b/iu],
    analogy: "利用者が触る案内カウンター",
  },
  {
    patterns: [/\bbackend\b/iu, /\bserver\b/iu, /\bservice\b/iu],
    analogy: "裏側で仕事をする作業場",
  },
  {
    patterns: [/\bworker\b/iu, /\bjob\b/iu],
    analogy: "仕事を受け持つ担当スタッフ",
  },
  {
    patterns: [/\bcompiler\b/iu, /\bvalidator\b/iu, /\bparser\b/iu],
    analogy: "間違いを見つける校正係",
  },
  {
    patterns: [/\bai\b/iu, /\bllm\b/iu, /\bmodel\b/iu],
    analogy: "情報を整理する解説者",
  },
  {
    patterns: [/\bcli\b/iu, /\bcommand\b/iu],
    analogy: "文字で操作するリモコン",
  },
  {
    patterns: [/\blibrary\b/iu, /\bpackage\b/iu, /\bsdk\b/iu],
    analogy: "何度も使える道具箱",
  },
  {
    patterns: [/\bdocs?\b/iu, /\breadme\b/iu],
    analogy: "使い方を伝える説明書",
  },
] as const;

const glossaryDefinitions: readonly GlossaryDefinition[] = [
  {
    term: "API",
    pattern: /\bapi\b/iu,
    explanation: "別の仕組みにお願いを渡すための受付窓口です。",
  },
  {
    term: "AST",
    pattern: /\bast\b/iu,
    explanation: "図を描く前に、部品とつながりを整理した下書きです。",
  },
  {
    term: "Mermaid",
    pattern: /\bmermaid\b/iu,
    explanation: "文字で書いた設計情報から図を描くための道具です。",
  },
  {
    term: "サニタイズ",
    pattern: /\b(?:sanitize|sanitization|dompurify)\b/iu,
    explanation: "危険な命令が混ざっていないか確認して取り除くことです。",
  },
  {
    term: "データベース",
    pattern: /\b(?:database|db)\b/iu,
    explanation: "あとで探して使えるように、情報を整理して保存する場所です。",
  },
  {
    term: "キャッシュ",
    pattern: /\bcache\b/iu,
    explanation: "よく使う情報を、すぐ取り出せる場所に一時保存する仕組みです。",
  },
  {
    term: "Redis",
    pattern: /\bredis\b/iu,
    explanation: "短い情報をすばやく保存・共有するための仕組みです。",
  },
  {
    term: "R2",
    pattern: /\br2\b/iu,
    explanation: "完成した図や説明などのファイルを保存する倉庫です。",
  },
  {
    term: "キュー",
    pattern: /\bqueue\b/iu,
    explanation: "仕事を受け付けた順番に並べておく待ち列です。",
  },
  {
    term: "フロントエンド",
    pattern: /\bfrontend\b/iu,
    explanation: "画面など、利用者が直接見たり操作したりする部分です。",
  },
  {
    term: "バックエンド",
    pattern: /\bbackend\b/iu,
    explanation: "画面の裏側で、計算や保存などを担当する部分です。",
  },
] as const;

export interface Eli5Part {
  id: string;
  name: string;
  type: string;
  description: string;
  analogy?: string;
}

export interface Eli5FlowStep {
  id: string;
  from: string;
  to: string;
  text: string;
}

export interface Eli5GlossaryEntry {
  term: string;
  explanation: string;
}

export interface Eli5ViewModel {
  summary?: string;
  parts: Eli5Part[];
  flow: Eli5FlowStep[];
  glossary: Eli5GlossaryEntry[];
  originalExplanation?: string;
}

interface BuildEli5ViewModelParams {
  explanation?: string | null;
  graph?: DiagramGraph | null;
}

function normalizeText(value: string): string {
  return value
    .normalize("NFC")
    .replace(/[\u0000-\u001f\u007f-\u009f\u2028\u2029]+/gu, " ")
    .replace(/\s+/gu, " ")
    .trim();
}

function normalizeMultilineText(value: string): string {
  return value
    .split(/\r?\n/gu)
    .map(normalizeText)
    .join("\n")
    .trim();
}

function toPlainExplanation(value: string): string {
  return value
    .split(/\r?\n/gu)
    .map((line) =>
      line
        .replace(/^\s{0,3}(?:#{1,6}\s+|[-*+]\s+|\d+[.)]\s+)/u, "")
        .replace(/[*_`]+/gu, "")
        .trim(),
    )
    .filter(Boolean)
    .join(" ");
}

function truncateText(value: string, maxLength: number): string {
  if (value.length <= maxLength) {
    return value;
  }

  return `${value.slice(0, Math.max(0, maxLength - 1)).trimEnd()}…`;
}

function buildSummary(explanation: string | undefined): string | undefined {
  if (!explanation) {
    return undefined;
  }

  const plainText = normalizeText(toPlainExplanation(explanation));
  if (!plainText) {
    return undefined;
  }

  const firstSentence =
    plainText.match(/^.*?[。！？]/u)?.[0] ??
    plainText.match(/^.*?[.!?](?=\s|$)/u)?.[0];
  return truncateText(firstSentence ?? plainText, MAX_SUMMARY_LENGTH);
}

function nodeSearchText(node: DiagramGraphNode): string {
  return normalizeText(
    [node.label, node.type, node.description ?? ""].join(" "),
  ).toLowerCase();
}

function analogyForNode(node: DiagramGraphNode): string | undefined {
  const searchText = nodeSearchText(node);
  return analogyDefinitions.find((definition) =>
    definition.patterns.some((pattern) => pattern.test(searchText)),
  )?.analogy;
}

function descriptionForNode(node: DiagramGraphNode): string {
  const description = normalizeText(node.description ?? "");
  if (description) {
    return description;
  }

  return `「${normalizeText(node.label)}」は、${normalizeText(node.type)}としてほかの部品と連携します。`;
}

function rankNodes(graph: DiagramGraph): DiagramGraphNode[] {
  const degreeByNodeId = new Map<string, number>();
  for (const edge of graph.edges) {
    degreeByNodeId.set(edge.from, (degreeByNodeId.get(edge.from) ?? 0) + 1);
    degreeByNodeId.set(edge.to, (degreeByNodeId.get(edge.to) ?? 0) + 1);
  }

  return graph.nodes
    .map((node, index) => ({
      node,
      index,
      degree: degreeByNodeId.get(node.id) ?? 0,
    }))
    .sort((left, right) => right.degree - left.degree || left.index - right.index)
    .slice(0, MAX_PARTS)
    .map(({ node }) => node);
}

function buildParts(graph: DiagramGraph | undefined): Eli5Part[] {
  if (!graph?.nodes.length) {
    return [];
  }

  return rankNodes(graph).map((node) => {
    const analogy = analogyForNode(node);
    return {
      id: node.id,
      name: normalizeText(node.label),
      type: normalizeText(node.type),
      description: descriptionForNode(node),
      ...(analogy ? { analogy } : {}),
    };
  });
}

function validEdges(graph: DiagramGraph): Array<{
  edge: DiagramGraphEdge;
  index: number;
}> {
  const nodeIds = new Set(graph.nodes.map((node) => node.id));
  return graph.edges
    .map((edge, index) => ({ edge, index }))
    .filter(({ edge }) => nodeIds.has(edge.from) && nodeIds.has(edge.to));
}

function orderRepresentativeEdges(graph: DiagramGraph): DiagramGraphEdge[] {
  const edges = validEdges(graph);
  if (!edges.length) {
    return [];
  }

  const incomingCount = new Map(graph.nodes.map((node) => [node.id, 0]));
  for (const { edge } of edges) {
    incomingCount.set(edge.to, (incomingCount.get(edge.to) ?? 0) + 1);
  }

  const rootNodeIds = graph.nodes
    .filter((node) => (incomingCount.get(node.id) ?? 0) === 0)
    .map((node) => node.id);
  const startNodeIds = [
    ...rootNodeIds,
    ...graph.nodes
      .map((node) => node.id)
      .filter((nodeId) => !rootNodeIds.includes(nodeId)),
  ];
  const queue = [...startNodeIds];
  const visitedNodes = new Set<string>();
  const usedEdgeIndexes = new Set<number>();
  const orderedEdges: DiagramGraphEdge[] = [];

  while (queue.length && orderedEdges.length < MAX_FLOW_STEPS) {
    const nodeId = queue.shift();
    if (!nodeId || visitedNodes.has(nodeId)) {
      continue;
    }
    visitedNodes.add(nodeId);

    for (const candidate of edges) {
      if (
        candidate.edge.from !== nodeId ||
        usedEdgeIndexes.has(candidate.index)
      ) {
        continue;
      }
      orderedEdges.push(candidate.edge);
      usedEdgeIndexes.add(candidate.index);
      queue.push(candidate.edge.to);
      if (orderedEdges.length >= MAX_FLOW_STEPS) {
        break;
      }
    }
  }

  if (orderedEdges.length >= MAX_FLOW_STEPS) {
    return orderedEdges;
  }

  for (const candidate of edges) {
    if (usedEdgeIndexes.has(candidate.index)) {
      continue;
    }
    orderedEdges.push(candidate.edge);
    if (orderedEdges.length >= MAX_FLOW_STEPS) {
      break;
    }
  }

  return orderedEdges;
}

function flowText(
  edge: DiagramGraphEdge,
  nodeById: ReadonlyMap<string, DiagramGraphNode>,
): string {
  const from = normalizeText(nodeById.get(edge.from)?.label ?? edge.from);
  const to = normalizeText(nodeById.get(edge.to)?.label ?? edge.to);
  const label = normalizeText(edge.label ?? "");
  const subject = label ? `「${label}」を` : "情報や処理を";
  return `「${from}」から「${to}」へ${subject}渡します。`;
}

function buildFlow(graph: DiagramGraph | undefined): Eli5FlowStep[] {
  if (!graph?.nodes.length) {
    return [];
  }

  const nodeById = new Map(graph.nodes.map((node) => [node.id, node]));
  return orderRepresentativeEdges(graph).map((edge, index) => ({
    id: `${edge.from}-${edge.to}-${index}`,
    from: normalizeText(nodeById.get(edge.from)?.label ?? edge.from),
    to: normalizeText(nodeById.get(edge.to)?.label ?? edge.to),
    text: flowText(edge, nodeById),
  }));
}

function buildSearchCorpus(
  explanation: string | undefined,
  graph: DiagramGraph | undefined,
): string {
  const graphText = graph
    ? [
        ...graph.groups.flatMap((group) => [
          group.label,
          group.description ?? "",
        ]),
        ...graph.nodes.flatMap((node) => [
          node.label,
          node.type,
          node.description ?? "",
        ]),
        ...graph.edges.flatMap((edge) => [
          edge.label ?? "",
          edge.description ?? "",
        ]),
      ].join(" ")
    : "";
  return normalizeText(`${explanation ?? ""} ${graphText}`);
}

function buildGlossary(
  explanation: string | undefined,
  graph: DiagramGraph | undefined,
): Eli5GlossaryEntry[] {
  const corpus = buildSearchCorpus(explanation, graph);
  if (!corpus) {
    return [];
  }

  return glossaryDefinitions
    .filter((definition) => definition.pattern.test(corpus))
    .slice(0, MAX_GLOSSARY_ENTRIES)
    .map(({ term, explanation: definitionExplanation }) => ({
      term,
      explanation: definitionExplanation,
    }));
}

export function buildEli5ViewModel({
  explanation,
  graph,
}: BuildEli5ViewModelParams): Eli5ViewModel | null {
  const normalizedExplanation = normalizeMultilineText(explanation ?? "");
  const normalizedGraph = graph?.nodes.length ? graph : undefined;
  if (!normalizedExplanation && !normalizedGraph) {
    return null;
  }

  const summary = buildSummary(normalizedExplanation || undefined);
  const parts = buildParts(normalizedGraph);
  const flow = buildFlow(normalizedGraph);
  const glossary = buildGlossary(
    normalizedExplanation || undefined,
    normalizedGraph,
  );

  return {
    ...(summary ? { summary } : {}),
    parts,
    flow,
    glossary,
    ...(normalizedExplanation
      ? { originalExplanation: normalizedExplanation }
      : {}),
  };
}

interface PriceTier {
  qty: number;
  price: number;
}

interface ParsedItem {
  name: string;
  price: number;
  unit: string | null;
  unitFrom: string | null;
  oldPrice: number | null;
  packQty: number | null;
  tiers: PriceTier[] | null;
  fromPrice: boolean;
  promo: boolean;
  category: string | null;
  confidence: number;
  source: 'template' | 'heuristic';
  raw: string;
  _bare?: boolean;
  _strong?: boolean;
}

interface UnparsedLine {
  line: string;
  reason: string;
}

interface ParseStats {
  lines: number;
  items: number;
  unparsed: number;
  candidateLines: number;
}

interface ParseResult {
  items: ParsedItem[];
  unparsed: UnparsedLine[];
  promoDate: string | null;
  stats: ParseStats;
}

interface Template {
  source: string;
  flags: string;
  fixedUnit: string | null;
  createdAt: number;
  hits: number;
  _re?: RegExp;
}

interface TemplateAnnotation {
  name: string;
  price: string | number;
  unit?: string | null;
  fixedUnit?: string | null;
  [key: string]: string | null | undefined;
}

interface TemplateStore {
  list(): Template[];
  learn(line: string, ann: TemplateAnnotation): Template;
  remove(source: string): void;
  clear(): void;
}

interface ParseOptions {
  templates?: Template[];
}

interface Candidate {
  start: number;
  numEnd: number;
  end: number;
  raw: string;
  value: number;
  cur: boolean;
  dec: number;
  reais: boolean;
  unit: string | null;
  unitFrom: string | null;
  unitStart?: any;
  attached: boolean;
  before: string;
  beforeFrom: number;
  score: number;
  role: 'price' | 'discard' | 'combo' | 'old' | string;
  fromPrice?: boolean;
}

interface AnalyzedSegment {
  kind?: 'blank' | 'noise' | 'long' | 'header' | 'text' | 'item' | string;
  raw: string;
  text?: string;
  name?: any;
  residual?: any;
  price?: any;
  unit?: string | null;
  unitFrom?: string | null;
  oldPrice?: any;
  packQty?: any;
  tiers?: PriceTier[] | null;
  fromPrice?: boolean;
  strong?: boolean;
  bare?: boolean;
  score?: any;
  promo?: boolean;
  inlineCategory?: string | null;
  dates?: string[];
  hadEmoji?: boolean;
  cands?: Candidate[];
  viaTemplate?: boolean;
}

interface Product {
  id: string;
  nome: string;
  preco: number;
  unidade: string;
  promocao: boolean;
  precoAnterior: number | null;
  conferir: boolean;
  categoria: string;
  quantidade: number;
  selecionado: boolean;
}

interface CartV1Entry {
  qty: number;
  name: string;
  unit: string;
  price: number;
  category: string;
}

type CartV1 = Record<string, CartV1Entry>;

interface HortiParserAPI {
  parse(text: string, opts?: ParseOptions): ParseResult;
  analyzeLine(rawLine: string): AnalyzedSegment[];
  induceTemplate(line: string, ann: TemplateAnnotation): Template;
  matchTemplate(tpl: Template, line: string): AnalyzedSegment | null;
  createTemplateStore(storage?: Storage | null, key?: string): TemplateStore;
  canonUnit(tok: string | null | undefined): string | null;
  _internals: {
    UNIT: string;
    CANDIDATE_RE: RegExp;
    AFTER_UNIT_RE: RegExp;
    BEFORE_UNIT_RE: RegExp;
    COMBO_RE: RegExp;
  };
}

interface Window {
  HortiParser: HortiParserAPI;
}

interface Document {
  getElementById(elementId: 'rawText' | 'finalMessage'): HTMLTextAreaElement;
  getElementById(elementId: 'search' | 'endereco'): HTMLInputElement;
  getElementById(elementId: 'pagamento'): HTMLSelectElement;
  getElementById(
    elementId: 'processBtn' | 'clipboardBtn' | 'clearDataBtn' | 'copyBtn' | 'deselectAllBtn' | 'filterSelectedBtn'
  ): HTMLButtonElement;
  getElementById(
    elementId: 'updateStatus' | 'selectionSection' | 'summarySection' | 'itemsList' | 'subtotalValue' | 'totalValue' | 'tabsContainer' | 'promo-date'
  ): HTMLElement;
  createElement(
    tagName: 'input',
    options?: ElementCreationOptions
  ): Omit<HTMLInputElement, 'value' | 'onchange' | 'oninput'> & {
    value: string | number;
    onchange: ((this: GlobalEventHandlers, ev: Omit<Event, 'target'> & { target: HTMLInputElement & { value: string } }) => any) | null;
    oninput: ((this: GlobalEventHandlers, ev: Omit<Event, 'target'> & { target: HTMLInputElement & { value: string } }) => any) | null;
  };
}

interface JSON {
  parse(text: string | null, reviver?: (this: any, key: string, value: any) => any): any;
}

interface String {
  codePointAt(pos: number): number;
  match(regexp: string | RegExp): (RegExpMatchArray & { index: number }) | null;
}

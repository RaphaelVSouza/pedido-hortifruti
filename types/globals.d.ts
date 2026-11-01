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
  boldIsPromo?: boolean;
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

interface UnitWeightEntry {
  keywords: string[];
  unitLabel: string;
  unitPlural: string;
  grams: number;
  min: number;
  max: number;
  source: string;
}

interface UnitWeightsData {
  version: number;
  items: UnitWeightEntry[];
}

interface Product {
  id: string;
  itemKey?: string;
  rawName?: string;
  packQty?: number | null;
  nome: string;
  preco: number;
  unidade: string;
  promocao: boolean;
  precoAnterior: number | null;
  conferir: boolean;
  categoria: string;
  quantidade: number;
  selecionado: boolean;
  indisponivel?: boolean;
  modo?: 'kg' | 'unit';
  unitWeight?: UnitWeightEntry | null;
  source?: 'template' | 'heuristic' | 'manual';
  raw?: string;
}

interface CartV1Entry {
  qty: number;
  name: string;
  unit: string;
  price: number;
  category: string;
  packQty?: number | null;
  mode?: 'kg' | 'unit';
}

type CartV1 = Record<string, CartV1Entry>;

interface SupplierProfile {
  id: string;
  name: string;
  whatsapp: string;
  deliveryFee: number;
  paymentMethods: string[];
  boldIsPromo: boolean;
}

interface SuppliersStoreV1 {
  activeId: string;
  profiles: Record<string, SupplierProfile>;
}

interface PriceSnapshotEntry {
  price: number;
  unit: string;
}

interface PriceSnapshot {
  importedAt: string;
  promoDate: string | null;
  prices: Record<string, PriceSnapshotEntry>;
}

interface HortiParserAPI {
  parse(text: string, opts?: ParseOptions): ParseResult;
  analyzeLine(rawLine: string, boldIsPromo?: boolean): AnalyzedSegment[];
  induceTemplate(line: string, ann: TemplateAnnotation): Template;
  matchTemplate(tpl: Template, line: string): AnalyzedSegment | null;
  isValidTemplate(t: any): t is Template;
  createTemplateStore(storage?: Storage | null, key?: string): TemplateStore;
  canonUnit(tok: string | null | undefined): string | null;
  itemKey(name: string, packQty?: number | null): string;
  categoryKey(category: string | null | undefined): string;
  productId(category: string | null | undefined, name: string, packQty?: number | null): string;
  levenshtein(a: string, b: string): number;
  buildWhatsAppUrl(phone: string | null | undefined, message: string): string;
  getWhatsAppCategoryEmoji(category: string | null | undefined): string;
  getWhatsAppItemEmoji(name: string | null | undefined): string;
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
  HORTI_UNIT_WEIGHTS?: UnitWeightEntry[];
}

interface Document {
  getElementById(elementId: 'rawText' | 'finalMessage'): HTMLTextAreaElement;
  getElementById(elementId: 'search' | 'endereco' | 'supplierName' | 'supplierWhatsapp' | 'supplierDeliveryFee' | 'supplierPayments' | 'supplierBoldIsPromo'): HTMLInputElement;
  getElementById(elementId: 'pagamento' | 'supplierSelect'): HTMLSelectElement;
  getElementById(elementId: 'whatsappBtn'): HTMLAnchorElement;
  getElementById(
    elementId: 'processBtn' | 'clipboardBtn' | 'clearDataBtn' | 'copyBtn' | 'deselectAllBtn' | 'filterSelectedBtn' | 'editSupplierBtn' | 'newSupplierBtn' | 'saveSupplierBtn' | 'cancelSupplierBtn' | 'deleteSupplierBtn'
  ): HTMLButtonElement;
  getElementById(
    elementId: 'whatsappNotice' | 'updateStatus' | 'selectionSection' | 'summarySection' | 'itemsList' | 'subtotalLabel' | 'subtotalValue' | 'deliveryFee' | 'totalLabel' | 'totalValue' | 'estimatedNote' | 'tabsContainer' | 'promo-date' | 'supplierConfigPanel' | 'supplierFormTitle' | 'supplierFormError'
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

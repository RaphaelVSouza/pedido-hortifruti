// @ts-check
document.addEventListener('DOMContentLoaded', () => {
    /**
     * @typedef {Object} Product
     * @property {string} id
     * @property {string} [itemKey]
     * @property {string} nome
     * @property {number} preco
     * @property {string} unidade
     * @property {boolean} promocao
     * @property {number | null} precoAnterior
     * @property {boolean} conferir
     * @property {string} categoria
     * @property {number} quantidade
     * @property {boolean} selecionado
     * @property {'kg' | 'unit'} [modo]
     * @property {UnitWeightEntry | null} [unitWeight]
     * @property {'template' | 'heuristic' | 'manual'} [source]
     * @property {string} [raw]
     *
     * @typedef {Object} CartV1Entry
     * @property {number} qty
     * @property {string} name
     * @property {string} unit
     * @property {number} price
     * @property {string} category
     * @property {'kg' | 'unit'} [mode]
     *
     * @typedef {Object} PriceSnapshotEntry
     * @property {number} price
     * @property {string} unit
     *
     * @typedef {Object} PriceSnapshot
     * @property {string} importedAt
     * @property {string | null} promoDate
     * @property {Record<string, PriceSnapshotEntry>} prices
     *
     * @typedef {Record<string, CartV1Entry>} CartV1
     */
    // DOM Elements
    const rawText = document.getElementById('rawText');
    const processBtn = document.getElementById('processBtn');
    const clipboardBtn = document.getElementById('clipboardBtn');
    const clearDataBtn = document.getElementById('clearDataBtn');
    const updateStatusEl = document.getElementById('updateStatus');
    const selectionSection = document.getElementById('selectionSection');
    const summarySection = document.getElementById('summarySection');
    const itemsList = document.getElementById('itemsList');
    const subtotalLabel = document.getElementById('subtotalLabel');
    const subtotalValue = document.getElementById('subtotalValue');
    const totalLabel = document.getElementById('totalLabel');
    const totalValue = document.getElementById('totalValue');
    const estimatedNote = document.getElementById('estimatedNote');
    const finalMessage = document.getElementById('finalMessage');
    const copyBtn = document.getElementById('copyBtn');
    const whatsappBtn = document.getElementById('whatsappBtn');
    const whatsappNotice = document.getElementById('whatsappNotice');
    const searchInput = document.getElementById('search');
    const deselectAllBtn = document.getElementById('deselectAllBtn');
    const tabsContainer = document.getElementById('tabsContainer');
    const enderecoInput = document.getElementById('endereco');
    const pagamentoSelect = document.getElementById('pagamento');
    const filterSelectedBtn = document.getElementById('filterSelectedBtn');
    const promoDateEl = document.getElementById('promo-date');

    const openReviewBtn = document.getElementById('openReviewBtn');
    const reviewCountBadge = document.getElementById('reviewCountBadge');
    const reviewPanel = document.getElementById('reviewPanel');
    const closeReviewBtn = document.getElementById('closeReviewBtn');
    const reviewFeedback = document.getElementById('reviewFeedback');
    const unparsedCountEl = document.getElementById('unparsedCount');
    const reviewUnparsedList = document.getElementById('reviewUnparsedList');
    const conferirCountEl = document.getElementById('conferirCount');
    const reviewConferirList = document.getElementById('reviewConferirList');
    const spellingCountEl = document.getElementById('spellingCount');
    const reviewSpellingList = document.getElementById('reviewSpellingList');
    const supplierTemplatesSection = document.getElementById('supplierTemplatesSection');
    const supplierTemplatesList = document.getElementById('supplierTemplatesList');

    const deliveryFeeEl = document.getElementById('deliveryFee');
    const supplierSelect = document.getElementById('supplierSelect');
    const editSupplierBtn = document.getElementById('editSupplierBtn');
    const newSupplierBtn = document.getElementById('newSupplierBtn');
    const supplierConfigPanel = document.getElementById('supplierConfigPanel');
    const supplierFormTitle = document.getElementById('supplierFormTitle');
    const supplierNameInput = document.getElementById('supplierName');
    const supplierWhatsappInput = document.getElementById('supplierWhatsapp');
    const supplierDeliveryFeeInput = document.getElementById('supplierDeliveryFee');
    const supplierPaymentsInput = document.getElementById('supplierPayments');
    const supplierBoldIsPromoInput = document.getElementById('supplierBoldIsPromo');
    const supplierFormError = document.getElementById('supplierFormError');
    const saveSupplierBtn = document.getElementById('saveSupplierBtn');
    const cancelSupplierBtn = document.getElementById('cancelSupplierBtn');
    const deleteSupplierBtn = document.getElementById('deleteSupplierBtn');
    const SUPPLIERS_KEY = 'hortifruti_suppliers_v1';
    const DEFAULT_SUPPLIER_ID = 'default';
    const DEFAULT_DELIVERY_FEE = 5.00;
    const DEFAULT_PAYMENT_METHODS = ['PIX', 'Cartão de Crédito'];
    const LEGACY_TEMPLATES_DOT_KEY = 'hortifruti.templates.v1';
    const LEGACY_TEMPLATES_KEY = 'hortifruti_templates_v1';
    const HISTORY_V1_KEY = 'hortifruti_history_v1';

    /** @returns {SupplierProfile} */
    const createDefaultProfile = () => ({
        id: DEFAULT_SUPPLIER_ID,
        name: 'Meu hortifruti',
        whatsapp: '',
        deliveryFee: DEFAULT_DELIVERY_FEE,
        paymentMethods: [...DEFAULT_PAYMENT_METHODS],
        boldIsPromo: true
    });

    /** @type {SuppliersStoreV1} */
    let suppliersState = {
        activeId: DEFAULT_SUPPLIER_ID,
        profiles: { [DEFAULT_SUPPLIER_ID]: createDefaultProfile() }
    };
    /** @type {string | null} */
    let editingSupplierId = null;

    const getActiveSupplierId = () => suppliersState.activeId || DEFAULT_SUPPLIER_ID;
    /** @returns {SupplierProfile} */
    const getActiveProfile = () => suppliersState.profiles[getActiveSupplierId()] || createDefaultProfile();
    const getRawTextKey = (id = getActiveSupplierId()) => `${RAW_TEXT_KEY}_${id}`;
    const getLastUpdateTsKey = (id = getActiveSupplierId()) => `${LAST_UPDATE_TS_KEY}_${id}`;
    const getLastUpdateSourceKey = (id = getActiveSupplierId()) => `${LAST_UPDATE_SOURCE_KEY}_${id}`;
    const getCartKey = (id = getActiveSupplierId()) => `${CART_V1_KEY}_${id}`;
    const getUnitModesKey = (id = getActiveSupplierId()) => `${UNIT_MODES_KEY}_${id}`;
    const getTemplatesKey = (id = getActiveSupplierId()) => `${LEGACY_TEMPLATES_KEY}_${id}`;
    const getHistoryKey = (id = getActiveSupplierId()) => `${HISTORY_V1_KEY}_${id}`;
    const RAW_TEXT_KEY = 'hortifruti_raw_text';
    const LAST_UPDATE_TS_KEY = 'hortifruti_last_update_ts';
    const LAST_UPDATE_SOURCE_KEY = 'hortifruti_last_update_source';
    const CART_V1_KEY = 'hortifruti_cart_v1';
    const UNIT_MODES_KEY = 'hortifruti_unit_modes_v1';
    const LEGACY_CART_KEY = 'hortifruti_cart';
    /** @type {Product[]} */
    let allProducts = [];
    /** @type {CartV1} */
    let unavailableCart = {};
    /** @type {UnparsedLine[]} */
    let currentUnparsedLines = [];
    /** @type {Array<{ oldId: string, oldEntry: CartV1Entry, newProductId: string, newName: string }>} */
    let pendingSpellingSuggestions = [];
    let activeCategory = 'Todos';
    let showOnlySelected = false;

    // 1. Storage Helpers
    const savePrefs = () => {
        localStorage.setItem('hortifruti_prefs', JSON.stringify({
            endereco: enderecoInput.value,
            pagamento: pagamentoSelect.value
        }));
    };

    const saveCart = () => {
        /** @type {CartV1} */
        const cart = {};
        /** @type {Record<string, 'kg' | 'unit'>} */
        const unitModes = readStoredObject(getUnitModesKey(), {});
        allProducts.forEach(p => {
            const key = p.itemKey || p.id;
            if (p.unitWeight) {
                if (p.modo === 'unit') {
                    unitModes[key] = 'unit';
                } else {
                    delete unitModes[key];
                }
            }
            if (p.selecionado) {
                /** @type {CartV1Entry} */
                const entry = {
                    qty: p.quantidade,
                    name: p.nome,
                    unit: p.unidade,
                    price: p.preco,
                    category: p.categoria
                };
                if (p.modo === 'unit' && p.unitWeight) {
                    entry.mode = 'unit';
                }
                cart[p.id] = entry;
            }
        });
        Object.entries(unavailableCart).forEach(([id, entry]) => {
            if (!(id in cart)) {
                cart[id] = entry;
            }
        });
        localStorage.setItem(getCartKey(), JSON.stringify(cart));
        if (Object.keys(unitModes).length > 0) {
            localStorage.setItem(getUnitModesKey(), JSON.stringify(unitModes));
        } else {
            localStorage.removeItem(getUnitModesKey());
        }
    };

    /**
     * @param {HTMLSelectElement} selectEl
     * @param {string} value
     */
    const setSelectValue = (selectEl, value) => {
        const fallback = selectEl.options[0]?.value || '';
        const hasMatchingOption = [...selectEl.options].some(option => option.value === value);
        selectEl.value = hasMatchingOption ? value : fallback;
    };

    // Lê um objeto JSON do localStorage; valor ausente, corrompido ou de outro tipo vira `fallback`.
    /**
     * @param {string} key
     * @param {any} [fallback]
     * @returns {any}
     */
    const readStoredObject = (key, fallback = null) => {
        try {
            const parsed = JSON.parse(localStorage.getItem(key));
            if (Array.isArray(fallback)) {
                return Array.isArray(parsed) ? parsed : fallback;
            }
            return parsed && typeof parsed === 'object' && !Array.isArray(parsed) ? parsed : fallback;
        } catch (error) {
            console.error(`Valor inválido em ${key}, ignorando:`, error);
            return fallback;
        }
    };

    /**
     * @param {string} supplierId
     * @param {Product[]} products
     * @param {string | null} promoDate
     */
    const savePriceSnapshot = (supplierId, products, promoDate) => {
        /** @type {PriceSnapshot[]} */
        const snapshots = readStoredObject(getHistoryKey(supplierId), []);
        /** @type {Record<string, { price: number, unit: string }>} */
        const prices = {};
        products.forEach(p => {
            prices[p.id] = { price: p.preco, unit: p.unidade };
        });
        /** @type {PriceSnapshot} */
        const snapshot = {
            importedAt: new Date().toISOString(),
            promoDate: promoDate || null,
            prices
        };
        const list = Array.isArray(snapshots) ? [...snapshots] : [];
        list.unshift(snapshot);
        const limited = list.slice(0, 10);
        localStorage.setItem(getHistoryKey(supplierId), JSON.stringify(limited));
    };

    /**
     * @param {PriceSnapshot} snapshot
     * @returns {string}
     */
    const formatDateRef = (snapshot) => {
        if (snapshot.promoDate) return snapshot.promoDate;
        if (snapshot.importedAt) {
            const d = new Date(snapshot.importedAt);
            if (!Number.isNaN(d.getTime())) {
                const day = String(d.getDate()).padStart(2, '0');
                const month = String(d.getMonth() + 1).padStart(2, '0');
                return `${day}/${month}`;
            }
        }
        return '';
    };

    /**
     * @param {string} [supplierId]
     * @returns {PriceSnapshot | null}
     */
    const getPreviousPriceSnapshot = (supplierId = getActiveSupplierId()) => {
        /** @type {PriceSnapshot[]} */
        const snapshots = readStoredObject(getHistoryKey(supplierId), []);
        if (!Array.isArray(snapshots) || snapshots.length === 0) return null;
        const currentSavedText = localStorage.getItem(getRawTextKey(supplierId));
        const isCurrentSaved = Boolean(currentSavedText && rawText.value === currentSavedText);
        if (isCurrentSaved) {
            return snapshots[1] || null;
        }
        return snapshots[0] || null;
    };

    const loadPrefs = () => {
        const prefs = readStoredObject('hortifruti_prefs');
        if (prefs) {
            enderecoInput.value = prefs.endereco || '';
            setSelectValue(pagamentoSelect, prefs.pagamento);
        }
    };

    /**
     * @param {string} value
     * @returns {string}
     */
    const normalizeText = (value) => (value || '')
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .toLowerCase();

    // --------------------------------------------------- catálogo de ícones (ADR-012)
    /** @type {Array<{ id: string, keywords: string[] }>} */
    const ICON_CATALOG = [
        {
            "id": "maracuja",
            "keywords": [
                "maracuja"
            ]
        },
        {
            "id": "mamao",
            "keywords": [
                "mamao",
                "papaia",
                "papaya",
                "formosa"
            ]
        },
        {
            "id": "goiaba",
            "keywords": [
                "goiaba"
            ]
        },
        {
            "id": "caqui",
            "keywords": [
                "caqui",
                "kaki"
            ]
        },
        {
            "id": "acerola",
            "keywords": [
                "acerola"
            ]
        },
        {
            "id": "pitaya",
            "keywords": [
                "pitaya",
                "pitaia"
            ]
        },
        {
            "id": "jabuticaba",
            "keywords": [
                "jabuticaba",
                "jaboticaba"
            ]
        },
        {
            "id": "graviola",
            "keywords": [
                "graviola"
            ]
        },
        {
            "id": "carambola",
            "keywords": [
                "carambola"
            ]
        },
        {
            "id": "figo",
            "keywords": [
                "figo"
            ]
        },
        {
            "id": "ameixa",
            "keywords": [
                "ameixa"
            ]
        },
        {
            "id": "limao-taiti",
            "keywords": [
                "limao",
                "taiti",
                "tahiti",
                "lima da persia"
            ]
        },
        {
            "id": "caju",
            "keywords": [
                "caju"
            ]
        },
        {
            "id": "roma",
            "keywords": [
                "roma"
            ]
        },
        {
            "id": "chuchu",
            "keywords": [
                "chuchu"
            ]
        },
        {
            "id": "mandioca",
            "keywords": [
                "mandioca",
                "aipim",
                "macaxeira"
            ]
        },
        {
            "id": "quiabo",
            "keywords": [
                "quiabo"
            ]
        },
        {
            "id": "jilo",
            "keywords": [
                "jilo"
            ]
        },
        {
            "id": "maxixe",
            "keywords": [
                "maxixe"
            ]
        },
        {
            "id": "abobrinha",
            "keywords": [
                "abobrinha",
                "abobora italiana"
            ]
        },
        {
            "id": "beterraba",
            "keywords": [
                "beterraba"
            ]
        },
        {
            "id": "inhame",
            "keywords": [
                "inhame",
                "cara"
            ]
        },
        {
            "id": "batata-doce",
            "keywords": [
                "batata doce",
                "batata-doce"
            ]
        },
        {
            "id": "mandioquinha",
            "keywords": [
                "mandioquinha",
                "batata baroa",
                "baroa",
                "batata salsa"
            ]
        },
        {
            "id": "vagem",
            "keywords": [
                "vagem",
                "vajem"
            ]
        },
        {
            "id": "ervilha",
            "keywords": [
                "ervilha"
            ]
        },
        {
            "id": "abobora-cabotia",
            "keywords": [
                "cabotia",
                "cabotian",
                "abobora japonesa",
                "kabocha"
            ]
        },
        {
            "id": "abobora-moranga",
            "keywords": [
                "moranga",
                "abobora"
            ]
        },
        {
            "id": "gengibre",
            "keywords": [
                "gengibre"
            ]
        },
        {
            "id": "rabanete",
            "keywords": [
                "rabanete"
            ]
        },
        {
            "id": "cogumelo",
            "keywords": [
                "cogumelo",
                "champignon",
                "shimeji",
                "shitake",
                "shiitake",
                "paris"
            ]
        },
        {
            "id": "couve",
            "keywords": [
                "couve"
            ]
        },
        {
            "id": "alface",
            "keywords": [
                "alface"
            ]
        },
        {
            "id": "rucula",
            "keywords": [
                "rucula"
            ]
        },
        {
            "id": "agriao",
            "keywords": [
                "agriao"
            ]
        },
        {
            "id": "espinafre",
            "keywords": [
                "espinafre"
            ]
        },
        {
            "id": "repolho",
            "keywords": [
                "repolho"
            ]
        },
        {
            "id": "repolho-roxo",
            "keywords": [
                "repolho roxo"
            ]
        },
        {
            "id": "couve-flor",
            "keywords": [
                "couve flor",
                "couve-flor",
                "couveflor"
            ]
        },
        {
            "id": "acelga",
            "keywords": [
                "acelga"
            ]
        },
        {
            "id": "salsinha",
            "keywords": [
                "salsinha",
                "salsa"
            ]
        },
        {
            "id": "cebolinha",
            "keywords": [
                "cebolinha"
            ]
        },
        {
            "id": "cheiro-verde",
            "keywords": [
                "cheiro verde",
                "cheiro-verde"
            ]
        },
        {
            "id": "coentro",
            "keywords": [
                "coentro"
            ]
        },
        {
            "id": "manjericao",
            "keywords": [
                "manjericao",
                "alfavaca"
            ]
        },
        {
            "id": "hortela",
            "keywords": [
                "hortela",
                "menta"
            ]
        },
        {
            "id": "alecrim",
            "keywords": [
                "alecrim"
            ]
        },
        {
            "id": "cebola-roxa",
            "keywords": [
                "cebola roxa"
            ]
        },
        {
            "id": "ovos-cartela",
            "keywords": [
                "ovos",
                "ovo",
                "cartela",
                "duzia de ovos"
            ]
        },
        {
            "id": "tamara",
            "keywords": [
                "tamara",
                "tamaras"
            ]
        },
        {
            "id": "caja",
            "keywords": [
                "caja",
                "taperaba"
            ]
        },
        {
            "id": "lichia",
            "keywords": [
                "lichia",
                "lichias",
                "lichi"
            ]
        },
        {
            "id": "chicoria",
            "keywords": [
                "chicoria",
                "escarola",
                "almeirao"
            ]
        },
        {
            "id": "louro",
            "keywords": [
                "louro"
            ]
        },
        {
            "id": "pimentas",
            "keywords": [
                "pimentas",
                "pimenta",
                "pimenta dedo de moca",
                "pimenta de cheiro",
                "pimenta biquinho",
                "malagueta"
            ]
        },
        {
            "id": "suco-garrafa",
            "keywords": [
                "suco",
                "sucos",
                "refresco",
                "cha",
                "agua de coco"
            ]
        },
        {
            "id": "salada-de-frutas",
            "keywords": [
                "salada de frutas",
                "salada de fruta"
            ]
        },
        {
            "id": "legumes-picados",
            "keywords": [
                "legumes picados",
                "picados",
                "sopa pronta",
                "mix de legumes"
            ]
        },
        {
            "id": "acucar",
            "keywords": [
                "acucar"
            ]
        },
        {
            "id": "farinha",
            "keywords": [
                "farinha",
                "farofa",
                "fuba",
                "flocao",
                "aveia",
                "polvilho",
                "tapioca",
                "mistura p bolo",
                "mistura para bolo"
            ]
        },
        {
            "id": "sabao-em-po",
            "keywords": [
                "sabao po",
                "sabao em po",
                "lava roupas"
            ]
        },
        {
            "id": "inseticida",
            "keywords": [
                "baygon",
                "inseticida",
                "sbp",
                "raid",
                "repelente"
            ]
        },
        {
            "id": "oleo",
            "keywords": [
                "oleo",
                "azeite",
                "vinagre"
            ]
        },
        {
            "id": "banana",
            "keywords": [
                "banana",
                "bananas"
            ]
        },
        {
            "id": "maca",
            "keywords": [
                "maca",
                "macas"
            ]
        },
        {
            "id": "maca-verde",
            "keywords": [
                "maca verde",
                "granny smith"
            ]
        },
        {
            "id": "pera",
            "keywords": [
                "pera",
                "peras"
            ]
        },
        {
            "id": "uva",
            "keywords": [
                "uva",
                "uvas"
            ]
        },
        {
            "id": "laranja",
            "keywords": [
                "laranja",
                "laranjas"
            ]
        },
        {
            "id": "mexerica",
            "keywords": [
                "mexerica",
                "tangerina",
                "ponkan",
                "bergamota",
                "murcote",
                "murcott"
            ]
        },
        {
            "id": "limao-siciliano",
            "keywords": [
                "limao siciliano",
                "siciliano"
            ]
        },
        {
            "id": "melancia",
            "keywords": [
                "melancia"
            ]
        },
        {
            "id": "melao",
            "keywords": [
                "melao",
                "pele de sapo"
            ]
        },
        {
            "id": "abacaxi",
            "keywords": [
                "abacaxi"
            ]
        },
        {
            "id": "morango",
            "keywords": [
                "morango",
                "morangos"
            ]
        },
        {
            "id": "manga",
            "keywords": [
                "manga",
                "mangas",
                "palmer",
                "tommy"
            ]
        },
        {
            "id": "abacate",
            "keywords": [
                "abacate",
                "avocado"
            ]
        },
        {
            "id": "kiwi",
            "keywords": [
                "kiwi"
            ]
        },
        {
            "id": "coco",
            "keywords": [
                "coco",
                "coco seco",
                "coco verde"
            ]
        },
        {
            "id": "pessego",
            "keywords": [
                "pessego",
                "nectarina"
            ]
        },
        {
            "id": "cereja",
            "keywords": [
                "cereja",
                "cerejas"
            ]
        },
        {
            "id": "mirtilo",
            "keywords": [
                "mirtilo",
                "blueberry"
            ]
        },
        {
            "id": "tomate",
            "keywords": [
                "tomate",
                "tomates"
            ]
        },
        {
            "id": "tomate-cereja",
            "keywords": [
                "tomatinho",
                "tomate cereja",
                "tomate grape",
                "sweet grape"
            ]
        },
        {
            "id": "batata",
            "keywords": [
                "batata",
                "batatas",
                "asterix",
                "batata inglesa"
            ]
        },
        {
            "id": "cenoura",
            "keywords": [
                "cenoura",
                "cenouras"
            ]
        },
        {
            "id": "cebola",
            "keywords": [
                "cebola",
                "cebolas"
            ]
        },
        {
            "id": "alho",
            "keywords": [
                "alho"
            ]
        },
        {
            "id": "berinjela",
            "keywords": [
                "berinjela"
            ]
        },
        {
            "id": "pepino",
            "keywords": [
                "pepino"
            ]
        },
        {
            "id": "pimentao",
            "keywords": [
                "pimentao",
                "pimentao verde"
            ]
        },
        {
            "id": "pimentao-colorido",
            "keywords": [
                "pimentao vermelho",
                "pimentao amarelo",
                "pimentao colorido"
            ]
        },
        {
            "id": "milho",
            "keywords": [
                "milho",
                "espiga"
            ]
        },
        {
            "id": "brocolis",
            "keywords": [
                "brocolis"
            ]
        },
        {
            "id": "mel",
            "keywords": [
                "mel"
            ]
        },
        {
            "id": "cafe",
            "keywords": [
                "cafe"
            ]
        },
        {
            "id": "arroz",
            "keywords": [
                "arroz"
            ]
        },
        {
            "id": "feijao",
            "keywords": [
                "feijao",
                "lentilha",
                "grao de bico"
            ]
        },
        {
            "id": "macarrao",
            "keywords": [
                "macarrao",
                "miojos",
                "espaguete",
                "parafuso",
                "penne",
                "massa",
                "miojo",
                "lamen"
            ]
        },
        {
            "id": "molho",
            "keywords": [
                "molho",
                "extrato",
                "catchup",
                "ketchup",
                "mostarda"
            ]
        },
        {
            "id": "maionese",
            "keywords": [
                "maionese"
            ]
        },
        {
            "id": "enlatado",
            "keywords": [
                "lata",
                "enlatado",
                "sardinha",
                "atum",
                "milho em lata",
                "ervilha p sopa",
                "azeitona"
            ]
        },
        {
            "id": "biscoito",
            "keywords": [
                "biscoito",
                "rosquinha",
                "bolacha",
                "cookies",
                "cookie",
                "torrada",
                "wafer"
            ]
        },
        {
            "id": "chocolate",
            "keywords": [
                "chocolate",
                "bombom",
                "nescau",
                "achocolatado",
                "toddy"
            ]
        },
        {
            "id": "salgadinho",
            "keywords": [
                "salgadinho",
                "batata palha",
                "chips",
                "torcida"
            ]
        },
        {
            "id": "pao",
            "keywords": [
                "pao",
                "paes",
                "bisnaguinha",
                "bisnaga",
                "pao de forma"
            ]
        },
        {
            "id": "leite",
            "keywords": [
                "leite",
                "leite em po",
                "leite condensado",
                "creme de leite",
                "leite de coco"
            ]
        },
        {
            "id": "queijo",
            "keywords": [
                "queijo",
                "parmesao",
                "mussarela",
                "polenguinho"
            ]
        },
        {
            "id": "manteiga",
            "keywords": [
                "manteiga",
                "margarina",
                "requeijao"
            ]
        },
        {
            "id": "sal",
            "keywords": [
                "sal",
                "sal grosso",
                "condimentos",
                "caldo",
                "sazon",
                "canela",
                "fermento",
                "gelatina",
                "tempero pronto"
            ]
        },
        {
            "id": "refrigerante",
            "keywords": [
                "refrigerante",
                "refri",
                "coca",
                "guarana",
                "sprite",
                "schweppes",
                "tonica",
                "gatorade",
                "h2o",
                "h20",
                "del vale",
                "guaracamp"
            ]
        },
        {
            "id": "agua",
            "keywords": [
                "agua",
                "aguas",
                "agua com gas",
                "agua sem gas"
            ]
        },
        {
            "id": "papel-higienico",
            "keywords": [
                "papel higienico",
                "papel toalha",
                "guardanapo"
            ]
        },
        {
            "id": "detergente",
            "keywords": [
                "detergente",
                "multiuso",
                "desinfetante",
                "agua sanitaria",
                "alcool",
                "amaciante"
            ]
        },
        {
            "id": "esponja",
            "keywords": [
                "esponja",
                "bombril",
                "la de aco"
            ]
        },
        {
            "id": "sabonete",
            "keywords": [
                "sabonete",
                "shampoo",
                "desodorante"
            ]
        },
        {
            "id": "pasta-de-dente",
            "keywords": [
                "pasta de dente",
                "creme dental",
                "escova de dente"
            ]
        },
        {
            "id": "fosforo",
            "keywords": [
                "fosforo",
                "fosforos"
            ]
        },
        {
            "id": "pipoca",
            "keywords": [
                "pipoca",
                "milho de pipoca"
            ]
        },
        {
            "id": "salsicha",
            "keywords": [
                "salsicha",
                "linguica"
            ]
        },
        {
            "id": "cat-frutas",
            "keywords": [
                "frutas",
                "fruta"
            ]
        },
        {
            "id": "cat-legumes",
            "keywords": [
                "legumes",
                "legume",
                "raizes",
                "tuberculos"
            ]
        },
        {
            "id": "cat-verduras",
            "keywords": [
                "verduras",
                "verdura",
                "folhas",
                "folhosas",
                "hortalicas"
            ]
        },
        {
            "id": "cat-temperos",
            "keywords": [
                "temperos",
                "tempero",
                "ervas"
            ]
        },
        {
            "id": "cat-granja",
            "keywords": [
                "granja",
                "ovos"
            ]
        },
        {
            "id": "cat-mercearia",
            "keywords": [
                "mercearia",
                "secos",
                "graos"
            ]
        },
        {
            "id": "cat-mercadinho",
            "keywords": [
                "mercadinho",
                "mercado",
                "mercadao",
                "armazem",
                "emporio"
            ]
        },
        {
            "id": "cat-laticinios",
            "keywords": [
                "laticinios",
                "frios",
                "leite",
                "queijo"
            ]
        },
        {
            "id": "cat-padaria",
            "keywords": [
                "padaria",
                "paes",
                "pao"
            ]
        },
        {
            "id": "cat-bebidas",
            "keywords": [
                "bebidas",
                "sucos",
                "suco"
            ]
        },
        {
            "id": "cat-limpeza",
            "keywords": [
                "limpeza",
                "higiene"
            ]
        },
        {
            "id": "cat-congelados",
            "keywords": [
                "congelados",
                "geladeira",
                "gelados",
                "polpas"
            ]
        },
        {
            "id": "cat-acougue",
            "keywords": [
                "acougue",
                "carnes",
                "carne",
                "frango",
                "peixe"
            ]
        },
        {
            "id": "cat-promocao",
            "keywords": [
                "promocao",
                "promocoes",
                "oferta",
                "ofertas",
                "destaque"
            ]
        },
        {
            "id": "cat-organicos",
            "keywords": [
                "organicos",
                "organico"
            ]
        },
        {
            "id": "cat-combo",
            "keywords": [
                "combo",
                "kit",
                "cesta"
            ]
        },
        {
            "id": "cat-outros",
            "keywords": [
                "outros",
                "diversos",
                "geral"
            ]
        }
    ];

    /** @type {Array<{ id: string, kw: string, len: number }>} */
    const ITEM_ICON_RULES = [];
    /** @type {Array<{ id: string, kw: string, len: number }>} */
    const CATEGORY_ICON_RULES = [];

    ICON_CATALOG.forEach(icon => {
        if (icon.id.startsWith('cat-')) {
            icon.keywords.forEach(kw => {
                CATEGORY_ICON_RULES.push({ id: icon.id, kw, len: kw.length });
            });
        } else {
            icon.keywords.forEach(kw => {
                ITEM_ICON_RULES.push({ id: icon.id, kw, len: kw.length });
            });
        }
    });

    ITEM_ICON_RULES.sort((a, b) => b.len - a.len || a.kw.localeCompare(b.kw));
    CATEGORY_ICON_RULES.sort((a, b) => b.len - a.len || a.kw.localeCompare(b.kw));

    // Casa por palavra inteira (com plural simples "s"/"es"), para que "sal" não case em "salada".
    /**
     * @param {string} paddedName
     * @param {string} keyword
     * @returns {boolean}
     */
    const matchesKeyword = (paddedName, keyword) =>
        paddedName.includes(` ${keyword} `)
        || paddedName.includes(` ${keyword}s `)
        || paddedName.includes(` ${keyword}es `);

    /**
     * @param {string | null | undefined} category
     * @returns {string}
     */
    const getCategoryIconUrl = (category) => {
        if (!category) return 'icons/custom/cat-outros.svg';
        const norm = normalizeText(category).replace(/[^a-z0-9]+/g, ' ').trim();
        const padded = ` ${norm} `;
        for (let i = 0; i < CATEGORY_ICON_RULES.length; i++) {
            const rule = CATEGORY_ICON_RULES[i];
            if (matchesKeyword(padded, rule.kw)) {
                return `icons/custom/${rule.id}.svg`;
            }
        }
        return 'icons/custom/cat-outros.svg';
    };

    /**
     * @param {string | null | undefined} name
     * @param {string | null | undefined} category
     * @returns {string}
     */
    const getItemIcon = (name, category) => {
        if (name) {
            const norm = normalizeText(name).replace(/[^a-z0-9]+/g, ' ').trim();
            const padded = ` ${norm} `;
            for (let i = 0; i < ITEM_ICON_RULES.length; i++) {
                const rule = ITEM_ICON_RULES[i];
                if (matchesKeyword(padded, rule.kw)) {
                    return `icons/custom/${rule.id}.svg`;
                }
            }
        }
        return getCategoryIconUrl(category);
    };

    /**
     * @param {string} source
     * @returns {string}
     */
    const getSourceLabel = (source) => {
        if (source === 'clipboard') return 'área de transferência';
        if (source === 'manual') return 'colagem manual';
        return 'dados salvos';
    };

    /**
     * @param {string} state
     * @param {string} message
     */
    const setUpdateStatus = (state, message) => {
        updateStatusEl.dataset.state = state;
        updateStatusEl.textContent = message;
    };

    /**
     * @param {string} text
     * @returns {boolean}
     */
    const fallbackCopyText = (text) => {
        const tempTextArea = document.createElement('textarea');
        tempTextArea.value = text;
        tempTextArea.setAttribute('readonly', '');
        tempTextArea.style.position = 'fixed';
        tempTextArea.style.opacity = '0';
        tempTextArea.style.left = '-9999px';
        tempTextArea.style.top = '0';

        document.body.appendChild(tempTextArea);
        tempTextArea.focus();
        tempTextArea.select();
        tempTextArea.setSelectionRange(0, tempTextArea.value.length);

        let copied = false;
        try {
            copied = document.execCommand('copy');
        } catch (error) {
            console.error('Fallback de cópia falhou:', error);
            copied = false;
        }

        document.body.removeChild(tempTextArea);
        return copied;
    };

    /**
     * @param {string} text
     * @returns {Promise<boolean>}
     */
    const copyTextToClipboard = async (text) => {
        if (navigator.clipboard && typeof navigator.clipboard.writeText === 'function') {
            try {
                await navigator.clipboard.writeText(text);
                return true;
            } catch (error) {
                console.error('Clipboard API falhou, usando fallback:', error);
            }
        }

        return fallbackCopyText(text);
    };

    /**
     * @param {string} timestamp
     * @returns {string | null}
     */
    const formatUpdateTimestamp = (timestamp) => {
        const parsedDate = new Date(timestamp);
        if (Number.isNaN(parsedDate.getTime())) return null;

        return parsedDate.toLocaleString('pt-BR', {
            dateStyle: 'short',
            timeStyle: 'short'
        });
    };

    const syncLastUpdateStatus = () => {
        const timestamp = localStorage.getItem(getLastUpdateTsKey());
        const source = localStorage.getItem(getLastUpdateSourceKey()) || 'manual';
        if (!timestamp) {
            setUpdateStatus('idle', 'Aguardando atualização da lista.');
            return;
        }

        const formattedTimestamp = formatUpdateTimestamp(timestamp);
        if (!formattedTimestamp) {
            setUpdateStatus('idle', 'Aguardando atualização da lista.');
            return;
        }

        setUpdateStatus('ok', `Última atualização: ${formattedTimestamp} (${getSourceLabel(source)}).`);
    };

    /**
     * @param {string} text
     * @param {string} source
     */
    const persistRawText = (text, source) => {
        localStorage.setItem(getRawTextKey(), text);
        localStorage.setItem(getLastUpdateTsKey(), new Date().toISOString());
        localStorage.setItem(getLastUpdateSourceKey(), source);
        syncLastUpdateStatus();
    };

    const updateFilterBtn = () => {
        filterSelectedBtn.classList.toggle('filter-active', showOnlySelected);
        const count = allProducts.filter(p => p.selecionado).length;
        filterSelectedBtn.textContent = showOnlySelected
            ? `🛒 Selecionados (${count})`
            : `🛒 Selecionados${count > 0 ? ' (' + count + ')' : ''}`;
    };


    // 2. Parser Logic
    // O parser vive em parser.js (window.HortiParser) e é testável em Node: tests/parser.test.js.
    const { parse: parseList, createTemplateStore, canonUnit, itemKey, categoryKey, productId, levenshtein, buildWhatsAppUrl, getWhatsAppCategoryEmoji, getWhatsAppItemEmoji } = window.HortiParser;

    // Unidades do parser -> códigos exibidos no app e na mensagem.
    /** @type {Record<string, string>} */
    const UNIT_LABELS = {
        kg: 'kg', g: 'g', un: 'un', bandeja: 'bdj', maco: 'maço', duzia: 'dz',
        caixa: 'cx', pacote: 'pc', penca: 'penca', litro: 'lt', ml: 'ml'
    };

    /** @type {UnitWeightEntry[]} */
    const DEFAULT_UNIT_WEIGHTS = [
        {
                "keywords": [
                        "banana da terra",
                        "banana pacova",
                        "pacova"
                ],
                "unitLabel": "unidade",
                "unitPlural": "unidades",
                "grams": 100,
                "min": 100,
                "max": 100,
                "source": "IBGE POF 2008-2009, medidas referidas, código 6801017 (PACOVA, UNIDADE)"
        },
        {
                "keywords": [
                        "batata doce"
                ],
                "unitLabel": "unidade",
                "unitPlural": "unidades",
                "grams": 355,
                "min": 355,
                "max": 355,
                "source": "IBGE POF 2008-2009, medidas referidas, código 6400401 (BATATA DOCE, UNIDADE)"
        },
        {
                "keywords": [
                        "batata baroa",
                        "cenoura amarela",
                        "mandioquinha"
                ],
                "unitLabel": "unidade",
                "unitPlural": "unidades",
                "grams": 45,
                "min": 45,
                "max": 45,
                "source": "IBGE POF 2008-2009, medidas referidas, código 6400304 (CENOURA AMARELA (BATATA BAROA), UNIDADE PEQUENA)"
        },
        {
                "keywords": [
                        "batata inglesa",
                        "batata",
                        "batata lavada",
                        "batata asterix",
                        "batatinha"
                ],
                "unitLabel": "unidade",
                "unitPlural": "unidades",
                "grams": 140,
                "min": 70,
                "max": 140,
                "source": "IBGE POF 2008-2009, medidas referidas, código 6400101 (BATATA INGLESA, UNIDADE)"
        },
        {
                "keywords": [
                        "couve flor"
                ],
                "unitLabel": "ramo",
                "unitPlural": "ramos",
                "grams": 60,
                "min": 60,
                "max": 60,
                "source": "IBGE POF 2008-2009, medidas referidas, código 6700601 (COUVE FLOR, RAMO)"
        },
        {
                "keywords": [
                        "laranjinha japonesa",
                        "kinkan"
                ],
                "unitLabel": "unidade",
                "unitPlural": "unidades",
                "grams": 18,
                "min": 18,
                "max": 18,
                "source": "IBGE POF 2008-2009, medidas referidas, código 6802407 (LARANJINHA JAPONESA, UNIDADE)"
        },
        {
                "keywords": [
                        "erva doce",
                        "funcho"
                ],
                "unitLabel": "ramo",
                "unitPlural": "ramos",
                "grams": 28.6,
                "min": 28.6,
                "max": 28.6,
                "source": "IBGE POF 2008-2009, medidas referidas, código 6702801 (ERVA DOCE, RAMO)"
        },
        {
                "keywords": [
                        "fruta de conde",
                        "pinha",
                        "ata"
                ],
                "unitLabel": "unidade",
                "unitPlural": "unidades",
                "grams": 60,
                "min": 45,
                "max": 60,
                "source": "IBGE POF 2008-2009, medidas referidas, código 6803802 (PINHA (FRUTA DE CONDE), UNIDADE)"
        },
        {
                "keywords": [
                        "caja manga",
                        "cajarana"
                ],
                "unitLabel": "unidade",
                "unitPlural": "unidades",
                "grams": 55,
                "min": 40,
                "max": 55,
                "source": "IBGE POF 2008-2009, medidas referidas, código 6804601 (CAJA MANGA, UNIDADE)"
        },
        {
                "keywords": [
                        "coco da bahia",
                        "coco"
                ],
                "unitLabel": "unidade",
                "unitPlural": "unidades",
                "grams": 40,
                "min": 40,
                "max": 40,
                "source": "IBGE POF 2008-2009, medidas referidas, código 6600101 (COCO DA BAHIA, UNIDADE)"
        },
        {
                "keywords": [
                        "castanha portuguesa"
                ],
                "unitLabel": "unidade",
                "unitPlural": "unidades",
                "grams": 4,
                "min": 4,
                "max": 4,
                "source": "IBGE POF 2008-2009, medidas referidas, código 6600301 (CASTANHA PORTUGUESA, UNIDADE)"
        },
        {
                "keywords": [
                        "castanha do para"
                ],
                "unitLabel": "unidade",
                "unitPlural": "unidades",
                "grams": 4,
                "min": 4,
                "max": 4,
                "source": "IBGE POF 2008-2009, medidas referidas, código 6600701 (CASTANHA DO PARA, UNIDADE)"
        },
        {
                "keywords": [
                        "castanha de caju"
                ],
                "unitLabel": "unidade",
                "unitPlural": "unidades",
                "grams": 2.5,
                "min": 2.5,
                "max": 2.5,
                "source": "IBGE POF 2008-2009, medidas referidas, código 6600801 (CASTANHA DE CAJU, UNIDADE)"
        },
        {
                "keywords": [
                        "milho verde",
                        "milho"
                ],
                "unitLabel": "espiga",
                "unitPlural": "espigas",
                "grams": 100,
                "min": 50,
                "max": 100,
                "source": "IBGE POF 2008-2009, medidas referidas, código 8501402 (MILHO COZIDO, ESPIGA)"
        },
        {
                "keywords": [
                        "banana",
                        "banana prata",
                        "banana nanica",
                        "banana dagua",
                        "banana ouro",
                        "banana maca",
                        "banana caturra"
                ],
                "unitLabel": "unidade",
                "unitPlural": "unidades",
                "grams": 75,
                "min": 56.3,
                "max": 75,
                "source": "IBGE POF 2008-2009, medidas referidas, código 6801101 (BANANA (OURO, PRATA, D´AGUA, DA TERRA, ETC), UNIDADE)"
        },
        {
                "keywords": [
                        "cenoura"
                ],
                "unitLabel": "unidade",
                "unitPlural": "unidades",
                "grams": 120,
                "min": 55,
                "max": 120,
                "source": "IBGE POF 2008-2009, medidas referidas, código 6401201 (CENOURA, UNIDADE)"
        },
        {
                "keywords": [
                        "beterraba"
                ],
                "unitLabel": "unidade",
                "unitPlural": "unidades",
                "grams": 140,
                "min": 140,
                "max": 140,
                "source": "IBGE POF 2008-2009, medidas referidas, código 6401101 (BETERRABA, UNIDADE)"
        },
        {
                "keywords": [
                        "inhame",
                        "cara"
                ],
                "unitLabel": "unidade",
                "unitPlural": "unidades",
                "grams": 125,
                "min": 125,
                "max": 125,
                "source": "IBGE POF 2008-2009, medidas referidas, código 6400501 (INHAME, UNIDADE)"
        },
        {
                "keywords": [
                        "rabanete"
                ],
                "unitLabel": "unidade",
                "unitPlural": "unidades",
                "grams": 25,
                "min": 25,
                "max": 25,
                "source": "IBGE POF 2008-2009, medidas referidas, código 6401001 (RABANETE, UNIDADE)"
        },
        {
                "keywords": [
                        "alface"
                ],
                "unitLabel": "pé",
                "unitPlural": "pés",
                "grams": 200,
                "min": 130,
                "max": 200,
                "source": "IBGE POF 2008-2009, medidas referidas, código 6700101 (ALFACE, UNIDADE)"
        },
        {
                "keywords": [
                        "cebolinha"
                ],
                "unitLabel": "ramo",
                "unitPlural": "ramos",
                "grams": 6.2,
                "min": 6.2,
                "max": 6.2,
                "source": "IBGE POF 2008-2009, medidas referidas, código 6701101 (CEBOLINHA, RAMO)"
        },
        {
                "keywords": [
                        "agriao"
                ],
                "unitLabel": "maço",
                "unitPlural": "maços",
                "grams": 5,
                "min": 5,
                "max": 5,
                "source": "IBGE POF 2008-2009, medidas referidas, código 6701301 (AGRIAO, MACO)"
        },
        {
                "keywords": [
                        "rucula"
                ],
                "unitLabel": "ramo",
                "unitPlural": "ramos",
                "grams": 6,
                "min": 6,
                "max": 6,
                "source": "IBGE POF 2008-2009, medidas referidas, código 6702001 (RUCULA, RAMO)"
        },
        {
                "keywords": [
                        "alcachofra"
                ],
                "unitLabel": "unidade",
                "unitPlural": "unidades",
                "grams": 140,
                "min": 140,
                "max": 140,
                "source": "IBGE POF 2008-2009, medidas referidas, código 6702301 (ALCACHOFRA, UNIDADE)"
        },
        {
                "keywords": [
                        "pepino"
                ],
                "unitLabel": "unidade",
                "unitPlural": "unidades",
                "grams": 100,
                "min": 75,
                "max": 100,
                "source": "IBGE POF 2008-2009, medidas referidas, código 6704001 (PEPINO, UNIDADE)"
        },
        {
                "keywords": [
                        "chuchu"
                ],
                "unitLabel": "unidade",
                "unitPlural": "unidades",
                "grams": 230,
                "min": 230,
                "max": 230,
                "source": "IBGE POF 2008-2009, medidas referidas, código 6704101 (CHUCHU, UNIDADE)"
        },
        {
                "keywords": [
                        "jilo"
                ],
                "unitLabel": "unidade",
                "unitPlural": "unidades",
                "grams": 26,
                "min": 26,
                "max": 26,
                "source": "IBGE POF 2008-2009, medidas referidas, código 6704201 (JILO, UNIDADE)"
        },
        {
                "keywords": [
                        "pimentao"
                ],
                "unitLabel": "unidade",
                "unitPlural": "unidades",
                "grams": 55,
                "min": 38,
                "max": 55,
                "source": "IBGE POF 2008-2009, medidas referidas, código 6704501 (PIMENTAO, UNIDADE)"
        },
        {
                "keywords": [
                        "quiabo"
                ],
                "unitLabel": "unidade",
                "unitPlural": "unidades",
                "grams": 18,
                "min": 18,
                "max": 18,
                "source": "IBGE POF 2008-2009, medidas referidas, código 6705001 (QUIABO, UNIDADE)"
        },
        {
                "keywords": [
                        "tomate",
                        "tomatinho"
                ],
                "unitLabel": "unidade",
                "unitPlural": "unidades",
                "grams": 100,
                "min": 50,
                "max": 100,
                "source": "IBGE POF 2008-2009, medidas referidas, código 6705101 (TOMATE, UNIDADE)"
        },
        {
                "keywords": [
                        "berinjela"
                ],
                "unitLabel": "unidade",
                "unitPlural": "unidades",
                "grams": 200,
                "min": 200,
                "max": 200,
                "source": "IBGE POF 2008-2009, medidas referidas, código 6705401 (BERINJELA, UNIDADE)"
        },
        {
                "keywords": [
                        "cebola"
                ],
                "unitLabel": "unidade",
                "unitPlural": "unidades",
                "grams": 70,
                "min": 30,
                "max": 70,
                "source": "IBGE POF 2008-2009, medidas referidas, código 6705701 (CEBOLA, UNIDADE)"
        },
        {
                "keywords": [
                        "alho"
                ],
                "unitLabel": "cabeça",
                "unitPlural": "cabeças",
                "grams": 4.4,
                "min": 4.4,
                "max": 4.4,
                "source": "IBGE POF 2008-2009, medidas referidas, código 6706201 (ALHO, UNIDADE)"
        },
        {
                "keywords": [
                        "laranja"
                ],
                "unitLabel": "unidade",
                "unitPlural": "unidades",
                "grams": 180,
                "min": 90,
                "max": 180,
                "source": "IBGE POF 2008-2009, medidas referidas, código 6801801 (LARANJA (PERA, SELETA, LIMA, DA TERRA, ETC), UNIDADE)"
        },
        {
                "keywords": [
                        "lima"
                ],
                "unitLabel": "unidade",
                "unitPlural": "unidades",
                "grams": 180,
                "min": 180,
                "max": 180,
                "source": "IBGE POF 2008-2009, medidas referidas, código 6801901 (LIMA, UNIDADE)"
        },
        {
                "keywords": [
                        "limao"
                ],
                "unitLabel": "unidade",
                "unitPlural": "unidades",
                "grams": 84,
                "min": 84,
                "max": 84,
                "source": "IBGE POF 2008-2009, medidas referidas, código 6802001 (LIMAO (COMUM, GALEGO, ETC), UNIDADE)"
        },
        {
                "keywords": [
                        "tangerina",
                        "mexerica",
                        "bergamota",
                        "mimosa",
                        "ponkan",
                        "pocan",
                        "murcote",
                        "tanja",
                        "maricota"
                ],
                "unitLabel": "unidade",
                "unitPlural": "unidades",
                "grams": 135,
                "min": 100,
                "max": 135,
                "source": "IBGE POF 2008-2009, medidas referidas, código 6802201 (TANGERINA, UNIDADE)"
        },
        {
                "keywords": [
                        "abacaxi"
                ],
                "unitLabel": "unidade",
                "unitPlural": "unidades",
                "grams": 750,
                "min": 480,
                "max": 750,
                "source": "IBGE POF 2008-2009, medidas referidas, código 6802601 (ABACAXI, UNIDADE)"
        },
        {
                "keywords": [
                        "abacate",
                        "avocado"
                ],
                "unitLabel": "unidade",
                "unitPlural": "unidades",
                "grams": 430,
                "min": 370,
                "max": 430,
                "source": "IBGE POF 2008-2009, medidas referidas, código 6802701 (ABACATE, UNIDADE)"
        },
        {
                "keywords": [
                        "caqui"
                ],
                "unitLabel": "unidade",
                "unitPlural": "unidades",
                "grams": 110,
                "min": 85,
                "max": 110,
                "source": "IBGE POF 2008-2009, medidas referidas, código 6802801 (CAQUI, UNIDADE)"
        },
        {
                "keywords": [
                        "figo"
                ],
                "unitLabel": "unidade",
                "unitPlural": "unidades",
                "grams": 55,
                "min": 55,
                "max": 55,
                "source": "IBGE POF 2008-2009, medidas referidas, código 6802901 (FIGO, UNIDADE)"
        },
        {
                "keywords": [
                        "maca"
                ],
                "unitLabel": "unidade",
                "unitPlural": "unidades",
                "grams": 150,
                "min": 90,
                "max": 150,
                "source": "IBGE POF 2008-2009, medidas referidas, código 6803001 (MACA, UNIDADE)"
        },
        {
                "keywords": [
                        "mamao",
                        "papaia"
                ],
                "unitLabel": "unidade",
                "unitPlural": "unidades",
                "grams": 310,
                "min": 270,
                "max": 310,
                "source": "IBGE POF 2008-2009, medidas referidas, código 6803101 (MAMAO, UNIDADE)"
        },
        {
                "keywords": [
                        "manga"
                ],
                "unitLabel": "unidade",
                "unitPlural": "unidades",
                "grams": 140,
                "min": 60,
                "max": 140,
                "source": "IBGE POF 2008-2009, medidas referidas, código 6803201 (MANGA, UNIDADE)"
        },
        {
                "keywords": [
                        "maracuja"
                ],
                "unitLabel": "unidade",
                "unitPlural": "unidades",
                "grams": 45,
                "min": 45,
                "max": 45,
                "source": "IBGE POF 2008-2009, medidas referidas, código 6803301 (MARACUJA, UNIDADE)"
        },
        {
                "keywords": [
                        "melao"
                ],
                "unitLabel": "unidade",
                "unitPlural": "unidades",
                "grams": 660,
                "min": 660,
                "max": 660,
                "source": "IBGE POF 2008-2009, medidas referidas, código 6803501 (MELAO, UNIDADE)"
        },
        {
                "keywords": [
                        "pera"
                ],
                "unitLabel": "unidade",
                "unitPlural": "unidades",
                "grams": 130,
                "min": 97.5,
                "max": 130,
                "source": "IBGE POF 2008-2009, medidas referidas, código 6803601 (PERA, UNIDADE)"
        },
        {
                "keywords": [
                        "pessego"
                ],
                "unitLabel": "unidade",
                "unitPlural": "unidades",
                "grams": 60,
                "min": 32,
                "max": 60,
                "source": "IBGE POF 2008-2009, medidas referidas, código 6803701 (PESSEGO, UNIDADE)"
        },
        {
                "keywords": [
                        "uva"
                ],
                "unitLabel": "cacho",
                "unitPlural": "cachos",
                "grams": 170,
                "min": 170,
                "max": 170,
                "source": "IBGE POF 2008-2009, medidas referidas, código 6803901 (UVA, CACHO)"
        },
        {
                "keywords": [
                        "jenipapo"
                ],
                "unitLabel": "unidade",
                "unitPlural": "unidades",
                "grams": 60,
                "min": 60,
                "max": 60,
                "source": "IBGE POF 2008-2009, medidas referidas, código 6804001 (JENIPAPO, UNIDADE)"
        },
        {
                "keywords": [
                        "goiaba"
                ],
                "unitLabel": "unidade",
                "unitPlural": "unidades",
                "grams": 170,
                "min": 50,
                "max": 170,
                "source": "IBGE POF 2008-2009, medidas referidas, código 6804201 (GOIABA, UNIDADE)"
        },
        {
                "keywords": [
                        "ameixa"
                ],
                "unitLabel": "unidade",
                "unitPlural": "unidades",
                "grams": 42,
                "min": 34,
                "max": 42,
                "source": "IBGE POF 2008-2009, medidas referidas, código 6804301 (AMEIXA, UNIDADE)"
        },
        {
                "keywords": [
                        "caju"
                ],
                "unitLabel": "unidade",
                "unitPlural": "unidades",
                "grams": 90,
                "min": 80,
                "max": 90,
                "source": "IBGE POF 2008-2009, medidas referidas, código 6804401 (CAJU, UNIDADE)"
        },
        {
                "keywords": [
                        "cereja"
                ],
                "unitLabel": "unidade",
                "unitPlural": "unidades",
                "grams": 6.8,
                "min": 6.8,
                "max": 6.8,
                "source": "IBGE POF 2008-2009, medidas referidas, código 6804501 (CEREJA, UNIDADE)"
        },
        {
                "keywords": [
                        "tapereba",
                        "caja"
                ],
                "unitLabel": "unidade",
                "unitPlural": "unidades",
                "grams": 5.7,
                "min": 5.7,
                "max": 5.7,
                "source": "IBGE POF 2008-2009, medidas referidas, código 6804701 (TAPEREBA, UNIDADE)"
        },
        {
                "keywords": [
                        "carambola"
                ],
                "unitLabel": "unidade",
                "unitPlural": "unidades",
                "grams": 75,
                "min": 75,
                "max": 75,
                "source": "IBGE POF 2008-2009, medidas referidas, código 6804801 (CARAMBOLA, UNIDADE)"
        },
        {
                "keywords": [
                        "jaboticaba"
                ],
                "unitLabel": "unidade",
                "unitPlural": "unidades",
                "grams": 5,
                "min": 5,
                "max": 5,
                "source": "IBGE POF 2008-2009, medidas referidas, código 6804901 (JABOTICABA, UNIDADE)"
        },
        {
                "keywords": [
                        "graviola"
                ],
                "unitLabel": "unidade",
                "unitPlural": "unidades",
                "grams": 227,
                "min": 227,
                "max": 227,
                "source": "IBGE POF 2008-2009, medidas referidas, código 6805001 (GRAVIOLA, UNIDADE)"
        },
        {
                "keywords": [
                        "morango"
                ],
                "unitLabel": "unidade",
                "unitPlural": "unidades",
                "grams": 12,
                "min": 7,
                "max": 12,
                "source": "IBGE POF 2008-2009, medidas referidas, código 6805201 (MORANGO, UNIDADE)"
        },
        {
                "keywords": [
                        "jambo"
                ],
                "unitLabel": "unidade",
                "unitPlural": "unidades",
                "grams": 40,
                "min": 40,
                "max": 40,
                "source": "IBGE POF 2008-2009, medidas referidas, código 6805301 (JAMBO, UNIDADE)"
        },
        {
                "keywords": [
                        "atemoia"
                ],
                "unitLabel": "unidade",
                "unitPlural": "unidades",
                "grams": 227,
                "min": 227,
                "max": 227,
                "source": "IBGE POF 2008-2009, medidas referidas, código 6805401 (ATEMOIA (FRUTA), UNIDADE)"
        },
        {
                "keywords": [
                        "nespera"
                ],
                "unitLabel": "unidade",
                "unitPlural": "unidades",
                "grams": 27,
                "min": 27,
                "max": 27,
                "source": "IBGE POF 2008-2009, medidas referidas, código 6805801 (NESPERA, UNIDADE)"
        },
        {
                "keywords": [
                        "sapoti"
                ],
                "unitLabel": "unidade",
                "unitPlural": "unidades",
                "grams": 50,
                "min": 50,
                "max": 50,
                "source": "IBGE POF 2008-2009, medidas referidas, código 6806001 (SAPOTI, UNIDADE)"
        },
        {
                "keywords": [
                        "tamarindo"
                ],
                "unitLabel": "unidade",
                "unitPlural": "unidades",
                "grams": 8.06,
                "min": 8.06,
                "max": 8.06,
                "source": "IBGE POF 2008-2009, medidas referidas, código 6806201 (TAMARINDO, UNIDADE)"
        },
        {
                "keywords": [
                        "cacau"
                ],
                "unitLabel": "unidade",
                "unitPlural": "unidades",
                "grams": 91.2,
                "min": 91.2,
                "max": 91.2,
                "source": "IBGE POF 2008-2009, medidas referidas, código 6806301 (CACAU, UNIDADE)"
        },
        {
                "keywords": [
                        "pitomba"
                ],
                "unitLabel": "cacho",
                "unitPlural": "cachos",
                "grams": 60,
                "min": 60,
                "max": 60,
                "source": "IBGE POF 2008-2009, medidas referidas, código 6806401 (PITOMBA, CACHO)"
        },
        {
                "keywords": [
                        "bacuri"
                ],
                "unitLabel": "unidade",
                "unitPlural": "unidades",
                "grams": 40,
                "min": 40,
                "max": 40,
                "source": "IBGE POF 2008-2009, medidas referidas, código 6806501 (BACURI, UNIDADE)"
        },
        {
                "keywords": [
                        "pitanga"
                ],
                "unitLabel": "unidade",
                "unitPlural": "unidades",
                "grams": 10,
                "min": 10,
                "max": 10,
                "source": "IBGE POF 2008-2009, medidas referidas, código 6806801 (PITANGA, UNIDADE)"
        },
        {
                "keywords": [
                        "ciriguela",
                        "seriguela"
                ],
                "unitLabel": "unidade",
                "unitPlural": "unidades",
                "grams": 10,
                "min": 5.6,
                "max": 10,
                "source": "IBGE POF 2008-2009, medidas referidas, código 6806901 (CIRIGUELA, UNIDADE)"
        },
        {
                "keywords": [
                        "umbu",
                        "imbu"
                ],
                "unitLabel": "unidade",
                "unitPlural": "unidades",
                "grams": 33.33,
                "min": 33.33,
                "max": 33.33,
                "source": "IBGE POF 2008-2009, medidas referidas, código 6807101 (UMBU, UNIDADE)"
        },
        {
                "keywords": [
                        "nectarina"
                ],
                "unitLabel": "unidade",
                "unitPlural": "unidades",
                "grams": 60,
                "min": 60,
                "max": 60,
                "source": "IBGE POF 2008-2009, medidas referidas, código 6807401 (NECTARINA, UNIDADE)"
        },
        {
                "keywords": [
                        "roma"
                ],
                "unitLabel": "unidade",
                "unitPlural": "unidades",
                "grams": 70,
                "min": 70,
                "max": 70,
                "source": "IBGE POF 2008-2009, medidas referidas, código 6807601 (ROMA, UNIDADE)"
        },
        {
                "keywords": [
                        "acerola"
                ],
                "unitLabel": "unidade",
                "unitPlural": "unidades",
                "grams": 12,
                "min": 12,
                "max": 12,
                "source": "IBGE POF 2008-2009, medidas referidas, código 6807701 (ACEROLA, UNIDADE)"
        },
        {
                "keywords": [
                        "kiwi"
                ],
                "unitLabel": "unidade",
                "unitPlural": "unidades",
                "grams": 94,
                "min": 57,
                "max": 94,
                "source": "IBGE POF 2008-2009, medidas referidas, código 6807801 (KIWI, UNIDADE)"
        },
        {
                "keywords": [
                        "amora"
                ],
                "unitLabel": "unidade",
                "unitPlural": "unidades",
                "grams": 4,
                "min": 4,
                "max": 4,
                "source": "IBGE POF 2008-2009, medidas referidas, código 6809901 (AMORA, UNIDADE)"
        },
        {
                "keywords": [
                        "pinhao"
                ],
                "unitLabel": "unidade",
                "unitPlural": "unidades",
                "grams": 4,
                "min": 4,
                "max": 4,
                "source": "IBGE POF 2008-2009, medidas referidas, código 6600401 (PINHAO, UNIDADE)"
        },
        {
                "keywords": [
                        "noz",
                        "nozes"
                ],
                "unitLabel": "unidade",
                "unitPlural": "unidades",
                "grams": 5,
                "min": 5,
                "max": 5,
                "source": "IBGE POF 2008-2009, medidas referidas, código 6601501 (NOZ, UNIDADE)"
        },
        {
                "keywords": [
                        "pupunha"
                ],
                "unitLabel": "unidade",
                "unitPlural": "unidades",
                "grams": 22.5,
                "min": 16.9,
                "max": 22.5,
                "source": "IBGE POF 2008-2009, medidas referidas, código 6601805 (PUPUNHA, UNIDADE)"
        }
    ];

    /** @type {UnitWeightEntry[]} */
    let unitWeightRules = Array.isArray(window.HORTI_UNIT_WEIGHTS)
        ? window.HORTI_UNIT_WEIGHTS
        : DEFAULT_UNIT_WEIGHTS;

    /**
     * @param {string} itemKeyStr
     * @returns {UnitWeightEntry | null}
     */
    const findUnitWeight = (itemKeyStr) => {
        if (Array.isArray(window.HORTI_UNIT_WEIGHTS)) {
            unitWeightRules = window.HORTI_UNIT_WEIGHTS;
        }
        const padded = ` ${normalizeText(itemKeyStr).replace(/[^a-z0-9]+/g, ' ').trim()} `;
        if (!padded.trim()) return null;
        /** @type {{ rule: UnitWeightEntry, words: number, len: number, idx: number } | null} */
        let best = null;
        for (let idx = 0; idx < unitWeightRules.length; idx++) {
            const rule = unitWeightRules[idx];
            if (!rule || !Array.isArray(rule.keywords)) continue;
            for (const rawKw of rule.keywords) {
                const kw = normalizeText(rawKw).replace(/[^a-z0-9]+/g, ' ').trim();
                if (!kw) continue;
                if (matchesKeyword(padded, kw)) {
                    const words = kw.split(/\s+/).length;
                    const len = kw.length;
                    if (
                        !best
                        || words > best.words
                        || (words === best.words && len > best.len)
                        || (words === best.words && len === best.len && idx < best.idx)
                    ) {
                        best = { rule, words, len, idx };
                    }
                }
            }
        }
        return best ? best.rule : null;
    };

    /**
     * @param {Product} item
     * @returns {{ qty: number, label: string, gramsStr: string, priceStr: string, estPrice: number, inlineText: string, msgText: string }}
     */
    const formatUnitEstimate = (item) => {
        const uw = item.unitWeight || { unitLabel: 'unidade', unitPlural: 'unidades', grams: 0, min: 0, max: 0, keywords: [], source: '' };
        const rawQty = Number(item.quantidade);
        const qty = Number.isFinite(rawQty) && rawQty >= 1 ? Math.round(rawQty) : 1;
        const label = qty === 1 ? uw.unitLabel : (uw.unitPlural || `${uw.unitLabel}s`);
        const totalGrams = qty * uw.grams;
        const roundedGrams = Math.round(totalGrams * 10) / 10;
        const gramsStr = Number.isInteger(roundedGrams)
            ? String(roundedGrams)
            : roundedGrams.toFixed(1).replace('.', ',');
        const estPrice = (totalGrams / 1000) * item.preco;
        const priceStr = estPrice.toFixed(2).replace('.', ',');
        return {
            qty,
            label,
            gramsStr,
            priceStr,
            estPrice,
            inlineText: `${qty} ${label} ≈ ${gramsStr} g · ≈ R$ ${priceStr}`,
            msgText: `${qty} ${label} (≈ ${gramsStr} g · ≈ R$ ${priceStr})`
        };
    };

    /**
     * @param {string | null} promoDate
     */
    const showPromoDate = (promoDate) => {
        if (promoDate) {
            promoDateEl.textContent = `📅 Promoção de: ${promoDate}`;
            promoDateEl.classList.remove('hidden');
        } else {
            promoDateEl.classList.add('hidden');
        }
    };

    // Converte a saída do parser no modelo do app. Combos ("3 por R$ 10") viram
    // um item com o preço exato do combo, para o total não perder centavos.
    /**
     * @param {ParsedItem & { unit: any }} it
     * @returns {Product}
     */
    const toProduct = (it) => {
        const categoria = it.category || 'Geral';
        const key = itemKey(it.name, it.packQty);
        const id = productId(categoria, it.name, it.packQty);
        let nome = it.name;
        let unidade = UNIT_LABELS[it.unit] || 'un';
        if (it.packQty) {
            nome = `${nome} (combo ${it.packQty} ${unidade})`;
            unidade = 'combo';
        }
        const uw = unidade === 'kg' ? findUnitWeight(key) : null;
        return {
            id,
            itemKey: key,
            nome,
            preco: it.price,
            unidade,
            promocao: !!it.promo,
            precoAnterior: it.oldPrice,
            conferir: it.confidence < 0.5,
            categoria,
            quantidade: 1,
            selecionado: false,
            modo: 'kg',
            unitWeight: uw,
            source: it.source,
            raw: it.raw
        };
    };

    /**
     * @param {Product[]} products
     * @returns {CartV1}
     */
    const loadAndMigrateCart = (products) => {
        const cartKey = getCartKey();
        if (localStorage.getItem(cartKey) === null && localStorage.getItem(CART_V1_KEY) !== null) {
            localStorage.setItem(cartKey, localStorage.getItem(CART_V1_KEY) || '{}');
            localStorage.removeItem(CART_V1_KEY);
        }
        if (localStorage.getItem(cartKey) === null && localStorage.getItem(LEGACY_CART_KEY) !== null) {
            const legacy = readStoredObject(LEGACY_CART_KEY, {});
            /** @type {CartV1} */
            const migrated = {};
            const comboSuffixRe = /^(.*?)\s*\(combo\s+(\d+)\s+[^)]+\)$/i;

            Object.entries(legacy).forEach(([oldName, rawQty]) => {
                if (typeof rawQty !== 'number' || !Number.isFinite(rawQty) || rawQty < 0) return;
                const m = oldName.match(comboSuffixRe);
                const baseName = m ? m[1].trim() : oldName;
                const packQty = m ? parseInt(m[2], 10) : null;
                const key = itemKey(baseName, packQty);
                const matched = products.find(p => p.itemKey === key);
                if (matched) {
                    migrated[matched.id] = {
                        qty: rawQty,
                        name: matched.nome,
                        unit: matched.unidade,
                        price: matched.preco,
                        category: matched.categoria
                    };
                } else {
                    const fallbackId = productId('Geral', baseName, packQty);
                    migrated[fallbackId] = {
                        qty: rawQty,
                        name: oldName,
                        unit: packQty ? 'combo' : 'un',
                        price: 0,
                        category: 'Geral'
                    };
                }
            });

            localStorage.setItem(cartKey, JSON.stringify(migrated));
            localStorage.removeItem(LEGACY_CART_KEY);
            return migrated;
        }

        const raw = readStoredObject(cartKey, {});
        /** @type {CartV1} */
        const valid = {};
        Object.entries(raw).forEach(([id, entry]) => {
            if (entry && typeof entry === 'object' && typeof entry.qty === 'number' && Number.isFinite(entry.qty) && entry.qty >= 0) {
                /** @type {CartV1Entry} */
                const itemEntry = {
                    qty: entry.qty,
                    name: String(entry.name || id),
                    unit: String(entry.unit || 'un'),
                    price: Number(entry.price) || 0,
                    category: String(entry.category || 'Geral')
                };
                if (entry.mode === 'unit') {
                    itemEntry.mode = 'unit';
                }
                valid[id] = itemEntry;
            }
        });
        return valid;
    };

    /**
     * @param {string} text
     * @returns {{ products: Product[], unparsed: number, unparsedItems: UnparsedLine[], promoDate: string | null }}
     */
    function parseProducts(text) {
        const activeProfile = getActiveProfile();
        const templates = createTemplateStore(localStorage, getTemplatesKey()).list();
        const result = parseList(text, { templates, boldIsPromo: activeProfile.boldIsPromo });
        return {
            products: result.items.map(toProduct).filter(p => p.nome && p.preco > 0),
            unparsed: result.unparsed.length,
            unparsedItems: result.unparsed,
            promoDate: result.promoDate
        };
    }

    // 3. Rendering & UI Management
    function renderTabs() {
        const categories = ['Todos'];
        const hasPromotions = allProducts.some(p => p.promocao);
        const baseCategories = [...new Set(allProducts.map(p => p.categoria).filter(cat => cat !== 'Promoção'))];

        if (hasPromotions) categories.push('Promoção');
        categories.push(...baseCategories);

        tabsContainer.innerHTML = '';
        
        categories.forEach(cat => {
            const tab = document.createElement('button');
            tab.type = 'button';
            tab.dataset.category = cat;
            tab.className = `tab ${activeCategory === cat ? 'active' : ''}`;
            const tabIcon = document.createElement('img');
            tabIcon.src = getCategoryIconUrl(cat);
            tabIcon.alt = '';
            tabIcon.className = 'tab-icon';

            const tabLabel = document.createElement('span');
            tabLabel.textContent = cat;

            tab.append(tabIcon, tabLabel);
            tab.onclick = () => {
                activeCategory = cat;
                renderTabs();
                renderItems();
            };
            tabsContainer.appendChild(tab);
        });
    }

    function renderItems() {
        const prevSnapshot = getPreviousPriceSnapshot(getActiveSupplierId());
        const searchTerm = normalizeText(searchInput.value).trim();
        itemsList.innerHTML = '';

        const filtered = allProducts.filter(p => {
            if (showOnlySelected && !p.selecionado) return false;
            const matchesSearch = normalizeText(p.nome).includes(searchTerm);
            const matchesTab = activeCategory === 'Todos'
                || (activeCategory === 'Promoção' ? p.promocao : p.categoria === activeCategory);
            return matchesSearch && matchesTab;
        });

        filtered.forEach(item => {
            const div = document.createElement('div');
            const itemClasses = ['item-row'];
            const itemIconUrl = getItemIcon(item.nome, item.categoria);
            if (item.selecionado) itemClasses.push('selected');
            if (item.promocao) itemClasses.push('promo-item');
            div.className = itemClasses.join(' ');

            // DOM montado sem innerHTML: nome e unidade vêm de texto externo (não confiável).
            const check = document.createElement('input');
            check.type = 'checkbox';
            check.className = 'item-check';
            check.checked = item.selecionado;

            const nameWrap = document.createElement('span');
            nameWrap.className = 'item-name';

            const icon = document.createElement('img');
            icon.className = 'item-icon';
            icon.src = itemIconUrl;
            icon.alt = '';
            icon.loading = 'lazy';
            icon.decoding = 'async';

            const nameText = document.createElement('span');
            nameText.className = 'item-name-text';
            nameText.textContent = item.nome;

            nameWrap.append(icon, nameText);
            if (item.conferir) {
                const warn = document.createElement('span');
                warn.className = 'check-badge';
                warn.textContent = '⚠ conferir';
                warn.title = 'Preço lido com pouca certeza (sem R$). Confira com o fornecedor.';
                nameWrap.append(warn);
            }

            const price = document.createElement('span');
            price.className = 'item-price';

            if (item.precoAnterior && item.precoAnterior > 0 && item.precoAnterior !== item.preco) {
                const oldPriceEl = document.createElement('del');
                oldPriceEl.className = 'old-price';
                const formattedOld = item.precoAnterior.toFixed(2).replace('.', ',');
                oldPriceEl.setAttribute('aria-label', `antes R$ ${formattedOld}`);
                oldPriceEl.textContent = `R$ ${formattedOld}`;
                price.appendChild(oldPriceEl);
                price.appendChild(document.createTextNode(' '));
            }

            const currentPriceText = document.createTextNode(`R$ ${item.preco.toFixed(2).replace('.', ',')}/${item.unidade}`);
            price.appendChild(currentPriceText);

            if (prevSnapshot && prevSnapshot.prices && prevSnapshot.prices[item.id]) {
                const prevEntry = prevSnapshot.prices[item.id];
                if (prevEntry.unit === item.unidade && typeof prevEntry.price === 'number' && prevEntry.price > 0 && item.preco !== prevEntry.price) {
                    const pct = Math.round(((item.preco - prevEntry.price) / prevEntry.price) * 100);
                    if (pct !== 0) {
                        const isUp = pct > 0;
                        const absPct = Math.abs(pct);
                        const arrow = isUp ? '↑' : '↓';
                        const action = isUp ? 'subiu' : 'caiu';
                        const diffBadge = document.createElement('span');
                        diffBadge.className = `price-diff ${isUp ? 'price-up' : 'price-down'}`;
                        diffBadge.textContent = `${arrow} ${absPct}%`;
                        const dateRef = formatDateRef(prevSnapshot);
                        const labelText = dateRef ? `${action} ${absPct}% desde ${dateRef}` : `${action} ${absPct}%`;
                        diffBadge.setAttribute('aria-label', labelText);
                        diffBadge.setAttribute('title', labelText);
                        price.appendChild(document.createTextNode(' '));
                        price.appendChild(diffBadge);
                    }
                }
            }

            const qtyInput = document.createElement('input');
            qtyInput.type = 'number';
            qtyInput.className = 'item-qty';
            qtyInput.value = item.quantidade;
            qtyInput.min = isDecimalMode(item) ? '0.25' : '1';
            qtyInput.step = isDecimalMode(item) ? '0.25' : '1';
            qtyInput.disabled = !item.selecionado;

            div.append(check, nameWrap, price, qtyInput);

            /** @type {HTMLSpanElement | null} */
            let unitEstimate = null;

            if (item.unidade === 'kg' && item.unitWeight) {
                div.classList.add('has-unit-mode');
                const modeBar = document.createElement('div');
                modeBar.className = 'unit-mode-bar';

                const modeSelector = document.createElement('div');
                modeSelector.className = 'unit-mode-selector';
                modeSelector.setAttribute('role', 'group');
                modeSelector.setAttribute('aria-label', 'Modo de pedido');

                const kgBtn = document.createElement('button');
                kgBtn.type = 'button';
                kgBtn.className = `unit-mode-btn${item.modo !== 'unit' ? ' active' : ''}`;
                kgBtn.dataset.mode = 'kg';
                kgBtn.setAttribute('aria-pressed', String(item.modo !== 'unit'));
                kgBtn.textContent = 'kg';

                const unitBtn = document.createElement('button');
                unitBtn.type = 'button';
                unitBtn.className = `unit-mode-btn${item.modo === 'unit' ? ' active' : ''}`;
                unitBtn.dataset.mode = 'unit';
                unitBtn.setAttribute('aria-pressed', String(item.modo === 'unit'));
                unitBtn.textContent = item.unitWeight.unitLabel;

                unitEstimate = document.createElement('span');
                unitEstimate.className = `unit-estimate${item.modo === 'unit' ? '' : ' hidden'}`;
                if (item.modo === 'unit') {
                    unitEstimate.textContent = formatUnitEstimate(item).inlineText;
                }

                /** @param {'kg' | 'unit'} nextMode */
                const applyMode = (nextMode) => {
                    item.modo = nextMode;
                    const inUnitMode = nextMode === 'unit';
                    kgBtn.classList.toggle('active', !inUnitMode);
                    kgBtn.setAttribute('aria-pressed', String(!inUnitMode));
                    unitBtn.classList.toggle('active', inUnitMode);
                    unitBtn.setAttribute('aria-pressed', String(inUnitMode));

                    if (inUnitMode) {
                        item.quantidade = Math.max(1, Math.round(Number(item.quantidade) || 1));
                        qtyInput.min = '1';
                        qtyInput.step = '1';
                        qtyInput.value = item.quantidade;
                        if (unitEstimate) {
                            unitEstimate.textContent = formatUnitEstimate(item).inlineText;
                            unitEstimate.classList.remove('hidden');
                        }
                    } else {
                        if (!Number.isFinite(item.quantidade) || item.quantidade < 0.25) {
                            item.quantidade = 1;
                        }
                        qtyInput.min = '0.25';
                        qtyInput.step = '0.25';
                        qtyInput.value = item.quantidade;
                        if (unitEstimate) {
                            unitEstimate.textContent = '';
                            unitEstimate.classList.add('hidden');
                        }
                    }
                    updateTotals();
                    saveCart();
                };

                kgBtn.onclick = () => applyMode('kg');
                unitBtn.onclick = () => applyMode('unit');

                modeSelector.append(kgBtn, unitBtn);
                modeBar.append(modeSelector, unitEstimate);
                div.appendChild(modeBar);
            }

            check.onchange = (e) => {
                item.selecionado = e.target.checked;
                qtyInput.disabled = !item.selecionado;
                div.classList.toggle('selected', item.selecionado);
                updateFilterBtn();
                updateTotals();
                saveCart();
            };

            qtyInput.oninput = (e) => {
                item.quantidade = parseFloat(e.target.value) || 0;
                if (unitEstimate && item.modo === 'unit' && item.unitWeight && item.quantidade > 0) {
                    unitEstimate.textContent = formatUnitEstimate(item).inlineText;
                }
                updateTotals();
                saveCart();
            };

            // Ao sair do campo: quantidade inválida ou menor que o mínimo da unidade desmarca o item
            // (durante a digitação não, para permitir apagar e digitar outro número).
            qtyInput.onchange = (e) => {
                let qty = parseFloat(e.target.value);
                if (Number.isFinite(qty) && !isDecimalMode(item)) qty = Math.round(qty);
                const min = isDecimalMode(item) ? 0.25 : 1;
                if (!item.selecionado || (Number.isFinite(qty) && qty >= min)) {
                    if (Number.isFinite(qty)) {
                        item.quantidade = qty;
                        qtyInput.value = qty;
                    }
                    if (unitEstimate && item.modo === 'unit' && item.unitWeight) {
                        unitEstimate.textContent = formatUnitEstimate(item).inlineText;
                    }
                    updateTotals();
                    saveCart();
                    return;
                }
                item.selecionado = false;
                item.quantidade = 1;
                check.checked = false;
                qtyInput.value = 1;
                qtyInput.disabled = true;
                div.classList.remove('selected');
                if (unitEstimate && item.modo === 'unit' && item.unitWeight) {
                    unitEstimate.textContent = formatUnitEstimate(item).inlineText;
                }
                updateFilterBtn();
                updateTotals();
                saveCart();
            };

            itemsList.appendChild(div);
        });

        const filteredUnavailable = Object.entries(unavailableCart).filter(([, entry]) => {
            const matchesSearch = normalizeText(entry.name).includes(searchTerm);
            const matchesTab = activeCategory === 'Todos'
                || (activeCategory !== 'Promoção' && entry.category === activeCategory);
            return matchesSearch && matchesTab;
        });

        filteredUnavailable.forEach(([unavailId, entry]) => {
            const div = document.createElement('div');
            div.className = 'item-row unavailable-item';

            const itemIconUrl = getItemIcon(entry.name, entry.category);

            const check = document.createElement('input');
            check.type = 'checkbox';
            check.className = 'item-check';
            check.checked = true;
            check.disabled = true;

            const nameWrap = document.createElement('span');
            nameWrap.className = 'item-name';

            const icon = document.createElement('img');
            icon.className = 'item-icon';
            icon.src = itemIconUrl;
            icon.alt = '';
            icon.loading = 'lazy';
            icon.decoding = 'async';

            const nameText = document.createElement('span');
            nameText.className = 'item-name-text';
            nameText.textContent = entry.name;

            const badge = document.createElement('span');
            badge.className = 'unavailable-badge';
            badge.textContent = 'indisponível nesta lista';

            nameWrap.append(icon, nameText, badge);

            const price = document.createElement('span');
            price.className = 'item-price';
            price.textContent = entry.price > 0
                ? `R$ ${entry.price.toFixed(2).replace('.', ',')}/${entry.unit}`
                : '—';

            const removeBtn = document.createElement('button');
            removeBtn.type = 'button';
            removeBtn.className = 'remove-unavailable-btn';
            removeBtn.textContent = 'Remover';
            removeBtn.onclick = () => {
                delete unavailableCart[unavailId];
                saveCart();
                updateFilterBtn();
                renderItems();
            };

            div.append(check, nameWrap, price, removeBtn);
            itemsList.appendChild(div);
        });
    }

    // Só kg (no modo kg) aceita quantidade decimal; modo unidade e demais unidades são inteiros.
    /**
     * @param {string} unidade
     * @returns {boolean}
     */
    const isDecimalUnit = (unidade) => unidade === 'kg';

    /**
     * @param {Product} item
     * @returns {boolean}
     */
    const isDecimalMode = (item) => isDecimalUnit(item.unidade) && item.modo !== 'unit';

    // Itens que entram no pedido: marcados e com quantidade maior que zero.
    const getCartItems = () => allProducts.filter(p => p.selecionado && p.quantidade > 0);

    // Mensagem de uma linha só: remove quebras e caracteres de controle de texto externo.
    /**
     * @param {string} value
     * @returns {string}
     */
    const toSingleLine = (value) => String(value)
        .replace(/[\u0000-\u001f\u007f\u2028\u2029]+/g, ' ')
        .replace(/\s+/g, ' ')
        .trim();

    const getGreeting = () => {
        const hour = new Date().getHours();
        if (hour < 12) return 'Bom dia';
        if (hour < 18) return 'Boa tarde';
        return 'Boa noite';
    };

    function updateTotals() {
        let subtotal = 0;
        let hasEstimated = false;
        const selected = getCartItems();

        selected.forEach(p => {
            if (p.unidade === 'kg' && p.modo === 'unit' && p.unitWeight) {
                subtotal += formatUnitEstimate(p).estPrice;
                hasEstimated = true;
            } else {
                subtotal += p.preco * p.quantidade;
            }
        });

        const deliveryFee = getActiveProfile().deliveryFee;
        const total = subtotal + deliveryFee;

        if (hasEstimated) {
            subtotalLabel.textContent = 'Subtotal estimado';
            subtotalValue.textContent = `≈ R$ ${subtotal.toFixed(2).replace('.', ',')}`;
            totalLabel.textContent = 'Total estimado';
            totalValue.textContent = `≈ R$ ${total.toFixed(2).replace('.', ',')}`;
            estimatedNote.classList.remove('hidden');
        } else {
            subtotalLabel.textContent = 'Subtotal';
            subtotalValue.textContent = `R$ ${subtotal.toFixed(2).replace('.', ',')}`;
            totalLabel.textContent = 'Total';
            totalValue.textContent = `R$ ${total.toFixed(2).replace('.', ',')}`;
            estimatedNote.classList.add('hidden');
        }
        deliveryFeeEl.textContent = `R$ ${deliveryFee.toFixed(2).replace('.', ',')}`;

        generateMessage(selected, total, hasEstimated);
        updateWhatsAppButton(selected, finalMessage.value);
    }

    /**
     * @param {Product[]} items
     * @param {string} message
     */
    function updateWhatsAppButton(items, message) {
        if (!whatsappBtn) return;
        const profile = getActiveProfile();
        const hasPhone = Boolean(profile && profile.whatsapp && profile.whatsapp.trim().length > 0);
        const hasItems = items.length > 0;

        if (hasPhone && hasItems) {
            const url = buildWhatsAppUrl(profile.whatsapp, message);
            whatsappBtn.href = url;
            whatsappBtn.setAttribute('aria-disabled', 'false');
            whatsappBtn.classList.remove('disabled');
            whatsappBtn.removeAttribute('tabindex');
            whatsappBtn.title = 'Enviar pedido diretamente no WhatsApp do fornecedor';

            if (whatsappNotice) {
                if (encodeURIComponent(message).length > 2000) {
                    whatsappNotice.classList.remove('hidden');
                } else {
                    whatsappNotice.classList.add('hidden');
                }
            }
        } else {
            whatsappBtn.removeAttribute('href');
            whatsappBtn.setAttribute('aria-disabled', 'true');
            whatsappBtn.classList.add('disabled');
            whatsappBtn.setAttribute('tabindex', '-1');

            if (!hasItems) {
                whatsappBtn.title = 'Selecione itens no carrinho para enviar o pedido';
            } else if (!hasPhone) {
                whatsappBtn.title = 'Configure o WhatsApp do fornecedor em "Configurar fornecedor" para enviar direto';
            }

            if (whatsappNotice) {
                whatsappNotice.classList.add('hidden');
            }
        }
    }


    /**
     * @param {Product[]} items
     * @param {number} total
     * @param {boolean} [hasEstimated]
     */
    function generateMessage(items, total, hasEstimated = false) {
        if (items.length === 0) {
            finalMessage.value = 'Selecione pelo menos um item para gerar o pedido.';
            return;
        }

        const endereco = toSingleLine(enderecoInput.value) || 'Não informado';
        const pagamento = pagamentoSelect.value;

        let msg = `${getGreeting()}, tudo bem? Gostaria de fazer um pedido:\n\n`;
        
        const categories = [...new Set(items.map(i => i.categoria))];
        categories.forEach(cat => {
            const catEmoji = getWhatsAppCategoryEmoji(cat);
            const catUpper = toSingleLine(cat).toUpperCase();
            msg += `${catEmoji} *${catUpper}*\n`;
            items.filter(i => i.categoria === cat).forEach(item => {
                const itemEmoji = getWhatsAppItemEmoji(item.nome);
                const prefix = itemEmoji ? `${itemEmoji} ` : '';
                if (item.unidade === 'kg' && item.modo === 'unit' && item.unitWeight) {
                    const est = formatUnitEstimate(item);
                    msg += `- ${prefix}${toSingleLine(item.nome)}, ${est.msgText}\n`;
                } else {
                    const itemTotal = item.preco * item.quantidade;
                    // Combo: formato explícito "N combo(s)", para o fornecedor não ler como N unidades (ADR-011).
                    const qtyStr = String(item.quantidade).replace('.', ',');
                    const isCombo = item.unidade === 'combo' || Boolean(/** @type {any} */ (item).packQty);
                    const qty = isCombo
                        ? `${qtyStr} ${item.quantidade === 1 ? 'combo' : 'combos'}`
                        : `${qtyStr}${item.unidade}`;
                    msg += `- ${prefix}${toSingleLine(item.nome)}, ${qty} (R$ ${itemTotal.toFixed(2).replace('.', ',')})\n`;
                }
            });
            msg += '\n';
        });

        const deliveryFee = getActiveProfile().deliveryFee;
        msg += `Taxa de entrega: R$ ${deliveryFee.toFixed(2).replace('.', ',')}\n`;
        if (hasEstimated) {
            msg += `*Total estimado: ≈ R$ ${total.toFixed(2).replace('.', ',')} (itens por unidade são pesados na separação)*\n\n`;
        } else {
            msg += `*Total Geral: R$ ${total.toFixed(2).replace('.', ',')}*\n\n`;
        }
        msg += `📍 *Endereço:* ${endereco}\n`;
        msg += `💳 *Pagamento:* ${pagamento}`;

        finalMessage.value = msg;
    }

    // 4. Main Actions
    /**
     * @param {string} text
     * @param {{ source?: string, saveToStorage?: boolean }} [opts]
     * @returns {boolean}
     */
    const processContent = (text, { source = 'manual', saveToStorage = true } = {}) => {
        const parsed = parseProducts(text);

        // Valida antes de mexer no estado: sem produtos, a lista, o carrinho e o texto salvo ficam como estavam.
        if (parsed.products.length === 0) {
            setUpdateStatus('error', allProducts.length > 0
                ? 'Nenhum produto encontrado no texto informado. A lista anterior foi mantida.'
                : 'Nenhum produto encontrado no texto informado.');
            return false;
        }

        allProducts = parsed.products;
        showPromoDate(parsed.promoDate);
        currentUnparsedLines = parsed.unparsedItems ? [...parsed.unparsedItems] : [];

        if (saveToStorage) {
            persistRawText(text, source);
            savePriceSnapshot(getActiveSupplierId(), parsed.products, parsed.promoDate);
        }
        if (parsed.unparsed > 0) {
            updateStatusEl.appendChild(document.createTextNode(` ${parsed.unparsed} linha(s) não reconhecida(s) e ignorada(s). `));
            const revBtn = document.createElement('button');
            revBtn.type = 'button';
            revBtn.className = 'status-review-btn';
            revBtn.textContent = 'Revisar';
            revBtn.onclick = () => openReviewPanel();
            updateStatusEl.appendChild(revBtn);
        }
        
        activeCategory = 'Todos';
        selectionSection.classList.remove('hidden');
        summarySection.classList.remove('hidden');
        
        // Hydrate cart from storage (ADR-008: migração + 4 passos de reconciliação)
        unavailableCart = {};
        pendingSpellingSuggestions = [];
        const storedCart = loadAndMigrateCart(allProducts);
        const storedUnitModes = readStoredObject(getUnitModesKey(), {});
        const matchedProductIds = new Set();

        allProducts.forEach(p => {
            const key = p.itemKey || p.id;
            if (p.unitWeight && storedUnitModes[key] === 'unit') {
                p.modo = 'unit';
            }
        });

        /**
         * @param {Product} target
         * @param {CartV1Entry} entry
         */
        const applyCartEntryToProduct = (target, entry) => {
            target.selecionado = true;
            const key = target.itemKey || target.id;
            const wantsUnit = entry.mode === 'unit' || storedUnitModes[key] === 'unit';
            if (target.unitWeight && wantsUnit) {
                target.modo = 'unit';
                target.quantidade = Math.max(1, Math.round(entry.qty));
            } else {
                target.modo = 'kg';
                target.quantidade = entry.qty;
            }
        };

        // Passo 1: Match exato por productId
        Object.entries(storedCart).forEach(([savedId, entry]) => {
            if (!entry || typeof entry.qty !== 'number' || !Number.isFinite(entry.qty) || entry.qty < 0) return;
            const exact = allProducts.find(p => p.id === savedId && !matchedProductIds.has(p.id));
            if (exact) {
                applyCartEntryToProduct(exact, entry);
                matchedProductIds.add(exact.id);
            }
        });

        // Passos 2, 3 e 4 para itens não casados exatamente
        Object.entries(storedCart).forEach(([savedId, entry]) => {
            if (!entry || typeof entry.qty !== 'number' || !Number.isFinite(entry.qty) || entry.qty < 0) return;
            if (matchedProductIds.has(savedId)) return;

            const savedItemKey = savedId.includes('|')
                ? savedId.slice(savedId.indexOf('|') + 1)
                : itemKey(entry.name || savedId);

            // Passo 2: Match único por itemKey em outra categoria
            const byKey = allProducts.filter(p => p.itemKey === savedItemKey && !matchedProductIds.has(p.id));
            if (byKey.length === 1) {
                const target = byKey[0];
                applyCartEntryToProduct(target, entry);
                matchedProductIds.add(target.id);
                return;
            }

            // Passo 3: Levenshtein <= 2 sobre itemKey (nomes com >= 6 caracteres) -> não aplicar automaticamente
            const baseSavedKey = savedItemKey.replace(/#combo\d+$/, '');
            if (baseSavedKey.length >= 6) {
                const similar = allProducts.find(p => {
                    const pKey = (p.itemKey || '').replace(/#combo\d+$/, '');
                    return pKey.length >= 6 && levenshtein(savedItemKey, p.itemKey || '') <= 2;
                });
                if (similar) {
                    pendingSpellingSuggestions.push({
                        oldId: savedId,
                        oldEntry: entry,
                        newProductId: similar.id,
                        newName: similar.nome
                    });
                }
            }

            // Passo 4: Ausente -> manter no carrinho como "indisponível nesta lista"
            /** @type {CartV1Entry} */
            const unavailEntry = {
                qty: entry.qty,
                name: String(entry.name || savedId),
                unit: String(entry.unit || 'un'),
                price: Number(entry.price) || 0,
                category: String(entry.category || 'Geral')
            };
            if (entry.mode === 'unit') {
                unavailEntry.mode = 'unit';
            }
            unavailableCart[savedId] = unavailEntry;
        });

        saveCart();

        renderTabs();
        renderItems();
        updateFilterBtn();
        updateTotals();
        updateReviewCountBadge();
        if (reviewPanel && !reviewPanel.classList.contains('hidden')) {
            renderReviewPanel();
        }
        return true;
    };

    const updateReviewCountBadge = () => {
        const total = currentUnparsedLines.length
            + allProducts.filter(p => p.conferir).length
            + pendingSpellingSuggestions.length;
        if (reviewCountBadge) {
            reviewCountBadge.textContent = String(total);
        }
        if (openReviewBtn) {
            if (total > 0) {
                openReviewBtn.classList.remove('hidden');
            } else {
                openReviewBtn.classList.add('hidden');
            }
        }
    };

    /**
     * @param {'ok' | 'error'} type
     * @param {string} msg
     */
    const showReviewFeedback = (type, msg) => {
        if (!reviewFeedback) return;
        reviewFeedback.className = `review-feedback feedback-${type}`;
        reviewFeedback.textContent = msg;
        reviewFeedback.classList.remove('hidden');
    };

    const openReviewPanel = () => {
        if (!reviewPanel) return;
        reviewPanel.classList.remove('hidden');
        renderReviewPanel();
        reviewPanel.scrollIntoView({ behavior: 'smooth' });
    };

    const closeReviewPanel = () => {
        if (!reviewPanel) return;
        reviewPanel.classList.add('hidden');
        if (reviewFeedback) {
            reviewFeedback.classList.add('hidden');
            reviewFeedback.textContent = '';
        }
    };

    const renderReviewPanel = () => {
        if (unparsedCountEl) unparsedCountEl.textContent = String(currentUnparsedLines.length);
        const conferirItems = allProducts.filter(p => p.conferir);
        if (conferirCountEl) conferirCountEl.textContent = String(conferirItems.length);
        if (spellingCountEl) spellingCountEl.textContent = String(pendingSpellingSuggestions.length);
        updateReviewCountBadge();

        // 1. Unparsed list
        if (reviewUnparsedList) {
            reviewUnparsedList.innerHTML = '';
            if (currentUnparsedLines.length === 0) {
                const empty = document.createElement('p');
                empty.className = 'empty-review-text';
                empty.textContent = 'Nenhuma linha não reconhecida.';
                reviewUnparsedList.appendChild(empty);
            } else {
                currentUnparsedLines.forEach(unp => {
                    const card = document.createElement('div');
                    card.className = 'review-card';

                    const topRow = document.createElement('div');
                    topRow.className = 'review-card-top';
                    const code = document.createElement('code');
                    code.className = 'review-line-text';
                    code.textContent = unp.line;
                    const reason = document.createElement('span');
                    reason.className = 'review-reason';
                    reason.textContent = unp.reason;
                    topRow.appendChild(code);
                    topRow.appendChild(reason);
                    card.appendChild(topRow);

                    // Form grid
                    const formGrid = document.createElement('div');
                    formGrid.className = 'review-form-grid';

                    const nameInput = document.createElement('input');
                    nameInput.type = 'text';
                    nameInput.className = 'review-input-name';
                    nameInput.placeholder = 'Nome do item';
                    const nonDigits = unp.line.replace(/[\d.,]+/g, ' ').replace(/[->=~*_#]+/g, ' ').trim();
                    nameInput.value = nonDigits.split(/\s+/).slice(0, 3).join(' ');

                    const priceInput = document.createElement('input');
                    priceInput.type = 'number';
                    priceInput.step = '0.01';
                    priceInput.min = '0';
                    priceInput.className = 'review-input-price';
                    priceInput.placeholder = 'Preço (R$)';
                    const numMatch = unp.line.match(/\d+(?:[.,]\d{1,2})?/);
                    if (numMatch) {
                        priceInput.value = numMatch[0].replace(',', '.');
                    }

                    const unitSelect = document.createElement('select');
                    unitSelect.className = 'review-input-unit';
                    const unitOptions = [
                        { val: 'un', label: 'un (unidade)' },
                        { val: 'kg', label: 'kg (quilo)' },
                        { val: 'g', label: 'g (grama)' },
                        { val: 'bdj', label: 'bdj (bandeja)' },
                        { val: 'maço', label: 'maço' },
                        { val: 'dz', label: 'dz (dúzia)' },
                        { val: 'cx', label: 'cx (caixa)' },
                        { val: 'pc', label: 'pc (pacote)' },
                        { val: 'penca', label: 'penca' },
                        { val: 'lt', label: 'lt (litro)' },
                        { val: 'ml', label: 'ml' }
                    ];
                    unitOptions.forEach(u => {
                        const opt = document.createElement('option');
                        opt.value = u.val;
                        opt.textContent = u.label;
                        unitSelect.appendChild(opt);
                    });
                    unitSelect.value = 'un';

                    const catInput = document.createElement('input');
                    catInput.type = 'text';
                    catInput.className = 'review-input-category';
                    catInput.placeholder = 'Categoria';
                    catInput.value = 'Geral';

                    formGrid.appendChild(nameInput);
                    formGrid.appendChild(priceInput);
                    formGrid.appendChild(unitSelect);
                    formGrid.appendChild(catInput);
                    card.appendChild(formGrid);

                    // Token chips
                    const tokens = unp.line.split(/\s+/).filter(Boolean);
                    if (tokens.length > 0) {
                        const tokensWrap = document.createElement('div');
                        tokensWrap.className = 'review-tokens';
                        const tLabel = document.createElement('span');
                        tLabel.className = 'review-tokens-label';
                        tLabel.textContent = 'Palavras:';
                        tokensWrap.appendChild(tLabel);
                        tokens.forEach(tok => {
                            const chip = document.createElement('button');
                            chip.type = 'button';
                            chip.className = 'review-token-chip';
                            chip.textContent = tok;
                            chip.onclick = () => {
                                const pureNum = tok.replace(/^[^\d]+/, '').replace(/[^\d.,]+$/, '');
                                if (/^\d+(?:[.,]\d+)?$/.test(pureNum)) {
                                    priceInput.value = pureNum.replace(',', '.');
                                } else {
                                    const cur = String(nameInput.value).trim();
                                    nameInput.value = cur ? `${cur} ${tok}` : tok;
                                }
                            };
                            tokensWrap.appendChild(chip);
                        });
                        card.appendChild(tokensWrap);
                    }

                    // Actions
                    const actions = document.createElement('div');
                    actions.className = 'review-card-actions';

                    const addItemBtn = document.createElement('button');
                    addItemBtn.type = 'button';
                    addItemBtn.className = 'primary-btn small-btn btn-add-item';
                    addItemBtn.textContent = '+ Adicionar item';
                    addItemBtn.onclick = () => {
                        const name = toSingleLine(String(nameInput.value));
                        const price = Number(priceInput.value);
                        if (!name) {
                            showReviewFeedback('error', 'Informe o nome do item.');
                            return;
                        }
                        if (!Number.isFinite(price) || price <= 0) {
                            showReviewFeedback('error', 'Informe um preço válido maior que zero.');
                            return;
                        }
                        const rawCat = toSingleLine(String(catInput.value)) || 'Geral';
                        const canonU = canonUnit(unitSelect.value) || 'un';
                        const key = itemKey(name);
                        const pId = productId(rawCat, name);
                        /** @type {Product} */
                        const manualProduct = {
                            id: pId,
                            itemKey: key,
                            nome: name,
                            preco: price,
                            unidade: canonU,
                            promocao: false,
                            precoAnterior: null,
                            conferir: false,
                            categoria: rawCat,
                            quantidade: 1,
                            selecionado: false,
                            modo: canonU === 'kg' ? 'kg' : 'unit',
                            unitWeight: canonU === 'kg' ? findUnitWeight(key) : null,
                            source: 'manual'
                        };
                        allProducts.push(manualProduct);
                        currentUnparsedLines = currentUnparsedLines.filter(u => u !== unp);
                        renderTabs();
                        renderItems();
                        updateTotals();
                        showReviewFeedback('ok', `Item "${name}" adicionado.`);
                        renderReviewPanel();
                    };

                    const learnBtn = document.createElement('button');
                    learnBtn.type = 'button';
                    learnBtn.className = 'secondary-btn small-btn btn-learn-template';
                    learnBtn.textContent = '🧠 Aprender formato';
                    learnBtn.onclick = () => {
                        const name = toSingleLine(String(nameInput.value));
                        const rawPrice = String(priceInput.value).trim();
                        if (!name || !rawPrice) {
                            showReviewFeedback('error', 'Preencha o nome e o preço da linha para aprender o formato.');
                            return;
                        }
                        try {
                            const store = createTemplateStore(localStorage, getTemplatesKey());
                            store.learn(unp.line, {
                                name,
                                price: rawPrice,
                                unit: unitSelect.value || 'un'
                            });
                            const prevUnparsedCount = currentUnparsedLines.length;
                            processContent(rawText.value, { source: 'manual', saveToStorage: true });
                            const newlyRecognized = Math.max(0, prevUnparsedCount - currentUnparsedLines.length);
                            showReviewFeedback('ok', `Formato aprendido! ${newlyRecognized} linha(s) nova(s) reconhecida(s).`);
                            renderReviewPanel();
                        } catch (err) {
                            showReviewFeedback('error', err instanceof Error ? err.message : 'Erro ao aprender formato.');
                        }
                    };

                    const discardBtn = document.createElement('button');
                    discardBtn.type = 'button';
                    discardBtn.className = 'secondary-btn small-btn btn-discard-unparsed';
                    discardBtn.textContent = '✕ Descartar';
                    discardBtn.onclick = () => {
                        currentUnparsedLines = currentUnparsedLines.filter(u => u !== unp);
                        renderReviewPanel();
                        showReviewFeedback('ok', 'Linha descartada da revisão.');
                    };

                    actions.appendChild(addItemBtn);
                    actions.appendChild(learnBtn);
                    actions.appendChild(discardBtn);
                    card.appendChild(actions);

                    reviewUnparsedList.appendChild(card);
                });
            }
        }

        // 2. Conferir list
        if (reviewConferirList) {
            reviewConferirList.innerHTML = '';
            if (conferirItems.length === 0) {
                const empty = document.createElement('p');
                empty.className = 'empty-review-text';
                empty.textContent = 'Nenhum item a conferir.';
                reviewConferirList.appendChild(empty);
            } else {
                conferirItems.forEach(prod => {
                    const card = document.createElement('div');
                    card.className = 'review-card';

                    const topRow = document.createElement('div');
                    topRow.className = 'review-card-top';
                    const nameSpan = document.createElement('strong');
                    nameSpan.textContent = prod.nome;
                    const badge = document.createElement('span');
                    badge.className = 'badge-conferir';
                    badge.textContent = '⚠ conferir';
                    topRow.appendChild(nameSpan);
                    topRow.appendChild(badge);
                    card.appendChild(topRow);

                    const formGrid = document.createElement('div');
                    formGrid.className = 'review-form-grid';

                    const nameInput = document.createElement('input');
                    nameInput.type = 'text';
                    nameInput.className = 'review-input-name';
                    nameInput.value = prod.nome;

                    const priceInput = document.createElement('input');
                    priceInput.type = 'number';
                    priceInput.step = '0.01';
                    priceInput.min = '0';
                    priceInput.className = 'review-input-price';
                    priceInput.value = String(prod.preco);

                    const unitSelect = document.createElement('select');
                    unitSelect.className = 'review-input-unit';
                    const unitOptions = ['un', 'kg', 'g', 'bdj', 'maço', 'dz', 'cx', 'pc', 'penca', 'lt', 'ml'];
                    unitOptions.forEach(u => {
                        const opt = document.createElement('option');
                        opt.value = u;
                        opt.textContent = u;
                        unitSelect.appendChild(opt);
                    });
                    unitSelect.value = prod.unidade || 'un';

                    const catInput = document.createElement('input');
                    catInput.type = 'text';
                    catInput.className = 'review-input-category';
                    catInput.value = prod.categoria || 'Geral';

                    formGrid.appendChild(nameInput);
                    formGrid.appendChild(priceInput);
                    formGrid.appendChild(unitSelect);
                    formGrid.appendChild(catInput);
                    card.appendChild(formGrid);

                    const actions = document.createElement('div');
                    actions.className = 'review-card-actions';

                    const confirmBtn = document.createElement('button');
                    confirmBtn.type = 'button';
                    confirmBtn.className = 'primary-btn small-btn btn-confirm-conferir';
                    confirmBtn.textContent = '✓ Confirmar';
                    confirmBtn.onclick = () => {
                        const newName = toSingleLine(String(nameInput.value));
                        const newPrice = Number(priceInput.value);
                        if (!newName || !Number.isFinite(newPrice) || newPrice <= 0) {
                            showReviewFeedback('error', 'Nome e preço válido são obrigatórios.');
                            return;
                        }
                        const newCat = toSingleLine(String(catInput.value)) || 'Geral';
                        const newUnit = canonUnit(unitSelect.value) || 'un';

                        prod.nome = newName;
                        prod.preco = newPrice;
                        prod.unidade = newUnit;
                        prod.categoria = newCat;
                        prod.conferir = false;
                        prod.itemKey = itemKey(newName);
                        prod.id = productId(newCat, newName);
                        if (prod.unidade === 'kg') {
                            prod.unitWeight = findUnitWeight(prod.itemKey);
                        } else {
                            prod.unitWeight = null;
                            prod.modo = 'unit';
                        }
                        saveCart();
                        renderTabs();
                        renderItems();
                        updateTotals();
                        showReviewFeedback('ok', `Item "${newName}" confirmado!`);
                        renderReviewPanel();
                    };

                    const removeBtn = document.createElement('button');
                    removeBtn.type = 'button';
                    removeBtn.className = 'danger-outline-btn small-btn btn-remove-conferir';
                    removeBtn.textContent = '🗑️ Remover';
                    removeBtn.onclick = () => {
                        const removedName = prod.nome;
                        allProducts = allProducts.filter(p => p !== prod);
                        delete unavailableCart[prod.id];
                        saveCart();
                        renderTabs();
                        renderItems();
                        updateTotals();
                        showReviewFeedback('ok', `Item "${removedName}" removido.`);
                        renderReviewPanel();
                    };

                    const learnBtn = document.createElement('button');
                    learnBtn.type = 'button';
                    learnBtn.className = 'secondary-btn small-btn btn-learn-template';
                    learnBtn.textContent = '🧠 Aprender formato';
                    learnBtn.onclick = () => {
                        const newName = toSingleLine(String(nameInput.value));
                        const rawPrice = String(priceInput.value).trim();
                        if (!newName || !rawPrice) {
                            showReviewFeedback('error', 'Nome e preço são obrigatórios para aprender o formato.');
                            return;
                        }
                        try {
                            const store = createTemplateStore(localStorage, getTemplatesKey());
                            store.learn(prod.raw || `${newName} ${rawPrice}`, {
                                name: newName,
                                price: rawPrice,
                                unit: unitSelect.value || 'un'
                            });
                            processContent(rawText.value, { source: 'manual', saveToStorage: true });
                            showReviewFeedback('ok', 'Formato aprendido com sucesso!');
                            renderReviewPanel();
                        } catch (err) {
                            showReviewFeedback('error', err instanceof Error ? err.message : 'Erro ao aprender formato.');
                        }
                    };

                    actions.appendChild(confirmBtn);
                    actions.appendChild(learnBtn);
                    actions.appendChild(removeBtn);
                    card.appendChild(actions);

                    reviewConferirList.appendChild(card);
                });
            }
        }

        // 3. Spelling suggestions list
        if (reviewSpellingList) {
            reviewSpellingList.innerHTML = '';
            if (pendingSpellingSuggestions.length === 0) {
                const empty = document.createElement('p');
                empty.className = 'empty-review-text';
                empty.textContent = 'Nenhuma sugestão de grafia pendente.';
                reviewSpellingList.appendChild(empty);
            } else {
                pendingSpellingSuggestions.forEach(sugg => {
                    const card = document.createElement('div');
                    card.className = 'review-card';

                    const desc = document.createElement('p');
                    desc.textContent = `Era "${sugg.oldEntry.name}" no pedido anterior. Corresponde a "${sugg.newName}" nesta lista?`;
                    card.appendChild(desc);

                    const actions = document.createElement('div');
                    actions.className = 'review-card-actions';

                    const acceptBtn = document.createElement('button');
                    acceptBtn.type = 'button';
                    acceptBtn.className = 'primary-btn small-btn btn-accept-spelling';
                    acceptBtn.textContent = '✓ Confirmar e aplicar seleção';
                    acceptBtn.onclick = () => {
                        const target = allProducts.find(p => p.id === sugg.newProductId);
                        if (target) {
                            target.selecionado = true;
                            target.quantidade = sugg.oldEntry.qty;
                            if (sugg.oldEntry.mode === 'unit' && target.unitWeight) {
                                target.modo = 'unit';
                            }
                        }
                        delete unavailableCart[sugg.oldId];
                        pendingSpellingSuggestions = pendingSpellingSuggestions.filter(s => s !== sugg);
                        saveCart();
                        renderItems();
                        updateTotals();
                        showReviewFeedback('ok', `Sugestão aceita: "${sugg.newName}" selecionado.`);
                        renderReviewPanel();
                    };

                    const rejectBtn = document.createElement('button');
                    rejectBtn.type = 'button';
                    rejectBtn.className = 'secondary-btn small-btn btn-reject-spelling';
                    rejectBtn.textContent = '✕ Recusar (manter indisponível)';
                    rejectBtn.onclick = () => {
                        pendingSpellingSuggestions = pendingSpellingSuggestions.filter(s => s !== sugg);
                        saveCart();
                        showReviewFeedback('ok', `Sugestão recusada. "${sugg.oldEntry.name}" mantido como indisponível.`);
                        renderReviewPanel();
                    };

                    actions.appendChild(acceptBtn);
                    actions.appendChild(rejectBtn);
                    card.appendChild(actions);

                    reviewSpellingList.appendChild(card);
                });
            }
        }
    };

    /**
     * @param {string} supId
     */
    const renderSupplierTemplatesList = (supId) => {
        if (!supplierTemplatesList) return;
        supplierTemplatesList.innerHTML = '';
        const store = createTemplateStore(localStorage, getTemplatesKey(supId));
        const templates = store.list();

        if (templates.length === 0) {
            const empty = document.createElement('p');
            empty.className = 'empty-review-text';
            empty.textContent = 'Nenhum formato aprendido para este fornecedor.';
            supplierTemplatesList.appendChild(empty);
            return;
        }

        templates.forEach(t => {
            const card = document.createElement('div');
            card.className = 'supplier-template-card';

            const info = document.createElement('div');
            info.className = 'supplier-template-info';

            const sourceCode = document.createElement('code');
            sourceCode.className = 'supplier-template-source';
            sourceCode.textContent = t.source;

            const meta = document.createElement('span');
            meta.className = 'supplier-template-meta';
            meta.textContent = `Usos: ${t.hits || 0}${t.fixedUnit ? ' · Unidade fixa: ' + t.fixedUnit : ''}`;

            info.appendChild(sourceCode);
            info.appendChild(meta);
            card.appendChild(info);

            const deleteBtn = document.createElement('button');
            deleteBtn.type = 'button';
            deleteBtn.className = 'danger-outline-btn small-btn delete-template-btn';
            deleteBtn.textContent = 'Excluir';
            deleteBtn.onclick = () => {
                store.remove(t.source);
                renderSupplierTemplatesList(supId);
                if (supId === getActiveSupplierId() && rawText.value.trim()) {
                    processContent(rawText.value, { source: 'manual', saveToStorage: false });
                }
            };
            card.appendChild(deleteBtn);

            supplierTemplatesList.appendChild(card);
        });
    };

    processBtn.onclick = () => {
        const text = rawText.value;
        if (processContent(text, { source: 'manual' })) {
            selectionSection.scrollIntoView({ behavior: 'smooth' });
        } else {
            alert('Nenhum produto encontrado. Tente colar a mensagem novamente.');
        }
    };

    clipboardBtn.onclick = async () => {
        if (!navigator.clipboard || typeof navigator.clipboard.readText !== 'function') {
            setUpdateStatus('error', 'Seu navegador não permite leitura da área de transferência.');
            return;
        }

        setUpdateStatus('loading', 'Lendo a área de transferência...');

        try {
            const clipboardText = await navigator.clipboard.readText();
            if (!clipboardText.trim()) {
                setUpdateStatus('error', 'A área de transferência está vazia.');
                return;
            }

            rawText.value = clipboardText;

            if (processContent(clipboardText, { source: 'clipboard' })) {
                selectionSection.scrollIntoView({ behavior: 'smooth' });
            } else {
                alert('Nenhum produto encontrado na área de transferência.');
            }
        } catch (error) {
            console.error('Falha ao ler área de transferência:', error);
            setUpdateStatus('error', 'Não foi possível acessar a área de transferência. Permita o acesso no navegador.');
        }
    };

    searchInput.oninput = renderItems;

    filterSelectedBtn.onclick = () => {
        showOnlySelected = !showOnlySelected;
        updateFilterBtn();
        renderItems();
    };

    deselectAllBtn.onclick = () => {
        allProducts.forEach(p => {
            p.selecionado = false;
            p.quantidade = 1;
        });
        unavailableCart = {};
        pendingSpellingSuggestions = [];
        localStorage.removeItem(getCartKey());
        localStorage.removeItem(getUnitModesKey());
        localStorage.removeItem(CART_V1_KEY);
        localStorage.removeItem(LEGACY_CART_KEY);
        showOnlySelected = false;
        updateFilterBtn();
        renderItems();
        updateTotals();
    };

    clearDataBtn.onclick = () => {
        if (!confirm('Apagar texto, carrinho, endereço e pagamento salvos neste navegador?')) return;

        // Remove toda chave do app por prefixo (`hortifruti_` e `hortifruti.`), inclusive as futuras.
        Object.keys(localStorage)
            .filter(key => key.startsWith('hortifruti_') || key.startsWith('hortifruti.'))
            .forEach(key => localStorage.removeItem(key));

        allProducts = [];
        unavailableCart = {};
        pendingSpellingSuggestions = [];
        currentUnparsedLines = [];
        closeReviewPanel();
        updateReviewCountBadge();
        activeCategory = 'Todos';
        showOnlySelected = false;

        rawText.value = '';
        searchInput.value = '';
        enderecoInput.value = '';
        suppliersState = {
            activeId: DEFAULT_SUPPLIER_ID,
            profiles: { [DEFAULT_SUPPLIER_ID]: createDefaultProfile() }
        };
        editingSupplierId = null;
        supplierConfigPanel.classList.add('hidden');
        supplierFormError.classList.add('hidden');
        renderSupplierUI();
        setSelectValue(pagamentoSelect, '');
        itemsList.innerHTML = '';
        tabsContainer.innerHTML = '';
        promoDateEl.classList.add('hidden');
        selectionSection.classList.add('hidden');
        summarySection.classList.add('hidden');

        updateFilterBtn();
        setUpdateStatus('idle', 'Dados apagados. Aguardando atualização da lista.');
        updateTotals();
    };

    const saveSuppliersState = () => {
        localStorage.setItem(SUPPLIERS_KEY, JSON.stringify(suppliersState));
    };

    /**
     * @param {any} raw
     * @param {string} fallbackId
     * @returns {SupplierProfile | null}
     */
    const sanitizeSupplierProfile = (raw, fallbackId) => {
        if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return null;
        const id = toSingleLine(raw.id || fallbackId);
        const name = toSingleLine(raw.name || '');
        if (!id || !name) return null;
        const fee = Number(raw.deliveryFee);
        const deliveryFee = Number.isFinite(fee) && fee >= 0 ? fee : DEFAULT_DELIVERY_FEE;
        const whatsapp = typeof raw.whatsapp === 'string' && /^\d{12,13}$/.test(raw.whatsapp.trim())
            ? raw.whatsapp.trim()
            : '';
        const rawMethods = Array.isArray(raw.paymentMethods) ? raw.paymentMethods : [];
        const paymentMethods = rawMethods
            .map((/** @type {any} */ m) => toSingleLine(m))
            .filter(Boolean);
        return {
            id,
            name,
            whatsapp,
            deliveryFee,
            paymentMethods: paymentMethods.length > 0 ? paymentMethods : [...DEFAULT_PAYMENT_METHODS],
            boldIsPromo: raw.boldIsPromo !== false
        };
    };

    const initSuppliers = () => {
        const stored = readStoredObject(SUPPLIERS_KEY);
        /** @type {Record<string, SupplierProfile>} */
        const validProfiles = {};
        if (stored && stored.profiles && typeof stored.profiles === 'object' && !Array.isArray(stored.profiles)) {
            Object.entries(stored.profiles).forEach(([key, prof]) => {
                const sanitized = sanitizeSupplierProfile(prof, key);
                if (sanitized) validProfiles[sanitized.id] = sanitized;
            });
        }
        if (Object.keys(validProfiles).length === 0) {
            validProfiles[DEFAULT_SUPPLIER_ID] = createDefaultProfile();
        }
        const preferredActive = stored && typeof stored.activeId === 'string' && validProfiles[stored.activeId]
            ? stored.activeId
            : (validProfiles[DEFAULT_SUPPLIER_ID] ? DEFAULT_SUPPLIER_ID : Object.keys(validProfiles)[0]);

        suppliersState = {
            activeId: preferredActive,
            profiles: validProfiles
        };

        const targetId = validProfiles[DEFAULT_SUPPLIER_ID] ? DEFAULT_SUPPLIER_ID : preferredActive;

        // Migração de chaves legadas sem sufixo para o fornecedor padrão
        const legacyRaw = localStorage.getItem(RAW_TEXT_KEY);
        if (legacyRaw !== null) {
            if (localStorage.getItem(getRawTextKey(targetId)) === null) {
                localStorage.setItem(getRawTextKey(targetId), legacyRaw);
            }
            localStorage.removeItem(RAW_TEXT_KEY);
        }

        const legacyTs = localStorage.getItem(LAST_UPDATE_TS_KEY);
        if (legacyTs !== null) {
            if (localStorage.getItem(getLastUpdateTsKey(targetId)) === null) {
                localStorage.setItem(getLastUpdateTsKey(targetId), legacyTs);
            }
            localStorage.removeItem(LAST_UPDATE_TS_KEY);
        }

        const legacySource = localStorage.getItem(LAST_UPDATE_SOURCE_KEY);
        if (legacySource !== null) {
            if (localStorage.getItem(getLastUpdateSourceKey(targetId)) === null) {
                localStorage.setItem(getLastUpdateSourceKey(targetId), legacySource);
            }
            localStorage.removeItem(LAST_UPDATE_SOURCE_KEY);
        }

        const legacyCartV1 = localStorage.getItem(CART_V1_KEY);
        if (legacyCartV1 !== null) {
            if (localStorage.getItem(getCartKey(targetId)) === null) {
                localStorage.setItem(getCartKey(targetId), legacyCartV1);
            }
            localStorage.removeItem(CART_V1_KEY);
        }

        const legacyTplDot = localStorage.getItem(LEGACY_TEMPLATES_DOT_KEY);
        if (legacyTplDot !== null) {
            if (localStorage.getItem(getTemplatesKey(targetId)) === null) {
                localStorage.setItem(getTemplatesKey(targetId), legacyTplDot);
            }
            localStorage.removeItem(LEGACY_TEMPLATES_DOT_KEY);
        }

        const legacyTpl = localStorage.getItem(LEGACY_TEMPLATES_KEY);
        if (legacyTpl !== null) {
            if (localStorage.getItem(getTemplatesKey(targetId)) === null) {
                localStorage.setItem(getTemplatesKey(targetId), legacyTpl);
            }
            localStorage.removeItem(LEGACY_TEMPLATES_KEY);
        }
    };

    function renderSupplierUI() {
        const activeProfile = getActiveProfile();
        supplierSelect.innerHTML = '';
        Object.values(suppliersState.profiles).forEach(prof => {
            const opt = document.createElement('option');
            opt.value = prof.id;
            opt.textContent = prof.name;
            supplierSelect.appendChild(opt);
        });
        supplierSelect.value = activeProfile.id;

        const prefs = readStoredObject('hortifruti_prefs');
        const desiredPayment = pagamentoSelect.value || (prefs && prefs.pagamento) || '';
        pagamentoSelect.innerHTML = '';
        activeProfile.paymentMethods.forEach(method => {
            const opt = document.createElement('option');
            opt.value = method;
            opt.textContent = method;
            pagamentoSelect.appendChild(opt);
        });
        setSelectValue(pagamentoSelect, desiredPayment);

        deliveryFeeEl.textContent = `R$ ${activeProfile.deliveryFee.toFixed(2).replace('.', ',')}`;
        updateWhatsAppButton(getCartItems(), finalMessage.value);
    }

    /**
     * @param {string} supplierId
     */
    const switchActiveSupplier = (supplierId) => {
        if (!suppliersState.profiles[supplierId]) return;
        suppliersState.activeId = supplierId;
        renderSupplierUI();
        syncLastUpdateStatus();

        const savedText = localStorage.getItem(getRawTextKey(supplierId));
        if (savedText) {
            rawText.value = savedText;
            const source = localStorage.getItem(getLastUpdateSourceKey(supplierId)) || 'manual';
            processContent(savedText, { saveToStorage: false, source });
            if (!localStorage.getItem(getLastUpdateTsKey(supplierId))) {
                setUpdateStatus('ok', `Lista carregada de ${getSourceLabel('manual')}.`);
            }
        } else {
            allProducts = [];
            unavailableCart = {};
            pendingSpellingSuggestions = [];
            currentUnparsedLines = [];
            closeReviewPanel();
            activeCategory = 'Todos';
            showOnlySelected = false;
            rawText.value = '';
            searchInput.value = '';
            itemsList.innerHTML = '';
            tabsContainer.innerHTML = '';
            promoDateEl.classList.add('hidden');
            selectionSection.classList.add('hidden');
            summarySection.classList.add('hidden');
            updateFilterBtn();
            updateTotals();
            updateReviewCountBadge();
        }
    };

    /**
     * @param {string | null} supplierId
     */
    const openSupplierConfig = (supplierId) => {
        editingSupplierId = supplierId;
        supplierFormError.classList.add('hidden');
        supplierFormError.textContent = '';

        if (supplierId && suppliersState.profiles[supplierId]) {
            const prof = suppliersState.profiles[supplierId];
            supplierFormTitle.textContent = 'Configurar fornecedor';
            supplierNameInput.value = prof.name;
            supplierWhatsappInput.value = prof.whatsapp;
            supplierDeliveryFeeInput.value = prof.deliveryFee.toFixed(2);
            supplierPaymentsInput.value = prof.paymentMethods.join(', ');
            supplierBoldIsPromoInput.checked = prof.boldIsPromo !== false;
            deleteSupplierBtn.disabled = Object.keys(suppliersState.profiles).length <= 1;
            deleteSupplierBtn.classList.remove('hidden');
            renderSupplierTemplatesList(supplierId);
            if (supplierTemplatesSection) supplierTemplatesSection.classList.remove('hidden');
        } else {
            supplierFormTitle.textContent = 'Novo fornecedor';
            supplierNameInput.value = '';
            supplierWhatsappInput.value = '';
            supplierDeliveryFeeInput.value = DEFAULT_DELIVERY_FEE.toFixed(2);
            supplierPaymentsInput.value = DEFAULT_PAYMENT_METHODS.join(', ');
            supplierBoldIsPromoInput.checked = true;
            deleteSupplierBtn.disabled = true;
            deleteSupplierBtn.classList.add('hidden');
            if (supplierTemplatesSection) supplierTemplatesSection.classList.add('hidden');
        }
        supplierConfigPanel.classList.remove('hidden');
    };

    const closeSupplierConfig = () => {
        supplierConfigPanel.classList.add('hidden');
        supplierFormError.classList.add('hidden');
        supplierFormError.textContent = '';
        editingSupplierId = null;
    };

    /**
     * @param {string} msg
     */
    const showSupplierFormError = (msg) => {
        supplierFormError.textContent = msg;
        supplierFormError.classList.remove('hidden');
    };

    supplierSelect.onchange = () => {
        closeSupplierConfig();
        const nextId = supplierSelect.value;
        if (!suppliersState.profiles[nextId]) return;
        suppliersState.activeId = nextId;
        saveSuppliersState();
        switchActiveSupplier(nextId);
    };

    editSupplierBtn.onclick = () => {
        openSupplierConfig(getActiveSupplierId());
    };

    newSupplierBtn.onclick = () => {
        openSupplierConfig(null);
    };

    cancelSupplierBtn.onclick = () => {
        closeSupplierConfig();
    };

    saveSupplierBtn.onclick = () => {
        const name = toSingleLine(supplierNameInput.value);
        if (!name) {
            showSupplierFormError('Informe o nome do fornecedor.');
            return;
        }

        const rawFee = String(supplierDeliveryFeeInput.value).trim().replace(',', '.');
        const deliveryFee = rawFee === '' ? NaN : Number(rawFee);
        if (!Number.isFinite(deliveryFee) || deliveryFee < 0) {
            showSupplierFormError('A taxa de entrega deve ser um número maior ou igual a zero.');
            return;
        }

        const whatsapp = String(supplierWhatsappInput.value).trim();
        if (whatsapp !== '' && !/^\d{12,13}$/.test(whatsapp)) {
            showSupplierFormError('O WhatsApp deve conter apenas dígitos (12 a 13 caracteres com DDI) ou ficar vazio.');
            return;
        }

        const paymentMethods = String(supplierPaymentsInput.value)
            .split(',')
            .map(s => toSingleLine(s))
            .filter(Boolean);
        if (paymentMethods.length === 0) {
            showSupplierFormError('Informe pelo menos uma forma de pagamento.');
            return;
        }

        const boldIsPromo = supplierBoldIsPromoInput.checked;

        if (editingSupplierId && suppliersState.profiles[editingSupplierId]) {
            const id = editingSupplierId;
            suppliersState.profiles[id] = {
                id,
                name,
                whatsapp,
                deliveryFee,
                paymentMethods,
                boldIsPromo
            };
            suppliersState.activeId = id;
            saveSuppliersState();
            closeSupplierConfig();
            renderSupplierUI();
            if (rawText.value.trim()) {
                const source = localStorage.getItem(getLastUpdateSourceKey(id)) || 'manual';
                processContent(rawText.value, { source, saveToStorage: false });
            } else {
                updateTotals();
            }
        } else {
            const newId = `sup_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 6)}`;
            suppliersState.profiles[newId] = {
                id: newId,
                name,
                whatsapp,
                deliveryFee,
                paymentMethods,
                boldIsPromo
            };
            suppliersState.activeId = newId;
            saveSuppliersState();
            closeSupplierConfig();
            switchActiveSupplier(newId);
        }
    };

    deleteSupplierBtn.onclick = () => {
        if (!editingSupplierId || !suppliersState.profiles[editingSupplierId]) return;
        const ids = Object.keys(suppliersState.profiles);
        if (ids.length <= 1) {
            showSupplierFormError('Não é possível excluir o único fornecedor.');
            return;
        }
        const delId = editingSupplierId;
        delete suppliersState.profiles[delId];
        localStorage.removeItem(getRawTextKey(delId));
        localStorage.removeItem(getLastUpdateTsKey(delId));
        localStorage.removeItem(getLastUpdateSourceKey(delId));
        localStorage.removeItem(getCartKey(delId));
        localStorage.removeItem(getUnitModesKey(delId));
        localStorage.removeItem(getTemplatesKey(delId));
        localStorage.removeItem(getHistoryKey(delId));

        const nextId = Object.keys(suppliersState.profiles)[0];
        suppliersState.activeId = nextId;
        saveSuppliersState();
        closeSupplierConfig();
        switchActiveSupplier(nextId);
    };

    enderecoInput.oninput = () => { updateTotals(); savePrefs(); };
    pagamentoSelect.onchange = () => { updateTotals(); savePrefs(); };

    if (openReviewBtn) {
        openReviewBtn.onclick = () => openReviewPanel();
    }
    if (closeReviewBtn) {
        closeReviewBtn.onclick = () => closeReviewPanel();
    }

    if (whatsappBtn) {
        whatsappBtn.onclick = (e) => {
            if (whatsappBtn.getAttribute('aria-disabled') === 'true') {
                e.preventDefault();
            }
        };
    }

    copyBtn.onclick = async () => {
        if (getCartItems().length === 0) return;

        const copied = await copyTextToClipboard(finalMessage.value);
        if (!copied) {
            alert('Não foi possível copiar automaticamente. Tente pressionar e segurar na mensagem para copiar.');
            return;
        }

        const originalText = copyBtn.innerHTML;
        copyBtn.innerHTML = '✅ Copiado!';
        copyBtn.style.background = '#27ae60';
        setTimeout(() => {
            copyBtn.innerHTML = originalText;
            copyBtn.style.background = 'var(--accent)';
        }, 2000);
    };

    // 5. Initial Hydration
    const loadUnitWeights = async () => {
        if (Array.isArray(window.HORTI_UNIT_WEIGHTS)) {
            unitWeightRules = window.HORTI_UNIT_WEIGHTS;
            return;
        }
        if (typeof window.fetch !== 'function' || !window.location.protocol.startsWith('http')) {
            return;
        }
        try {
            const resp = await fetch('data/unit-weights.json');
            if (!resp.ok) return;
            /** @type {UnitWeightsData} */
            const data = await resp.json();
            if (data && Array.isArray(data.items)) {
                unitWeightRules = data.items;
                if (allProducts.length > 0) {
                    const storedUnitModes = readStoredObject(getUnitModesKey(), {});
                    const storedCart = readStoredObject(getCartKey(), {});
                    allProducts.forEach(p => {
                        p.unitWeight = p.unidade === 'kg' ? findUnitWeight(p.itemKey || p.nome) : null;
                        const key = p.itemKey || p.id;
                        const savedEntry = storedCart[p.id];
                        if (p.unitWeight && (p.modo === 'unit' || storedUnitModes[key] === 'unit' || (savedEntry && savedEntry.mode === 'unit'))) {
                            p.modo = 'unit';
                            p.quantidade = Math.max(1, Math.round(Number(p.quantidade) || 1));
                        } else if (!p.unitWeight) {
                            p.modo = 'kg';
                        }
                    });
                    renderItems();
                    updateTotals();
                }
            }
        } catch (err) {
            // Mantém DEFAULT_UNIT_WEIGHTS embutido em caso de falha ou offline
        }
    };

    loadUnitWeights();
    initSuppliers();
    renderSupplierUI();
    loadPrefs();
    updateTotals();
    syncLastUpdateStatus();
    const savedText = localStorage.getItem(getRawTextKey());
    if (savedText) {
        rawText.value = savedText;
        processContent(savedText, { saveToStorage: false, source: 'manual' });

        if (!localStorage.getItem(getLastUpdateTsKey())) {
            setUpdateStatus('ok', `Lista carregada de ${getSourceLabel('manual')}.`);
        }
    }

    if ('serviceWorker' in navigator && (location.protocol === 'https:' || location.hostname === 'localhost' || location.hostname === '127.0.0.1')) {
        navigator.serviceWorker.register('./sw.js').catch(() => {});
    }
});

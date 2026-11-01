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
     *
     * @typedef {Object} CartV1Entry
     * @property {number} qty
     * @property {string} name
     * @property {string} unit
     * @property {number} price
     * @property {string} category
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
    const subtotalValue = document.getElementById('subtotalValue');
    const totalValue = document.getElementById('totalValue');
    const finalMessage = document.getElementById('finalMessage');
    const copyBtn = document.getElementById('copyBtn');
    const searchInput = document.getElementById('search');
    const deselectAllBtn = document.getElementById('deselectAllBtn');
    const tabsContainer = document.getElementById('tabsContainer');
    const enderecoInput = document.getElementById('endereco');
    const pagamentoSelect = document.getElementById('pagamento');
    const filterSelectedBtn = document.getElementById('filterSelectedBtn');
    const promoDateEl = document.getElementById('promo-date');

    const DELIVERY_FEE = 5.00;
    const RAW_TEXT_KEY = 'hortifruti_raw_text';
    const LAST_UPDATE_TS_KEY = 'hortifruti_last_update_ts';
    const LAST_UPDATE_SOURCE_KEY = 'hortifruti_last_update_source';
    const CART_V1_KEY = 'hortifruti_cart_v1';
    const LEGACY_CART_KEY = 'hortifruti_cart';
    /** @type {Product[]} */
    let allProducts = [];
    /** @type {CartV1} */
    let unavailableCart = {};
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
        allProducts.forEach(p => {
            if (p.selecionado) {
                cart[p.id] = {
                    qty: p.quantidade,
                    name: p.nome,
                    unit: p.unidade,
                    price: p.preco,
                    category: p.categoria
                };
            }
        });
        Object.entries(unavailableCart).forEach(([id, entry]) => {
            if (!(id in cart)) {
                cart[id] = entry;
            }
        });
        localStorage.setItem(CART_V1_KEY, JSON.stringify(cart));
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
            return parsed && typeof parsed === 'object' && !Array.isArray(parsed) ? parsed : fallback;
        } catch (error) {
            console.error(`Valor inválido em ${key}, ignorando:`, error);
            return fallback;
        }
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

    /**
     * @param {string} category
     * @returns {string}
     */
    const getCategoryIcon = (category) => {
        const normalized = normalizeText(category);

        if (normalized.includes('todo')) return '🧺';
        if (normalized.includes('promoc')) return '🏷️';
        if (normalized.includes('fruta')) return '🍉';
        if (normalized.includes('legume')) return '🥕';
        if (normalized.includes('verdura')) return '🥬';
        if (normalized.includes('mercad')) return '🛒';
        if (normalized.includes('geladeira')) return '🧊';
        if (normalized.includes('limpeza')) return '🧼';
        return '📦';
    };

    const ITEM_ICON_RULES = [
        { emoji: '🍍', keywords: ['abacaxi'] },
        { emoji: '🥑', keywords: ['abacate'] },
        { emoji: '🍌', keywords: ['banana'] },
        { emoji: '🍎', keywords: ['maca fuji', 'maca gala', 'maca promo', 'maca saquinho'] },
        { emoji: '🍏', keywords: ['maca verde'] },
        { emoji: '🍊', keywords: ['laranja', 'tangerina'] },
        { emoji: '🍋', keywords: ['limao'] },
        { emoji: '🍇', keywords: ['uva'] },
        { emoji: '🍓', keywords: ['morango'] },
        { emoji: '🍉', keywords: ['melancia'] },
        { emoji: '🍈', keywords: ['melao'] },
        { emoji: '🥭', keywords: ['manga', 'mamao'] },
        { emoji: '🍑', keywords: ['ameixa', 'goiaba', 'caqui', 'maracuja', 'pitaia', 'graviola'] },
        { emoji: '🍐', keywords: ['pera'] },
        { emoji: '🥝', keywords: ['kiwi'] },
        { emoji: '🥥', keywords: ['coco'] },
        { emoji: '🍅', keywords: ['tomate', 'tomatinho'] },
        { emoji: '🥒', keywords: ['pepino'] },
        { emoji: '🍆', keywords: ['berinjela'] },
        { emoji: '🧄', keywords: ['alho', 'gengibre'] },
        { emoji: '🧅', keywords: ['cebola'] },
        { emoji: '🥕', keywords: ['cenoura', 'jilo', 'maxixe', 'vagem', 'quiabo', 'beterraba'] },
        { emoji: '🥔', keywords: ['batata', 'aipim', 'mandioca', 'inhame', 'baroa'] },
        { emoji: '🎃', keywords: ['abobora', 'abobrinha', 'chuchu'] },
        { emoji: '🫑', keywords: ['pimentao'] },
        { emoji: '🥦', keywords: ['brocolis', 'couve flor'] },
        { emoji: '🥬', keywords: ['alface', 'couve', 'espinafre', 'agriao', 'coentro', 'salsa', 'hortela', 'louro', 'cheiro verde', 'repolho', 'chicoria'] },
        { emoji: '🌿', keywords: ['ervilha bdj', 'ervilha'] },
        { emoji: '🥚', keywords: ['ovo'] },
        { emoji: '🍯', keywords: ['mel silvestre', 'mel'] },
        { emoji: '☕', keywords: ['cafe', 'nescau', 'cha leao', 'cha'] },
        { emoji: '🥛', keywords: ['leite', 'requeijao', 'margarina', 'manteiga', 'creme de leite', 'condensado'] },
        { emoji: '🍞', keywords: ['pao', 'torrada', 'bisnaguinha', 'tapioca'] },
        { emoji: '🍪', keywords: ['biscoito', 'rosquinha'] },
        { emoji: '🍿', keywords: ['pipoca', 'salgadinho'] },
        { emoji: '🧃', keywords: ['suco', 'agua de coco', 'refresco', 'salada de frutas'] },
        { emoji: '🍚', keywords: ['arroz', 'feijao', 'farinha', 'espaguete', 'parafuso', 'miojo', 'macarrao', 'flocao'] },
        { emoji: '🌽', keywords: ['milho'] },
        { emoji: '🫒', keywords: ['azeite', 'oleo'] },
        { emoji: '🧂', keywords: ['sal', 'canela', 'condimentos', 'sazon', 'caldo', 'fermento'] },
        { emoji: '🍅', keywords: ['ketchup', 'mostarda', 'maionese', 'vinagre'] },
        { emoji: '🧈', keywords: ['acucar', 'aveia', 'gelatina'] },
        { emoji: '🌭', keywords: ['salsicha'] },
        { emoji: '🧀', keywords: ['parmesao', 'queijo'] },
        { emoji: '🔥', keywords: ['carvao', 'churrasco', 'palito', 'fosforo'] },
        { emoji: '🧻', keywords: ['papel toalha', 'papel aluminio'] },
        { emoji: '🧼', keywords: ['detergente', 'sabao', 'alcool', 'baygon', 'sabonete', 'desodorante', 'pasta de dente', 'esponja', 'multiuso'] },
        { emoji: '🫘', keywords: ['farofa', 'ervilha p'] },
        { emoji: '🍶', keywords: ['leite de coco', 'coco ralado'] },
        { emoji: '🥜', keywords: ['tamara'] }
    ];

    /**
     * @param {string} emoji
     * @returns {string}
     */
    const emojiToExternalIconUrl = (emoji) => {
        const codepoints = [...emoji]
            .map(char => char.codePointAt(0).toString(16))
            .filter(cp => cp !== 'fe0f')
            .join('-');

        return `https://cdn.jsdelivr.net/gh/shuding/fluentui-emoji-unicode/assets/${codepoints}_3d.png`;
    };

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
     * @param {string} itemName
     * @param {string} category
     * @returns {string}
     */
    const getItemIconEmoji = (itemName, category) => {
        const paddedName = ` ${normalizeText(itemName).replace(/[^a-z0-9]+/g, ' ').trim()} `;
        const matchedRule = ITEM_ICON_RULES.find(rule =>
            rule.keywords.some(keyword => matchesKeyword(paddedName, keyword))
        );

        if (matchedRule) return matchedRule.emoji;
        return getCategoryIcon(category);
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
        const timestamp = localStorage.getItem(LAST_UPDATE_TS_KEY);
        const source = localStorage.getItem(LAST_UPDATE_SOURCE_KEY) || 'manual';
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
        localStorage.setItem(RAW_TEXT_KEY, text);
        localStorage.setItem(LAST_UPDATE_TS_KEY, new Date().toISOString());
        localStorage.setItem(LAST_UPDATE_SOURCE_KEY, source);
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
    const { parse: parseList, itemKey, categoryKey, productId, levenshtein } = window.HortiParser;

    // Unidades do parser -> códigos exibidos no app e na mensagem.
    /** @type {Record<string, string>} */
    const UNIT_LABELS = {
        kg: 'kg', g: 'g', un: 'un', bandeja: 'bdj', maco: 'maço', duzia: 'dz',
        caixa: 'cx', pacote: 'pc', penca: 'penca', litro: 'lt', ml: 'ml'
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
            selecionado: false
        };
    };

    /**
     * @param {Product[]} products
     * @returns {CartV1}
     */
    const loadAndMigrateCart = (products) => {
        if (localStorage.getItem(CART_V1_KEY) === null && localStorage.getItem(LEGACY_CART_KEY) !== null) {
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

            localStorage.setItem(CART_V1_KEY, JSON.stringify(migrated));
            localStorage.removeItem(LEGACY_CART_KEY);
            return migrated;
        }

        const raw = readStoredObject(CART_V1_KEY, {});
        /** @type {CartV1} */
        const valid = {};
        Object.entries(raw).forEach(([id, entry]) => {
            if (entry && typeof entry === 'object' && typeof entry.qty === 'number' && Number.isFinite(entry.qty) && entry.qty >= 0) {
                valid[id] = {
                    qty: entry.qty,
                    name: String(entry.name || id),
                    unit: String(entry.unit || 'un'),
                    price: Number(entry.price) || 0,
                    category: String(entry.category || 'Geral')
                };
            }
        });
        return valid;
    };

    /**
     * @param {string} text
     * @returns {{ products: Product[], unparsed: number, promoDate: string | null }}
     */
    function parseProducts(text) {
        const result = parseList(text);
        return {
            products: result.items.map(toProduct).filter(p => p.nome && p.preco > 0),
            unparsed: result.unparsed.length,
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
            tab.textContent = `${getCategoryIcon(cat)} ${cat}`;
            tab.onclick = () => {
                activeCategory = cat;
                renderTabs();
                renderItems();
            };
            tabsContainer.appendChild(tab);
        });
    }

    function renderItems() {
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
            const itemEmoji = getItemIconEmoji(item.nome, item.categoria);
            const itemIconUrl = emojiToExternalIconUrl(itemEmoji);
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
            icon.alt = itemEmoji;
            icon.loading = 'lazy';
            icon.decoding = 'async';
            icon.referrerPolicy = 'no-referrer';

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
            price.textContent = `R$ ${item.preco.toFixed(2).replace('.', ',')}/${item.unidade}`;

            const qtyInput = document.createElement('input');
            qtyInput.type = 'number';
            qtyInput.className = 'item-qty';
            qtyInput.value = item.quantidade;
            qtyInput.min = isDecimalUnit(item.unidade) ? '0.1' : '1';
            qtyInput.step = isDecimalUnit(item.unidade) ? '0.1' : '1';
            qtyInput.disabled = !item.selecionado;

            div.append(check, nameWrap, price, qtyInput);

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
                updateTotals();
                saveCart();
            };

            // Ao sair do campo: quantidade inválida ou menor que o mínimo da unidade desmarca o item
            // (durante a digitação não, para permitir apagar e digitar outro número).
            qtyInput.onchange = (e) => {
                let qty = parseFloat(e.target.value);
                if (Number.isFinite(qty) && !isDecimalUnit(item.unidade)) qty = Math.round(qty);
                const min = isDecimalUnit(item.unidade) ? 0.1 : 1;
                if (!item.selecionado || (Number.isFinite(qty) && qty >= min)) {
                    if (Number.isFinite(qty)) {
                        item.quantidade = qty;
                        qtyInput.value = qty;
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

            const itemEmoji = getItemIconEmoji(entry.name, entry.category);
            const itemIconUrl = emojiToExternalIconUrl(itemEmoji);

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
            icon.alt = itemEmoji;
            icon.loading = 'lazy';
            icon.decoding = 'async';
            icon.referrerPolicy = 'no-referrer';

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

    // Só kg aceita quantidade decimal; as demais unidades (un, bdj, maço, combo...) são inteiras.
    /**
     * @param {string} unidade
     * @returns {boolean}
     */
    const isDecimalUnit = (unidade) => unidade === 'kg';

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
        const selected = getCartItems();

        selected.forEach(p => {
            subtotal += p.preco * p.quantidade;
        });

        const total = subtotal + DELIVERY_FEE;

        subtotalValue.textContent = `R$ ${subtotal.toFixed(2).replace('.', ',')}`;
        totalValue.textContent = `R$ ${total.toFixed(2).replace('.', ',')}`;

        generateMessage(selected, total);
    }

    /**
     * @param {Product[]} items
     * @param {number} total
     */
    function generateMessage(items, total) {
        if (items.length === 0) {
            finalMessage.value = 'Selecione pelo menos um item para gerar o pedido.';
            return;
        }

        const endereco = toSingleLine(enderecoInput.value) || 'Não informado';
        const pagamento = pagamentoSelect.value;

        let msg = `${getGreeting()}, tudo bem? Gostaria de fazer um pedido:\n\n`;
        
        const categories = [...new Set(items.map(i => i.categoria))];
        categories.forEach(cat => {
            msg += `*${toSingleLine(cat).toUpperCase()}*\n`;
            items.filter(i => i.categoria === cat).forEach(item => {
                const itemTotal = item.preco * item.quantidade;
                // Combo: "2x" do pacote inteiro, para o fornecedor não ler como 2 unidades.
                const qty = item.unidade === 'combo' ? `${item.quantidade}x` : `${item.quantidade}${item.unidade}`;
                msg += `- ${toSingleLine(item.nome)}, ${qty} (R$ ${itemTotal.toFixed(2).replace('.', ',')})\n`;
            });
            msg += '\n';
        });

        msg += `Taxa de entrega: R$ ${DELIVERY_FEE.toFixed(2).replace('.', ',')}\n`;
        msg += `*Total Geral: R$ ${total.toFixed(2).replace('.', ',')}*\n\n`;
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

        if (saveToStorage) {
            persistRawText(text, source);
        }
        if (parsed.unparsed > 0) {
            updateStatusEl.textContent += ` ${parsed.unparsed} linha(s) não reconhecida(s) e ignorada(s).`;
        }
        
        activeCategory = 'Todos';
        selectionSection.classList.remove('hidden');
        summarySection.classList.remove('hidden');
        
        // Hydrate cart from storage (ADR-008: migração + 4 passos de reconciliação)
        unavailableCart = {};
        pendingSpellingSuggestions = [];
        const storedCart = loadAndMigrateCart(allProducts);
        const matchedProductIds = new Set();

        // Passo 1: Match exato por productId
        Object.entries(storedCart).forEach(([savedId, entry]) => {
            if (!entry || typeof entry.qty !== 'number' || !Number.isFinite(entry.qty) || entry.qty < 0) return;
            const exact = allProducts.find(p => p.id === savedId && !matchedProductIds.has(p.id));
            if (exact) {
                exact.selecionado = true;
                exact.quantidade = entry.qty;
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
                target.selecionado = true;
                target.quantidade = entry.qty;
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
            unavailableCart[savedId] = {
                qty: entry.qty,
                name: String(entry.name || savedId),
                unit: String(entry.unit || 'un'),
                price: Number(entry.price) || 0,
                category: String(entry.category || 'Geral')
            };
        });

        saveCart();

        renderTabs();
        renderItems();
        updateFilterBtn();
        updateTotals();
        return true;
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
        activeCategory = 'Todos';
        showOnlySelected = false;

        rawText.value = '';
        searchInput.value = '';
        enderecoInput.value = '';
        setSelectValue(pagamentoSelect, '');
        itemsList.innerHTML = '';
        tabsContainer.innerHTML = '';
        promoDateEl.classList.add('hidden');
        selectionSection.classList.add('hidden');
        summarySection.classList.add('hidden');

        updateFilterBtn();
        setUpdateStatus('idle', 'Dados apagados. Aguardando atualização da lista.');
    };

    enderecoInput.oninput = () => { updateTotals(); savePrefs(); };
    pagamentoSelect.onchange = () => { updateTotals(); savePrefs(); };

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
    loadPrefs();
    syncLastUpdateStatus();
    const savedText = localStorage.getItem(RAW_TEXT_KEY);
    if (savedText) {
        rawText.value = savedText;
        processContent(savedText, { saveToStorage: false, source: 'manual' });

        if (!localStorage.getItem(LAST_UPDATE_TS_KEY)) {
            setUpdateStatus('ok', `Lista carregada de ${getSourceLabel('manual')}.`);
        }
    }
});

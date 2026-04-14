document.addEventListener('DOMContentLoaded', () => {
    // DOM Elements
    const rawText = document.getElementById('rawText');
    const processBtn = document.getElementById('processBtn');
    const clipboardBtn = document.getElementById('clipboardBtn');
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
    const enderecoSelect = document.getElementById('endereco');
    const pagamentoSelect = document.getElementById('pagamento');
    const promoDateEl = document.getElementById('promo-date');
    const pixInfo = document.getElementById('pixInfo');
    const pixKeyValue = document.getElementById('pixKeyValue');
    const pixQrCode = document.getElementById('pixQrCode');
    const copyPixKeyBtn = document.getElementById('copyPixKeyBtn');

    const DELIVERY_FEE = 5.00;
    const PIX_KEY = '37223063000117';
    const PIX_KEY_DISPLAY = '37.223.063/0001-17';
    const RAW_TEXT_KEY = 'hortifruti_raw_text';
    const LAST_UPDATE_TS_KEY = 'hortifruti_last_update_ts';
    const LAST_UPDATE_SOURCE_KEY = 'hortifruti_last_update_source';
    let allProducts = [];
    let activeCategory = 'Todos';

    // 1. Storage Helpers
    const savePrefs = () => {
        localStorage.setItem('hortifruti_prefs', JSON.stringify({
            endereco: enderecoSelect.value,
            pagamento: pagamentoSelect.value
        }));
    };

    const saveCart = () => {
        const cart = {};
        allProducts.forEach(p => {
            if (p.selecionado) {
                cart[p.nome] = p.quantidade;
            }
        });
        localStorage.setItem('hortifruti_cart', JSON.stringify(cart));
    };

    const setSelectValue = (selectEl, value) => {
        const fallback = selectEl.options[0]?.value || '';
        const hasMatchingOption = [...selectEl.options].some(option => option.value === value);
        selectEl.value = hasMatchingOption ? value : fallback;
    };

    const loadPrefs = () => {
        const prefs = JSON.parse(localStorage.getItem('hortifruti_prefs'));
        if (prefs) {
            setSelectValue(enderecoSelect, prefs.endereco);
            setSelectValue(pagamentoSelect, prefs.pagamento);
        }
    };

    const normalizeText = (value) => (value || '')
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .toLowerCase();

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

    const getSourceLabel = (source) => {
        if (source === 'clipboard') return 'área de transferência';
        if (source === 'manual') return 'colagem manual';
        return 'dados salvos';
    };

    const setUpdateStatus = (state, message) => {
        updateStatusEl.dataset.state = state;
        updateStatusEl.textContent = message;
    };

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

    const persistRawText = (text, source) => {
        localStorage.setItem(RAW_TEXT_KEY, text);
        localStorage.setItem(LAST_UPDATE_TS_KEY, new Date().toISOString());
        localStorage.setItem(LAST_UPDATE_SOURCE_KEY, source);
        syncLastUpdateStatus();
    };

    const updatePixInfo = () => {
        const isPix = pagamentoSelect.value.toUpperCase() === 'PIX';

        if (!isPix) {
            pixInfo.classList.add('hidden');
            pixQrCode.removeAttribute('src');
            return;
        }

        pixKeyValue.textContent = PIX_KEY_DISPLAY;
        pixQrCode.src = `https://api.qrserver.com/v1/create-qr-code/?size=220x220&margin=8&data=${encodeURIComponent(PIX_KEY)}`;
        pixQrCode.alt = `QR Code da chave PIX ${PIX_KEY_DISPLAY}`;
        pixInfo.classList.remove('hidden');
    };

    // 2. Parser Logic
    function extractDate(text) {
        const dateRegex = /(\d{2}\/\d{2}\/\d{4})/;
        const match = text.match(dateRegex);
        if (match) {
            promoDateEl.textContent = `📅 Promoção de: ${match[1]}`;
            promoDateEl.classList.remove('hidden');
        } else {
            promoDateEl.classList.add('hidden');
        }
    }

    function parseProducts(text) {
        const lines = text.split('\n');
        const products = [];
        let currentCategory = 'Geral';
        
        const categoryRegex = /[#*_]{1,3}\s*([A-ZÀ-Ú ]+)\s*[#*_]{1,3}/i;
        const productRegex = /([^*_\r\n]+?)\s*R?\$?\s*(\d+[,.]\d+)\s*(kg|un|bdj|unit|kgg|g)?/i;
        const promoRegex = /\*[^*\n]*\d+[,.]\d+[^*\n]*\*/;

        lines.forEach(line => {
            const cleanLine = line.trim();
            if (!cleanLine) return;

            const catMatch = cleanLine.match(categoryRegex);
            if (catMatch) {
                currentCategory = catMatch[1].trim();
                return;
            }

            const prodMatch = cleanLine.match(productRegex);
            if (prodMatch) {
                let nomeLimpo = prodMatch[1].trim().replace(/^[^\wÀ-ú]+/, '').trim();
                const preco = parseFloat(prodMatch[2].replace(',', '.'));
                let unidade = (prodMatch[3] || 'un').toLowerCase();
                const isPromocao = promoRegex.test(cleanLine);

                if (unidade === 'kgg') unidade = 'kg';
                if (unidade === 'unit') unidade = 'un';

                if (nomeLimpo && !isNaN(preco)) {
                    products.push({
                        id: 'item-' + Math.random().toString(36).substr(2, 9),
                        nome: nomeLimpo,
                        preco: preco,
                        unidade: unidade,
                        promocao: isPromocao,
                        categoria: currentCategory,
                        quantidade: 1,
                        selecionado: false
                    });
                }
            }
        });
        
        return products;
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
        const searchTerm = searchInput.value.toLowerCase();
        itemsList.innerHTML = '';

        const filtered = allProducts.filter(p => {
            const matchesSearch = p.nome.toLowerCase().includes(searchTerm);
            const matchesTab = activeCategory === 'Todos'
                || (activeCategory === 'Promoção' ? p.promocao : p.categoria === activeCategory);
            return matchesSearch && matchesTab;
        });

        filtered.forEach(item => {
            const div = document.createElement('div');
            const itemClasses = ['item-row'];
            const itemIcon = getCategoryIcon(item.categoria);
            if (item.selecionado) itemClasses.push('selected');
            if (item.promocao) itemClasses.push('promo-item');
            div.className = itemClasses.join(' ');
            div.innerHTML = `
                <input type="checkbox" class="item-check" ${item.selecionado ? 'checked' : ''}>
                <span class="item-name"><span class="item-icon" aria-hidden="true">${itemIcon}</span>${item.nome}</span>
                <span class="item-price">R$ ${item.preco.toFixed(2).replace('.', ',')}/${item.unidade}</span>
                <input type="number" class="item-qty" value="${item.quantidade}" min="0.1" step="0.1" ${item.selecionado ? '' : 'disabled'}>
            `;

            const check = div.querySelector('.item-check');
            const qtyInput = div.querySelector('.item-qty');

            check.onchange = (e) => {
                item.selecionado = e.target.checked;
                qtyInput.disabled = !item.selecionado;
                div.classList.toggle('selected', item.selecionado);
                updateTotals();
                saveCart();
            };

            qtyInput.oninput = (e) => {
                item.quantidade = parseFloat(e.target.value) || 0;
                updateTotals();
                saveCart();
            };

            itemsList.appendChild(div);
        });
    }

    function updateTotals() {
        let subtotal = 0;
        const selected = allProducts.filter(p => p.selecionado);

        selected.forEach(p => {
            subtotal += p.preco * p.quantidade;
        });

        const total = subtotal + DELIVERY_FEE;

        subtotalValue.textContent = `R$ ${subtotal.toFixed(2).replace('.', ',')}`;
        totalValue.textContent = `R$ ${total.toFixed(2).replace('.', ',')}`;

        generateMessage(selected, total);
    }

    function generateMessage(items, total) {
        if (items.length === 0) {
            finalMessage.value = 'Selecione pelo menos um item para gerar o pedido.';
            return;
        }

        const endereco = enderecoSelect.value;
        const pagamento = pagamentoSelect.value;

        let msg = 'Bom dia, tudo bem? Gostaria de fazer um pedido:\n\n';
        
        const categories = [...new Set(items.map(i => i.categoria))];
        categories.forEach(cat => {
            msg += `*${cat.toUpperCase()}*\n`;
            items.filter(i => i.categoria === cat).forEach(item => {
                const itemTotal = item.preco * item.quantidade;
                msg += `- ${item.nome}, ${item.quantidade}${item.unidade} (R$ ${itemTotal.toFixed(2).replace('.', ',')})\n`;
            });
            msg += '\n';
        });

        msg += `Taxa de entrega: R$ ${DELIVERY_FEE.toFixed(2).replace('.', ',')}\n`;
        msg += `*Total Geral: R$ ${total.toFixed(2).replace('.', ',')}*\n\n`;
        msg += `📍 *Endereço:* ${endereco}\n`;
        if (pagamento.toUpperCase() === 'PIX') {
            msg += '💳 *Pagamento:* PIX\n';
            msg += `🔑 *Chave PIX (CNPJ):* ${PIX_KEY}`;
        } else {
            msg += `💳 *Pagamento:* ${pagamento}`;
        }

        finalMessage.value = msg;
    }

    // 4. Main Actions
    const processContent = (text, { source = 'manual', saveToStorage = true } = {}) => {
        extractDate(text);
        allProducts = parseProducts(text);
        
        if (allProducts.length === 0) {
            setUpdateStatus('error', 'Nenhum produto encontrado no texto informado.');
            return false;
        }

        if (saveToStorage) {
            persistRawText(text, source);
        }
        
        activeCategory = 'Todos';
        selectionSection.classList.remove('hidden');
        summarySection.classList.remove('hidden');
        
        // Hydrate cart from storage
        const cart = JSON.parse(localStorage.getItem('hortifruti_cart')) || {};
        allProducts.forEach(p => {
            if (cart[p.nome] !== undefined) {
                p.selecionado = true;
                p.quantidade = cart[p.nome];
            }
        });

        renderTabs();
        renderItems();
        updatePixInfo();
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

    deselectAllBtn.onclick = () => {
        allProducts.forEach(p => {
            p.selecionado = false;
            p.quantidade = 1;
        });
        localStorage.removeItem('hortifruti_cart');
        renderItems();
        updateTotals();
    };

    enderecoSelect.onchange = () => { updateTotals(); savePrefs(); };
    pagamentoSelect.onchange = () => { updatePixInfo(); updateTotals(); savePrefs(); };

    copyBtn.onclick = () => {
        if (allProducts.filter(p => p.selecionado).length === 0) return;
        
        navigator.clipboard.writeText(finalMessage.value)
            .then(() => {
                const originalText = copyBtn.innerHTML;
                copyBtn.innerHTML = '✅ Copiado!';
                copyBtn.style.background = '#27ae60';
                setTimeout(() => {
                    copyBtn.innerHTML = originalText;
                    copyBtn.style.background = 'var(--accent)';
                }, 2000);
            });
    };

    copyPixKeyBtn.onclick = () => {
        navigator.clipboard.writeText(PIX_KEY)
            .then(() => {
                const originalText = copyPixKeyBtn.innerHTML;
                copyPixKeyBtn.innerHTML = '✅ Chave copiada!';
                setTimeout(() => {
                    copyPixKeyBtn.innerHTML = originalText;
                }, 2000);
            });
    };

    // 5. Initial Hydration
    loadPrefs();
    updatePixInfo();
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

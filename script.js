document.addEventListener('DOMContentLoaded', () => {
    // DOM Elements
    const rawText = document.getElementById('rawText');
    const processBtn = document.getElementById('processBtn');
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

    const DELIVERY_FEE = 5.00;
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

    const loadPrefs = () => {
        const prefs = JSON.parse(localStorage.getItem('hortifruti_prefs'));
        if (prefs) {
            enderecoSelect.value = prefs.endereco || enderecoSelect.options[0].value;
            pagamentoSelect.value = prefs.pagamento || pagamentoSelect.options[0].value;
        }
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

                if (unidade === 'kgg') unidade = 'kg';
                if (unidade === 'unit') unidade = 'un';

                if (nomeLimpo && !isNaN(preco)) {
                    products.push({
                        id: 'item-' + Math.random().toString(36).substr(2, 9),
                        nome: nomeLimpo,
                        preco: preco,
                        unidade: unidade,
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
        const categories = ['Todos', ...new Set(allProducts.map(p => p.categoria))];
        tabsContainer.innerHTML = '';
        
        categories.forEach(cat => {
            const tab = document.createElement('button');
            tab.type = 'button';
            tab.className = `tab ${activeCategory === cat ? 'active' : ''}`;
            tab.textContent = cat;
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
            const matchesTab = activeCategory === 'Todos' || p.categoria === activeCategory;
            return matchesSearch && matchesTab;
        });

        filtered.forEach(item => {
            const div = document.createElement('div');
            div.className = `item-row ${item.selecionado ? 'selected' : ''}`;
            div.innerHTML = `
                <input type="checkbox" class="item-check" ${item.selecionado ? 'checked' : ''}>
                <span class="item-name">${item.nome}</span>
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
        msg += `💳 *Pagamento:* ${pagamento}`;

        finalMessage.value = msg;
    }

    // 4. Main Actions
    const processContent = (text) => {
        extractDate(text);
        allProducts = parseProducts(text);
        
        if (allProducts.length === 0) return false;

        localStorage.setItem('hortifruti_raw_text', text);
        
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
        updateTotals();
        return true;
    };

    processBtn.onclick = () => {
        const text = rawText.value;
        if (processContent(text)) {
            selectionSection.scrollIntoView({ behavior: 'smooth' });
        } else {
            alert('Nenhum produto encontrado. Tente colar a mensagem novamente.');
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
    pagamentoSelect.onchange = () => { updateTotals(); savePrefs(); };

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

    // 5. Initial Hydration
    loadPrefs();
    const savedText = localStorage.getItem('hortifruti_raw_text');
    if (savedText) {
        rawText.value = savedText;
        processContent(savedText);
    }
});

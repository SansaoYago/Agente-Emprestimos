// Template unificado parametrizado para documentos PDF
function _buildElementFor(type, payload) {
    const el = document.createElement('div');
    el.style.padding = '0';
    el.style.fontFamily = 'Arial, sans-serif';

    if (type === 'emprestimo') {
        const dados = payload;
        const totalComJuros = dados.valorParcela * dados.numParcelas;
        el.innerHTML = `
            <div class="page" style="box-sizing:border-box;">
                <header class="pdf-header">
                    <div class="logo">Agente Empréstimos</div>
                    <div class="doc-title">COMPROVANTE DE EMPRÉSTIMO</div>
                </header>
                <section class="client-info">
                    <div><strong>Cliente:</strong> ${dados.cliente}</div>
                    <div><strong>WhatsApp:</strong> ${dados.whatsapp}</div>
                    <div><strong>Data:</strong> ${new Date().toLocaleDateString('pt-br')}</div>
                </section>
                <section class="summary">
                    <h3>Resumo</h3>
                    <div class="row"><span>Valor solicitado</span><span class="value">${dados.valor.toLocaleString('pt-br', { style: 'currency', currency: 'BRL' })}</span></div>
                    <div class="row"><span>Juros</span><span class="value">${((dados.valorParcela * dados.numParcelas - dados.valor) / dados.valor * 100).toFixed(0)}%</span></div>
                    <div class="row"><span>Parcelas</span><span class="value">${dados.numParcelas}x</span></div>
                    <div class="row total"><span>Total</span><span class="value">${totalComJuros.toLocaleString('pt-br', { style: 'currency', currency: 'BRL' })}</span></div>
                </section>
                <section class="installments">
                    <h3>Parcelas</h3>
                    <table>
                        <thead><tr><th>Parcela</th><th>Vencimento</th><th>Valor</th></tr></thead>
                        <tbody>
                            <!-- apenas um resumo: 1ª parcela com data fornecida -->
                            <tr><td>1/${dados.numParcelas}</td><td>${dados.dataVencimento.split('-').reverse().join('/')}</td><td>${dados.valorParcela.toLocaleString('pt-br', { style: 'currency', currency: 'BRL' })}</td></tr>
                        </tbody>
                    </table>
                </section>
                <footer class="pdf-footer"><div class="assinatura">ASSINATURA</div></footer>
            </div>
        `;
        return { element: el, filename: `Recibo_${dados.cliente}_emprestimo.pdf` };
    }

    if (type === 'pagamento') {
        const { cliente, qtd, valor, restantes } = payload;
        el.innerHTML = `
            <div class="page" style="box-sizing:border-box;">
                <header class="pdf-header">
                    <div class="logo">Agente Empréstimos</div>
                    <div class="doc-title">RECIBO DE PAGAMENTO</div>
                </header>
                <section class="client-info">
                    <div><strong>Recebemos de:</strong> ${cliente}</div>
                    <div><strong>Data:</strong> ${new Date().toLocaleDateString('pt-br')}</div>
                </section>
                <section class="summary">
                    <h3>Detalhes</h3>
                    <div class="row"><span>Valor Pago</span><span class="value">${valor.toLocaleString('pt-br', { style: 'currency', currency: 'BRL' })}</span></div>
                    <div class="row total"><span>Parcelas</span><span class="value">${qtd}x</span></div>
                </section>
                <section class="installments">
                    <div style="background: rgba(248,249,250,0.8); padding: 15px; text-align: center; border-radius: 5px;">
                        <strong>${restantes > 0 ? `Ainda restam ${restantes} parcelas para este empréstimo.` : "Empréstimo TOTALMENTE QUITADO. Obrigado!"}</strong>
                    </div>
                </section>
                <footer class="pdf-footer"><div class="assinatura">ASSINATURA</div></footer>
            </div>
        `;
        return { element: el, filename: `Recibo_Pagamento_${cliente}_${Date.now()}.pdf` };
    }

    // fallback
    el.textContent = 'Documento inválido';
    return { element: el, filename: `documento_${Date.now()}.pdf` };
}

function _renderPdf(element, filename) {
    if (typeof html2pdf === 'undefined') {
        console.error('Biblioteca html2pdf não encontrada.');
        return;
    }
    const opt = {
        margin: 0,
        filename,
        image: { type: 'jpeg', quality: 0.98 },
        html2canvas: { scale: 2 },
        jsPDF: { unit: 'in', format: 'letter', orientation: 'portrait' }
    };

    // Antes de gerar, tente carregar o CSS do template `pdf.css` e injetar no elemento
    // para que o PDF herde o mesmo estilo do `pdf.html`.
    fetch('pdf.css').then(resp => {
        if (!resp.ok) return '';
        return resp.text();
    }).then(cssText => {
        try {
            // Remove estilo anterior se existir
            const existing = element.querySelector('style[data-pdf-css]');
            if (existing) existing.remove();
            const style = document.createElement('style');
            style.setAttribute('data-pdf-css', '');
            style.textContent = cssText || '';
            // Inserir no topo do elemento para aplicar o CSS
            element.insertBefore(style, element.firstChild);

            html2pdf().set(opt).from(element).toPdf().output('blob').then((blob) => {
                const url = URL.createObjectURL(blob);
                window.open(url, '_blank');
                html2pdf().set(opt).from(element).save();
                setTimeout(() => URL.revokeObjectURL(url), 10000);
            });
        } catch (err) {
            console.error('Erro ao gerar PDF:', err);
        }
    }).catch(e => {
        console.warn('Não foi possível carregar pdf.css, gerando sem estilo externo.', e);
        try {
            html2pdf().set(opt).from(element).toPdf().output('blob').then((blob) => {
                const url = URL.createObjectURL(blob);
                window.open(url, '_blank');
                html2pdf().set(opt).from(element).save();
                setTimeout(() => URL.revokeObjectURL(url), 10000);
            });
        } catch (err) {
            console.error('Erro ao gerar PDF:', err);
        }
    });
}

export function gerarDocumento(tipo, payload) {
    const { element, filename } = _buildElementFor(tipo, payload);
    _renderPdf(element, filename);
}

export function gerarComprovantePDF(dados) {
    gerarDocumento('emprestimo', dados);
}

export function gerarReciboPagamentoPDF(cliente, qtd, valor, restantes) {
    gerarDocumento('pagamento', { cliente, qtd, valor, restantes });
}

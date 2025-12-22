// Template unificado parametrizado para documentos PDF
function _buildElementFor(type, payload) {
    const el = document.createElement('div');
    el.style.padding = '0';
    el.style.fontFamily = 'Arial, sans-serif';

    if (type === 'emprestimo') {
        const dados = payload;
        const totalComJuros = dados.valorParcela * dados.numParcelas;
        el.innerHTML = `
            <div style="width:8.5in; height:11in; box-sizing:border-box; background-image: url('img/background-pdf.jpg'); background-size: cover; background-position: center;">
                <div style="padding: 40px; border-radius: 10px; background: rgba(255,255,255,0.0); box-sizing: border-box; width:100%; height:100%;">
                    <h1 style="color: #1a73e8; text-align: center;">COMPROVANTE DE EMPRÉSTIMO</h1>
                    <hr>
                    <p><strong>Cliente:</strong> ${dados.cliente}</p>
                    <p><strong>WhatsApp:</strong> ${dados.whatsapp}</p>
                    <p><strong>Data:</strong> ${new Date().toLocaleDateString('pt-br')}</p>
                    <br>
                    <h3>Resumo:</h3>
                    <p><strong>${dados.numParcelas}x</strong> de <strong>${dados.valorParcela.toLocaleString('pt-br', { style: 'currency', currency: 'BRL' })}</strong>.</p>
                    <p><strong>Total:</strong> ${totalComJuros.toLocaleString('pt-br', { style: 'currency', currency: 'BRL' })}</p>
                    <p><strong>1º Vencimento:</strong> ${dados.dataVencimento.split('-').reverse().join('/')}</p>
                </div>
            </div>
        `;
        return { element: el, filename: `Recibo_${dados.cliente}_emprestimo.pdf` };
    }

    if (type === 'pagamento') {
        const { cliente, qtd, valor, restantes } = payload;
        el.innerHTML = `
            <div style="width:8.5in; height:11in; box-sizing:border-box; background-image: url('img/background-pdf.jpg'); background-size: cover; background-position: center;">
                <div style="padding: 40px; border-radius: 10px; background: rgba(255,255,255,0.0); box-sizing: border-box; width:100%; height:100%;">
                    <h1 style="color: #28a745; text-align: center;">RECIBO DE PAGAMENTO</h1>
                    <hr>
                    <p><strong>Recebemos de:</strong> ${cliente}</p>
                    <p><strong>Valor Pago:</strong> ${valor.toLocaleString('pt-br', { style: 'currency', currency: 'BRL' })}</p>
                    <p><strong>Referente a:</strong> ${qtd} parcela(s)</p>
                    <p><strong>Data:</strong> ${new Date().toLocaleString('pt-br')}</p>
                    <br>
                    <div style="background: rgba(248,249,250,0.8); padding: 15px; text-align: center; border-radius: 5px;">
                        <strong>${restantes > 0 ? `Ainda restam ${restantes} parcelas para este empréstimo.` : "Empréstimo TOTALMENTE QUITADO. Obrigado!"}</strong>
                    </div>
                </div>
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

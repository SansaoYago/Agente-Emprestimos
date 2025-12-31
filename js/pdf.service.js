// Template unificado parametrizado para documentos PDF
function _buildElementFor(type, payload) {
    const el = document.createElement('div');
    el.style.padding = '0';
    el.style.margin = '0';

    const estilo = `
        <style>
            .pdf-container {
                width: 8.5in; height: 11in; 
                box-sizing: border-box; 
                background-image: url('img/background-pdf.jpg'); 
                background-size: cover; 
                background-position: center;
                font-family: Arial, sans-serif;
                position: relative;
                color: #222;
            }
            .pdf-content { padding: 50px 60px; }
            .pdf-header { text-align: center; margin-bottom: 30px; }
            .logo { color: #0b4a9b; font-weight: bold; font-size: 20px; margin-bottom: 5px; }
            .doc-title { color: #0b4a9b; font-weight: bold; font-size: 18px; text-transform: uppercase; }
            
            .info-box { font-size: 14px; margin-bottom: 25px; line-height: 1.6; }
            
            .summary-title { color: #0b4a9b; font-weight: bold; border-bottom: 1px solid #ddd; margin-bottom: 10px; padding-bottom: 5px; }
            .row { display: flex; justify-content: space-between; padding: 5px 0; font-size: 14px; }
            .row.total { font-weight: bold; border-top: 2px solid #0b4a9b; margin-top: 10px; padding-top: 10px; font-size: 16px; }
            
            .table-title { color: #0b4a9b; font-weight: bold; margin-top: 25px; margin-bottom: 10px; }
            table { width: 100%; border-collapse: collapse; }
            th { background: rgba(11, 74, 155, 0.1); color: #0b4a9b; text-align: left; padding: 8px; font-size: 13px; }
            td { padding: 8px; border-bottom: 1px solid #eee; font-size: 13px; }
            
            .pdf-footer { position: absolute; bottom: 50px; left: 0; right: 0; text-align: center; }
            .assinatura { width: 60%; margin: 0 auto; border-top: 1px dashed #999; padding-top: 10px; font-size: 12px; color: #666; }
        </style>
    `;

    if (type === 'emprestimo') {
        const dados = payload;
        
        // CORREÇÃO AQUI: Tenta pegar o valor de diferentes chaves possíveis
        const vSolicitado = dados.valorSolicitado || dados.valor || dados.valorTotal || 0;
        const totalComJuros = dados.valorParcela * dados.numParcelas;
        
        let parcelasHtml = '';
        try {
            const dataBase = new Date(dados.dataVencimento + 'T00:00:00');
            for (let i = 1; i <= dados.numParcelas; i++) {
                const dataP = new Date(dataBase);
                dataP.setMonth(dataBase.getMonth() + (i - 1));
                parcelasHtml += `
                    <tr>
                        <td>${i}/${dados.numParcelas}</td>
                        <td>${dataP.toLocaleDateString('pt-br')}</td>
                        <td>${dados.valorParcela.toLocaleString('pt-br', { style: 'currency', currency: 'BRL' })}</td>
                    </tr>
                `;
            }
        } catch(e) { parcelasHtml = '<tr><td colspan="3">Erro ao processar datas</td></tr>'; }

        el.innerHTML = `
            ${estilo}
            <div class="pdf-container">
                <div class="pdf-content">
                    <div class="pdf-header">
                        <div class="logo">Agente Empréstimos</div>
                        <div class="doc-title">COMPROVANTE DE EMPRÉSTIMO</div>
                    </div>

                    <div class="info-box">
                        <strong>Cliente:</strong> ${dados.cliente}<br>
                        <strong>WhatsApp:</strong> ${dados.whatsapp}<br>
                        <strong>Data:</strong> ${new Date().toLocaleDateString('pt-br')}
                    </div>

                    <div class="summary-title">Resumo</div>
                    <div class="row"><span>Valor Solicitado</span><span>${vSolicitado.toLocaleString('pt-br', { style: 'currency', currency: 'BRL' })}</span></div>
                    <div class="row"><span>Parcelas</span><span>${dados.numParcelas}x</span></div>
                    <div class="row"><span>Valor da Parcela</span><span>${dados.valorParcela.toLocaleString('pt-br', { style: 'currency', currency: 'BRL' })}</span></div>
                    <div class="row total"><span>Total a Pagar</span><span>${totalComJuros.toLocaleString('pt-br', { style: 'currency', currency: 'BRL' })}</span></div>

                    <div class="table-title">Parcelas</div>
                    <table>
                        <thead><tr><th>Parcela</th><th>Vencimento</th><th>Valor</th></tr></thead>
                        <tbody>${parcelasHtml}</tbody>
                    </table>
                </div>
                <div class="pdf-footer">
                    <div class="assinatura">ASSINATURA DIGITAL</div>
                </div>
            </div>
        `;
        return { element: el, filename: `Emprestimo_${dados.cliente}.pdf` };
    }

    if (type === 'pagamento') {
        const { cliente, qtd, valor, restantes } = payload;
        el.innerHTML = `
            ${estilo}
            <div class="pdf-container">
                <div class="pdf-content">
                    <div class="pdf-header">
                        <div class="logo">Agente Empréstimos</div>
                        <div class="doc-title" style="color:#28a745">RECIBO DE PAGAMENTO</div>
                    </div>
                    <div class="info-box" style="margin-top:40px">
                        <strong>Recebemos de:</strong> ${cliente}<br>
                        <strong>Valor Pago:</strong> ${valor.toLocaleString('pt-br', { style: 'currency', currency: 'BRL' })}<br>
                        <strong>Referente a:</strong> ${qtd} parcela(s)<br>
                        <strong>Data:</strong> ${new Date().toLocaleString('pt-br')}
                    </div>
                    <div style="background:rgba(40,167,69,0.1); padding:20px; border-radius:10px; text-align:center; margin-top:30px">
                        <strong style="color:#28a745">${restantes > 0 ? `Restam ${restantes} parcelas.` : "QUITADO!"}</strong>
                    </div>
                </div>
                <div class="pdf-footer">
                    <div class="assinatura">COMPROVANTE DIGITAL</div>
                </div>
            </div>
        `;
        return { element: el, filename: `Recibo_${cliente}.pdf` };
    }

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
        html2canvas: { scale: 2, useCORS: true },
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
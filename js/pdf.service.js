// Template unificado parametrizado para documentos PDF - OTIMIZADO
function _buildElementFor(type, payload) {
    const wrapper = document.createElement('div');
    wrapper.style.width = '100%';
    wrapper.style.display = 'flex';
    wrapper.style.justifyContent = 'center';
    wrapper.style.backgroundColor = '#ffffff'; 

    const el = document.createElement('div');
    el.id = "pdf-render-target";
    el.style.width = '400px';
    el.style.backgroundColor = '#ffffff';
    el.style.margin = '0 auto'; 

    const estilo = `
        <style>
            #pdf-render-target { font-family: Arial, sans-serif; color: #222; padding: 30px; box-sizing: border-box; text-align: left; }
            .pdf-header { text-align: center; border-bottom: 2px solid #0b4a9b; padding-bottom: 20px; margin-bottom: 25px; }
            .logo { color: #0b4a9b; font-weight: bold; font-size: 26px; }
            .doc-title { color: #666; font-size: 14px; text-transform: uppercase; margin-top: 8px; font-weight: bold; }
            .info-box { font-size: 16px; margin-bottom: 25px; line-height: 1.8; background: #f8fafc; padding: 15px; border-radius: 8px; border-left: 4px solid #0b4a9b; }
            .info-box strong { color: #0b4a9b; }
            .row { display: flex; justify-content: space-between; padding: 12px 0; font-size: 16px; border-bottom: 1px solid #edf2f7; }
            .row.total { font-weight: bold; background: #0b4a9b; color: #fff; margin-top: 20px; padding: 18px; border-radius: 8px; font-size: 22px; }
            table { width: 100%; border-collapse: collapse; margin-top: 25px; }
            th { background: #f1f5f9; color: #0b4a9b; text-align: left; padding: 12px; font-size: 14px; text-transform: uppercase; }
            td { padding: 12px; border-bottom: 1px solid #edf2f7; font-size: 15px; }
            .status-badge { margin: 25px auto; padding: 18px; border-radius: 12px; text-align: center; font-weight: bold; font-size: 20px; color: #fff; width: 90%; }
            .pdf-footer { margin-top: 40px; text-align: center; border-top: 1px dashed #cbd5e1; padding-top: 25px; font-size: 13px; color: #94a3b8; font-weight: bold; }
        </style>
    `;

    if (type === 'emprestimo') {
        const dados = payload || {};
        // CORREÇÃO: Pegando os dados de qualquer forma que eles venham
        const cliente = dados.cliente || "Cliente";
        const whatsapp = dados.whatsapp || "N/A";
        const vSolicitado = Number(dados.valor_total || dados.valorSolicitado || dados.valor || 0);
        const vParcela = Number(dados.valor_parcela || dados.valorParcela || 0);
        const nParcelas = Number(dados.num_parcelas || dados.numParcelas || dados.parcelas || 0);
        const vVencimento = dados.data_vencimento || dados.dataVencimento || new Date().toISOString().split('T')[0];
        
        const totalComJuros = vParcela * nParcelas;

        let parcelasHtml = '';
        try {
            const dataBase = new Date(vVencimento + 'T12:00:00'); // T12:00 evita erro de fuso horário
            for (let i = 1; i <= nParcelas; i++) {
                const dataP = new Date(dataBase);
                dataP.setMonth(dataBase.getMonth() + (i - 1));
                parcelasHtml += `<tr><td>${i}/${nParcelas}</td><td>${dataP.toLocaleDateString('pt-br')}</td><td><b>R$ ${vParcela.toFixed(2)}</b></td></tr>`;
            }
        } catch (e) { parcelasHtml = '<tr><td colspan="3">Erro no plano de parcelas</td></tr>'; }

        el.innerHTML = `${estilo}
            <div class="pdf-header"><div class="logo">Agente Empréstimos</div><div class="doc-title">Comprovante de Empréstimo</div></div>
            <div class="info-box">
                <strong>Cliente:</strong> ${cliente}<br>
                <strong>WhatsApp:</strong> ${whatsapp}<br>
                <strong>Emissão:</strong> ${new Date().toLocaleDateString('pt-br')}
            </div>
            <div class="row"><span>Valor Base:</span><span>R$ ${vSolicitado.toFixed(2)}</span></div>
            <div class="row"><span>Plano:</span><span>${nParcelas} meses</span></div>
            <div class="row total"><span>Total Final:</span><span>R$ ${totalComJuros.toFixed(2)}</span></div>
            <table><thead><tr><th>Parc.</th><th>Venc.</th><th>Valor</th></tr></thead><tbody>${parcelasHtml}</tbody></table>
            <div class="pdf-footer">VALIDADO DIGITALMENTE</div>`;
        
        wrapper.appendChild(el);
        return { element: wrapper, filename: `Emprestimo_${cliente}.pdf` };
    }

    if (type === 'pagamento') {
        const { cliente, qtd, valor, restantes } = payload;
        // Lógica de quitação absoluta: se o resto for <= 0, é QUITADO.
        const saldoRestante = typeof restantes === 'string' ? parseFloat(restantes) : restantes;
        const isQuitado = saldoRestante <= 0 || restantes === "QUITADO!";
        
        let corStatus = isQuitado ? "#16a34a" : "#ca8a04";
        let textoStatus = isQuitado ? "QUITADO!" : `Faltam ${restantes} parcelas`;

        el.innerHTML = `${estilo}
            <div class="pdf-header"><div class="logo">Agente Empréstimos</div><div class="doc-title">Recibo de Recebimento</div></div>
            <div class="info-box">
                <strong>Cliente:</strong> ${cliente}<br>
                <strong>Recebemos:</strong> R$ ${valor.toFixed(2)}<br>
                <strong>Parcelas Pagas:</strong> ${qtd > 0 ? qtd : 'Parcial'}<br>
                <strong>Data/Hora:</strong> ${new Date().toLocaleString('pt-br')}
            </div>
            <div class="status-badge" style="background-color: ${corStatus}">${textoStatus}</div>
            <div class="pdf-footer">COMPROVANTE DE PAGAMENTO</div>`;
            
        wrapper.appendChild(el);
        return { element: wrapper, filename: `Recibo_${cliente}.pdf` };
    }
}

function _renderPdf(element, filename) {
    if (typeof html2pdf === 'undefined') {
        console.error("Biblioteca html2pdf não encontrada!");
        return;
    }

    const opt = {
        margin: 0,
        filename: filename,
        image: { type: 'jpeg', quality: 1 },
        html2canvas: { scale: 2, useCORS: true, letterRendering: true },
        jsPDF: { unit: 'pt', format: [400, 850], orientation: 'portrait' }
    };

    document.body.appendChild(element);

    html2pdf().set(opt).from(element).toPdf().output('blob').then((blob) => {
        const url = URL.createObjectURL(blob);
        const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);

        if (isMobile) {
            window.location.href = url; // Abre na mesma aba para garantir no mobile
        } else {
            const win = window.open(url, '_blank');
            if (!win) window.location.href = url;
        }

        setTimeout(() => html2pdf().set(opt).from(element).save(), 2000);
    }).finally(() => {
        if (element.parentNode) document.body.removeChild(element);
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
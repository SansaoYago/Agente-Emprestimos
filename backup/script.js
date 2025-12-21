// 1. SELEÇÃO DE ELEMENTOS
const botoesMenu = document.querySelectorAll('footer nav .material-symbols-outlined');
const btnSalvar = document.getElementById('btn-salvar');
const listaVencimentos = document.getElementById('lista-vencimentos');
const listaHistorico = document.getElementById('lista-historico');
const campoSaldoVisivel = document.querySelector('.valor-capital');

const modal = document.getElementById('modal-pagamento');
const modalInfo = document.getElementById('modal-info');
const selectParcelas = document.getElementById('select-qtd-parcelas');
const btnConfirmarPg = document.getElementById('btn-confirmar-pagamento');
const btnFecharModal = document.getElementById('btn-fechar-modal');

const menuGestao = document.getElementById('menu-gestao-flutuante');
const blurOverlay = document.getElementById('blur-overlay');
const btnFecharMenuGestao = document.getElementById('btn-fechar-gestao');

const modalValidacao = document.getElementById('modal-validacao');
const inputCodigo = document.getElementById('input-codigo-recebido');

// VARIÁVEIS DE ESTADO
let lucroTotal = 0.00;
let cardEmEdicao = null;
let dadosEmEdicao = null;
let saldoGlobal = 0;
let taxaJurosGlobal = 1.30;
let codigoGeradoLocal = null;
let dadosTemporarios = null;
let listaNegativadosGlobal = [];

// 2. UTILITÁRIOS E NAVEGAÇÃO
function atualizarDisplaySaldo() {
    campoSaldoVisivel.textContent = saldoGlobal.toLocaleString('pt-br', { style: 'currency', currency: 'BRL' });
    const campoLucro = document.getElementById('valor-lucro-acumulado');
    if (campoLucro) campoLucro.textContent = lucroTotal.toLocaleString('pt-br', { style: 'currency', currency: 'BRL' });
}

function trocarSecao(idAlvo) {
    fecharMenuGestao();
    document.querySelectorAll('.content-section').forEach(sec => sec.style.display = 'none');
    const seccaoAtiva = document.getElementById(idAlvo);
    if (seccaoAtiva) {
        seccaoAtiva.style.display = 'flex';
        seccaoAtiva.classList.remove('animar-entrada');
        void seccaoAtiva.offsetWidth;
        seccaoAtiva.classList.add('animar-entrada');
    }
}

function fecharMenuGestao() {
    if (menuGestao) {
        menuGestao.style.display = 'none';
        blurOverlay.style.display = 'none';
    }
}

document.getElementById('btn-config-topo').onclick = () => {
    const isVisivel = menuGestao.style.display === 'flex';
    if (isVisivel) fecharMenuGestao();
    else {
        menuGestao.style.display = 'flex';
        blurOverlay.style.display = 'block';
    }
};

if (btnFecharMenuGestao) btnFecharMenuGestao.onclick = fecharMenuGestao;
if (blurOverlay) blurOverlay.onclick = fecharMenuGestao;

function abrirOpcaoConfig(idAlvo) {
    fecharMenuGestao();
    trocarSecao(idAlvo);
}

// 3. CONFIGURAÇÕES (JUROS)
const btnSalvarJuros = document.getElementById('btn-salvar-juros');
if (btnSalvarJuros) {
    btnSalvarJuros.onclick = () => {
        const novaTaxa = parseFloat(document.getElementById('input-taxa-juros').value);
        if (!isNaN(novaTaxa) && novaTaxa >= 0) {
            taxaJurosGlobal = 1 + (novaTaxa / 100);
            alert(`Configurado: Juros de ${novaTaxa}% aplicados.`);
            botoesMenu[0].click();
        }
    };
}

// 4. LÓGICA DO MODAL E RECEBIMENTOS
function abrirModal(card, dados) {
    cardEmEdicao = card;
    dadosEmEdicao = dados;
    const spanParc = card.querySelector('.pg-parcela');
    const parcelaAtualNoCard = parseInt(spanParc.textContent.split(':')[1].trim().split('/')[0]);
    const parcelasRestantes = (dados.numParcelas - parcelaAtualNoCard) + 1;

    let displayTotal = document.getElementById('display-total-modal');
    if (!displayTotal) {
        displayTotal = document.createElement('div');
        displayTotal.id = 'display-total-modal';
        displayTotal.style = "background:#f0f7ff; padding:10px; border-radius:10px; margin:15px 0; border:1px dashed var(--corPrimaria);";
        btnConfirmarPg.parentNode.insertBefore(displayTotal, btnConfirmarPg);
    }

    let btnExcluir = document.getElementById('btn-excluir-emprestimo');
    if (!btnExcluir) {
        btnExcluir = document.createElement('button');
        btnExcluir.id = 'btn-excluir-emprestimo';
        btnExcluir.innerHTML = '<span class="material-symbols-outlined" style="font-size:18px; vertical-align:middle;">delete</span> Excluir Registro';
        btnExcluir.style = "background:none; border:none; color:var(--corErro); cursor:pointer; margin-top:15px; font-size:0.8em; width:100%;";
        modal.querySelector('div').appendChild(btnExcluir);
        btnExcluir.onclick = () => {
            if (confirm("Deseja apagar este registro permanentemente?")) {
                cardEmEdicao.remove();
                modal.style.display = 'none';
            }
        };
    }
    // --- ADIÇÃO DA BLACK LIST DENTRO DO MODAL ---
    let containerBlacklist = document.getElementById('container-blacklist-modal');
    if (!containerBlacklist) {
        containerBlacklist = document.createElement('div');
        containerBlacklist.id = 'container-blacklist-modal';
        containerBlacklist.style = "margin-top: 10px; display: flex; align-items: center; justify-content: center; gap: 8px; border-top: 1px solid #eee; padding-top: 10px;";
        
        containerBlacklist.innerHTML = `
            <input type="checkbox" id="check-blacklist-modal" style="accent-color: var(--corErro); cursor:pointer;">
            <label for="check-blacklist-modal" style="font-size: 0.8em; color: var(--corErro); font-weight: bold; cursor:pointer;">Negativar Cliente</label>
        `;
        
        // Insere abaixo do botão de excluir
        btnExcluir.parentNode.appendChild(containerBlacklist);
    }

    // Resetar o estado do checkbox toda vez que abrir o modal
    const checkbox = document.getElementById('check-blacklist-modal');
    checkbox.checked = false; 

    // Lógica para salvar na Black List ao clicar no checkbox
    checkbox.onchange = () => {
        if (checkbox.checked) {
            const confirmar = confirm(`Deseja adicionar ${dados.cliente} à Black List? Ele não poderá fazer novos empréstimos.`);
            if (confirmar) {
                adicionarABlackList(dados.cliente, dados.whatsapp);
                alert(`${dados.cliente} foi negativado.`);
            } else {
                checkbox.checked = false;
            }
        }
    };

    modalInfo.innerHTML = `Cliente: <b>${dados.cliente}</b><br>Valor unitário: ${dados.valorParcela.toLocaleString('pt-br', { style: 'currency', currency: 'BRL' })}`;

    selectParcelas.innerHTML = '';
    for (let i = 1; i <= parcelasRestantes; i++) {
        const opt = document.createElement('option');
        opt.value = i;
        opt.textContent = i === parcelasRestantes && i > 1 ? `Quitar tudo (${i} parcelas)` : `${i} parcela(s)`;
        selectParcelas.appendChild(opt);
    }

    const atualizarValorTotalUI = () => {
        const qtd = parseInt(selectParcelas.value);
        const total = dados.valorParcela * qtd;
        displayTotal.innerHTML = `Valor a receber: <b style="color:var(--corSucesso); font-size: 1.2em;">${total.toLocaleString('pt-br', { style: 'currency', currency: 'BRL' })}</b>`;
    };
    atualizarValorTotalUI();
    selectParcelas.onchange = atualizarValorTotalUI;
    modal.style.display = 'flex';
}

btnConfirmarPg.onclick = () => {
    const qtdSelecionada = parseInt(selectParcelas.value);
    const spanParc = cardEmEdicao.querySelector('.pg-parcela');
    let parcelaAtual = parseInt(spanParc.textContent.split(':')[1].trim().split('/')[0]);

    const valorRecebido = dadosEmEdicao.valorParcela * qtdSelecionada;
    const proporcaoJuros = (taxaJurosGlobal - 1) / taxaJurosGlobal;
    const lucroDestaOperacao = valorRecebido * proporcaoJuros;

    lucroTotal += lucroDestaOperacao;
    saldoGlobal += valorRecebido;
    atualizarDisplaySaldo();

    const novaParcelaIndice = parcelaAtual + qtdSelecionada;
    const parcelasRestantes = dadosEmEdicao.numParcelas - (novaParcelaIndice - 1);

    // --- NOVIDADE: REGISTRA O PAGAMENTO ESPECÍFICO NO HISTÓRICO ---
    registrarNoHistorico(dadosEmEdicao.cliente, qtdSelecionada, valorRecebido, novaParcelaIndice > dadosEmEdicao.numParcelas);

    // --- NOVIDADE: GERA O PDF DO RECEBIMENTO DESTA PARCELA ---
    gerarReciboPagamentoPDF(dadosEmEdicao.cliente, qtdSelecionada, valorRecebido, parcelasRestantes);

    if (novaParcelaIndice > dadosEmEdicao.numParcelas) {
        finalizarCard(cardEmEdicao);
    } else {
        spanParc.textContent = `Parc: ${novaParcelaIndice}/${dadosEmEdicao.numParcelas}`;
    }
    modal.style.display = 'none';
};

function finalizarCard(card) {
    card.classList.remove('no-prazo', 'em-atraso');
    card.classList.add('card-historico');
    card.onclick = null;
    const detalhes = card.querySelector('.pagamento-detalhes');
    detalhes.innerHTML = `<span class="pago-status">QUITADO</span>` + detalhes.innerHTML;
    if (listaHistorico.querySelector('p')) listaHistorico.innerHTML = '';
    listaHistorico.prepend(card);
}

// 5. SALVAR COM VALIDAÇÃO WHATSAPP E TRAVAS DE SEGURANÇA
btnSalvar.onclick = () => {
    const cliente = document.getElementById('input-cliente').value;
    const whatsapp = document.getElementById('input-whatsapp').value;
    const valor = parseFloat(document.getElementById('input-valor').value);
    const dataInput = document.getElementById('input-data').value;
    const parcelas = parseInt(document.getElementById('input-parcelas').value) || 1;

    // A. Validação de Campos Vazios
    if (!cliente || !whatsapp || isNaN(valor) || !dataInput) {
        return alert("Preencha todos os campos!");
    }

    // B. Validação de Data (IMPEDE DATAS RETROATIVAS)
    const dataHoje = new Date().toISOString().split('T')[0];
    if (dataInput < dataHoje) {
        return alert("Erro: O vencimento não pode ser uma data que já passou.");
    }

    // C. Validação de Saldo
    if (valor > saldoGlobal) {
        return alert("Saldo insuficiente no capital disponível.");
    }

    // D. Preparação para o WhatsApp
    codigoGeradoLocal = Math.floor(100 + Math.random() * 900);
    const valorTotalComJuros = valor * taxaJurosGlobal;
    const valorParcela = valorTotalComJuros / parcelas;

    dadosTemporarios = { cliente, whatsapp, valor, valorParcela, parcelas, dataInput };

    const msg = `Olá ${cliente}, para validar seu empréstimo de R$ ${valor.toFixed(2)}, informe este código: *${codigoGeradoLocal}*\n\n` +
        `*DETALHES:* ${parcelas}x de R$ ${valorParcela.toFixed(2)} | Total: R$ ${valorTotalComJuros.toFixed(2)}`;

    // Abre o WhatsApp
    window.open(`https://wa.me/55${whatsapp}?text=${encodeURIComponent(msg)}`, '_blank');

    // Mostra o Modal de Validação
    document.getElementById('msg-validacao-whatsapp').innerHTML = `Enviamos um código para o WhatsApp de <b>${cliente}</b>.<br>Peça ao cliente e digite abaixo:`;
    modalValidacao.style.display = 'flex';
    inputCodigo.value = '';
    inputCodigo.focus();
};

// CONFIRMAÇÃO DO CÓDIGO (Continua igual, garantindo o funcionamento)
document.getElementById('btn-confirmar-codigo').onclick = () => {
    if (inputCodigo.value == codigoGeradoLocal) {
        processarSalvamento(dadosTemporarios);
        modalValidacao.style.display = 'none';
    } else {
        alert("Código incorreto!");
    }
};

// BOTÃO CANCELAR
document.getElementById('btn-cancelar-validacao').onclick = () => {
    modalValidacao.style.display = 'none';
};

// PROCESSAMENTO FINAL (Onde o card é criado)
function processarSalvamento(d) {
    saldoGlobal -= d.valor;
    atualizarDisplaySaldo();

    // Como bloqueamos data retroativa no início, aqui ele será sempre 'no-prazo'
    // Mas mantemos a lógica por segurança caso você mude a regra no futuro
    const dataHoje = new Date().toISOString().split('T')[0];
    const isAtrasado = d.dataInput < dataHoje;
    const classeStatus = isAtrasado ? 'em-atraso' : 'no-prazo';

    const novoCard = document.createElement('div');
    novoCard.className = `card-pagamento ${classeStatus} animar-entrada`;

    const dadosCard = {
        cliente: d.cliente,
        valorParcela: d.valorParcela,
        numParcelas: d.parcelas,
        whatsapp: d.whatsapp,
        dataVencimento: d.dataInput
    };

    novoCard.onclick = () => abrirModal(novoCard, dadosCard);

    novoCard.innerHTML = `
        <div class="pagamento-dados">
            <span class="pg-cliente">${d.cliente}</span>
            <span class="pg-valor">${d.valorParcela.toLocaleString('pt-br', { style: 'currency', currency: 'BRL' })} <small>(x${d.parcelas})</small></span>
        </div>
        <div class="pagamento-detalhes">
            <span class="pg-data" style="color: ${isAtrasado ? 'var(--corErro)' : 'var(--corSucesso)'}">
                Venc: ${d.dataInput.split('-').reverse().slice(0, 2).join('/')}
            </span>
            <span class="pg-parcela">Parc: 1/${d.parcelas}</span>
        </div>
    `;

    listaVencimentos.appendChild(novoCard);
    gerarComprovantePDF(dadosCard);

    // Limpa o formulário
    document.querySelectorAll('#section-cadastro input').forEach(i => i.value = '');
    document.getElementById('input-parcelas').value = '1';
    botoesMenu[0].click(); // Volta para a Home
}

// 6. GERADOR DE PDF
function gerarComprovantePDF(dados) {
    // PROTEÇÃO: Verifica se a biblioteca html2pdf foi carregada no index.html
    if (typeof html2pdf === 'undefined') {
        console.error("Biblioteca html2pdf não encontrada. Verifique o link no seu HTML.");
        alert("Empréstimo salvo com sucesso! (Apenas o recibo em PDF não pôde ser gerado pois a biblioteca não foi carregada).");
        return; // Sai da função sem travar o sistema
    }

    const elementoPDF = document.createElement('div');
    elementoPDF.style.padding = "40px";
    elementoPDF.style.fontFamily = "Arial, sans-serif";
    const totalComJuros = dados.valorParcela * dados.numParcelas;

    elementoPDF.innerHTML = `
        <div style="border: 2px solid #1a73e8; padding: 20px; border-radius: 10px;">
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
    `;

    const opt = {
        margin: 1,
        filename: `Recibo_${dados.cliente}.pdf`,
        image: { type: 'jpeg', quality: 0.98 },
        html2canvas: { scale: 2 },
        jsPDF: { unit: 'in', format: 'letter', orientation: 'portrait' }
    };

    // Tenta gerar o PDF
    try {
        html2pdf().set(opt).from(elementoPDF).save();
    } catch (err) {
        console.error("Erro ao gerar PDF:", err);
    }
}

// 7. NAVEGAÇÃO E INICIALIZAÇÃO
botoesMenu.forEach((btn, i) => {
    btn.onclick = () => {
        const ids = ['section-home', 'section-history', 'section-cadastro'];
        trocarSecao(ids[i]);
        botoesMenu.forEach(b => b.style.color = '#1a73e8');
        btn.style.color = '#1d5020';
    };
});

document.getElementById('btn-inserir-capital').onclick = () => {
    const v = parseFloat(document.getElementById('input-movimentar-valor').value);
    if (v > 0) { saldoGlobal += v; atualizarDisplaySaldo(); botoesMenu[0].click(); }
};
document.getElementById('btn-retirar-capital').onclick = () => {
    const v = parseFloat(document.getElementById('input-movimentar-valor').value);
    if (v > 0 && v <= saldoGlobal) { saldoGlobal -= v; atualizarDisplaySaldo(); botoesMenu[0].click(); }
};

document.getElementById('btn-voltar-home').onclick = () => botoesMenu[0].click();
btnFecharModal.onclick = () => { modal.style.display = 'none'; };

atualizarDisplaySaldo();
trocarSecao('section-home');

// CRIA UM ITEM NO HISTÓRICO PARA CADA PAGAMENTO FEITO
function registrarNoHistorico(cliente, qtd, valor, quitado) {
    if (listaHistorico.querySelector('p')) listaHistorico.innerHTML = '';

    const item = document.createElement('div');
    // Usamos a classe card-pagamento para manter o estilo, mas com ajustes
    item.className = 'card-pagamento card-historico animar-entrada';
    item.style.opacity = "1";
    item.style.filter = "none";
    item.style.cursor = "default";

    item.innerHTML = `
        <div class="pagamento-dados">
            <span class="pg-cliente">${cliente}</span>
            <span class="pg-valor" style="color:var(--corSucesso)">+ ${valor.toLocaleString('pt-br', { style: 'currency', currency: 'BRL' })}</span>
        </div>
        <div class="pagamento-detalhes">
            <span class="pago-status" style="background:${quitado ? '#d1e7dd' : '#fff3cd'}">
                ${quitado ? 'QUITAÇÃO' : 'PARCELA'}
            </span>
            <span style="font-size:0.7em; color:#666; margin-top:4px;">
                ${new Date().toLocaleDateString()} - ${qtd}x parc.
            </span>
        </div>
    `;
    listaHistorico.prepend(item);
}

// GERA O PDF ESPECÍFICO DE RECEBIMENTO
function gerarReciboPagamentoPDF(cliente, qtd, valor, restantes) {
    if (typeof html2pdf === 'undefined') return;

    const elemento = document.createElement('div');
    elemento.style.padding = "40px";
    elemento.style.fontFamily = "Arial, sans-serif";

    elemento.innerHTML = `
        <div style="border: 2px solid #28a745; padding: 20px; border-radius: 10px;">
            <h1 style="color: #28a745; text-align: center;">RECIBO DE PAGAMENTO</h1>
            <hr>
            <p><strong>Recebemos de:</strong> ${cliente}</p>
            <p><strong>Valor Pago:</strong> ${valor.toLocaleString('pt-br', { style: 'currency', currency: 'BRL' })}</p>
            <p><strong>Referente a:</strong> ${qtd} parcela(s)</p>
            <p><strong>Data:</strong> ${new Date().toLocaleString('pt-br')}</p>
            <br>
            <div style="background: #f8f9fa; padding: 15px; text-align: center; border-radius: 5px;">
                <strong>${restantes > 0 ? `Ainda restam ${restantes} parcelas para este empréstimo.` : "Empréstimo TOTALMENTE QUITADO. Obrigado!"}</strong>
            </div>
        </div>
    `;

    const opt = {
        margin: 1,
        filename: `Recibo_Pagamento_${cliente}_${Date.now()}.pdf`,
        image: { type: 'jpeg', quality: 0.98 },
        html2canvas: { scale: 2 },
        jsPDF: { unit: 'in', format: 'letter', orientation: 'portrait' }
    };

    html2pdf().set(opt).from(elemento).save();
}

// --- SCRIPT DE LIMPEZA SEGURA (ADICIONAL) ---
// Limpa o campo de capital ao clicar em Inserir ou Retirar
const limparCapital = () => {
    setTimeout(() => {
        const campo = document.getElementById('input-movimentar-valor');
        if (campo) campo.value = '';
    }, 100); // Aguarda 100ms para garantir que a conta foi feita antes de limpar
};

if(document.getElementById('btn-inserir-capital')) {
    document.getElementById('btn-inserir-capital').addEventListener('click', limparCapital);
}
if(document.getElementById('btn-retirar-capital')) {
    document.getElementById('btn-retirar-capital').addEventListener('click', limparCapital);
}
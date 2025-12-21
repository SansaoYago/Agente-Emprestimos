import { atualizarDisplaySaldo, addSaldo, subSaldo, addLucro, taxaJurosGlobal, setTaxaPercentual, isNegativado, saldoGlobal } from './app-state.js';
import { gerarComprovantePDF, gerarReciboPagamentoPDF } from './pdf.service.js';
import { adicionarABlackList } from './blacklist.js';

// SELEÇÃO DE ELEMENTOS
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

// Estado local
let cardEmEdicao = null;
let dadosEmEdicao = null;

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

// CONFIGURAÇÕES (JUROS)
const btnSalvarJuros = document.getElementById('btn-salvar-juros');
if (btnSalvarJuros) {
    btnSalvarJuros.onclick = () => {
        const novaTaxa = parseFloat(document.getElementById('input-taxa-juros').value);
        if (!isNaN(novaTaxa) && novaTaxa >= 0) {
            setTaxaPercentual(novaTaxa);
            alert(`Configurado: Juros de ${novaTaxa}% aplicados.`);
            botoesMenu[0].click();
        }
    };
}

// LÓGICA DO MODAL E RECEBIMENTOS
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

    let containerBlacklist = document.getElementById('container-blacklist-modal');
    if (!containerBlacklist) {
        containerBlacklist = document.createElement('div');
        containerBlacklist.id = 'container-blacklist-modal';
        containerBlacklist.style = "margin-top: 10px; display: flex; align-items: center; justify-content: center; gap: 8px; border-top: 1px solid #eee; padding-top: 10px;";

        containerBlacklist.innerHTML = `
            <input type="checkbox" id="check-blacklist-modal" style="accent-color: var(--corErro); cursor:pointer;">
            <label for="check-blacklist-modal" style="font-size: 0.8em; color: var(--corErro); font-weight: bold; cursor:pointer;">Negativar Cliente</label>
        `;

        btnExcluir.parentNode.appendChild(containerBlacklist);
    }

    const checkbox = document.getElementById('check-blacklist-modal');
    checkbox.checked = false;

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
        const displayTotalEl = document.getElementById('display-total-modal');
        if (displayTotalEl) displayTotalEl.innerHTML = `Valor a receber: <b style="color:var(--corSucesso); font-size: 1.2em;">${total.toLocaleString('pt-br', { style: 'currency', currency: 'BRL' })}</b>`;
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

    addLucro(lucroDestaOperacao);
    addSaldo(valorRecebido);

    const novaParcelaIndice = parcelaAtual + qtdSelecionada;
    const parcelasRestantes = dadosEmEdicao.numParcelas - (novaParcelaIndice - 1);

    registrarNoHistorico(dadosEmEdicao.cliente, qtdSelecionada, valorRecebido, novaParcelaIndice > dadosEmEdicao.numParcelas);
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

// SALVAR COM VALIDAÇÃO WHATSAPP
btnSalvar.onclick = () => {
    const cliente = document.getElementById('input-cliente').value;

    if (isNegativado(cliente)) {
        alert(`ACESSO NEGADO: O cliente ${cliente} está na Black List.`);
        return;
    }

    const whatsapp = document.getElementById('input-whatsapp').value;
    const valor = parseFloat(document.getElementById('input-valor').value);
    const dataInput = document.getElementById('input-data').value;
    const parcelas = parseInt(document.getElementById('input-parcelas').value) || 1;

    if (!cliente || !whatsapp || isNaN(valor) || !dataInput) {
        return alert('Preencha todos os campos!');
    }

    const dataHoje = new Date().toISOString().split('T')[0];
    if (dataInput < dataHoje) {
        return alert('Erro: O vencimento não pode ser uma data que já passou.');
    }

    // Bloqueia empréstimo se valor for maior que o saldo disponível
    if (valor > saldoGlobal) {
        return alert('Saldo insuficiente no capital disponível.');
    }

    const codigoGeradoLocal = Math.floor(100 + Math.random() * 900);
    const valorTotalComJuros = valor * taxaJurosGlobal;
    const valorParcela = valorTotalComJuros / parcelas;

    const dadosTemporarios = { cliente, whatsapp, valor, valorParcela, parcelas, dataInput };

    const msg = `Olá ${cliente}, para validar seu empréstimo de R$ ${valor.toFixed(2)}, informe este código: *${codigoGeradoLocal}*\n\n` +
        `*DETALHES:* ${parcelas}x de R$ ${valorParcela.toFixed(2)} | Total: R$ ${valorTotalComJuros.toFixed(2)}`;

    window.open(`https://wa.me/55${whatsapp}?text=${encodeURIComponent(msg)}`, '_blank');

    document.getElementById('msg-validacao-whatsapp').innerHTML = `Enviamos um código para o WhatsApp de <b>${cliente}</b>.<br>Peça ao cliente e digite abaixo:`;
    modalValidacao.style.display = 'flex';
    inputCodigo.value = '';
    inputCodigo.focus();

    modalValidacao.__codigoGerado = codigoGeradoLocal;
    modalValidacao.__dadosTemporarios = dadosTemporarios;
};

document.getElementById('btn-confirmar-codigo').onclick = () => {
    const expected = modalValidacao.__codigoGerado;
    if (inputCodigo.value == expected) {
        processarSalvamento(modalValidacao.__dadosTemporarios);
        modalValidacao.style.display = 'none';
    } else {
        alert('Código incorreto!');
    }
};

document.getElementById('btn-cancelar-validacao').onclick = () => { modalValidacao.style.display = 'none'; };

function processarSalvamento(d) {
    subSaldo(d.valor);
    atualizarDisplaySaldo();

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

    document.querySelectorAll('#section-cadastro input').forEach(i => i.value = '');
    document.getElementById('input-parcelas').value = '1';
    botoesMenu[0].click();
}

function registrarNoHistorico(cliente, qtd, valor, quitado) {
    if (listaHistorico.querySelector('p')) listaHistorico.innerHTML = '';

    const item = document.createElement('div');
    item.className = 'card-pagamento card-historico animar-entrada';
    item.style.opacity = '1';
    item.style.filter = 'none';
    item.style.cursor = 'default';

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

btnFecharModal.onclick = () => { modal.style.display = 'none'; };

atualizarDisplaySaldo();
trocarSecao('section-home');

// Footer buttons (navegação)
botoesMenu.forEach((btn, i) => {
    btn.onclick = () => {
        const ids = ['section-home', 'section-history', 'section-cadastro'];
        trocarSecao(ids[i]);
        botoesMenu.forEach(b => b.style.color = '#1a73e8');
        btn.style.color = '#1d5020';
    };
});

// Inserir / Retirar capital
const btnInserir = document.getElementById('btn-inserir-capital');
const btnRetirar = document.getElementById('btn-retirar-capital');
if (btnInserir) {
    btnInserir.onclick = () => {
        const v = parseFloat(document.getElementById('input-movimentar-valor').value);
        if (v > 0) { addSaldo(v); document.getElementById('input-movimentar-valor').value = ''; botoesMenu[0].click(); }
    };
}
if (btnRetirar) {
    btnRetirar.onclick = () => {
        const v = parseFloat(document.getElementById('input-movimentar-valor').value);
        if (v > 0 && v <= saldoGlobal) { subSaldo(v); document.getElementById('input-movimentar-valor').value = ''; botoesMenu[0].click(); }
        else if (v > saldoGlobal) alert('Saldo insuficiente no capital disponível.');
    };
}

// Privacidade
const btnPrivacidade = document.getElementById('btn-privacidade');
const valorCapital = document.querySelector('.valor-capital');

btnPrivacidade.onclick = () => {
    valorCapital.classList.toggle('ocultar-capital');
    const estaOculto = valorCapital.classList.contains('ocultar-capital');
    btnPrivacidade.textContent = estaOculto ? 'visibility_off' : 'visibility';
    localStorage.setItem('privacidadeSaldo', estaOculto);
};

function carregarPreferenciaPrivacidade() {
    const salvoOculto = localStorage.getItem('privacidadeSaldo');
    if (salvoOculto === 'true') {
        valorCapital.classList.add('ocultar-capital');
        btnPrivacidade.textContent = 'visibility_off';
    }
}

carregarPreferenciaPrivacidade();

// Expõe funções/variáveis usadas por handlers inline no HTML
window.abrirOpcaoConfig = abrirOpcaoConfig;
window.botoesMenu = botoesMenu;


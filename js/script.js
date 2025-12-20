// 1. SELEÇÃO DE ELEMENTOS
const botoesMenu = document.querySelectorAll('footer nav .material-symbols-outlined');
const seccoes = document.querySelectorAll('.content-section');
const btnSalvar = document.getElementById('btn-salvar');
const listaVencimentos = document.getElementById('lista-vencimentos');
const listaHistorico = document.getElementById('lista-historico');
const campoSaldoVisivel = document.querySelector('.valor-capital');

const modal = document.getElementById('modal-pagamento');
const modalInfo = document.getElementById('modal-info');
const selectParcelas = document.getElementById('select-qtd-parcelas');
const btnConfirmarPg = document.getElementById('btn-confirmar-pagamento');
const btnFecharModal = document.getElementById('btn-fechar-modal');

let cardEmEdicao = null;
let dadosEmEdicao = null;
let saldoGlobal = 5000.00;

// 2. UTILITÁRIOS
function atualizarDisplaySaldo() {
    campoSaldoVisivel.textContent = saldoGlobal.toLocaleString('pt-br', { style: 'currency', currency: 'BRL' });
}

function trocarSecao(idAlvo) {
    seccoes.forEach(sec => sec.style.display = 'none');
    const seccaoAtiva = document.getElementById(idAlvo);
    if (seccaoAtiva) {
        seccaoAtiva.style.display = 'flex';
        setTimeout(() => seccaoAtiva.classList.add('animar-entrada'), 10);
    }
}

// 3. LÓGICA DO MODAL (COM VALOR DINÂMICO E EXCLUIR)
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

    // Botão de Excluir (Caso tenha cadastrado errado)
    let btnExcluir = document.getElementById('btn-excluir-emprestimo');
    if (!btnExcluir) {
        btnExcluir = document.createElement('button');
        btnExcluir.id = 'btn-excluir-emprestimo';
        btnExcluir.innerHTML = '<span class="material-symbols-outlined" style="font-size:18px; vertical-align:middle;">delete</span> Excluir Registro';
        btnExcluir.style = "background:none; border:none; color:var(--corErro); cursor:pointer; margin-top:15px; font-size:0.8em; width:100%;";
        modal.querySelector('div').appendChild(btnExcluir);
        
        btnExcluir.onclick = () => {
            if(confirm("Deseja apagar este registro permanentemente?\nO valor original NÃO retornará ao saldo automaticamente.")) {
                cardEmEdicao.remove();
                modal.style.display = 'none';
            }
        };
    }

    modalInfo.innerHTML = `Cliente: <b>${dados.cliente}</b><br>Valor unitário: ${dados.valorParcela.toLocaleString('pt-br',{style:'currency',currency:'BRL'})}`;
    
    selectParcelas.innerHTML = '';
    for (let i = 1; i <= parcelasRestantes; i++) {
        const opt = document.createElement('option');
        opt.value = i;
        opt.textContent = i === parcelasRestantes && i > 1 ? `Quitar tudo (${i} parcelas)` : `${i} parcela(s)`;
        selectParcelas.appendChild(opt);
    }

    selectParcelas.value = "1";

    const atualizarValorTotalUI = () => {
        const qtd = parseInt(selectParcelas.value);
        const total = dados.valorParcela * qtd;
        displayTotal.innerHTML = `Valor a receber: <b style="color:var(--corSucesso); font-size: 1.2em;">${total.toLocaleString('pt-br',{style:'currency',currency:'BRL'})}</b>`;
    };

    atualizarValorTotalUI();
    selectParcelas.onchange = atualizarValorTotalUI;
    modal.style.display = 'flex';
}

btnFecharModal.onclick = () => { modal.style.display = 'none'; };

btnConfirmarPg.onclick = () => {
    const qtdSelecionada = parseInt(selectParcelas.value);
    const spanParc = cardEmEdicao.querySelector('.pg-parcela');
    let parcelaAtual = parseInt(spanParc.textContent.split(':')[1].trim().split('/')[0]);

    saldoGlobal += (dadosEmEdicao.valorParcela * qtdSelecionada);
    atualizarDisplaySaldo();

    const novaParcelaIndice = parcelaAtual + qtdSelecionada;

    if (novaParcelaIndice > dadosEmEdicao.numParcelas) {
        finalizarCard(cardEmEdicao);
    } else {
        spanParc.textContent = `Parc: ${novaParcelaIndice}/${dadosEmEdicao.numParcelas}`;
        alert(`Recebido ${qtdSelecionada} parcela(s).`);
    }
    modal.style.display = 'none';
};

function finalizarCard(card) {
    card.classList.remove('no-prazo');
    card.classList.add('card-historico');
    card.onclick = null;
    const detalhes = card.querySelector('.pagamento-detalhes');
    detalhes.innerHTML = `<span class="pago-status">QUITADO</span>` + detalhes.innerHTML;
    if (listaHistorico.querySelector('p')) listaHistorico.innerHTML = '';
    listaHistorico.prepend(card);
}

// 4. SALVAR EMPRÉSTIMO COM VALIDAÇÃO (VERSÃO BLOQUEIO TOTAL)
btnSalvar.onclick = () => {
    const cliente = document.getElementById('input-cliente').value;
    const valor = parseFloat(document.getElementById('input-valor').value);
    const dataInput = document.getElementById('input-data').value;
    const parcelas = parseInt(document.getElementById('input-parcelas').value) || 1;

    // Validação de campos vazios
    if (!cliente || isNaN(valor) || !dataInput) {
        return alert("Preencha todos os campos!");
    }

    // --- VALIDAÇÃO DE DATA (BLOQUEIO) ---
    const hoje = new Date();
    hoje.setHours(0, 0, 0, 0);
    const dataEscolhida = new Date(dataInput + "T00:00:00");

    if (dataEscolhida < hoje) {
        // Aqui ele apenas avisa e interrompe o salvamento
        alert("Erro: Não é permitido registrar pagamentos com datas passadas.");
        return; // O código para aqui e não salva o card
    }
    // -------------------------------------

    saldoGlobal -= valor;
    atualizarDisplaySaldo();

    const valorParcela = (valor * 1.30) / parcelas;
    const dados = { cliente, valorParcela, numParcelas: parcelas };

    const novoCard = document.createElement('div');
    novoCard.className = 'card-pagamento no-prazo animar-entrada';
    novoCard.onclick = () => abrirModal(novoCard, dados);
    
    novoCard.innerHTML = `
        <div class="pagamento-dados">
            <span class="pg-cliente">${cliente}</span>
            <span class="pg-valor">${valorParcela.toLocaleString('pt-br',{style:'currency',currency:'BRL'})} <small>(x${parcelas})</small></span>
        </div>
        <div class="pagamento-detalhes">
            <span class="pg-data">Venc: ${dataInput.split('-').reverse().slice(0,2).join('/')}</span>
            <span class="pg-parcela">Parc: 1/${parcelas}</span>
        </div>
    `;

    listaVencimentos.appendChild(novoCard);
    document.querySelectorAll('#section-cadastro input').forEach(i => i.value = '');
    document.getElementById('input-parcelas').value = '1';
    botoesMenu[0].click();
};

// 5. NAVEGAÇÃO E MOVIMENTAÇÃO
botoesMenu.forEach((btn, i) => {
    btn.onclick = () => {
        const ids = ['section-home', 'section-history', 'section-cadastro'];
        trocarSecao(ids[i]);
        botoesMenu.forEach(b => b.style.color = '#1a73e8');
        btn.style.color = '#1d5020';
    };
});

document.getElementById('btn-config-topo').onclick = () => trocarSecao('section-config');
document.getElementById('btn-voltar-home').onclick = () => botoesMenu[0].click();

document.getElementById('btn-inserir-capital').onclick = () => {
    const v = parseFloat(document.getElementById('input-movimentar-valor').value);
    if(v > 0) { saldoGlobal += v; atualizarDisplaySaldo(); botoesMenu[0].click(); }
};
document.getElementById('btn-retirar-capital').onclick = () => {
    const v = parseFloat(document.getElementById('input-movimentar-valor').value);
    if(v > 0 && v <= saldoGlobal) { saldoGlobal -= v; atualizarDisplaySaldo(); botoesMenu[0].click(); }
};

atualizarDisplaySaldo();
trocarSecao('section-home');
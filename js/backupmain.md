import { supabase } from './supabase-client.js';
import { monitorarAutenticacao, sairDoSistema } from './auth.js';
import { atualizarDisplaySaldo, addSaldo, subSaldo, addLucro, taxaJurosGlobal, setTaxaPercentual, isNegativado, saldoGlobal, emprestimosAtivos, adicionarMeses, calcularDiasAtraso, calcularValorComJuros, setTaxaAtrasoPercentual } from './app-state.js';
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
        // Captura a taxa padrão (30%)
        const novaTaxaPadrao = parseFloat(document.getElementById('input-taxa-juros').value);
        // Captura a taxa de atraso (0.1%)
        const novaTaxaAtraso = parseFloat(document.getElementById('input-taxa-atraso').value);

        if (!isNaN(novaTaxaPadrao) && !isNaN(novaTaxaAtraso)) {
            setTaxaPercentual(novaTaxaPadrao);
            // Chama a nova função do app-state
            setTaxaAtrasoPercentual(novaTaxaAtraso);

            alert(`Configurado com sucesso!\nJuros Padrão: ${novaTaxaPadrao}%\nMulta Diária: ${novaTaxaAtraso}%`);
            botoesMenu[0].click(); // Volta para a home
        } else {
            alert("Por favor, insira valores válidos.");
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
    const diasAtraso = calcularDiasAtraso(dados.dataVencimento);
    const valorOriginal = dados.valorRestanteParcelaAtual || dados.valorParcela;
    const valorAtualizado = calcularValorComJuros(valorOriginal, diasAtraso);
    const jurosCobrados = valorAtualizado - valorOriginal;

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
        btnExcluir.onclick = async () => {
            if (confirm("Deseja apagar este registro permanentemente?")) {
                // REMOVE DO SUPABASE
                const { error } = await supabase
                    .from('emprestimos')
                    .delete()
                    .eq('id', dadosEmEdicao.id); // Usa o ID único do banco

                if (error) {
                    alert("Erro ao excluir do banco: " + error.message);
                } else {
                    // Se deu certo no banco, remove do Array local
                    const index = emprestimosAtivos.indexOf(dadosEmEdicao);
                    if (index > -1) emprestimosAtivos.splice(index, 1);

                    modal.style.display = 'none';
                    renderizarListaVencimentos();
                }
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

    let htmlJuros = "";
    if (diasAtraso > 0) {
        htmlJuros = `
            <div style="color:var(--corErro); font-size:0.85em; margin-top:5px;">
                ⚠️ <b>Atraso de ${diasAtraso} dias</b><br>
                Juros acumulados: ${jurosCobrados.toLocaleString('pt-br', { style: 'currency', currency: 'BRL' })}
            </div>
        `;
    }

    modalInfo.innerHTML = `
        Cliente: <b>${dados.cliente}</b><br>
        Valor Original: ${valorOriginal.toLocaleString('pt-br', { style: 'currency', currency: 'BRL' })}
        ${htmlJuros}
    `;

    selectParcelas.innerHTML = '';
    for (let i = 1; i <= parcelasRestantes; i++) {
        const opt = document.createElement('option');
        opt.value = i;
        opt.textContent = i === parcelasRestantes && i > 1 ? `Quitar tudo (${i} parcelas)` : `${i} parcela(s)`;
        selectParcelas.appendChild(opt);
    }

    const atualizarValorTotalUI = () => {
        const qtd = parseInt(selectParcelas.value);
        const total = (qtd === 1) ? valorAtualizado : (valorAtualizado + (dados.valorParcela * (qtd - 1)));

        const displayTotalEl = document.getElementById('display-total-modal');
        if (displayTotalEl) {
            displayTotalEl.innerHTML = `Valor total com juros: <b style="color:var(--corSucesso); font-size: 1.2em;">${total.toLocaleString('pt-br', { style: 'currency', currency: 'BRL' })}</b>`;
            // Guardamos o valor com juros para o momento de confirmar
            displayTotalEl.dataset.valorComJuros = total;
        }
    };
    atualizarValorTotalUI();
    selectParcelas.onchange = atualizarValorTotalUI;
    modal.style.display = 'flex';
}

btnConfirmarPg.onclick = () => {
    const qtdSelecionada = parseInt(selectParcelas.value);
    const displayTotalEl = document.getElementById('display-total-modal');

    // Pegamos o valor final calculado (que já inclui juros de atraso se houver)
    const valorComJurosTotal = parseFloat(displayTotalEl.dataset.valorComJuros);

    // Calculamos quanto desse valor é "multa/atraso" e quanto é "operação normal"
    const valorSemJurosAtraso = dadosEmEdicao.valorParcela * qtdSelecionada;
    const jurosDeAtraso = Math.max(0, valorComJurosTotal - valorSemJurosAtraso);

    // 1. Cálculo do Lucro Total desta transação:
    // (Lucro da taxa de 30% sobre o valor base) + (Juros de atraso integrais)
    const proporcaoJurosNormal = (taxaJurosGlobal - 1) / taxaJurosGlobal;
    const lucroNormalOperacao = valorSemJurosAtraso * proporcaoJurosNormal;
    const lucroTotalTransacao = lucroNormalOperacao + jurosDeAtraso;

    // ATUALIZAÇÃO ÚNICA (Corrigindo a duplicidade anterior)
    addLucro(lucroTotalTransacao);
    addSaldo(valorComJurosTotal);

    // 2. Atualiza os dados do empréstimo
    dadosEmEdicao.parcelaAtual += qtdSelecionada;
    dadosEmEdicao.dataVencimento = adicionarMeses(dadosEmEdicao.dataVencimento, qtdSelecionada);

    // Reseta o valor restante caso tenha tido parcial antes
    dadosEmEdicao.valorRestanteParcelaAtual = dadosEmEdicao.valorParcela;

    // ATUALIZA NO BANCO DE DADOS
    const { error } = await supabase
        .from('emprestimos')
        .update({
            parcela_atual: dadosEmEdicao.parcelaAtual,
            data_vencimento: dadosEmEdicao.dataVencimento,
            valor_restante_parcela_atual: dadosEmEdicao.valorRestanteParcelaAtual
        })
        .eq('id', dadosEmEdicao.id);

    if (error) console.error("Erro ao atualizar banco:", error.message);

    // 3. Registros e PDFs
    registrarNoHistorico(dadosEmEdicao.cliente, qtdSelecionada, valorComJurosTotal, dadosEmEdicao.parcelaAtual > dadosEmEdicao.numParcelas);
    gerarReciboPagamentoPDF(dadosEmEdicao.cliente, qtdSelecionada, valorComJurosTotal, (dadosEmEdicao.numParcelas - dadosEmEdicao.parcelaAtual + 1));

    // 4. Finalização
    if (dadosEmEdicao.parcelaAtual > dadosEmEdicao.numParcelas) {
        const index = emprestimosAtivos.indexOf(dadosEmEdicao);
        if (index > -1) emprestimosAtivos.splice(index, 1);
        finalizarCard(cardEmEdicao);
    }

    modal.style.display = 'none';
    renderizarListaVencimentos();
};

function renderizarListaVencimentos() {
    const listaVencimentos = document.getElementById('lista-vencimentos');
    listaVencimentos.innerHTML = ''; // Limpa a lista atual

    // ORDENAÇÃO: Mais antigos (atrasados) primeiro
    emprestimosAtivos.sort((a, b) => new Date(a.dataVencimento) - new Date(b.dataVencimento));

    emprestimosAtivos.forEach(dados => {
        const dataHoje = new Date().toISOString().split('T')[0];
        const isAtrasado = dados.dataVencimento < dataHoje;
        const classeStatus = isAtrasado ? 'em-atraso' : 'no-prazo';

        const saldoPendente = dados.valorRestanteParcelaAtual || dados.valorParcela;
        const infoParcial = saldoPendente < dados.valorParcela ? `<br><small style="color:var(--corErro)">Falta: R$ ${saldoPendente.toFixed(2)}</small>` : '';

        const novoCard = document.createElement('div');
        novoCard.className = `card-pagamento ${classeStatus}`;

        // Importante: vincular os dados ao card para o modal
        novoCard.onclick = () => abrirModal(novoCard, dados);

        novoCard.innerHTML = `
            <div class="pagamento-dados">
                <span class="pg-cliente">${dados.cliente}</span>
                <span class="pg-valor">${dados.valorParcela.toLocaleString('pt-br', { style: 'currency', currency: 'BRL' })} <small>(x${dados.numParcelas})</small>${infoParcial}</span>
            </div>
            <div class="pagamento-detalhes">
                <span class="pg-data" style="color: ${isAtrasado ? 'var(--corErro)' : 'var(--corSucesso)'}">
                    Venc: ${dados.dataVencimento.split('-').reverse().slice(0, 2).join('/')}
                </span>
                <span class="pg-parcela">Parc: ${dados.parcelaAtual}/${dados.numParcelas}</span>
            </div>
        `;
        listaVencimentos.appendChild(novoCard);
    });
}

// Seleção de novos elementos
const modalParcial = document.getElementById('modal-parcial');
const btnAbrirParcial = document.getElementById('btn-abrir-parcial');
const btnConfirmarParcial = document.getElementById('btn-confirmar-parcial');
const btnFecharParcial = document.getElementById('btn-fechar-parcial');
const inputValorParcial = document.getElementById('input-valor-parcial');
const checkAlterarData = document.getElementById('check-alterar-data');

// Abrir o modal secundário
btnAbrirParcial.onclick = () => {
    // Sugere o valor que falta no input
    inputValorParcial.value = (dadosEmEdicao.valorRestanteParcelaAtual || dadosEmEdicao.valorParcela).toFixed(2);
    modalParcial.style.display = 'flex';
};

// Fechar modal secundário
btnFecharParcial.onclick = () => modalParcial.style.display = 'none';

// Lógica do Pagamento Parcial
btnConfirmarParcial.onclick = () => {
    const valorPago = parseFloat(inputValorParcial.value);
    const saldoAtualParcela = dadosEmEdicao.valorRestanteParcelaAtual || dadosEmEdicao.valorParcela;

    if (isNaN(valorPago) || valorPago <= 0 || valorPago > saldoAtualParcela) {
        return alert("Valor inválido ou maior que o saldo da parcela.");
    }

    // 1. Processar Financeiro
    const proporcaoJuros = (taxaJurosGlobal - 1) / taxaJurosGlobal;
    const lucroDestaOperacao = valorPago * proporcaoJuros;
    addLucro(lucroDestaOperacao);
    addSaldo(valorPago);

    // 2. Atualizar Saldo da Parcela
    dadosEmEdicao.valorRestanteParcelaAtual = saldoAtualParcela - valorPago;

    // 3. Verificar se a parcela foi quitada via parcial
    if (dadosEmEdicao.valorRestanteParcelaAtual <= 0.01) { // margem de erro de centavos
        dadosEmEdicao.parcelaAtual += 1;
        dadosEmEdicao.dataVencimento = adicionarMeses(dadosEmEdicao.dataVencimento, 1);
        dadosEmEdicao.valorRestanteParcelaAtual = dadosEmEdicao.valorParcela; // reseta para a próxima
    } else {
        // Se NÃO quitou e o checkbox está marcado, pergunta a nova data
        if (checkAlterarData.checked) {
            const novaData = prompt("Digite a nova data para o restante (AAAA-MM-DD):", dadosEmEdicao.dataVencimento);
            if (novaData) dadosEmEdicao.dataVencimento = novaData;
        }
    }

    // 4. Histórico e Recibo
    registrarNoHistorico(`${dadosEmEdicao.cliente} (Parcial)`, 0, valorPago, false);

    const { error: errorParcial } = await supabase
        .from('emprestimos')
        .update({
            parcela_atual: dadosEmEdicao.parcelaAtual,
            data_vencimento: dadosEmEdicao.dataVencimento,
            valor_restante_parcela_atual: dadosEmEdicao.valorRestanteParcelaAtual
        })
        .eq('id', dadosEmEdicao.id);

    if (errorParcial) console.error("Erro ao atualizar parcial no banco:", errorParcial.message);

    // Alterado aqui: Enviamos uma mensagem clara sobre o saldo restante para o PDF
    const msgRestante = `SALDO PENDENTE NESTA PARCELA: ${dadosEmEdicao.valorRestanteParcelaAtual.toLocaleString('pt-br', { style: 'currency', currency: 'BRL' })}`;
    gerarReciboPagamentoPDF(dadosEmEdicao.cliente, 0, valorPago, msgRestante);

    // 5. Finalizar
    modalParcial.style.display = 'none';
    modal.style.display = 'none';
    renderizarListaVencimentos();
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

// 1. IMPORTA AS NOVAS FUNÇÕES DE SETTER (Atualize a linha de import do app-state no topo!)
import { ..., setSaldoGlobal, setLucroTotal } from './app-state.js'; 

// 2. FUNÇÃO PARA CARREGAR SALDO E TAXAS DO BANCO
async function carregarConfiguracoes() {
    try {
        const { data: { user } } = await supabase.auth.getUser();
        
        let { data, error } = await supabase
            .from('configuracoes')
            .select('*')
            .single();

        // Se não existir configuração para este usuário, criamos uma inicial
        if (error && error.code === 'PGRST116') {
            const { data: novaConfig, error: erroCriar } = await supabase
                .from('configuracoes')
                .insert([{ user_id: user.id, saldo_global: 5000, lucro_total: 0 }])
                .select()
                .single();
            data = novaConfig;
        }

        if (data) {
            setSaldoGlobal(parseFloat(data.saldo_global));
            setLucroTotal(parseFloat(data.lucro_total));
            setTaxaPercentual((data.taxa_juros_padrao - 1) * 100);
            setTaxaAtrasoPercentual(data.taxa_juros_atraso * 100);
        }
    } catch (err) {
        console.error("Erro ao carregar configurações:", err);
    }
}

// 3. FUNÇÃO PARA CARREGAR EMPRÉSTIMOS (APENAS UMA VERSÃO AQUI)
async function carregarDadosDoBanco() {
    try {
        const { data: emprestimos, error } = await supabase
            .from('emprestimos')
            .select('*')
            .order('data_vencimento', { ascending: true });

        if (error) throw error;

        emprestimosAtivos.length = 0;
        emprestimos.forEach(emp => {
            emprestimosAtivos.push({
                ...emp,
                numParcelas: emp.num_parcelas,
                parcelaAtual: emp.parcela_atual,
                valorRestanteParcelaAtual: parseFloat(emp.valor_restante_parcela_atual)
            });
        });

        renderizarListaVencimentos();
    } catch (error) {
        console.error("Erro ao carregar dados:", error);
    }
}

// 4. INICIALIZAÇÃO DO SISTEMA
monitorarAutenticacao(async (usuario) => {
    console.log("Logado como:", usuario.email);
    
    // Agora o sistema carrega TUDO do banco ao iniciar
    await carregarConfiguracoes();
    await carregarDadosDoBanco();
});

// window.sairDoSistema = sairDoSistema;

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

async function processarSalvamento(d) {
    try {
        // 1. Pegamos o usuário logado
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return alert("Erro: Usuário não autenticado.");

        // 2. Preparamos o objeto para o Banco de Dados
        const novoEmprestimo = {
            user_id: user.id,
            cliente: d.cliente,
            whatsapp: d.whatsapp,
            valor_total: d.valor,
            valor_parcela: d.valorParcela,
            num_parcelas: d.parcelas,
            parcela_atual: 1,
            data_vencimento: d.dataInput,
            valor_restante_parcela_atual: d.valorParcela
        };

        // 3. Enviamos para a tabela 'emprestimos' do Supabase
        const { error } = await supabase.from('emprestimos').insert([novoEmprestimo]);

        if (error) throw error;

        // 4. Se deu certo, atualizamos o saldo localmente
        subSaldo(d.valor);
        atualizarDisplaySaldo();

        alert('Empréstimo salvo com sucesso no banco de dados!');

        // 5. Atualiza a lista e limpa o formulário
        document.querySelectorAll('#section-cadastro input').forEach(i => i.value = '');
        botoesMenu[0].click();

    } catch (error) {
        console.error("Erro ao salvar:", error);
        alert("Erro ao salvar no banco: " + error.message);
    }
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

async function carregarDadosDoBanco() {
    try {
        // Busca apenas os empréstimos do usuário logado
        const { data: emprestimos, error } = await supabase
            .from('emprestimos')
            .select('*')
            .order('data_vencimento', { ascending: true });

        if (error) throw error;

        // Limpa a lista local e preenche com o que veio do banco
        emprestimosAtivos.length = 0;
        emprestimos.forEach(emp => {
            // Ajuste caso os nomes das colunas no banco sejam um pouco diferentes do JS
            emprestimosAtivos.push({
                ...emp,
                numParcelas: emp.num_parcelas, // Mapeia colunas do banco para o seu código antigo
                parcelaAtual: emp.parcela_atual,
                valorRestanteParcelaAtual: emp.valor_restante_parcela_atual
            });
        });

        renderizarListaVencimentos();
    } catch (error) {
        console.error("Erro ao carregar dados:", error);
    }
}

// Chame a função de teste
// O sistema só inicia de verdade aqui
monitorarAutenticacao((usuario) => {
    console.log("Logado como:", usuario.email);


    carregarDadosDoBanco();

    atualizarDisplaySaldo();
});

// Adicione um botão de logout no seu header se quiser testar o "Sair"
// window.sairDoSistema = sairDoSistema;
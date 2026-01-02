// ==========================================================
// app-state.js - ESTADO CENTRALIZADO REVISADO
// ==========================================================

export let emprestimosAtivos = [];
export let lucroTotal = 0.00;
export let saldoGlobal = 0;
export let taxaJurosGlobal = 1.30;
export let taxaJurosAtrasoCid = 0.001;
export let listaNegativadosGlobal = [];

/**
 * Atualiza a interface respeitando a regra de privacidade [2025-12-21]
 */
export function atualizarDisplaySaldo() {
    const campoSaldoVisivel = document.querySelector('.valor-capital');
    const campoLucro = document.getElementById('valor-lucro-acumulado');
    
    // Verifica a preferência de privacidade salva no Local Storage [2025-12-21]
    const capitalOculto = localStorage.getItem('privacidadeSaldo') === 'true';

    if (campoSaldoVisivel) {
        if (capitalOculto) {
            campoSaldoVisivel.textContent = 'R$ ••••••';
        } else {
            campoSaldoVisivel.textContent = saldoGlobal.toLocaleString('pt-br', { style: 'currency', currency: 'BRL' });
        }
    }

    if (campoLucro) {
        if (capitalOculto) {
            campoLucro.textContent = 'R$ ••••••';
        } else {
            campoLucro.textContent = lucroTotal.toLocaleString('pt-br', { style: 'currency', currency: 'BRL' });
        }
    }
}

export function addSaldo(valor) { 
    const v = parseFloat(valor) || 0;
    saldoGlobal += v; 
    atualizarDisplaySaldo(); 
}
export function subSaldo(valor) { 
    const v = parseFloat(valor) || 0;
    saldoGlobal -= v; 
    atualizarDisplaySaldo(); 
}

export function addLucro(valor) { 
    const v = parseFloat(valor) || 0;
    lucroTotal += v; 
    atualizarDisplaySaldo(); 
}

// Seters de Taxa
export function setTaxaMultiplicador(mult) { taxaJurosGlobal = mult; }
export function setTaxaPercentual(pct) { taxaJurosGlobal = 1 + (pct / 100); }
export function setTaxaAtrasoPercentual(pct) { taxaJurosAtrasoCid = pct / 100; }

// Negativação
export function isNegativado(nome) {
    return listaNegativadosGlobal.some(n => n.toLowerCase() === nome.toLowerCase());
}

export function pushNegativado(nome) {
    if (!listaNegativadosGlobal.includes(nome)) {
        listaNegativadosGlobal.push(nome);
    }
}

export function removerNegativado(nome) {
    listaNegativadosGlobal = listaNegativadosGlobal.filter(n => n.toLowerCase() !== nome.toLowerCase());
}

// Helpers de Data e Cálculos
export function adicionarMeses(dataString, meses) {
    const data = new Date(dataString + 'T00:00:00');
    data.setMonth(data.getMonth() + meses);
    return data.toISOString().split('T')[0];
}

export function calcularDiasAtraso(dataVencimento) {
    const venc = new Date(dataVencimento + 'T00:00:00');
    const hoje = new Date();
    hoje.setHours(0, 0, 0, 0);
    const diferencaEmMs = hoje - venc;
    const dias = Math.floor(diferencaEmMs / (1000 * 60 * 60 * 24));
    return dias > 0 ? dias : 0;
}

export function calcularValorComJuros(valorBase, dias) {
    if (dias <= 0) return valorBase;
    return valorBase * Math.pow((1 + taxaJurosAtrasoCid), dias);
}

// Seters Globais (Usados na carga do banco)
export function setSaldoGlobal(valor) { 
    saldoGlobal = parseFloat(valor) || 0; 
    atualizarDisplaySaldo(); 
}

export function setLucroTotal(valor) { 
    lucroTotal = parseFloat(valor) || 0; 
    atualizarDisplaySaldo(); 
}
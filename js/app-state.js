// Estado compartilhado e helpers de estado
export let lucroTotal = 0.00;
export let saldoGlobal = 5000;
export let taxaJurosGlobal = 1.30; // multiplicador (1.30 = +30%)
export let listaNegativadosGlobal = [];

export function atualizarDisplaySaldo() {
    const campoSaldoVisivel = document.querySelector('.valor-capital');
    if (campoSaldoVisivel) campoSaldoVisivel.textContent = saldoGlobal.toLocaleString('pt-br', { style: 'currency', currency: 'BRL' });
    const campoLucro = document.getElementById('valor-lucro-acumulado');
    if (campoLucro) campoLucro.textContent = lucroTotal.toLocaleString('pt-br', { style: 'currency', currency: 'BRL' });
}

export function addSaldo(valor) { saldoGlobal += valor; atualizarDisplaySaldo(); }
export function subSaldo(valor) { saldoGlobal -= valor; atualizarDisplaySaldo(); }
export function addLucro(valor) { lucroTotal += valor; atualizarDisplaySaldo(); }
export function setTaxaMultiplicador(mult) { taxaJurosGlobal = mult; }
export function setTaxaPercentual(pct) { taxaJurosGlobal = 1 + (pct / 100); }

export function isNegativado(nome) {
    return listaNegativadosGlobal.some(n => n.toLowerCase() === nome.toLowerCase());
}

export function pushNegativado(nome) {
    if (!listaNegativadosGlobal.includes(nome)) listaNegativadosGlobal.push(nome);
}

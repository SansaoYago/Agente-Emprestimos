import { pushNegativado } from './app-state.js';

export function adicionarABlackList(nome, whatsapp) {
    pushNegativado(nome);

    const listaUI = document.getElementById('lista-negativados');
    if (!listaUI) return;

    if (listaUI.innerText.includes('Nenhum') || listaUI.querySelector('p')) {
        listaUI.innerHTML = '';
    }

    const item = document.createElement('div');
    item.className = 'card-pagamento em-atraso animar-entrada';
    item.style = 'cursor: default; width: 100%; display: flex; justify-content: space-between; align-items: center; margin-bottom: 10px; background: white; padding: 15px; border-radius: 12px; border-left: 5px solid var(--corErro);';

    item.innerHTML = `
        <div class="pagamento-dados">
            <span class="pg-cliente" style="font-weight:bold; display:block;">${nome}</span>
            <span style="font-size:0.8em; color:#666;">WhatsApp: ${whatsapp}</span>
        </div>
        <span class="material-symbols-outlined" style="color:var(--corErro)">block</span>
    `;

    listaUI.prepend(item);
}

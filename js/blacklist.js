import { pushNegativado, removerNegativado } from './app-state.js';
import { supabase } from './supabase-client.js';

/**
 * Adiciona um cliente à Blacklist (Interface, Memória e Banco)
 */
export async function adicionarABlackList(nome, whatsapp) {
    // 1. Garante que está na memória RAM (para bloqueio imediato)
    pushNegativado(nome);

    // 2. Tenta salvar no banco de dados (para persistência)
    try {
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
            // Verifica se já existe para não duplicar no banco
            const { data: existente } = await supabase
                .from('blacklist')
                .select('id')
                .eq('nome', nome)
                .maybeSingle();

            if (!existente) {
                await supabase.from('blacklist').insert([
                    { user_id: user.id, nome: nome, whatsapp: whatsapp }
                ]);
            }
        }
    } catch (err) {
        console.error("Erro ao persistir na Black List:", err);
    }

    // 3. Lógica de Interface (UI)
    const listaUI = document.getElementById('lista-negativados');
    if (!listaUI) return;

    // Limpa mensagem de "Nenhum" se existir
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
        <span class="btn-desbloquear material-symbols-outlined" 
              style="color:var(--corErro); cursor:pointer; user-select:none; font-size: 24px;" 
              title="Remover da Blacklist">block</span>
    `;

    // 4. Funcionalidade de Clique para Desbloquear
    const btnDesbloquear = item.querySelector('.btn-desbloquear');
    btnDesbloquear.onclick = async () => {
        const confirmar = confirm(`Deseja remover ${nome} da Blacklist e permitir novos empréstimos?`);
        
        if (confirmar) {
            try {
                // Remove do Supabase
                const { error } = await supabase
                    .from('blacklist')
                    .delete()
                    .eq('nome', nome);

                if (error) throw error;

                // Remove do Array Global (RAM)
                removerNegativado(nome);

                // Efeito visual de saída
                item.style.transition = '0.3s';
                item.style.opacity = '0';
                item.style.transform = 'translateX(20px)';
                
                setTimeout(() => {
                    item.remove();
                    // Se a lista ficar vazia, poderia colocar a mensagem de "Nenhum" aqui
                }, 300);

            } catch (err) {
                console.error("Erro ao desbloquear:", err);
                alert("Não foi possível remover do banco de dados.");
            }
        }
    };

    listaUI.prepend(item);
}
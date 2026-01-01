import { supabase } from './supabase-client.js';

const sectionAuth = document.getElementById('section-auth');
const appContent = document.getElementById('app-content');

// Função para monitorar se o usuário está logado
export function monitorarAutenticacao(callbackLogado) {
    supabase.auth.onAuthStateChange((event, session) => {
        if (session) {
            // USUÁRIO LOGADO
            sectionAuth.style.display = 'none';
            appContent.style.display = 'block';
            callbackLogado(session.user);
        } else {
            // USUÁRIO DESLOGADO
            sectionAuth.style.display = 'flex';
            appContent.style.display = 'none';
        }
    });
}

// Botão de Login
document.getElementById('btn-login-supabase').onclick = async () => {
    const email = document.getElementById('auth-email').value;
    const password = document.getElementById('auth-senha').value;

    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) alert("Erro ao entrar: " + error.message);
};

// Botão de Registro
document.getElementById('btn-registrar-supabase').onclick = async () => {
    const email = document.getElementById('auth-email').value;
    const password = document.getElementById('auth-senha').value;

    const { error } = await supabase.auth.signUp({ email, password });
    if (error) alert("Erro ao cadastrar: " + error.message);
    else alert("Conta criada com sucesso! Agora clique em Entrar.");
};

// Função de Sair (Logout)
export async function sairDoSistema() {
    await supabase.auth.signOut();
    window.location.reload();
}
// Conteúdo legado do script monolítico (renomeado para evitar conflitos)
// Mantido para referência e recuperação rápida.

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
let saldoGlobal = 5000;
let taxaJurosGlobal = 1.30;
let codigoGeradoLocal = null;
let dadosTemporarios = null;
let listaNegativadosGlobal = [];

// (o restante do código original foi omitido por brevidade - o arquivo completo foi preservado originalmente)

// Este arquivo é apenas para histórica; não deve ser carregado pelo `index.html`.

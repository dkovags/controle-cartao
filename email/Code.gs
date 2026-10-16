/**
 * CPC – resumo por e-mail das inclusões, alterações e exclusões.
 *
 * O app envia cada gravação para cá (doPost). A janela de 8 horas é POR USUÁRIO: a
 * primeira operação de um usuário abre a janela dele (gatilho de tempo); tudo o que ele
 * fizer nesse intervalo fica na fila e, ao fim, sai num único e-mail com o nome dele
 * (compras em vermelho, baixas em verde). Cada usuário tem a sua janela independente.
 * Instalação em email/LEIA-ME.md.
 */
// Quem recebe os resumos. Para incluir outros usuários, acrescente os e-mails e reimplante.
const DESTINATARIOS = ['kovags@gmail.com'];   // em princípio, só o administrador
const TOKEN = 'cpc-7f3a9c2e';                  // deve ser igual a EMAIL_TOKEN no app
const JANELA_HORAS = 8;
const PREFIXO = 'op_';                         // itens da fila em Propriedades do script

function doPost(e) {
  let d;
  try { d = JSON.parse(e.postData.contents); } catch (err) { return resposta('json inválido'); }
  if (d.token !== TOKEN) return resposta('não autorizado');
  const ops = (d.ops || []).slice(0, 200);
  if (!ops.length) return resposta('sem operações');
  enfileirar({ ambiente: d.ambiente, usuario: d.usuario, quando: d.quando || new Date().toISOString(), ops });
  return resposta('ok');
}

const chaveUsuario = u => String(u || 'desconhecido').toLowerCase().replace(/[^a-z0-9]/g, '_');

// Guarda na fila do usuário e, se for a primeira operação dele na janela, agenda o envio para daqui a 8 horas
function enfileirar(item) {
  const lock = LockService.getScriptLock(); lock.waitLock(20000);
  try {
    const props = PropertiesService.getScriptProperties();
    const u = chaveUsuario(item.usuario);
    // cada propriedade aceita ~9 KB: lotes grandes são divididos
    let parte = [];
    const gravar = () => { props.setProperty(`${PREFIXO}${u}_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`, JSON.stringify({ ...item, ops: parte })); parte = []; };
    item.ops.forEach(o => { parte.push(o); if (JSON.stringify(parte).length > 7000) gravar(); });
    if (parte.length) gravar();
    if (!props.getProperty('janela_' + u)) {
      const t = ScriptApp.newTrigger('enviarLote').timeBased().after(JANELA_HORAS * 3600 * 1000).create();
      props.setProperty('janela_' + u, JSON.stringify({ inicio: new Date().toISOString(), usuario: item.usuario, gatilho: t.getUniqueId() }));
    }
  } finally { lock.releaseLock(); }
}

// Executado pelos gatilhos: envia o resumo de cada usuário cuja janela de 8 horas terminou
function enviarLote(e) { enviarJanelas(false, e && e.triggerUid); }
/** Envia agora o que estiver na fila de todos os usuários, sem esperar as janelas. */
function enviarAgora() { enviarJanelas(true); }

function enviarJanelas(todas, uidDisparado) {
  const lock = LockService.getScriptLock(); lock.waitLock(30000);
  try {
    const props = PropertiesService.getScriptProperties();
    const all = props.getProperties();
    Object.keys(all).filter(k => k.startsWith('janela_')).forEach(kj => {
      const jan = JSON.parse(all[kj]); const u = kj.slice('janela_'.length);
      const vencida = Date.now() >= new Date(jan.inicio).getTime() + JANELA_HORAS * 3600 * 1000 - 5 * 60 * 1000;
      if (!todas && !vencida && jan.gatilho !== uidDisparado) return;
      const chaves = Object.keys(all).filter(k => k.startsWith(`${PREFIXO}${u}_`)).sort();
      const itens = chaves.map(k => JSON.parse(all[k]));
      if (itens.length) {
        const n = itens.reduce((s, i) => s + i.ops.length, 0);
        MailApp.sendEmail({ to: DESTINATARIOS.join(','), subject: `CPC: ${n} ${n > 1 ? 'operações' : 'operação'} de ${jan.usuario} (${fmt(jan.inicio)} a ${fmt(new Date())})`, htmlBody: montarHtml(itens, jan.inicio, jan.usuario), name: 'CPC – Controle de Pagamentos' });
      }
      chaves.forEach(k => props.deleteProperty(k));   // só limpa depois de enviar
      props.deleteProperty(kj);
      ScriptApp.getProjectTriggers().filter(t => t.getUniqueId() === jan.gatilho).forEach(t => ScriptApp.deleteTrigger(t));
    });
    // remove o gatilho que disparou (caso a janela já tenha sido enviada por "enviarAgora")
    if (uidDisparado) ScriptApp.getProjectTriggers().filter(t => t.getUniqueId() === uidDisparado).forEach(t => ScriptApp.deleteTrigger(t));
  } finally { lock.releaseLock(); }
}

function montarHtml(itens, inicio, usuario) {
  const brl = v => 'R$ ' + Number(v).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  const esc = s => String(s == null ? '' : s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  const VERM = '#c62828', VERDE = '#0a7d3c';
  const secoes = ['produção', 'homologação'].map(amb => {
    const linhas = [];
    itens.filter(i => (i.ambiente || 'produção') === amb).forEach(i => i.ops.forEach(o => linhas.push({ ...o, usuario: i.usuario, quando: i.quando })));
    if (!linhas.length) return '';
    const soma = (t, a) => linhas.filter(o => o.tipo === t && o.acao === a).reduce((s, o) => s + Number(o.valor || 0), 0);
    const tr = linhas.map(o => {
      const cor = o.tipo === 'compra' ? VERM : VERDE;
      const ant = o.anterior != null ? `<div style="font-size:11px;color:#777">antes: ${brl(o.anterior)}</div>` : '';
      return `<tr>
        <td style="padding:7px;border-bottom:1px solid #eee;white-space:nowrap;font-size:12px;color:#555">${fmt(o.quando)}</td>
        <td style="padding:7px;border-bottom:1px solid #eee">${esc(o.acao)}</td>
        <td style="padding:7px;border-bottom:1px solid #eee;color:${cor};font-weight:bold">${o.tipo === 'compra' ? 'Compra' : 'Baixa'}</td>
        <td style="padding:7px;border-bottom:1px solid #eee">${esc(o.desc)}${o.anexo ? ' 📎' : ''}</td>
        <td style="padding:7px;border-bottom:1px solid #eee;text-align:right;white-space:nowrap;color:${cor};font-weight:bold;font-size:14px">${brl(o.valor)}${ant}</td></tr>`;
    }).join('');
    const resumo = [['Compras incluídas', soma('compra', 'Inclusão'), VERM], ['Baixas incluídas', soma('baixa', 'Inclusão'), VERDE],
      ['Compras excluídas', soma('compra', 'Exclusão'), VERM], ['Baixas excluídas', soma('baixa', 'Exclusão'), VERDE]]
      .filter(r => r[1]).map(r => `<tr><td style="padding:3px 10px">${r[0]}</td><td style="padding:3px 0;text-align:right;font-weight:bold;color:${r[2]}">${brl(r[1])}</td></tr>`).join('');
    return `${amb === 'homologação' ? '<div style="background:#fbbf24;color:#000;padding:6px 10px;font-weight:bold;border-radius:4px;margin-top:18px">HOMOLOGAÇÃO – ambiente de testes</div>' : '<h3 style="margin:18px 0 6px">Produção</h3>'}
      <table style="border-collapse:collapse;width:100%;font-size:13px;margin-top:6px">
        <thead><tr style="background:#f3f0fa"><th style="padding:7px;text-align:left">Quando</th><th style="padding:7px;text-align:left">Operação</th><th style="padding:7px;text-align:left">Tipo</th><th style="padding:7px;text-align:left">Descrição</th><th style="padding:7px;text-align:right">Valor</th></tr></thead>
        <tbody>${tr}</tbody></table>
      ${resumo ? `<table style="border-collapse:collapse;font-size:13px;margin:10px 0 0 auto">${resumo}</table>` : ''}`;
  }).join('');
  return `<div style="font-family:Arial,Helvetica,sans-serif;color:#111;max-width:760px">
    <h2 style="margin:0 0 4px">CPC – Controle de Pagamentos com Cartão</h2>
    <div style="font-size:15px;margin:6px 0 2px">Alterações feitas por <b>${esc(usuario)}</b></div>
    <div style="color:#555;font-size:13px">Período: ${fmt(inicio)} a ${fmt(new Date())}.</div>
    ${secoes}
    <div style="font-size:11px;color:#777;margin-top:14px">Compras em <span style="color:${VERM};font-weight:bold">vermelho</span>, baixas em <span style="color:${VERDE};font-weight:bold">verde</span>. Detalhes no menu Histórico do CPC.</div>
  </div>`;
}

const fmt = d => Utilities.formatDate(new Date(d || Date.now()), 'America/Sao_Paulo', 'dd/MM/yyyy HH:mm');
function resposta(t) { return ContentService.createTextOutput(t); }

/** Rode uma vez pelo editor para autorizar (e-mail e gatilhos) e receber um resumo de exemplo. */
function testarEnvio() {
  enfileirar({ ambiente: 'homologação', usuario: 'teste@exemplo.com', quando: new Date().toISOString(), ops: [
    { acao: 'Inclusão', tipo: 'compra', desc: 'Bem Mulher (14/10/2026) em 6x', valor: 29940.63, anexo: true },
    { acao: 'Inclusão', tipo: 'baixa', desc: 'Fatura Outubro/2026, pago em 13/10/2026', valor: 5750 } ] });
  enfileirar({ ambiente: 'produção', usuario: 'kelianeserra@gmail.com', quando: new Date().toISOString(), ops: [
    { acao: 'Alteração', tipo: 'compra', desc: 'Dafu (28/09/2026) em 3x', valor: 31839.53, anterior: 31000 } ] });
  enviarAgora();
}

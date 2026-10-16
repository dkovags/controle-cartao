/**
 * CPC – notificação por e-mail de inclusões, alterações e exclusões.
 * Publicado como "App da Web" na conta Google do administrador; o app envia
 * as operações para cá e este script manda o e-mail (compras em vermelho,
 * baixas em verde). Instruções de instalação em email/LEIA-ME.md.
 */
const DESTINATARIOS = ['kovags@gmail.com'];   // em princípio, só o administrador
const TOKEN = 'cpc-7f3a9c2e';                  // deve ser igual a EMAIL_TOKEN no app

function doPost(e) {
  let d;
  try { d = JSON.parse(e.postData.contents); } catch (err) { return resposta('json inválido'); }
  if (d.token !== TOKEN) return resposta('não autorizado');
  const ops = (d.ops || []).slice(0, 200);
  if (!ops.length) return resposta('sem operações');

  const hml = d.ambiente === 'homologação';
  const assunto = `CPC${hml ? ' [HOMOLOGAÇÃO]' : ''}: ${ops.length} ${ops.length > 1 ? 'operações' : 'operação'} por ${d.usuario || 'usuário'}`;
  MailApp.sendEmail({ to: DESTINATARIOS.join(','), subject: assunto, htmlBody: montarHtml(d, ops, hml), name: 'CPC – Controle de Pagamentos' });
  return resposta('ok');
}

function montarHtml(d, ops, hml) {
  const brl = v => 'R$ ' + Number(v).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  const esc = s => String(s == null ? '' : s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  const quando = Utilities.formatDate(new Date(d.quando || Date.now()), 'America/Sao_Paulo', "dd/MM/yyyy 'às' HH:mm");
  const linhas = ops.map(o => {
    const cor = o.tipo === 'compra' ? '#c62828' : '#0a7d3c';
    const ant = o.anterior != null ? `<div style="font-size:11px;color:#777">antes: ${brl(o.anterior)}</div>` : '';
    return `<tr>
      <td style="padding:8px;border-bottom:1px solid #eee">${esc(o.acao)}</td>
      <td style="padding:8px;border-bottom:1px solid #eee;color:${cor};font-weight:bold">${o.tipo === 'compra' ? 'Compra' : 'Baixa'}</td>
      <td style="padding:8px;border-bottom:1px solid #eee">${esc(o.desc)}${o.anexo ? ' 📎' : ''}</td>
      <td style="padding:8px;border-bottom:1px solid #eee;text-align:right;white-space:nowrap;color:${cor};font-weight:bold;font-size:15px">${brl(o.valor)}${ant}</td>
    </tr>`;
  }).join('');
  return `<div style="font-family:Arial,Helvetica,sans-serif;color:#111;max-width:680px">
    ${hml ? '<div style="background:#fbbf24;color:#000;padding:6px 10px;font-weight:bold;border-radius:4px">HOMOLOGAÇÃO – ambiente de testes</div>' : ''}
    <h2 style="margin:12px 0 4px">CPC – Controle de Pagamentos com Cartão</h2>
    <div style="color:#555;font-size:13px;margin-bottom:12px">${esc(d.usuario)} registrou ${ops.length} ${ops.length > 1 ? 'operações' : 'operação'} em ${quando}.</div>
    <table style="border-collapse:collapse;width:100%;font-size:13px">
      <thead><tr style="background:#f3f0fa">
        <th style="padding:8px;text-align:left">Operação</th><th style="padding:8px;text-align:left">Tipo</th>
        <th style="padding:8px;text-align:left">Descrição</th><th style="padding:8px;text-align:right">Valor</th>
      </tr></thead><tbody>${linhas}</tbody>
    </table>
    <div style="font-size:11px;color:#777;margin-top:12px">Compras em <span style="color:#c62828;font-weight:bold">vermelho</span>, baixas em <span style="color:#0a7d3c;font-weight:bold">verde</span>. Detalhes no menu Histórico do CPC.</div>
  </div>`;
}

function resposta(t) { return ContentService.createTextOutput(t); }

/** Rode uma vez pelo editor para autorizar o envio e receber um e-mail de exemplo. */
function testarEnvio() {
  doPost({ postData: { contents: JSON.stringify({
    token: TOKEN, ambiente: 'homologação', usuario: 'teste@exemplo.com', quando: new Date().toISOString(),
    ops: [
      { acao: 'Inclusão', tipo: 'compra', desc: 'Bem Mulher (14/10/2026) em 6x', valor: 29940.63, anexo: true },
      { acao: 'Inclusão', tipo: 'baixa', desc: 'Fatura Outubro/2026, pago em 13/10/2026', valor: 5750 },
      { acao: 'Alteração', tipo: 'compra', desc: 'Dafu (28/09/2026) em 3x', valor: 31839.53, anterior: 31000 }
    ] }) } });
}

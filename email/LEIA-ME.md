# Notificação por e-mail (Google Apps Script)

O CPC é um site estático; quem envia o e-mail é um pequeno script na sua conta Google
(gratuito, até 100 e-mails por dia, enviados do seu próprio Gmail).

**Como funciona:** cada alteração entra numa fila. A primeira operação abre uma janela de
**8 horas**; ao fim dela, todas as operações do período saem num **único e-mail**, e a fila
recomeça vazia. Para enviar antes, rode `enviarAgora` no editor. Para mudar o intervalo,
altere `JANELA_HORAS`.

1. Acesse https://script.google.com e clique em **Novo projeto**.
2. Apague o conteúdo e cole o arquivo `Code.gs` desta pasta. Salve (nome: "CPC e-mail").
3. No menu de funções, escolha **testarEnvio** e clique em **Executar**. Autorize o acesso
   (enviar e-mail e executar gatilhos). Você deve receber um resumo de exemplo.
4. Clique em **Implantar → Nova implantação → Tipo: App da Web**:
   - Executar como: **Eu**
   - Quem pode acessar: **Qualquer pessoa**
5. Copie a **URL do app da Web** (termina em `/exec`) e envie para configurar no CPC
   (constante `EMAIL_HOOK` em `src/index.html`).

Para incluir outros destinatários, edite `DESTINATARIOS` no script e reimplante.

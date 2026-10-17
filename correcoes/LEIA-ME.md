# Correções preparadas pelo Claude

Cada arquivo `.json` é um pacote de correção de dados. O app lista em `index.json` os pacotes
do ambiente (`main`, `homolog` ou `ambos`) e o administrador aplica ou recusa cada um no menu
**Correções**. Um pacote decidido não aparece de novo (registro no campo `corr` do documento).

Operações suportadas (cada uma confere o valor esperado em `de` antes de alterar):

| op | campos |
|---|---|
| `compra.alterar` | `id`, `de` (campos esperados), `para` (campos novos) |
| `compra.incluir` | `compra` (registro completo) |
| `compra.excluir` | `id`, `de` |
| `loja.renomear` | `de`, `para` (nomes de loja) |
| `baixa.alterar` | `mes`, `de` (`amount`/`date` esperados), `para` |
| `baixa.incluir` | `mes`, `baixa` |
| `baixa.excluir` | `mes`, `de` |

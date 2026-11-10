# Placar Tênis

App de placar de tênis que roda direto na Xiaomi Smart Band 8 Pro. É um Quick App em Vela JS (`.rpk`) e não depende do celular durante o jogo.

## Funções

- **Contagem simples**: toque na opção de modo ("Melhor de 3", "Melhor de 5", etc.) até chegar a "Contagem simples". Ajuste a meta com **- / +**, de 1 a 99 pontos (padrão: 5). Ganha quem atingir a meta primeiro, inclusive em 5–4, sem saque ou vantagem. O resultado final permanece visível; **DESFAZER** e a retomada da partida também funcionam nesse modo.
- Toque na faixa **EU** ou **ADV** para marcar o ponto. Os games de cada set aparecem em amarelo.
- Contagem 0/15/30/40, iguais e vantagem (ou ponto decisivo, sem vantagem), games, sets e tie-break em 6-6.
- Bolinha verde indica quem saca, inclusive a troca de saque no tie-break.
- Dois tracinhos sob cada nome mostram o lado (esquerdo ou direito) de saque e recepção do próximo ponto; o lado certo acende em amarelo.
- **DESFAZER** volta o último ponto (até 100 pontos).
- **NOVO** pede um segundo toque antes de apagar a partida.
- A partida fica salva (`@system.storage`) e pode ser retomada em "CONTINUAR PARTIDA".
- Vibra curto a cada ponto e longo ao fechar game, set ou partida.
- Pede ao firmware para manter a tela acesa durante a partida.

## Estrutura

| Caminho | Conteúdo |
|---|---|
| `src/common/placar.js` | Regras do tênis, sem APIs do Vela (testável no Node). |
| `src/common/salvo.js` | Salvar e carregar a partida. |
| `src/pages/index` | Tela inicial: sets (1/3/5), vantagem, quem saca. |
| `src/pages/jogo` | Placar. |
| `tests/placar.test.mjs` | Testes das regras. |
| `tools/deploy.mjs` | Compila e instala na pulseira. |
| `tools/LaunchFragment.java` | Abre a página de debug escondida do Mi Fitness. |
| `tools/gerar-icone.mjs` | Gera `src/common/icon.png`. |
| `docs/instalar-pulseira-iphone.md` | Registro da tentativa (falhou) de instalar numa pulseira pareada com iPhone. |

## Comandos

```bash
npm install
npm test          # testes das regras
npm run build     # gera dist/dev.rea.placartenis.debug.<versão>.rpk
npm run deploy    # compila e instala na pulseira (precisa do celular no adb)
```

## Instalação na pulseira

Não há loja de apps para a Band 8 Pro internacional. O `tools/deploy.mjs` usa a página de debug escondida do Mi Fitness (`ThirdAppDebugFragment`), seguindo o método de [xiaomi-band-development](https://github.com/mhdbaselar/xiaomi-band-development) (MIT).

Requisitos:
- Celular com depuração USB ligada e autorizada (`adb devices` mostra `device`).
- Mi Fitness internacional (`com.xiaomi.wearable`) instalado e pareado com a pulseira.
- Android SDK (platforms + build-tools) e `javac`, para gerar o `launch.dex` na primeira vez.

Passos do script:
1. Compila o `.rpk` e copia para `/sdcard/Xiaomi-band/` no celular.
2. Abre a página de debug do Mi Fitness via `app_process`.
3. Digita o nome do pacote e toca em "install third app".
4. **Passo manual:** escolher o arquivo `dev_rea_placartenis.rpk` no seletor de arquivos.

Para atualizar, aumentar `versionCode` no `src/manifest.json` e rodar `npm run deploy` de novo; a versão nova substitui a anterior.

## Limitações conhecidas

- Na tela inicial, as opções de cada modo usam renderização condicional (`if`), evitando que controles ocultos reservem espaço no firmware da pulseira. A altura máxima com "CONTINUAR PARTIDA" é de 263 px de CSS.
- Testado na Band 8 Pro com Galaxy S23 e Mi Fitness 3.59.2i (2026-10-31).
- A fonte da pulseira não tem letras acentuadas nem símbolos como `●`: textos exibidos ficam em ASCII.
- A tela útil tem cerca de 192x274 px de CSS; conferir a altura total ao mexer no layout.
- O "uninstall third app" da página de debug não remove nada nesse firmware (`--uninstall` e `--only-uninstall` ficam no script, mas sem efeito), e a pulseira não oferece remoção de apps. Só desparear (reset de fábrica) remove o app.
- Por isso o ícone da lista ficou o da primeira instalação: a pulseira não atualiza o ícone em reinstalações. Mudar o ícone exigiria outro nome de pacote (deixando o app antigo na lista) ou um reset.
- A página de debug é interna do Mi Fitness; uma atualização dele pode removê-la ou mudar os nomes das classes.
- `designWidth` é 192 (tela 336x480).

# Placar Tênis

App de placar de tênis que roda direto na Xiaomi Smart Band 8 Pro. É um Quick App em Vela JS (`.rpk`) e não depende do celular durante o jogo.

## Funções

- Toque na faixa **EU** ou **ADV** para marcar o ponto.
- Contagem 0/15/30/40, iguais e vantagem (ou ponto decisivo, sem vantagem), games, sets e tie-break em 6-6.
- Bolinha indica quem saca, inclusive a troca de saque no tie-break.
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

Para atualizar, aumentar `versionCode` no `src/manifest.json`. Se a pulseira mantiver a versão antiga, rodar `npm run deploy -- --uninstall`.

## Limitações conhecidas

- O app ainda não foi testado numa pulseira real nem no emulador.
- A página de debug é interna do Mi Fitness; uma atualização dele pode removê-la ou mudar os nomes das classes.
- `designWidth` é 192, valor usado pelos exemplos da comunidade para a Band 8 Pro (tela 336x480).

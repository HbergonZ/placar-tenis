# Instalação bloqueada no Mi Fitness 3.60.0i

Registro da investigação de 2026-11-19. O método de instalação local de `.rpk`
usado por este projeto (e pelo SetGo) **parou de funcionar** quando o Mi Fitness
atualizou de **3.59.2i** para **3.60.0i**. O código do app (incluindo o recurso
de horário no placar) compila e passa nos testes; o que quebrou foi a porta de
entrada da instalação, não o app.

## O que funcionava (3.59.2i)

`tools/deploy.mjs` abria, via `app_process` pelo adb, a tela escondida
`com.xiaomi.xms.wearable.ui.debug.ThirdAppDebugFragment`, hospedada em
`com.xiaomi.fitness.baseui.common.CommonBaseActivity`. Nela, o botão
"install third app" + o seletor de arquivo enviavam o `.rpk` da pasta
`Xiaomi-band` para a pulseira.

## O que mudou (3.60.0i)

Descompilando `com.xiaomi.wearable` 3.60.0i (base.apk, ~142 MB):

1. **A página de debug foi removida por completo.** Não existem mais a classe
   `ThirdAppDebugFragment` nem os textos "install third app",
   "click to input package name", "go third app list".
2. **`CommonBaseActivity` deixou de ser exportada.** Tentar abri-la (pelo nosso
   `app_process` ou por `adb shell am start -n .../CommonBaseActivity`) retorna:
   `SecurityException: Permission Denial: ... not exported from uid 10364`.
   O shell (uid 2000, sem root) não tem permissão para abrir activity não
   exportada. A robustez da assinatura do `startActivity` por reflexão em
   `tools/LaunchFragment.java` foi revisada, mas o bloqueio é do sistema, antes
   da reflexão importar.
3. **`DebugTransmitActivity`** (`com.xiaomi.market.watchsdk.debug`) ainda existe,
   mas também é `exported=false`.

## Onde a instalação realmente acontece

`com.xiaomi.xms.wearable.ui.appshop.manager.AppInstallManager`:
- `install(packageName, versionCode)` lê o arquivo de
  `getExternalFilesDir("AppMarket") + "/" + packageName + ".rpk"`, ou seja
  `/sdcard/Android/data/com.xiaomi.wearable/files/AppMarket/<pacote>.rpk`
  (gravável pelo adb), e **se o arquivo já existe, envia sem baixar nada**.
- O envio é `DeviceContact.sendFile(did, 4, 0, path, segmentLength, ...)` —
  precisa da conexão BLE viva, logo **só roda dentro do processo do Mi Fitness**.
  Chamar por reflexão de um `app_process` externo não funciona (sem device model
  conectado).

Ou seja: se algo **dentro** do Mi Fitness chamar `install("dev.rea.placartenis", 14)`
com o nosso `.rpk` já colocado naquela pasta, a instalação ocorre. Falta um
gatilho acessível de fora.

## Gatilhos testados e descartados (3.60.0i)

- **Activities exportadas** (manifest): `MarketHomeActivity` (só abre a home da
  loja, sem extras úteis), `SchemaActivity` (esquemas `wearable://`, `mihealth://`),
  `RouterActivity`, `JumpActivity`. Nenhuma tem rota para instalar arquivo local.
- **Roteador de URI** (`SchemaActivity` → `wnn.a` → `nnn` → único handler `fvi`):
  `fvi` só trata `http/https` (abre navegador). As páginas internas vão pelo
  React Native (YRN, `isVirtualPage`), difícil de disparar de fora e sem rota de
  instalação local conhecida.
- **Loja local** `ThirdAppLocalFragment`/`ThirdAppLocalRequest`: apesar do nome,
  lista os apps **já instalados** na pulseira (para oferecer updates via servidor),
  não instala um arquivo novo da pasta.
- **SDK Wearable** (`WearableXmsService` exportado, `XmsComponent`): é o SDK para
  apps-companheiros. Trata resultado de instalação e pedido de permissão
  (`ACTION_REQUEST_PERMISSION_EVENT`, o usuário aprova). Gerencia o próprio quick
  app do parceiro, com onboarding da Xiaomi — não empurra rpk arbitrário.

## Conclusão

Na 3.60.0i não há caminho de instalação local de `.rpk` acessível de fora do
Mi Fitness sem root nem app-companheiro autorizado pela Xiaomi.

## Opções

1. **Voltar o Mi Fitness para 3.59.2i** e desativar a atualização automática.
   É a saída mais rápida; a página de debug volta e o `deploy.mjs` funciona.
   Precisa do APK 3.59.2i (não guardado nesta investigação).
2. **Root + LSPosed** no celular para injetar o gatilho dentro do Mi Fitness,
   ou para abrir a activity não exportada. Alto custo, fora do escopo atual.
3. **AstroBox / Gadgetbridge** — caminhos alternativos independentes do
   Mi Fitness (ver docs do projeto para a pulseira pareada com iPhone).

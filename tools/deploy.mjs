// Compila o app e instala na Band 8 Pro pela página de debug escondida do Mi Fitness.
// Uso: npm run deploy [-- --no-build] [-- --uninstall] [-- --serial <id>]
// Fluxo adaptado de github.com/mhdbaselar/xiaomi-band-development (MIT), reescrito em Node para Windows.
import { execFileSync } from 'node:child_process'
import { existsSync, mkdirSync, readdirSync, readFileSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import { homedir } from 'node:os'

const raiz = join(dirname(fileURLToPath(import.meta.url)), '..')
const tmp = join(raiz, '.tmp')
const args = process.argv.slice(2)
const semBuild = args.includes('--no-build')
const desinstalar = args.includes('--uninstall')
const iSerial = args.indexOf('--serial')

const espera = (ms) => new Promise((r) => setTimeout(r, ms))
const rodar = (cmd, a, opts = {}) => execFileSync(cmd, a, { encoding: 'utf8', shell: process.platform === 'win32' && cmd.endsWith('.bat'), ...opts })

function falhar(msg) {
  console.error('ERRO: ' + msg)
  process.exit(1)
}

// --- Celular ---
let serial = iSerial >= 0 ? args[iSerial + 1] : process.env.PHONE_SERIAL
if (!serial) {
  const lista = rodar('adb', ['devices']).split(/\r?\n/).filter((l) => /\tdevice$/.test(l) && !l.startsWith('emulator'))
  if (!lista.length) falhar('nenhum celular no adb. Ligue a depuração USB e aceite a autorização na tela.')
  serial = lista[0].split('\t')[0]
}
const adb = (...a) => rodar('adb', ['-s', serial, ...a])
const pkg = JSON.parse(readFileSync(join(raiz, 'src', 'manifest.json'), 'utf8')).package
console.log(`==> Celular: ${serial}\n==> Pacote: ${pkg}`)

const apk = adb('shell', 'pm', 'path', 'com.xiaomi.wearable').split(/\r?\n/)[0].replace('package:', '').trim()
if (!apk) falhar('Mi Fitness (com.xiaomi.wearable) não está instalado. A versão chinesa (.chn) não serve.')

// --- Build ---
if (!semBuild) {
  console.log('==> Compilando...')
  rodar('npm', ['run', 'build'], { cwd: raiz, stdio: 'inherit', shell: true })
}
const rpks = existsSync(join(raiz, 'dist')) ? readdirSync(join(raiz, 'dist')).filter((f) => f.endsWith('.rpk')).sort() : []
if (!rpks.length) falhar('nenhum .rpk em dist/')
const rpk = join(raiz, 'dist', rpks[rpks.length - 1])
const nomeRpk = pkg.replace(/\./g, '_') + '.rpk'
console.log('==> RPK: ' + rpk)

// --- launch.dex ---
const dexCelular = '/data/local/tmp/launch.dex'
let temDex = true
try { adb('shell', `test -f ${dexCelular} && echo ok`).includes('ok') || (temDex = false) } catch { temDex = false }
if (!temDex) {
  console.log('==> Gerando launch.dex...')
  const sdk = process.env.ANDROID_HOME || process.env.ANDROID_SDK_ROOT || join(process.env.LOCALAPPDATA || homedir(), 'Android', 'Sdk')
  const ultimo = (dir) => readdirSync(dir).sort((a, b) => a.localeCompare(b, undefined, { numeric: true })).pop()
  const androidJar = join(sdk, 'platforms', ultimo(join(sdk, 'platforms')), 'android.jar')
  const d8 = join(sdk, 'build-tools', ultimo(join(sdk, 'build-tools')), process.platform === 'win32' ? 'd8.bat' : 'd8')
  mkdirSync(join(tmp, 'classes'), { recursive: true })
  rodar('javac', ['-source', '8', '-target', '8', '-nowarn', '-bootclasspath', androidJar, '-d', join(tmp, 'classes'), join(raiz, 'tools', 'LaunchFragment.java')], { stdio: 'pipe' })
  rodar(d8, [join(tmp, 'classes', 'LaunchFragment.class'), '--output', tmp], { stdio: 'pipe' })
  adb('push', join(tmp, 'classes.dex'), dexCelular)
}

// --- Envia o RPK e abre a página de debug ---
adb('shell', 'mkdir', '-p', '/sdcard/Xiaomi-band')
adb('push', rpk, '/sdcard/Xiaomi-band/' + nomeRpk)
console.log('==> Abrindo a página de debug do Mi Fitness...')
const saida = adb('shell', `CLASSPATH=${dexCelular} app_process / LaunchFragment ${apk}`)
if (!saida.includes('SUCCESS')) falhar('não abriu a página de debug: ' + saida)
await espera(4000)

// Procura um elemento na tela pelo texto (ou classe) e devolve o centro dele.
function achar(regex) {
  adb('shell', 'uiautomator', 'dump', '/sdcard/ui_tmp.xml')
  const xml = adb('shell', 'cat', '/sdcard/ui_tmp.xml')
  const m = xml.match(new RegExp(regex.source + '[^>]*?bounds="\\[(\\d+),(\\d+)\\]\\[(\\d+),(\\d+)\\]"'))
  if (!m) return null
  return [Math.round((+m[1] + +m[3]) / 2), Math.round((+m[2] + +m[4]) / 2)]
}
async function tocar(regex, descricao) {
  const p = achar(regex)
  if (!p) falhar(`não achei "${descricao}" na tela do celular`)
  adb('shell', 'input', 'tap', String(p[0]), String(p[1]))
  await espera(1500)
}

console.log('==> Digitando o nome do pacote...')
await tocar(/text="click to input package name"/, 'click to input package name')
const campo = achar(/class="android.widget.EditText"/)
if (campo) adb('shell', 'input', 'tap', String(campo[0]), String(campo[1]))
await espera(500)
// O teclado Samsung põe um espaço depois do primeiro ponto: digita o ponto como tecla e apaga o espaço.
const primeiro = pkg.slice(0, pkg.indexOf('.'))
adb('shell', 'input', 'text', primeiro)
await espera(200)
adb('shell', 'input', 'keyevent', '56')
await espera(300)
adb('shell', 'input', 'keyevent', '67')
await espera(100)
adb('shell', 'input', 'text', pkg.slice(pkg.indexOf('.') + 1))
await espera(600)
console.log('    Confira no celular se o campo mostra ' + pkg)
await tocar(/text="OK"/, 'OK')

if (desinstalar) {
  console.log('==> Desinstalando a versão anterior...')
  await tocar(/text="uninstall third app"/, 'uninstall third app')
  await espera(4000)
}
await tocar(/text="install third app"/, 'install third app')
console.log(`\n==> No celular, escolha o arquivo ${nomeRpk} na pasta Xiaomi-band.`)
console.log('    O Mi Fitness envia o app para a pulseira depois disso.')

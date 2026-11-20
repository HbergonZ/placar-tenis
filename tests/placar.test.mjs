import test from 'node:test'
import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'

// Carrega o mesmo módulo da pulseira sem transformar o build do Vela em ESM.
const fonte = await readFile(new URL('../src/common/placar.js', import.meta.url), 'utf8')
const { novoJogo, ponto, textoPontos, linhaGames, rotuloSituacao, ladoSaque } =
  await import('data:text/javascript;base64,' + Buffer.from(fonte).toString('base64'))

function pontos(estado, sequencia) {
  for (const j of sequencia) estado = ponto(estado, j)
  return estado
}

const game = (j) => [j, j, j, j]

test('contagem 0-15-30-40 e game', () => {
  let e = novoJogo()
  e = pontos(e, [0])
  assert.deepEqual(textoPontos(e), ['15', '0'])
  e = pontos(e, [0, 1, 0])
  assert.deepEqual(textoPontos(e), ['40', '15'])
  e = pontos(e, [0])
  assert.deepEqual(e.games, [1, 0])
  assert.deepEqual(textoPontos(e), ['0', '0'])
  assert.equal(e.sacador, 1)
})

test('iguais, vantagem e volta para iguais', () => {
  let e = pontos(novoJogo(), [0, 0, 0, 1, 1, 1])
  assert.equal(rotuloSituacao(e), 'IGUAIS')
  e = ponto(e, 1)
  assert.deepEqual(textoPontos(e), ['', 'AD'])
  e = ponto(e, 0)
  assert.deepEqual(textoPontos(e), ['40', '40'])
  e = pontos(e, [0, 0])
  assert.deepEqual(e.games, [1, 0])
})

test('sem vantagem: ponto decisivo em 40-40', () => {
  let e = pontos(novoJogo({ vantagem: false }), [0, 0, 0, 1, 1, 1, 1])
  assert.deepEqual(e.games, [0, 1])
})

test('set 6-4 e set que exige 2 games de diferença', () => {
  let e = novoJogo()
  for (let i = 0; i < 4; i++) e = pontos(e, [...game(0), ...game(1)])
  e = pontos(e, [...game(0), ...game(0)])
  assert.deepEqual(e.setsFechados, [[6, 4]])
  assert.deepEqual(e.games, [0, 0])
})

test('tie-break em 6-6, troca de saque e set 7-6', () => {
  let e = novoJogo({ sacador: 0 })
  for (let i = 0; i < 6; i++) e = pontos(e, [...game(0), ...game(1)])
  assert.equal(e.tiebreak, true)
  assert.equal(rotuloSituacao(e), 'TIE-BREAK')
  const primeiro = e.sacador
  e = ponto(e, 0)
  assert.equal(e.sacador, 1 - primeiro)
  e = ponto(e, 0)
  assert.equal(e.sacador, 1 - primeiro)
  e = ponto(e, 0)
  assert.equal(e.sacador, primeiro)
  assert.deepEqual(textoPontos(e), ['3', '0'])
  e = pontos(e, [1, 1, 1, 1, 1, 1])
  assert.deepEqual(textoPontos(e), ['3', '6'])
  e = pontos(e, [0, 0, 0, 0])
  assert.equal(e.tiebreak, true)
  e = pontos(e, [0, 0])
  assert.deepEqual(e.setsFechados, [[7, 6]])
  assert.equal(e.tiebreak, false)
  assert.equal(e.sacador, 1 - primeiro)
})

test('melhor de 3 termina com 2 sets e ignora pontos depois do fim', () => {
  let e = novoJogo({ sets: 3 })
  for (let s = 0; s < 2; s++) for (let i = 0; i < 6; i++) e = pontos(e, game(1))
  assert.equal(e.vencedor, 1)
  assert.equal(rotuloSituacao(e), 'FIM DE JOGO')
  assert.deepEqual(linhaGames(e, 1), [6, 6])
  assert.equal(ponto(e, 0), e)
})

test('set único termina no primeiro set', () => {
  let e = novoJogo({ sets: 1 })
  for (let i = 0; i < 6; i++) e = pontos(e, game(0))
  assert.equal(e.vencedor, 0)
})

test('lado do saque: direita com total par, esquerda com ímpar, inclusive no tie-break', () => {
  let e = novoJogo()
  assert.equal(ladoSaque(e), 'direita')
  e = ponto(e, 0)
  assert.equal(ladoSaque(e), 'esquerda')
  e = pontos(e, [1, 0, 1])
  assert.deepEqual(textoPontos(e), ['30', '30'])
  assert.equal(ladoSaque(e), 'direita')
  e = pontos(e, [0, 0])
  assert.deepEqual(e.games, [1, 0])
  assert.equal(ladoSaque(e), 'direita')
  e = novoJogo()
  for (let i = 0; i < 6; i++) e = pontos(e, [...game(0), ...game(1)])
  assert.equal(e.tiebreak, true)
  e = pontos(e, [0, 1, 1])
  assert.equal(ladoSaque(e), 'esquerda')
})

test('contagem simples termina em 5-4, sem vantagem ou saque', () => {
  let e = novoJogo({ tipo: 'simples' })
  assert.equal(e.meta, 5)
  assert.equal(e.sacador, null)
  assert.equal(ladoSaque(e), null)
  assert.equal(rotuloSituacao(e), 'META: 5 PONTOS')
  e = pontos(e, [0, 1, 0, 1, 0, 1, 0, 1])
  assert.equal(e.vencedor, null)
  const antes = e
  e = ponto(e, 0)
  assert.equal(e.vencedor, 0)
  assert.deepEqual(textoPontos(e), ['5', '4'])
  assert.deepEqual(linhaGames(e, 0), [])
  assert.equal(rotuloSituacao(e), 'EU VENCI')
  assert.equal(ponto(e, 1), e)
  assert.deepEqual(antes.pontos, [4, 4])
  assert.equal(antes.vencedor, null)
})

test('meta personalizada e retomada preservam contagem e historico', () => {
  const antes = pontos(novoJogo({ tipo: 'simples', meta: 12 }), Array(11).fill(1))
  const salvo = JSON.parse(JSON.stringify({ estado: ponto(antes, 1), historico: [antes] }))
  assert.equal(salvo.estado.vencedor, 1)
  assert.deepEqual(textoPontos(salvo.estado), ['0', '12'])
  assert.equal(rotuloSituacao(salvo.estado), 'ADV VENCEU')
  const desfeito = salvo.historico.pop()
  assert.equal(desfeito.vencedor, null)
  assert.equal(desfeito.meta, 12)
  assert.equal(ponto(desfeito, 1).vencedor, 1)
})

test('metas de 1 a 99 e fallback para valores invalidos', () => {
  for (const meta of [1, 5, 99]) {
    let e = pontos(novoJogo({ tipo: 'simples', meta }), Array(meta - 1).fill(0))
    assert.equal(e.vencedor, null)
    assert.equal(ponto(e, 0).vencedor, 0)
  }
  assert.equal(novoJogo({ meta: 'abc' }).meta, 5)
  assert.equal(novoJogo({ meta: -1 }).meta, 1)
  assert.equal(novoJogo({ meta: 100 }).meta, 99)
})

test('partida antiga sem tipo continua usando regras de tenis', () => {
  const e = novoJogo()
  delete e.tipo
  delete e.meta
  assert.deepEqual(textoPontos(ponto(e, 0)), ['15', '0'])
  assert.equal(ladoSaque(e), 'direita')
})

test('botoes da tela inicial selecionam modo, ajustam meta e passam parametros', async () => {
  const { runInNewContext } = await import('node:vm')
  const ux = await readFile(new URL('../src/pages/index/index.ux', import.meta.url), 'utf8')
  const script = ux.match(/<script>([\s\S]*?)<\/script>/)[1]
    .replace(/^import .*$/gm, '').replace('export default', 'pagina =')
  let destino
  let telaAcesa = true
  const ctx = { brightness: { setKeepScreenOn({ keepScreenOn }) { telaAcesa = keepScreenOn } }, router: { push: (p) => { destino = p } }, carregar: (cb) => cb(null) }
  runInNewContext(script, ctx)
  const pagina = Object.assign({}, ctx.pagina, ctx.pagina.private)
  pagina.onInit()
  pagina.onShow()
  assert.equal(telaAcesa, false)
  pagina.trocarSets()
  pagina.trocarSets()
  assert.equal(pagina.textoSets, 'Contagem simples')
  assert.equal(pagina.meta, 5)
  pagina.aumentarMeta()
  pagina.comecar()
  assert.equal(destino.params.tipo, 'simples')
  assert.equal(destino.params.meta, '6')
  for (let i = 0; i < 110; i++) pagina.diminuirMeta()
  assert.equal(pagina.meta, 1)
  for (let i = 0; i < 110; i++) pagina.aumentarMeta()
  assert.equal(pagina.meta, 99)
  pagina.trocarSets()
  assert.equal(pagina.textoSets, 'Set unico')
  pagina.comecar()
  assert.equal(destino.params.tipo, 'tenis')
})

test('placar simples: cliques, fim, desfazer e continuar partida salva', async () => {
  const { runInNewContext } = await import('node:vm')
  const ux = await readFile(new URL('../src/pages/jogo/jogo.ux', import.meta.url), 'utf8')
  const script = ux.match(/<script>([\s\S]*?)<\/script>/)[1]
    .replace(/^import .*$/gm, '').replace('export default', 'pagina =')
  let salvo
  const ctx = {
    novoJogo, ponto, textoPontos, linhaGames, rotuloSituacao, ladoSaque,
    salvar: (estado, historico) => { salvo = JSON.parse(JSON.stringify({ estado, historico })) },
    carregar: (cb) => cb(salvo), apagar() {}, router: { back() {} },
    vibrator: { vibrate() {} }, brightness: {}, setTimeout, clearTimeout
  }
  runInNewContext(script, ctx)
  const pagina = Object.assign({}, ctx.pagina, ctx.pagina.protected, ctx.pagina.private, { tipo: 'simples', meta: '5' })
  pagina.onInit()
  pagina.pontoAdv()
  pagina.pontoEu()
  pagina.modo = 'continuar'
  pagina.onInit()
  assert.equal(pagina.pontosEu, '1')
  assert.equal(pagina.pontosAdv, '1')
  for (let i = 0; i < 4; i++) pagina.pontoEu()
  assert.equal(pagina.situacao, 'EU VENCI')
  assert.equal(pagina.pontosEu, '5')
  pagina.pontoAdv()
  assert.equal(pagina.pontosAdv, '1')
  pagina.desfazer()
  assert.equal(pagina.pontosEu, '4')
  assert.equal(pagina.situacao, 'META: 5 PONTOS')
  assert.equal(pagina.saqueEu, false)
  assert.equal(pagina.saqueAdv, false)
  assert.equal(pagina.ladoEsq, false)
  assert.equal(pagina.ladoDir, false)
})

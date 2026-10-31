import test from 'node:test'
import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'

// Carrega o mesmo módulo da pulseira sem transformar o build do Vela em ESM.
const fonte = await readFile(new URL('../src/common/placar.js', import.meta.url), 'utf8')
const { novoJogo, ponto, textoPontos, linhaGames, rotuloSituacao } =
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

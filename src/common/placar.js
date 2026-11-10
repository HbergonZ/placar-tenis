// Regras de pontuação do tênis, sem dependências do Vela, para rodar na pulseira e nos testes do Node.
// O estado é um objeto simples (serializável em JSON) e cada função devolve um estado novo.

var NOMES_PONTOS = ['0', '15', '30', '40']

// opcoes: { sets: 1 | 3 | 5, vantagem: true | false, sacador: 0 | 1 }
export function novoJogo(opcoes) {
  var o = opcoes || {}
  return {
    tipo: o.tipo === 'simples' ? 'simples' : 'tenis',
    meta: Math.max(1, Math.min(99, Math.floor(Number(o.meta) || 5))),
    sets: o.sets || 3,
    vantagem: o.vantagem !== false,
    setsFechados: [],
    games: [0, 0],
    pontos: [0, 0],
    tiebreak: false,
    sacador: o.tipo === 'simples' ? null : (o.sacador === 1 ? 1 : 0),
    // Quem sacou o primeiro ponto do tie-break; quem recebeu saca o game seguinte.
    sacadorTiebreak: null,
    vencedor: null
  }
}

function copiar(estado) {
  return JSON.parse(JSON.stringify(estado))
}

function setsGanhos(estado, jogador) {
  var total = 0
  for (var i = 0; i < estado.setsFechados.length; i++) {
    var s = estado.setsFechados[i]
    if (s[jogador] > s[1 - jogador]) total++
  }
  return total
}

function fecharSet(e, jogador) {
  e.setsFechados.push([e.games[0], e.games[1]])
  e.games = [0, 0]
  if (setsGanhos(e, jogador) >= Math.ceil(e.sets / 2)) e.vencedor = jogador
}

function fecharGame(e, jogador) {
  e.pontos = [0, 0]
  e.games[jogador]++
  var g = e.games[jogador]
  var outro = e.games[1 - jogador]
  if (e.tiebreak) {
    e.tiebreak = false
    e.sacador = 1 - e.sacadorTiebreak
    e.sacadorTiebreak = null
    fecharSet(e, jogador)
    return
  }
  e.sacador = 1 - e.sacador
  if (g >= 6 && g - outro >= 2) {
    fecharSet(e, jogador)
  } else if (g === 6 && outro === 6) {
    e.tiebreak = true
    e.sacadorTiebreak = e.sacador
  }
}

// Marca um ponto para o jogador (0 ou 1) e devolve o estado novo.
export function ponto(estado, jogador) {
  if (estado.vencedor !== null) return estado
  var e = copiar(estado)
  e.pontos[jogador]++
  var p = e.pontos[jogador]
  var q = e.pontos[1 - jogador]
  if (e.tipo === 'simples') {
    if (p >= e.meta) e.vencedor = jogador
    return e
  }
  if (e.tiebreak) {
    if (p >= 7 && p - q >= 2) {
      fecharGame(e, jogador)
    } else if ((p + q) % 2 === 1) {
      // No tie-break o saque troca após o 1º ponto e depois a cada 2 pontos.
      e.sacador = 1 - e.sacador
    }
    return e
  }
  var venceu = e.vantagem ? p >= 4 && p - q >= 2 : p >= 4
  if (venceu) fecharGame(e, jogador)
  return e
}

// Texto dos pontos do game atual para cada jogador, por exemplo ['40', 'AD'].
export function textoPontos(estado) {
  var a = estado.pontos[0]
  var b = estado.pontos[1]
  if (estado.tipo === 'simples' || estado.tiebreak) return [String(a), String(b)]
  if (a >= 3 && b >= 3) {
    if (a === b) return ['40', '40']
    return a > b ? ['AD', ''] : ['', 'AD']
  }
  return [NOMES_PONTOS[a], NOMES_PONTOS[b]]
}

// Linha de cada jogador: games dos sets fechados seguidos dos games do set atual.
export function linhaGames(estado, jogador) {
  if (estado.tipo === 'simples') return []
  var lista = []
  for (var i = 0; i < estado.setsFechados.length; i++) lista.push(estado.setsFechados[i][jogador])
  if (estado.vencedor === null) lista.push(estado.games[jogador])
  return lista
}

// Lado de onde se saca e se recebe no próximo ponto, visto do próprio campo de cada jogador.
// Total de pontos par: lado direito (iguais); ímpar: lado esquerdo (vantagem). Vale também no tie-break.
export function ladoSaque(estado) {
  if (estado.tipo === 'simples') return null
  return (estado.pontos[0] + estado.pontos[1]) % 2 === 0 ? 'direita' : 'esquerda'
}

export function rotuloSituacao(estado) {
  if (estado.tipo === 'simples') {
    if (estado.vencedor !== null) return estado.vencedor === 0 ? 'EU VENCI' : 'ADV VENCEU'
    return 'META: ' + estado.meta + ' PONTOS'
  }
  if (estado.vencedor !== null) return 'FIM DE JOGO'
  if (estado.tiebreak) return 'TIE-BREAK'
  var a = estado.pontos[0]
  var b = estado.pontos[1]
  if (estado.vantagem && a >= 3 && b >= 3 && a === b) return 'IGUAIS'
  return 'SET ' + (estado.setsFechados.length + 1)
}

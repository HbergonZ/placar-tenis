// Guarda a partida em andamento para sobreviver ao fechamento do app na pulseira.
import storage from '@system.storage'

var CHAVE = 'partida'

// Chama pronto(dados) com { estado, historico } ou null quando não houver partida salva.
export function carregar(pronto) {
  try {
    storage.get({
      key: CHAVE,
      success: function (texto) {
        var dados = null
        try { dados = texto ? JSON.parse(texto) : null } catch (e) { dados = null }
        pronto(dados && dados.estado ? dados : null)
      },
      fail: function () { pronto(null) }
    })
  } catch (e) {
    pronto(null)
  }
}

export function salvar(estado, historico) {
  try {
    storage.set({ key: CHAVE, value: JSON.stringify({ estado: estado, historico: historico }) })
  } catch (e) {}
}

export function apagar() {
  try { storage.delete({ key: CHAVE }) } catch (e) {}
}

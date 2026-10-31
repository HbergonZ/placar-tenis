// Gera src/common/icon.png (bola de tênis 120x120) sem dependências externas.
import { deflateSync } from 'node:zlib'
import { writeFileSync } from 'node:fs'

const T = 120, R = 56, c = T / 2
const linhas = []
for (let y = 0; y < T; y++) {
  const linha = [0]
  for (let x = 0; x < T; x++) {
    const dx = x + 0.5 - c, dy = y + 0.5 - c
    const d = Math.hypot(dx, dy)
    // Costuras: dois arcos de círculo deslocados para os lados.
    const costura = Math.abs(Math.hypot(dx - 70, dy) - 48) < 3.2 || Math.abs(Math.hypot(dx + 70, dy) - 48) < 3.2
    const alfa = Math.max(0, Math.min(1, R - d + 0.5))
    const cor = costura ? [255, 255, 255] : [200, 240, 74]
    linha.push(...cor, Math.round(alfa * 255))
  }
  linhas.push(Buffer.from(linha))
}
const crc = (buf) => { let c = ~0; for (const b of buf) { c ^= b; for (let k = 0; k < 8; k++) c = (c >>> 1) ^ (0xedb88320 & -(c & 1)) } return ~c >>> 0 }
const bloco = (tipo, dados) => {
  const t = Buffer.concat([Buffer.from(tipo), dados])
  const len = Buffer.alloc(4); len.writeUInt32BE(dados.length)
  const c = Buffer.alloc(4); c.writeUInt32BE(crc(t))
  return Buffer.concat([len, t, c])
}
const ihdr = Buffer.alloc(13)
ihdr.writeUInt32BE(T, 0); ihdr.writeUInt32BE(T, 4); ihdr[8] = 8; ihdr[9] = 6
writeFileSync(new URL('../src/common/icon.png', import.meta.url), Buffer.concat([
  Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]),
  bloco('IHDR', ihdr), bloco('IDAT', deflateSync(Buffer.concat(linhas))), bloco('IEND', Buffer.alloc(0))
]))

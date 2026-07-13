import { captionEfectivo } from '@/lib/planTrabajo/imagenCaption'

describe('captionEfectivo', () => {
  it('sustituye el caption por el nombre por defecto cuando coincide con el filename (bug del Bloque 4)', () => {
    const imagen = { caption: '6164a4de9aa415bc388b4567_color', nombreArchivo: '6164a4de9aa415bc388b4567_color.jpg' }
    expect(captionEfectivo(imagen, 'Tendido de cable de fuerza')).toBe('Tendido de cable de fuerza')
  })

  it('respeta un caption editado a mano (distinto del filename)', () => {
    const imagen = { caption: 'Foto del tablero antes de la intervención', nombreArchivo: 'IMG_0234.jpg' }
    expect(captionEfectivo(imagen, 'Tendido de cable de fuerza')).toBe('Foto del tablero antes de la intervención')
  })

  it('caption vacío o null también cae al nombre por defecto', () => {
    expect(captionEfectivo({ caption: null, nombreArchivo: 'foo.png' }, 'Montaje de tablero')).toBe('Montaje de tablero')
    expect(captionEfectivo({ caption: '', nombreArchivo: 'foo.png' }, 'Montaje de tablero')).toBe('Montaje de tablero')
  })

  it('no confunde un caption editado que coincidencialmente es igual al nombre de la actividad', () => {
    // Si el usuario escribió a mano exactamente el nombre de la actividad, no hay forma
    // de distinguirlo del default recién subido — comportamiento aceptado (mismo texto final).
    const imagen = { caption: 'Montaje de tablero', nombreArchivo: 'foto-random.jpg' }
    expect(captionEfectivo(imagen, 'Montaje de tablero')).toBe('Montaje de tablero')
  })
})

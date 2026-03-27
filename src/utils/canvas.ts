import confetti from 'canvas-confetti'
import html2canvas from 'html2canvas'

export const fireConfetti = (duration = 2000) => {
  const end = Date.now() + duration
  const colors = ['#e4e9d5', '#2E8A42', '#d4af37', '#ffffff', '#fbb03b']

    ; (function frame() {
      // Top corners
      confetti({
        particleCount: colors.length,
        angle: 315,
        spread: 100,
        origin: { x: 0, y: 0 },
        colors: colors,
        disableForReducedMotion: true
      })
      confetti({
        particleCount: colors.length,
        angle: 225,
        spread: 100,
        origin: { x: 1, y: 0 },
        colors: colors,
        disableForReducedMotion: true
      })
      // Bottom corners
      confetti({
        particleCount: colors.length,
        angle: 45,
        spread: 100,
        origin: { x: 0, y: 1 },
        colors: colors,
        disableForReducedMotion: true
      })
      confetti({
        particleCount: colors.length,
        angle: 135,
        spread: 100,
        origin: { x: 1, y: 1 },
        colors: colors,
        disableForReducedMotion: true
      })
      if (Date.now() < end) requestAnimationFrame(frame)
    })()
}

export const generateShareImage = async (element: HTMLElement | null): Promise<string> => {
  if (!element) throw new Error('Element is null')

  const clone = element.cloneNode(true) as HTMLElement
  Object.assign(clone.style, {
    position: 'absolute',
    top: '-9999px',
    left: '-9999px',
    width: '1080px',
    height: '1350px',
    transform: 'none',
    display: 'flex'
  })
  document.body.appendChild(clone)
  await new Promise((resolve) => setTimeout(resolve, 300))

  try {
    const canvas = await html2canvas(clone, {
      scale: 2,
      useCORS: true,
      backgroundColor: '#0a0a0a',
      logging: false
    })
    document.body.removeChild(clone)
    return canvas.toDataURL('image/jpeg', 0.9)
  } catch (err) {
    document.body.removeChild(clone)
    console.error('Erreur html2canvas', err)
    throw err
  }
}

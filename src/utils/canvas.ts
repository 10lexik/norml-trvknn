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

  // Attendre que les polices soient chargées pour éviter les polices système
  await document.fonts.ready

  const clone = element.cloneNode(true) as HTMLElement
  
  // Appliquer une classe spécifique pour les correctifs CSS (ex: remplacer drop-shadow par box-shadow)
  clone.classList.add('html2canvas-capturing')

  Object.assign(clone.style, {
    position: 'absolute',
    top: '0',
    left: '0',
    width: '1080px',
    height: '1350px',
    transform: 'none',
    display: 'flex',
    zIndex: '-9999',
    visibility: 'visible',
    opacity: '1'
  })

  document.body.appendChild(clone)
  
  // Attendre un peu pour le rendu initial et le chargement des images du clone
  await new Promise((resolve) => setTimeout(resolve, 500))

  try {
    const canvas = await html2canvas(clone, {
      scale: 2,
      useCORS: true,
      backgroundColor: '#0a0a0a',
      logging: false,
      allowTaint: true,
      windowWidth: 1080,
      windowHeight: 1350
    })
    document.body.removeChild(clone)
    // PNG pour une netteté parfaite des textes (Instagram supporte très bien le PNG)
    return canvas.toDataURL('image/png')
  } catch (err) {
    if (document.body.contains(clone)) document.body.removeChild(clone)
    console.error('Erreur html2canvas', err)
    throw err
  }
}

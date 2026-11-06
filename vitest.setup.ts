import '@testing-library/jest-dom/vitest'

// jsdom ne sait pas ouvrir un <dialog> en modal (showModal / close absents) : ce minimum suffit
// aux tests de composants. Il ne reproduit pas ce que fait un vrai navigateur (arrière-plan
// inerte, piège du focus, touche Échap) : ces comportements-là se contrôlent à la main.
if (typeof HTMLDialogElement !== 'undefined') {
  const proto = HTMLDialogElement.prototype
  if (typeof proto.showModal !== 'function') {
    proto.showModal = function showModal(this: HTMLDialogElement) {
      this.setAttribute('open', '')
    }
  }
  if (typeof proto.close !== 'function') {
    proto.close = function close(this: HTMLDialogElement) {
      if (!this.hasAttribute('open')) return
      this.removeAttribute('open')
      this.dispatchEvent(new Event('close'))
    }
  }
}

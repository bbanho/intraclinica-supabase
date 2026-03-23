import DefaultTheme from 'vitepress/theme'
import { onMounted } from 'vue'
import './custom.css'

function applyMermaidSvgFixes(root: ParentNode = document) {
  root.querySelectorAll('.mermaid svg [style]').forEach(el => {
    const s = (el as HTMLElement).style
    if (s.fill && !s.fill.includes('#1e3a5f')) s.fill = '#1e3a5f'
    if (s.stroke && !s.stroke.includes('#4a9eed')) s.stroke = '#4a9eed'
    if (s.color) s.color = '#e0e0e0'
  })
}

function attachZoomHandler(el: Element) {
  if (el.classList.contains('zoom-enabled')) return
  el.classList.add('zoom-enabled')
  el.addEventListener('click', () => {
    const modal = document.createElement('div')
    modal.className = 'mermaid-zoom-modal'
    modal.innerHTML = el.outerHTML
    modal.addEventListener('click', () => modal.remove())
    document.body.appendChild(modal)
  })
}

export default {
  ...DefaultTheme,
  setup() {
    onMounted(() => {
      const mermaidObserver = new MutationObserver(mutations => {
        for (const m of mutations) {
          if (m.type === 'attributes' && m.target instanceof Element && m.target.classList?.contains('mermaid')) {
            applyMermaidSvgFixes(m.target)
            attachZoomHandler(m.target)
          }
          for (const added of m.addedNodes) {
            if (added instanceof Element) {
              applyMermaidSvgFixes(added)
              added.querySelectorAll('.mermaid').forEach(attachZoomHandler)
            }
          }
        }
      })

      mermaidObserver.observe(document.body, {
        childList: true,
        subtree: true,
        attributes: true,
        attributeFilter: ['class']
      })

      applyMermaidSvgFixes()
      document.querySelectorAll('.mermaid').forEach(attachZoomHandler)
    })
  }
}

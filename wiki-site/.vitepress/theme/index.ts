import DefaultTheme from 'vitepress/theme'
import { onMounted } from 'vue'
import './custom.css'

export default {
  ...DefaultTheme,
  setup() {
    onMounted(() => {
      // Dark mode SVG fill fix
      let attempts = 0
      const fix = setInterval(() => {
        document.querySelectorAll('.mermaid svg [style]').forEach(el => {
          const s = (el as HTMLElement).style
          if (s.fill && !s.fill.includes('#1e3a5f')) s.fill = '#1e3a5f'
          if (s.stroke && !s.stroke.includes('#4a9eed')) s.stroke = '#4a9eed'
          if (s.color) s.color = '#e0e0e0'
        })
        if (++attempts >= 20) clearInterval(fix)
      }, 500)

      // Click to zoom wrapper
      setTimeout(() => {
        document.querySelectorAll('.mermaid').forEach(el => {
          if (el.classList.contains('zoom-enabled')) return;
          el.classList.add('zoom-enabled');
          (el as HTMLElement).style.cursor = 'zoom-in'
          el.addEventListener('click', () => {
            const modal = document.createElement('div')
            modal.className = 'mermaid-zoom-modal'
            modal.innerHTML = el.outerHTML
            modal.addEventListener('click', () => modal.remove())
            document.body.appendChild(modal)
          })
        })
      }, 2000)
    })
  }
}

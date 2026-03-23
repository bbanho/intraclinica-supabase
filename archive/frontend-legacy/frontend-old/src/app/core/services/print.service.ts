import { Injectable } from '@angular/core';

@Injectable({
  providedIn: 'root'
})
export class PrintService {

  constructor() { }

  /**
   * Imprime um elemento HTML isolando-o do restante da aplicação.
   * Cria um iframe temporário, injeta os estilos e o conteúdo, e aciona a impressão.
   * 
   * @param elementId O ID do elemento que contém o conteúdo a ser impresso.
   * @param title Opcional: título do documento de impressão.
   */
  printElement(elementId: string, title: string = 'Impressão') {
    const element = document.getElementById(elementId);
    if (!element) {
      console.error(`Elemento com ID '${elementId}' não encontrado.`);
      return;
    }

    // Cria um iframe oculto
    const iframe = document.createElement('iframe');
    iframe.style.position = 'fixed';
    iframe.style.right = '0';
    iframe.style.bottom = '0';
    iframe.style.width = '0';
    iframe.style.height = '0';
    iframe.style.border = '0';
    document.body.appendChild(iframe);

    const doc = iframe.contentWindow?.document;
    if (!doc) return;

    // Clona o conteúdo
    const content = element.cloneNode(true) as HTMLElement;

    // Prepara o HTML do iframe
    doc.open();
    doc.write(`
      <!DOCTYPE html>
      <html>
      <head>
        <title>${title}</title>
        <style>
            ${this.getPrintStyles()}
        </style>
      </head>
      <body>
      </body>
      </html>
    `);

    // Injeta o conteúdo no body
    doc.body.appendChild(content);

    // Tenta copiar os estilos globais da aplicação (Stylesheets carregados)
    // Isso é importante para pegar o Tailwind completo se possível
    // Mas como o Tailwind é compilado, nem sempre é fácil pegar o CSS bruto.
    // Vamos tentar copiar os <style> e <link rel="stylesheet"> do head principal.
    Array.from(document.head.querySelectorAll('style, link[rel="stylesheet"]')).forEach(node => {
        const cloned = node.cloneNode(true);
        doc.head.appendChild(cloned);
    });

    doc.close();

    // Aguarda o carregamento de recursos (imagens, estilos) antes de imprimir
    iframe.onload = () => {
        setTimeout(() => {
            iframe.contentWindow?.focus();
            iframe.contentWindow?.print();
            
            // Remove o iframe após a impressão (timeout para garantir que o diálogo abriu)
            setTimeout(() => {
                document.body.removeChild(iframe);
            }, 1000);
        }, 500);
    };
  }

  private getPrintStyles(): string {
    return `
      /* Reset básico para impressão */
      * {
        box-sizing: border-box !important;
        -webkit-print-color-adjust: exact !important;
        print-color-adjust: exact !important;
      }

      body, html {
          margin: 0;
          padding: 0;
          background: white;
          width: 100%;
          height: 100%;
          overflow: visible; /* Permitir fluxo de página */
      }
      
      /* Remove sombras para evitar artefatos visuais */
      *, *::before, *::after {
          box-shadow: none !important;
          text-shadow: none !important;
          filter: none !important; /* Remove drop-shadow filters */
      }
      
      /* Garante que o conteúdo ocupe a largura correta e remove estilos do container clonado */
      body > div {
          display: block !important; /* Desativa flexbox/grid do container original */
          gap: 0 !important;
          width: 100% !important;
          max-width: 210mm !important; /* Limita A4 */
          margin: 0 auto !important;
          padding: 0 !important; /* Remove padding do container original (ex: p-8) */
          border: none !important;
          background: white !important;
      }

      /* Copia os estilos críticos de layout de etiquetas */
      .printable-page {
          display: grid !important;
          width: 100% !important; /* Ajuste para evitar overflow horizontal */
          max-width: 210mm !important;
          min-height: 296mm !important; /* Altura A4 aproximada segura */
          padding: 5mm !important; /* Margem de segurança */
          margin: 0 auto !important;
          background: white !important;
          box-shadow: none !important; /* Reforço específico */
          filter: none !important;
          page-break-after: always !important;
          break-after: page !important;
          grid-template-columns: repeat(3, 1fr); /* Default fallback */
          align-content: start;
          gap: 4mm;
          border: none !important; /* Remove bordas da página container */
      }
      
      .printable-page:last-child {
          page-break-after: auto !important;
          break-after: auto !important;
      }

      .blank-page {
          background: white !important;
      }

      /* Estilos utilitários usados nas etiquetas (Tailwind simplified) */
      .border { border-width: 1px; border-style: solid; }
      .border-slate-200 { border-color: #e2e8f0; }
      .rounded-lg { border-radius: 0.5rem; }
      .p-2 { padding: 0.5rem; }
      .flex { display: flex; }
      .flex-col { flex-direction: column; }
      .items-center { align-items: center; }
      .justify-center { justify-content: center; }
      .relative { position: relative; }
      .text-center { text-align: center; }
      .text-slate-800 { color: #1e293b; }
      .font-black { font-weight: 900; }
      .uppercase { text-transform: uppercase; }
      .truncate { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
      .text-\[10px\] { font-size: 10px; }
      .mb-1 { margin-bottom: 0.25rem; }
      .w-full { width: 100%; }
      .h-auto { height: auto; }
      .gap-2 { gap: 0.5rem; }
      
      /* Ocultar elementos marcados como no-print */
      .no-print { display: none !important; }
      
      @media print {
          @page { 
            size: A4; 
            margin: 0; /* Remove margens do navegador */
          }
      }
    `;
  }
}

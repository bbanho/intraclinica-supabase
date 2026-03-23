# ADR 001: Arquitetura Headless e Isolamento de Módulos (Frontend V2)

## 1. Status
**Aprovado** - 22/03/2026

## 2. Contexto e Problema
A versão 1 (Legado) do IntraClinica utilizava `divs` manipuladas manualmente com Tailwind para modais e popups, o que gerava severos bugs de CSS (Z-Index, Overflow e Stacking Contexts), exigindo manutenção constante.
Além disso, havia um risco contínuo de dependência circular entre módulos (ex: Recepção importando o Prontuário diretamente), o que violava o princípio do "SaaS Multi-tenant Modular", onde clínicas poderiam contratar/desativar módulos separadamente, quebrando a build ao fazer isso.
A solução deveria ser imensamente produtiva (amigável à IA), blindada contra bugs de UI, com curva de aprendizado suave (mantendo Angular) e livre de pesadas reescritas de Backend (Supabase mantido como fonte da verdade).

## 3. Decisão Arquitetural
Adotamos o padrão **Feature-Sliced Design (FSD)** adaptado para Angular 18+ com a filosofia **Headless UI**, definindo as seguintes regras inegociáveis:

1.  **A "Camada Invisível" (Física da UI):** O projeto utilizará ESTRITAMENTE o pacote oficial `@angular/cdk` (Component Dev Kit) do Google para lidar com Modais (`Dialog`), Overlays, Portals, Focus Traps e Accessibility. Componentes de UI de terceiros opinativos (ex: Angular Material clássico, ou bibliotecas Alfa/Instáveis como Spartan/UI) estão proscritos para evitar *Vendor Lock-in* de design e conflito de dependências CSS.
2.  **A "Camada Visível" (Pintura):** Todo o design visual será codificado exclusivamente com **Tailwind CSS** usando os utilitários sobre as estruturas invisíveis do CDK.
3.  **Muros de Concreto (Isolamento de Features):** É expressamente PROIBIDO que a pasta `src/app/features/X` importe qualquer arquivo da pasta `src/app/features/Y`. Toda comunicação entre módulos se dá via injeção de `Signals` ou de Services na pasta `/core/services` e `/core/store`. 
4.  **Toggles por Clínica:** Os roteamentos dos módulos serão gerenciados via *Lazy Loading* (`loadComponent` no `app.routes.ts`) protegidos por `Guards` baseados nos metadados de permissão do usuário logado (IAM/SaaS Plan do Supabase), garantindo que código de módulos não contratados sequer seja baixado.
5.  **Padrão Estrangulador:** O frontend legado (V1) permanece operante. O frontend-v2 o estrangula módulo a módulo, seguindo a ordem de dependência bottom-up (Core -> Pacientes/Estoque -> Operacional -> Complexos).

## 4. Consequências

### Pontos Positivos
*   **Velocidade IA Máxima:** Agentes de IA produzem código Tailwind + Angular CDK com 100% de precisão e sem alucinações de layouts quebrados.
*   **Estabilidade Visual Absoluta:** O CDK isola os Modais e Drops no fim do `<body>` do HTML, imunizando a interface contra erros de `overflow-hidden` na árvore de roteamento.
*   **Escalabilidade Infinita de Código:** A proibição do cruzamento de diretórios na pasta `features` previne a síndrome do "Código Espaguete". Módulos são plug-and-play.
*   **Baixo Custo de Infraestrutura:** Ao separar rigidamente o papel da UI (Apenas visualização) da regra de negócio (Mantida nas RPCs/RLS do Supabase), eliminamos a necessidade de uma VPS pesada no futuro; o frontend V2 continua podendo ser hospedado via CDN gratuíta (Cloudflare Pages, etc.).

### Pontos Negativos e Riscos (Trade-offs)
*   **Boilerplate Inicial de UI:** Teremos que escrever o esqueleto HTML do zero para botões e inputs e usar `tailwind-merge` se quisermos reutilizá-los largamente (o que uma lib pronta faria), mas esse custo de Setup (Fase 1) é pago uma única vez.
*   **Curva de Isolamento:** Requer extrema vigilância dos Agentes e Revisores Humanos para barrar *Pull Requests* que façam _Imports_ relativos entre features irmãs (`../../outra-feature/`).
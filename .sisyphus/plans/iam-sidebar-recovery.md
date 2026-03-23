# Plan: IAM Sidebar Recovery & Production Deploy

## Objetivo
Restaurar a interface funcional do painel legado em produção, garantindo que o deploy das nossas refatorações (Procedures, Social, Signal Stores) e correções de bugs (UUID 'all', NG0600) chegue ao servidor.

## Tarefas (Execution Graph)
1. **[Visual Engineering]** Modificar `frontend/src/app/layout/main-layout.component.ts`.
   - Criar um signal computado `hasAnyModuleAccess` que verifica se `iam.userBindings()` tem chaves válidas.
   - Adicionar um bloco `@if (!hasAnyModuleAccess())` no final da `<nav>` exibindo um card Tailwind bonito com a mensagem "Acesso Restrito: Você não possui módulos habilitados nesta clínica".
2. **[Git/GitHub Automation]** 
   - Fazer commit da alteração visual.
   - Fazer push da branch `fix/iam-sidebar-recovery` para o remote (`origin`).
   - Usar `gh pr create` para abrir o Pull Request e engatilhar a esteira de CI/CD.

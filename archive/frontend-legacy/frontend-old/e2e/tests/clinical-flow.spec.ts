import { test, expect } from '../fixtures/auth.fixture';

test.describe('E2E: Clinical Flow (Recepção -> Prontuário)', () => {
  
  test('O fluxo de vida do agendamento deve funcionar sem erros', async ({ authedPage: page }) => {
    
    test.setTimeout(45000); // 45s de tempo extra para fluxo longo de UI
    
    // ---------------------------------------------------------
    // 1. Recepção: Criar o agendamento
    // ---------------------------------------------------------
    await page.goto('/reception');
    
    // Abrir modal de novo agendamento
    await page.getByRole('button', { name: /novo agendamento/i }).click();
    
    // Preencher o modal
    const modal = page.locator('[role="dialog"], .bg-white.rounded-3xl.shadow-2xl');
    await expect(modal).toBeVisible();

    // Como já sabemos pelo `reception.component.ts`, temos um input de busca
    await modal.getByPlaceholder('Nome, CPF ou Telefone...').fill('Teste Paciente Flow E2E');
    await page.waitForTimeout(500); // Debounce time
    
    // Clicar no botão "Novo Paciente" (se ele não achar na busca)
    await modal.getByRole('button', { name: /novo paciente/i }).click();

    // Preencher o formulário de novo paciente
    await modal.getByPlaceholder('Ex: João da Silva').fill('Paciente Flow E2E');
    
    // Salvar paciente e agendamento (que está no mesmo modal agora)
    await modal.getByLabel('Data da Consulta').fill('2026-12-31');
    await modal.getByRole('button', { name: /salvar/i }).click();

    // Tratar o alert de "Paciente criado! Busque novamente"
    page.on('dialog', dialog => dialog.accept());
    
    // Aguarda carregar
    await page.waitForTimeout(1000);

    // Abre modal de novo
    await page.getByRole('button', { name: /novo agendamento/i }).click();
    await modal.getByPlaceholder('Nome, CPF ou Telefone...').fill('Paciente Flow E2E');
    await page.waitForTimeout(500);

    // Clica no resultado da busca
    await page.locator('button').filter({ hasText: 'Paciente Flow E2E' }).first().click();

    // Preenche data da consulta e salva agendamento real
    await modal.getByLabel('Data da Consulta').fill('2026-12-31T10:00');
    await modal.getByRole('button', { name: /salvar/i }).click();

    // ---------------------------------------------------------
    // 2. Recepção: Fazer o Check-in
    // ---------------------------------------------------------
    // Procurar paciente "Paciente Flow E2E" na Fila de Recepção (Tab "Fila")
    await page.getByRole('button', { name: /fila/i }).click();
    
    // Clicar em "Fazer Check-in" 
    const patientCard = page.locator('.bg-white', { hasText: 'Paciente Flow E2E' });
    await expect(patientCard).toBeVisible();
    await patientCard.getByRole('button', { name: /check-in/i }).click();

    // Validar se status mudou para Aguardando (Geralmente a UI muda a cor ou tira o botão)
    await expect(patientCard).toContainText('Aguardando');

    // ---------------------------------------------------------
    // 3. Prontuário: Chamar e Atender
    // ---------------------------------------------------------
    await page.goto('/clinical');

    // Na lista "Aguardando Atendimento", clicar em Chamar
    const clinicalCard = page.locator('.bg-white', { hasText: 'Paciente Flow E2E' });
    await expect(clinicalCard).toBeVisible();
    await clinicalCard.getByRole('button', { name: /chamar/i }).click();

    // O status muda para "Chamado". O botão passa a ser "Iniciar Atendimento".
    await clinicalCard.getByRole('button', { name: /iniciar/i }).click();

    // Isso deve travar o paciente no contexto (aba de Prontuário abre)
    await expect(page.getByRole('heading', { name: 'Paciente Flow E2E' })).toBeVisible();

    // ---------------------------------------------------------
    // 4. Prontuário: Criar Registro Clínico e Finalizar
    // ---------------------------------------------------------
    // Escrever algo no editor
    await page.locator('.ProseMirror, textarea').fill('Paciente não apresentou queixas. Tudo OK na revisão.');
    
    // Salvar Evolução
    await page.getByRole('button', { name: /salvar evolução/i }).click();
    
    // Finalizar Atendimento
    await page.getByRole('button', { name: /finalizar atendimento/i }).click();

    // Validar se a tela voltou para a lista de espera
    await expect(page.getByText('Nenhum paciente em atendimento')).toBeVisible();

    // Garantir que a lista de aguardando não tem mais ele
    await expect(clinicalCard).not.toBeVisible();

  });
});
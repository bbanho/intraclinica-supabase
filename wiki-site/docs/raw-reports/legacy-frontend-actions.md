---
title: Relatório Cru - Ações do Frontend Legado
description: Extração bruta das ações atômicas encontradas no painel Angular antigo.
---

# Relatório Cru: Ações do Frontend Legado

*Este relatório foi gerado via agente explorador varrendo o diretório `/archive/frontend-legacy/` para mapear todas as ações atômicas implícitas (CRUDs e UX) que precisam ser transportadas para o novo painel IAM.*

## 🩺 Clinical (Prontuário e Atendimento)
- **Call Patient to Room:** Atualizar o status de um agendamento para "Chamado" especificando a sala.
- **Start Consultation:** Atualizar status para "Em Atendimento".
- **Finish Consultation:** Concluir atendimento (status "Realizado") e salvar as notas registradas no histórico.
- **View Patient History:** Exibir prontuários passados do paciente selecionado.
- **Record Consultation Notes:** Digitar ou ditar manualmente as observações clínicas.
- **Toggle Audio Recording (Speech-to-Text):** Usar API nativa do browser para transcrever voz do médico.
- **Start Gemini Live:** Iniciar sessão de voz em tempo real via Cloud AI.
- **Load/Unload Local AI Model:** Baixar e instanciar modelo WebGPU local (Gemma 2B / Llama 3) offline.
- **Format Prontuário:** Usar IA (Cloud ou Local) para reestruturar notas de voz em prontuário padrão.
- **Refine Notes with Local AI:** Resumir ou melhorar notas clínicas via prompt local.
- **Perform Clinical Procedure:** Selecionar paciente e procedimento, debitando automaticamente os itens do estoque.

## 📊 Reports & Dashboards (Financeiro e Gestão)
- **View Dashboard Metrics:** Exibir Valor Total em Estoque, Contagem de Agendamentos, Itens em Baixa, Transações.
- **View Weekly Flow Chart:** Gráfico de transações IN e OUT de estoque nos últimos 7 dias.
- **View Appointment Density:** Analisar horários de pico de agendamento (histórico).
- **Request Finance Access:** Disparar fluxo de solicitação de acesso (salvando motivo) se faltar permissão IAM financeira.
- **Generate AI Strategic Analysis:** Processar contexto (estoque, agenda) via Gemini para insights em texto.

## 📢 Marketing & Social Media
- **View Social Posts History:** Listar todos os posts gerados anteriormente para a clínica.
- **Select Generated Post:** Exibir detalhes (legenda, plataforma, hashtags, data) de um post existente.
- **Generate Social Media Content:** Inputar tópico e tom, invocando Gemini para legenda promocional.
- **Copy Content to Clipboard:** Copiar texto gerado para a área de transferência.

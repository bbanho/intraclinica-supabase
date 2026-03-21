# Guia do Usuário: IntraClinica (Médico Assinante)

Bem-vindo ao **IntraClinica**! Este guia foi elaborado para ajudar você (médico, gestor ou profissional de saúde assinante) a extrair o máximo do nosso ecossistema SaaS de gestão médica. 

A interface da sua unidade é customizável. Se você não visualizar algum dos módulos abaixo no menu lateral, significa que ele não foi habilitado para a sua clínica pela Administração Global.

---

## 1. Recepção e Triagem (`/reception`)

O módulo de recepção é o coração do fluxo da clínica. Ele permite visualizar e gerenciar todos os pacientes que passarão por atendimento no dia.

*   **Status de Agendamento:** O fluxo de atendimento é linear e controlado por cores:
    *   **Agendado** (Cinza): O paciente está marcado para o futuro.
    *   **Aguardando** (Amarelo): O paciente chegou na clínica (Check-in realizado).
    *   **Chamado** (Roxo): O paciente foi chamado para o consultório ou sala de triagem.
    *   **Em Atendimento** (Azul): O paciente está atualmente com o médico.
    *   **Realizado** (Verde): O atendimento foi finalizado.
*   **Ações da Recepção:** O time da recepção pode adicionar pacientes avulsos, buscar pacientes no banco de dados para marcar novos horários e atualizar em qual "Guichê" ou "Consultório" o paciente deve ser direcionado.

## 2. Pacientes e Prontuários IA (`/patients` & `/clinical`)

A gestão clínica do paciente é centralizada, rápida e inteligente.

*   **Base de Pacientes (`/patients`):** Uma visão tabular completa de todos os seus pacientes, com informações de contato, CPF e histórico de registros.
*   **Prontuário IA (`/clinical`):** A execução clínica permite que você anote evoluções, emita atestados e crie prescrições com o apoio de Inteligência Artificial.
    *   *Como usar:* Ao clicar em "Gerar com IA", você pode ditar ou escrever tópicos soltos (ex: "paciente com dor de cabeça há 3 dias, febre leve, suspeita de sinusite, prescrever ibuprofeno"). A IA formatará o texto no padrão médico formal (SOAP).
    *   *Histórico:* Todo registro (evolução, atestado, exame) fica salvo no banco de dados criptografado da clínica com o timestamp e nome do profissional responsável.

## 3. Consultas e Agendamentos (`/appointments`)

Uma visão direta focada puramente na agenda médica. 

*   *Diferença para a Recepção:* Enquanto a Recepção foca no fluxo do dia (quem chegou, quem está aguardando), o módulo de Consultas permite gerenciar a agenda futura, realocações e cancelamentos de qualquer tipo de atendimento (Consulta, Retorno, Exame, Procedimento).

## 4. Estoque e Etiquetas (`/inventory`)

Se a sua clínica trabalha com insumos (ex: preenchedores, seringas, medicações), este módulo previne desperdícios.

*   **Catálogo de Produtos:** Você cadastra seus insumos (ex: "Toxina Botulínica 1ml", "Ácido Hialurônico") configurando um **Estoque Mínimo** de segurança.
*   **Movimentações:** Qualquer entrada (compra) ou saída (uso, perda) deve ser lançada.
*   **Baixa Automática:** O estoque conversa com o módulo de **Procedimentos**. Se uma receita de procedimento for configurada para usar "1 seringa" e "1 par de luvas", ao marcar o procedimento como "Realizado", esses itens saem automaticamente do seu inventário.

## 5. Procedimentos (`/procedures`)

Focado em padronização clínica e orçamentária.

*   **Tipos de Procedimento:** Permite cadastrar serviços oferecidos pela sua clínica (ex: "Limpeza de Pele", "Aplicação de Botox").
*   **Receitas (Kits):** Para cada procedimento, você pode atrelar os insumos exatos consumidos. Assim, padroniza-se o custo e integra-se diretamente com o estoque para evitar ruptura.

## 6. Indicadores e Relatórios (`/reports`)

O módulo de BI (Business Intelligence) exibe o pulso da sua clínica.

*   **Gráficos em Tempo Real:** Veja o volume de consultas do dia, a distribuição de pacientes e estatísticas financeiras simplificadas.
*   **Insight IA:** Nossa IA analisa os dados numéricos do mês (tendência de faltas, produtos mais usados) e escreve um resumo executivo para você em linguagem simples, recomendando ações.

## 7. Marketing IA (`/social`)

Para médicos que também empreendem nas redes sociais, mas não têm tempo de escrever posts.

*   **Gerador de Conteúdo:** Insira o tópico (ex: "A importância do protetor solar no inverno") e escolha o tom de voz (ex: "Amigável e Acolhedor", "Profissional e Técnico").
*   **Resultado:** A IA gerará um texto de legenda completo, já com quebras de linha ideais e as melhores hashtags para o Instagram ou LinkedIn da sua clínica.

---

*IntraClinica — Sua operação médica no piloto automático.*
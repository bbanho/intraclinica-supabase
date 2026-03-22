# Manual de Operação e Governança Clínica: IntraClinica

Este documento constitui a documentação oficial de operação do **IntraClinica**, detalhando os fluxos de trabalho, a arquitetura de permissões e a integração entre os módulos do sistema. Ele foi redigido para fornecer a gestores, médicos e parceiros estratégicos uma compreensão profunda de como a plataforma orquestra a jornada do paciente e a administração da unidade de saúde.

---

## 1. Visão Geral do Ecossistema

O IntraClinica não é apenas uma agenda digital; é um ecossistema **SaaS Multi-Tenant** e **AI-First**. Ele foi projetado para eliminar a fragmentação de dados que ocorre quando clínicas usam softwares diferentes para recepção, prontuário e controle de estoque.

A premissa central do sistema é a **Interoperabilidade de Módulos**: uma ação que ocorre na recepção reflete instantaneamente na tela do médico, e uma ação do médico (como a realização de um procedimento) reflete instantaneamente na baixa de custos do estoque.

### 1.1. Arquitetura de Módulos (Config-Driven UI)
A plataforma adapta-se à realidade de cada clínica. Através de um painel de governança, administradores podem habilitar ou desabilitar módulos específicos (ex: uma clínica de psicologia pode desabilitar o módulo de "Estoque e Procedimentos", mantendo apenas "Prontuário" e "Agenda"). A interface do sistema se reconfigura em tempo real com base nestas permissões.

---

## 2. Perfis de Acesso e Governança (IAM)

A segurança e a responsabilidade das ações são garantidas por um sistema de controle de acesso baseado em funções (RBAC). Cada usuário possui uma visão restrita às suas necessidades operacionais.

*   **Recepção (`RECEPTION`):** Focada no fluxo do dia. Tem acesso à criação de pacientes, agendamentos, e alteração de status de atendimento (Check-in). Não possui acesso a dados financeiros ou prontuários clínicos.
*   **Médico / Especialista (`DOCTOR`):** Acesso total à execução clínica. Pode visualizar a fila de espera, iniciar atendimentos, redigir evoluções (com ou sem IA) e dar baixa em procedimentos.
*   **Gestor de Estoque (`STOCK_MANAGER`):** Focado no *Backoffice*. Controla entradas de notas fiscais, níveis mínimos de segurança e custos médios de produtos.
*   **Administrador da Clínica (`CLINIC_ADMIN`):** Visão 360º da unidade. Acesso aos relatórios gerenciais (BI), controle de equipe e faturamento.

---

## 3. A Jornada do Paciente (Passo a Passo Operacional)

A operação do sistema segue uma linha do tempo clara, desenhada para evitar gargalos físicos na clínica.

### Fase 1: Agendamento e Chegada (`/reception` & `/appointments`)
1. **Cadastro:** O paciente é registrado no banco de dados único da clínica (CPF, Data de Nascimento, Contato).
2. **Marcação:** O atendimento é agendado (Consulta, Retorno, Exame ou Procedimento) e alocado para um profissional específico. O status inicial é **"Agendado"**.
3. **Check-in (A Chegada):** Quando o paciente cruza a porta da clínica, a recepção localiza o agendamento no painel do dia e altera o status para **"Aguardando"**. Opcionalmente, informa-se em qual guichê ou sala de triagem o paciente está.
   * *Impacto no Sistema:* Neste exato segundo, o nome do paciente aparece na tela do médico dentro do consultório, na lista de "Pacientes em Espera".

### Fase 2: O Atendimento Clínico (`/clinical`)
O módulo clínico foi desenhado para ser "ergonômico". Médicos têm pouco tempo entre pacientes e não devem focar em burocracia sistêmica.

1. **Chamada:** O médico clica em **"Chamar Paciente"**. O status muda para **"Chamado"** (notificando a recepção) e, em seguida, para **"Em Atendimento"**.
2. **O Prontuário IA:** O núcleo do sistema. Em vez de preencher dezenas de campos manuais, o médico pode utilizar o motor de Inteligência Artificial nativo.
   * *A Dinâmica:* O médico dita ou digita de forma bruta suas observações (ex: "Paciente relata dor lombar há 2 semanas, piora ao curvar. Solicito ressonância e prescrevo miorrelaxante").
   * *O Processamento:* A IA processa a entrada e estrutura o texto no padrão **SOAP** (Subjetivo, Objetivo, Avaliação, Plano), gerando um documento médico formal, claro e padronizado.
3. **Assinatura e Imutabilidade:** Ao finalizar, a evolução é gravada no banco de dados com um *timestamp* irreversível e atrelada ao identificador (ID) do médico, garantindo segurança jurídica.

### Fase 3: Procedimentos e Baixa de Estoque (`/procedures` & `/inventory`)
Este é o diferencial de clínicas de alta performance, onde o controle de custos é vital (ex: Harmonização Facial, Dermatologia, Odontologia).

1. **Receita do Procedimento:** Previamente, o gestor configura "Receitas". Por exemplo, o procedimento *Aplicação de Toxina Botulínica* exige 1 Seringa, 1 Agulha e 1 Frasco de Toxina.
2. **Execução:** Quando o médico finaliza o atendimento clínico e marca que o procedimento "X" foi realizado, o IntraClinica entra em ação no background.
3. **Dedução Automática:** O sistema vai até o módulo de Estoque, localiza os lotes dos produtos configurados na receita e subtrai as quantidades exatas.
4. **Alerta de Ruptura:** Se o frasco de Toxina Botulínica atingir o "Estoque Mínimo" pré-definido, o painel do `STOCK_MANAGER` emite um alerta de reposição, evitando que a clínica tenha que cancelar pacientes no dia seguinte por falta de insumos.

---

## 4. Governança e Inteligência de Negócio

Para que a clínica seja lucrativa, a operação deve gerar dados que se transformam em decisões.

### 4.1. Indicadores de Performance (`/reports`)
O painel de BI da clínica consome os dados dos módulos acima em tempo real para responder perguntas críticas:
* Qual o volume de consultas realizadas vs. canceladas (No-shows)?
* Qual o procedimento mais rentável da unidade?
* Qual profissional possui o maior tempo de atendimento?

**Insight IA:** Além dos gráficos, o sistema possui um "Conselheiro Virtual". O gestor pode solicitar à IA que analise os números do mês e redija um sumário executivo com recomendações de melhoria de eficiência.

### 4.2. Marketing Médico Autônomo (`/social`)
Clínicas modernas dependem de captação contínua de pacientes particulares via redes sociais. O módulo Social resolve o problema do "bloqueio criativo" da equipe de marketing ou do próprio médico.
* O usuário insere um tema técnico (Ex: *Cuidados com a pele no outono*).
* Define a "Persona" da clínica (Ex: *Acolhedor e Amigável* ou *Técnico e Científico*).
* A IA conectada ao Gemini gera textos completos para Instagram ou LinkedIn, aplicando gatilhos de engajamento, chamadas para ação (CTAs) para agendamento e as hashtags com maior tração no momento.

---

## 5. Arquitetura Técnica e Segurança (Resumo para Investidores)

* **Zero-Trust & RLS:** O sistema não confia cegamente no painel do usuário. A segurança é aplicada na raiz do banco de dados (Row Level Security no PostgreSQL). Mesmo que um usuário mal-intencionado tente forçar uma requisição, o banco de dados rejeita se ele não pertencer à clínica específica daquele dado.
* **Escalabilidade (State Management):** A arquitetura de frontend foi modernizada para utilizar **Angular Signals**. Isso significa que o aplicativo não sofre "reloads" pesados e consome o mínimo de memória do computador da recepção ou do tablet do médico. A sincronização de telas é quase instantânea.
* **Governança Global:** Caso o modelo de negócio expanda para franquias, o sistema conta com um perfil `SUPER_ADMIN` que pode visualizar a saúde (ARR, Churn, Uptime) de múltiplas clínicas simultaneamente, criando novas unidades e distribuindo licenças em segundos através de um painel de controle SaaS unificado.

---

*IntraClinica — Inteligência, Controle e Cuidado.*

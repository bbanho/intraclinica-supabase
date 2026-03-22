# Caso Crítico 05: A Tela Mágica (Config-Driven UI) e Multi-Tenancy

Software médico genérico é feito para todas as especialidades e, paradoxalmente, não atende ninguém. Uma clínica de psicologia (que vende apenas sessões de 50 min) não precisa e não deve ver botões de "Estoque" ou "Seringas".

---

### 🌪️ O Cenário (A Dor do Engessamento)
O investidor fecha negócio com um terceiro parceiro e cria uma "Nova Clínica" no painel SaaS. Quando o gestor local dessa nova clínica entra no sistema, ele se depara com um ambiente poluído e tenta acessar a agenda de outra unidade sem sucesso, ou a recepcionista vê abas inteiras que não fazem parte do seu trabalho. 

![A Governança SaaS Global](assets/01-auth-login-screen.png)
*(O SUPER_ADMIN no momento do login para gerenciar todas as unidades da franquia).*

**A Realidade Técnica:** O desenvolvedor do SaaS entra no painel, a Nova Clínica recém-criada ("nova clinica") é um ambiente estéril. Não há 1 paciente, não há 1 procedimento listado no inventário, a agenda do dia está totalmente em branco (vazia). O sistema só existe no papel para ela.

### ⚙️ Passo 1: A Ação no IntraClinica (Interface Dinâmica Controlada por Banco de Dados)
A interface do IntraClinica é **Config-Driven UI**.

![Painel de Configurações SaaS](assets/10-admin-ui-config.png)
*(Aba "Configurações SaaS" no Painel Administrativo).*

O Investidor/Super Admin tem a visão do ecossistema e dos *Tenants* (Clínicas).

### ⚙️ Passo 2: "Ligar/Desligar Módulos"
O painel mostra a lista de todas as *features* do SaaS. O investidor simplesmente desmarca a caixa "Gestão de Insumos" (Estoque) ou "Procedimentos" para a clínica de Psicologia, mas deixa ativado para a clínica Dermatológica.

### 🧠 Passo 3: A Mágica do NEXUS (Como a Engenharia age)
A mágica acontece em duas camadas profundas de engenharia de software moderno (Angular Signals + Supabase RLS):

*   **1. Row Level Security (RLS - Segurança Multi-Tenant de Banco de Dados):**
    *   No momento em que a "Nova Clínica" é instanciada pelo Administrador Global, o banco de dados Supabase levanta paredes isoladas criptográficas (`auth.clinic_id()`). Nenhum dado de pacientes, estoque ou finanças da "Clínica Piloto" (a clínica caótica e lotada que vimos nos outros prints) vaza para a nova unidade.
    *   *O Vazio Proposital:* A nova unidade é um deserto isolado. Isso não é um *bug*, é a maior proteção contra vazamento de dados (LGPD) que o investidor pode garantir. É impossível que um médico de uma unidade acesse a agenda de outra sem permissão explícita (IAM) com privilégios de Administrador.

*   **2. A Tela se Transmuta em Milissegundos:**
    *   Quando o Admin Global clica em "Desligar Módulo de Estoque", a resposta reativa (Signals) do Angular não precisa dar *reload* na tela do usuário logado naquela unidade.
    *   O menu lateral na tela do gestor daquela clínica pisca e **o botão "Estoque e Etiquetas" desaparece da interface imediatamente**. A barra de navegação (`/inventory`) é fisicamente limpa e extirpada da visão do funcionário, simplificando a curva de aprendizado do sistema para focar estritamente no lucro da operação daquele nicho específico.

### 📈 O Resultado Técnico
Um verdadeiro **Software como Serviço (SaaS)** governável globalmente, modularizado e com proteção de dados estrita (LGPD/Multi-Tenant Security), eliminando a "Síndrome de Frankenstein" de UI que afeta sistemas antigos de mercado. O painel de "Indicadores (Reports)" também reflete essas exclusões instantaneamente.

![Dashboard de Indicadores Dinâmico](assets/08-reports-dashboard.png)
*(Os relatórios gerenciais e gráficos refletem com exatidão apenas os módulos que a clínica contratou).*

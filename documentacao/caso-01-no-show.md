# Caso Crítico 01: O "Efeito Dominó" das Faltas (No-Shows)

O maior ralo financeiro de uma clínica particular não é o custo fixo, é a **hora clínica ociosa**. Quando um paciente falta, o médico fica parado, a energia é gasta e a receita não entra.

---

### 🎭 Os Atores
*   **Recepção:** Sobrecarregada, tentando ligar para a lista de espera.
*   **Médico:** Frustrado aguardando o paciente que não chegou.
*   **Gestor/Investidor:** Vendo o faturamento diário derreter.

### 🌪️ O Cenário (O Caos)
Chove forte numa sexta-feira à tarde. Dois pacientes enviam mensagens cancelando consultas de alto valor (ex: harmonização facial) faltando apenas 30 minutos para o horário. A clínica acaba de perder R$ 2.000,00 no dia. A recepcionista entra em pânico e começa a ligar para as 15 pessoas da lista de espera. Ninguém atende ou os pacientes dizem que "estão longe e não conseguem chegar a tempo". 

### ⚙️ A Ação no IntraClinica
A recepcionista não precisa abrir planilhas ou cadernos. No módulo de Recepção (Kanban Clínico), ela simplesmente clica no card do paciente e altera o status para **"Cancelado"**.

![Kanban da Recepção e Fila de Espera](assets/03-reception-board.png)

### 🧠 A Mágica do NEXUS (Como a IA age)
No milissegundo em que o card fica vermelho ("Cancelado"), o sistema IntraClinica deixa de ser um software passivo e se torna um parceiro de negócios ativo:

1. **Identificação da Lacuna:** O NEXUS lê a agenda do médico e percebe que um slot premium (1 hora) foi aberto das 14h às 15h.
2. **Varredura Inteligente:** A IA varre o banco de dados da **Lista de Espera** da clínica, filtrando apenas pacientes que moram na região (cruzamento de CEP) e que solicitaram aquele mesmo tipo de procedimento.
3. **Disparo Ativo (WhatsApp):** Sem nenhuma intervenção humana, o NEXUS utiliza a API do WhatsApp para disparar mensagens personalizadas e em linguagem natural para os 3 pacientes mais propensos: 
   > *"Olá, João! Tudo bem? Tivemos uma liberação de agenda de última hora com a Dra. Mariana agora às 14h. Como você estava na nossa lista de espera para o procedimento, gostaria de aproveitar essa vaga?"*
4. **Confirmação:** O primeiro paciente que responder "Sim", o bot do WhatsApp interpreta a intenção afirmativa via IA e **insere o paciente automaticamente no Kanban da recepção**, já com o status "Agendado".

### 📈 O Resultado Operacional
A vaga foi preenchida em 4 minutos. A recepcionista não precisou fazer uma única ligação. O médico foi notificado no consultório sobre a troca de pacientes. **Os R$ 2.000,00 foram recuperados.**

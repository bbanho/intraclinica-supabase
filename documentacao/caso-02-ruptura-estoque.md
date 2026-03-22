# Caso Crítico 02: A Ruptura Oculta de Insumos (Alto Custo)

Procedimentos de estética (Botox, Ácidos, Fios PDO) ou odontologia (Implantes) possuem insumos com altíssimo valor agregado (R$ 800 - R$ 2.000 a ampola) e vencimentos rígidos. Faltar produto na hora H é inaceitável.

---

### 🎭 Os Atores
*   **Médico:** Constrangido na frente do paciente na cadeira.
*   **Gestor de Estoque/Almoxarife:** Cobrado por não ter feito o pedido ou deixado o produto vencer.
*   **Paciente:** Pronto para o procedimento, maquiagem retirada, anestésico no rosto.
*   **Investidor:** Perdendo dinheiro na ponta da linha.

### 🌪️ O Cenário (O Prejuízo)
A paciente está sentada na cadeira da clínica dermatológica. O médico abre a gaveta e percebe que a última seringa de *Ácido Hialurônico (Juvederm)* venceu semana passada ou já foi usada. O constrangimento é imediato, a venda é perdida, o paciente fica furioso e o estoque "de papel" (ou Excel) falhou em avisar o gestor. O investimento em marketing para trazer o paciente foi jogado fora.

### ⚙️ A Ação no IntraClinica
No IntraClinica, o *Estoque* nunca é uma "tabela de excel glorificada". Ele conversa em tempo real com as *Receitas de Procedimento*.

![Estoque Crítico Alerta](assets/02-inventory-products.png)

A clínica cadastra "Receitas". Por exemplo:
> **Harmonização Facial** = 1 Seringa de Ácido + 1 Anestésico + 2 Pares de Luva.

Quando o médico, lá no **Prontuário**, marca que o procedimento "Harmonização" foi **Realizado**, o sistema entra no almoxarifado em milissegundos e desconta os itens exatos utilizando o método FIFO (Primeiro que Vence, Primeiro que Sai).

### 🧠 A Mágica do NEXUS (Como a IA age)
O IntraClinica não espera o produto acabar para piscar o alerta vermelho de "Estoque Crítico" (foto acima) na tela do gestor. Ele usa a **Inteligência Preditiva (NEXUS)**:

1. **Previsão de Demanda:** A IA do NEXUS lê a agenda inteira dos médicos da clínica para os **próximos 15 dias**.
2. **Cálculo de Consumo:** Se a IA constata que existem **10 aplicações de Toxina Botulínica agendadas** para a próxima semana, mas o estoque físico atual só tem **8 frascos**, o sistema entra em Alerta Crítico hoje.
3. **Notificação Ativa:** O painel do Administrador ou do Gestor de Insumos dispara uma notificação (Push/WhatsApp): *"Atenção: Risco de ruptura detectado. Você tem 10 Botox agendados até 28/03, mas apenas 8 no estoque. Recomenda-se compra imediata de 2 frascos."*

### 📈 O Resultado Operacional
A clínica implanta o conceito de **Just-in-Time**. O gestor não precisa manter R$ 50.000,00 de capital de giro "preso" no almoxarifado (com risco de vencimento) e nunca mais um paciente será despachado para casa por falta de agulha ou preenchedor.

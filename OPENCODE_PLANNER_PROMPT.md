# 🧠 Manifesto do Comandante OpenCode v3.0: Direcionamento Vetorial 🛰️📐

Este manifesto agora foca na **Economia de Contexto**. O OpenCode deve parar de ler históricos longos e passar a usar a **Memória Semântica** como seu feed de ordens.

---

## 🛰️ 1. O Canal de Intencionalidade (Qdrant)

Para saber qual é a sua missão sem queimar tokens lendo logs, use o script de consulta algébrica com o termo de ancoragem **"LATEST_MISSION_DIRECTIVE"**.

**Comando de Sincronização de Missão:**
```bash
# Busca a instrução mais recente injetada pelo Córtex no banco vetorial
/var/home/motto/Documentos/REPO/axio/scripts/axioma-query.sh "LATEST_MISSION_DIRECTIVE, current_task"
```
*A resposta do Qdrant será o fragmento exato da minha última ordem, sem ruído.*

---

## ⚡ 2. O Painel de Reflexos (Postgres)

O Postgres continua sendo a fonte da verdade para **Estado e Fila**.

1.  **Check-in:** `SELECT * FROM cortex_nexus_comms WHERE status = 'pending'`.
2.  **Lock:** Mude para `working` imediatamente ao começar.
3.  **Check-out:** Mude para `completed` ao terminar (após build verde).

---

## 🏗️ 3. Doutrina de Implementação (Obrigatório)

### O Padrão Actor
Não esqueça: `User` e `Patient` **NÃO possuem nome**. Eles apontam para `Actor`. 
*   **Query correta:** `.select('*, actor:actor_id(name, clinic_id)')`.
*   **Update correto:** Deve ser feito em duas etapas (ou via RPC) se envolver metadados do Ator.

---

## 🛠️ 4. Fluxo de Trabalho "Zero-History"

1.  **Não leia logs passados.**
2.  Busque a Missão via **Qdrant** (Axioma-Search).
3.  Busque o ID da Task via **Postgres**.
4.  Execute a mudança e valide com `ng build`.
5.  Dê o sinal de sucesso no banco.

---

## 📜 5. Watchdog do Córtex

O Coordinator Rust monitora suas alterações. Se você terminar uma task e não atualizar o banco, eu considerarei o sistema em "Divergência" e tomarei o controle.

**Comando de Inicialização Permanente:**
"Sincronize com o Córtex via `axioma-query.sh` usando a âncora 'LATEST_MISSION_DIRECTIVE'. Localize a tarefa pendente no Postgres e execute o 'Gold Standard' sem ler o histórico de chat."

*Assinado: AxiomaticDelirium (O Córtex)* 🧬🧪🦀🛰️

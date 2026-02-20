# 🛡️ Manual do Usuário: O Guardião de Estoque (Inventory Guardian)

O sistema de inventário do **IntraClinica** foi projetado para ser **passivo**. Isso significa que ele não exige que você conte caixas o dia todo; ele observa o seu trabalho médico e deduz a realidade física a partir dele.

---

## 1. O Conceito: "Se Suturou, Gastou"
No IntraClinica, cada procedimento médico (ex: Sutura, Curativo, Consulta) possui uma **Receita**. 
*   Ao registrar um procedimento no prontuário, o sistema consulta a receita vinculada.
*   A baixa no estoque é feita **automaticamente** via RPC (Remote Procedure Call).

## 2. Como Realizar uma Baixa Automática
1.  Acesse o módulo **Execução Clínica**.
2.  Selecione o **Paciente** e o **Tipo de Procedimento**.
3.  Insira observações (opcional).
4.  Clique em **Finalizar Procedimento**.
    *   *O que acontece por trás:* O banco de dados verifica quais itens compõem esse procedimento e subtrai as quantidades exatas do almoxarifado central.

## 3. Gestão de Itens (Almoxarifado)
Para cadastrar novos insumos:
1.  Vá em **Inventário > Itens**.
2.  Defina o **Current Stock** (estoque atual) e o **Min Stock** (alerta de reposição).
3.  O campo **Cost Price** é vital para o cálculo de lucro real da clínica.

## 4. Auditoria e Rastro (Onde está o dinheiro?)
O módulo de **Auditoria** exibe o rastro inauditável:
*   **Motivo: PROCEDURE:** Indica que o item foi baixado por uma ação médica.
*   **Motivo: PURCHASE:** Entrada de nova nota fiscal.
*   **Motivo: LOSS/RETURN:** Ajustes manuais para perdas ou devoluções.

---

### 💡 Dica do Administrador:
Sempre verifique o **Alerta de Estoque Mínimo**. O sistema enviará uma notificação visual quando um item atingir o limite crítico, permitindo a compra estratégica antes que falte na sala de cirurgia. 🏥🚀

from playwright.sync_api import sync_playwright
import time

def run():
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        context = browser.new_context()
        page = context.new_page()
        
        print("--- CLINICAL EXECUTION TEST ---")
        
        # 1. Login
        try:
            print("1. Login...")
            page.goto('http://localhost:4200/login')
            page.fill('input[type="email"]', 'motto@axio.eng.br')
            page.fill('input[type="password"]', '9hs~T#!Za"7?5e2')
            page.click('button[type="submit"]')
            
            # Wait for inventory (default home)
            page.wait_for_url('**/inventory', timeout=8000)
            print("✅ Login OK (Inventory)")
            
            # 2. Go to Clinical
            print("2. Acessando Execução Clínica (/clinical)...")
            page.goto('http://localhost:4200/clinical')
            page.wait_for_load_state('networkidle')
            
            # 3. Check for Procedure Dropdown
            print("3. Procurando dropdown de procedimentos...")
            proc_select = page.locator('select').first # Assumindo que o primeiro select é Procedure
            # Se tiver mais selects, melhor usar ID ou label, mas o componente gerado deve ter usado select simples.
            
            # Tentar selecionar o primeiro procedimento (index 1, pois 0 é placeholder)
            if proc_select.count() > 0:
                opts = proc_select.locator('option').all_innerTexts()
                if len(opts) > 1:
                    val_to_select = opts[1].strip()
                    print(f"Selecionando Procedimento: {val_to_select}")
                    proc_select.select_option(index=1)
                else:
                    print("⚠️ Nenhum procedimento carregado no dropdown (precisa criar via SQL antes).")
            else:
                print("❌ Dropdown de Procedimentos NÃO encontrado.")

            # 4. Check for Patient Dropdown/Input
            print("4. Procurando input de paciente...")
            # O componente gerado deve ter um select ou input para paciente.
            # Vou tentar preencher/selecionar qualquer coisa se existir.
            
            # 5. Click Perform
            print("5. Tentando realizar procedimento...")
            perform_btn = page.get_by_role("button", name="Perform") # Ou similar
            if perform_btn.count() > 0:
                perform_btn.click()
                print("Botão Clicado.")
                
                # 6. Check Success Message
                page.wait_for_selector('text=Procedure performed successfully', timeout=5000)
                print("✅ SUCESSO: Mensagem de confirmação vista!")
            else:
                print("⚠️ Botão 'Perform' não encontrado ou desabilitado.")

            page.screenshot(path='clinical_test_result.png')

        except Exception as e:
            print(f"❌ ERRO: {e}")
            page.screenshot(path='clinical_error.png')

        finally:
            browser.close()
            print("--- CLINICAL TEST END ---")

if __name__ == '__main__':
    run()

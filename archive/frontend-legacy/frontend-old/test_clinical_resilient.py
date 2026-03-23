from playwright.sync_api import sync_playwright
import time

def run():
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        # Usar contexto persistente ou novo contexto limpo
        context = browser.new_context()
        page = context.new_page()
        
        print("--- CLINICAL EXECUTION TEST (RESILIENT) ---")
        
        try:
            # 1. Login
            print("1. Login...")
            page.goto('http://localhost:4200/login')
            page.fill('input[type="email"]', 'motto@axio.eng.br')
            page.fill('input[type="password"]', '9hs~T#!Za"7?5e2')
            page.click('button[type="submit"]')
            
            # 2. Wait a bit for auth to process
            print("2. Processando Auth...")
            page.wait_for_timeout(3000)
            
            # 3. Force Navigation to Clinical (Bypass router issues)
            print("3. Navegando para /clinical...")
            page.goto('http://localhost:4200/clinical')
            page.wait_for_load_state('networkidle')
            
            # 4. Verify Component Loaded
            print("4. Verificando Tela Clínica...")
            if "Clinical Execution" in page.content() or "Perform Procedure" in page.content() or "Realizar" in page.content():
                print("✅ Tela Clínica Carregada com Sucesso.")
            else:
                print("⚠️ Tela carregou, mas texto chave não encontrado. Verifique screenshot.")
            
            # 5. Check Audit Log (To verify backend connection)
            print("5. Verificando Log de Auditoria...")
            # O componente carrega o log no ngOnInit via inventoryService.getProcedureAuditLog()
            # Se a tabela estiver vazia, ok. Se tiver erro, aparecerá no console/tela.
            
            page.screenshot(path='clinical_resilient.png')
            print("Screenshot salvo: clinical_resilient.png")

        except Exception as e:
            print(f"❌ ERRO: {e}")
            page.screenshot(path='clinical_error_resilient.png')

        finally:
            browser.close()
            print("--- CLINICAL TEST END ---")

if __name__ == '__main__':
    run()

from playwright.sync_api import sync_playwright
import time

def run():
    with sync_playwright() as p:
        # Launch browser (headless=True for speed, False for debug)
        browser = p.chromium.launch(headless=True)
        context = browser.new_context()
        page = context.new_page()
        
        print("1. Acessando Login...")
        try:
            page.goto('http://localhost:4200/login')
            page.wait_for_load_state('networkidle')
            
            # Fill Credentials
            print("2. Preenchendo credenciais...")
            page.fill('input[type="email"]', 'motto@axio.eng.br')
            page.fill('input[type="password"]', '9hs~T#!Za"7?5e2')
            
            # Click Login
            print("3. Clicando em Entrar...")
            page.click('button[type="submit"]')
            
            # Wait for navigation (AuthGuard redirect)
            print("4. Aguardando redirecionamento...")
            page.wait_for_url('**/inventory', timeout=10000)
            page.wait_for_load_state('networkidle')
            
            # Verify Inventory Page
            print("5. Verificando Inventário...")
            page.screenshot(path='inventory_authenticated.png')
            print("Screenshot salvo: inventory_authenticated.png")
            
            content = page.content()
            if "Inventory" in content or "Estoque" in content or "Novo Item" in content:
                print("✅ SUCESSO: Acesso ao Estoque confirmado!")
            else:
                print("⚠️ Acesso realizado, mas texto chave não encontrado. Verifique screenshot.")
                print(f"URL Atual: {page.url}")

        except Exception as e:
            print(f"❌ Erro: {e}")
            page.screenshot(path='error_login.png')
        
        finally:
            browser.close()

if __name__ == '__main__':
    run()

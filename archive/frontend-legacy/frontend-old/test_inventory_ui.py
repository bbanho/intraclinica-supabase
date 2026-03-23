from playwright.sync_api import sync_playwright
import time

def run():
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        page = browser.new_page()
        
        print("Navegando para o Inventário...")
        try:
            page.goto('http://localhost:4200/inventory')
            page.wait_for_load_state('networkidle')
            
            # Tira screenshot inicial
            page.screenshot(path='inventory_page.png')
            print("Screenshot salvo: inventory_page.png")
            
            # Verifica título ou elemento chave
            title = page.title()
            print(f"Título da página: {title}")
            
            # Verifica se a tabela de itens carregou (assumindo que existe uma tabela ou lista)
            # O componente inventory.component.ts tem 'items = signal([])', então pode estar vazio se não tiver dados.
            # Vamos procurar pelo botão 'Novo Item' ou texto de 'No items found'
            
            content = page.content()
            if "Inventory" in content or "Estoque" in content:
                print("✅ Página de Estoque carregada com sucesso (texto encontrado).")
            else:
                print("⚠️ Texto 'Inventory/Estoque' não encontrado. Verifique o screenshot.")

        except Exception as e:
            print(f"❌ Erro: {e}")
            page.screenshot(path='error_state.png')
        
        finally:
            browser.close()

if __name__ == '__main__':
    run()

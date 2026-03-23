from playwright.sync_api import sync_playwright
import json

def run():
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        page = browser.new_page()
        
        print("--- RAIO-X START ---")
        
        # 1. Login
        try:
            print("1. Login...")
            page.goto('http://localhost:4200/login')
            page.fill('input[type="email"]', 'motto@axio.eng.br')
            page.fill('input[type="password"]', '9hs~T#!Za"7?5e2')
            page.click('button[type="submit"]')
            
            # Wait for redirect or timeout
            try:
                page.wait_for_url('**/inventory', timeout=8000)
                print("✅ Redirect OK (/inventory)")
            except:
                print(f"⚠️ Redirect Timeout. URL Atual: {page.url}")
            
            page.wait_for_timeout(2000) # Wait for Angular to render sidebar

            # 2. Inspect Sidebar
            print("\n2. Inspecionando Sidebar...")
            sidebar = page.locator('aside')
            if sidebar.count() > 0:
                print("Sidebar encontrada.")
                
                # Check Context Selector
                select = sidebar.locator('select')
                if select.count() > 0:
                    options = select.locator('option').all_inner_texts()
                    print(f"Dropdown de Contexto encontrado com {len(options)} opções:")
                    for opt in options:
                        print(f" - {opt.strip()}")
                    
                    # Check selected value
                    val = select.input_value()
                    print(f"Valor Selecionado: '{val}'")
                else:
                    print("❌ Dropdown de Contexto NÃO encontrado.")

                # Check Navigation Links
                links = sidebar.locator('nav a').all_inner_texts()
                print(f"\nLinks de Navegação ({len(links)}):")
                for link in links:
                    print(f" - {link.strip()}")
            else:
                print("❌ Sidebar NÃO encontrada (Layout incorreto?)")

            # 3. Dump LocalStorage
            print("\n3. LocalStorage Dump:")
            ls = page.evaluate("() => JSON.stringify(localStorage)")
            data = json.loads(ls)
            for k, v in data.items():
                print(f" - {k}: {v[:50]}..." if len(v) > 50 else f" - {k}: {v}")

        except Exception as e:
            print(f"❌ CRITICAL ERROR: {e}")
            page.screenshot(path='raio_x_error.png')

        finally:
            browser.close()
            print("--- RAIO-X END ---")

if __name__ == '__main__':
    run()

from playwright.sync_api import sync_playwright

def run():
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        page = browser.new_page()
        
        # Capture console logs
        page.on("console", lambda msg: print(f"CONSOLE: {msg.text}"))
        # Capture network errors
        page.on("requestfailed", lambda req: print(f"NETWORK FAIL: {req.url} {req.failure}"))
        
        print("--- Diagnostic Start ---")
        try:
            page.goto('http://localhost:4200/login')
            page.wait_for_load_state('networkidle')
            
            page.fill('input[type="email"]', 'motto@axio.eng.br')
            page.fill('input[type="password"]', '9hs~T#!Za"7?5e2')
            page.click('button[type="submit"]')
            
            # Wait a bit for async actions
            page.wait_for_timeout(5000)
            
            print(f"URL Final: {page.url}")
            
        except Exception as e:
            print(f"ERROR: {e}")
        finally:
            browser.close()
            print("--- Diagnostic End ---")

if __name__ == '__main__':
    run()

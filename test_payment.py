from playwright.sync_api import sync_playwright

with sync_playwright() as p:
    browser = p.chromium.launch()
    page = browser.new_page()
    page.on("console", lambda msg: print(f"Browser Console: {msg.text}"))
    page.on("pageerror", lambda err: print(f"Browser Error: {err}"))
    
    print("Navigating to localhost:5500/main.html...")
    page.goto("http://localhost:5500/main.html")
    page.wait_for_selector("#products-container")
    page.wait_for_timeout(2000) # wait for data to load
    
    print("Available payment options:")
    options = page.query_selector_all(".payment-option")
    for opt in options:
        print(f"Option ID: {opt.get_attribute('id')}, Class: {opt.get_attribute('class')}")
        
    print("\nClicking on 'LINE Pay' (linepay-option)...")
    lp_opt = page.query_selector("#linepay-option")
    if lp_opt:
        # Check if visible
        print(f"Is LINE Pay visible? {lp_opt.is_visible()}")
        if not lp_opt.is_visible():
            # maybe it's hidden by CSS. Let's make it visible to simulate a config where it's enabled.
            page.evaluate("document.getElementById('linepay-option').classList.remove('hidden')")
        
        lp_opt.click()
        page.wait_for_timeout(500)
        
        print("\nClasses after click:")
        options = page.query_selector_all(".payment-option")
        for opt in options:
            print(f"Option ID: {opt.get_attribute('id')}, Class: {opt.get_attribute('class')}")
            
    browser.close()

from playwright.sync_api import sync_playwright

def run():
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        page = browser.new_page()
        page.goto('http://localhost:5173')
        page.wait_for_selector('h1')
        page.wait_for_timeout(2000)

        # Click 'Previous' button (ArrowBackIcon)
        # It's the first button in the controls area
        page.get_by_role('button').first.click()
        page.wait_for_timeout(2000)

        page.screenshot(path='verification/event_desc.png')
        browser.close()

if __name__ == '__main__':
    run()

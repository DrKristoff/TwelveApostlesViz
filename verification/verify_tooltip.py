from playwright.sync_api import sync_playwright

def verify_tooltip():
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        page = browser.new_page()

        # Navigate to the app (assuming it's running on port 5173)
        page.goto("http://localhost:5173")

        # Wait for the visualizer to load
        page.wait_for_selector('img[alt="Russell M. Nelson"]')

        # Hover over the first presidency member (Russell M. Nelson)
        # The Avatar has alt="Russell M. Nelson"
        avatar = page.locator('img[alt="Russell M. Nelson"]')

        # Hover
        avatar.hover()

        # Wait a bit for tooltip to appear
        page.wait_for_timeout(1000)

        # Take screenshot
        page.screenshot(path="verification/tooltip_check.png")

        browser.close()

if __name__ == "__main__":
    verify_tooltip()

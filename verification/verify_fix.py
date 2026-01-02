from playwright.sync_api import sync_playwright

def verify_first_presidency():
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        page = browser.new_page()
        try:
            # Navigate to the app (assuming default Vite port)
            page.goto("http://localhost:5173")

            # Wait for the visualization to load
            # We check for the presence of the First Presidency container or members
            # Based on LeadershipVisualizer.jsx, First Presidency members have Avatar with border '3px solid gold'
            # Or text "President" / "Couns."

            # Wait for at least one element with text "President" in the visualization area
            page.wait_for_selector('text=President', timeout=10000)

            # Check for the specific current president (Russell M. Nelson)
            # as the default date is likely today or recent.
            # TimelineApp.jsx sets default date to '2024-01-01'.
            # On that date, Nelson is President.
            page.wait_for_selector('text=Russell M. Nelson', timeout=5000)

            # Take a screenshot
            page.screenshot(path="verification/first_presidency_fixed.png")
            print("Screenshot taken successfully.")

        except Exception as e:
            print(f"Verification failed: {e}")
            # Take a screenshot anyway to see what happened
            page.screenshot(path="verification/error_state.png")
        finally:
            browser.close()

if __name__ == "__main__":
    verify_first_presidency()

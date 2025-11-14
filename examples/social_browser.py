#!/usr/bin/env python3
"""
Social Browser - Fast browser automation with session persistence
Supports LinkedIn, Facebook, and other social platforms
"""

import asyncio
import argparse
from pathlib import Path
from playwright.async_api import async_playwright, Browser
from typing import List, Optional


class SocialBrowser:
    def __init__(self, platform: str = "linkedin", headless: bool = False):
        self.platform = platform
        self.headless = headless
        self.session_dir = Path(__file__).parent / "sessions" / platform
        self.session_dir.mkdir(parents=True, exist_ok=True)
        self.context = None

    async def __aenter__(self):
        """Context manager entry - launches browser with persistent session"""
        self.playwright = await async_playwright().start()

        # Launch persistent context to save session
        self.context = await self.playwright.chromium.launch_persistent_context(
            str(self.session_dir),
            headless=self.headless,
            args=[
                '--disable-blink-features=AutomationControlled',
                '--disable-dev-shm-usage',
            ],
            viewport={'width': 1920, 'height': 1080},
        )

        return self

    async def __aexit__(self, exc_type, exc_val, exc_tb):
        """Context manager exit - closes browser"""
        if self.context:
            await self.context.close()
        await self.playwright.stop()

    async def open_platform(self, url: Optional[str] = None):
        """Open the main platform page"""
        if not url:
            urls = {
                'linkedin': 'https://www.linkedin.com',
                'facebook': 'https://www.facebook.com',
                'twitter': 'https://twitter.com',
            }
            url = urls.get(self.platform, 'https://www.linkedin.com')

        page = await self.context.new_page()
        await page.goto(url, wait_until='networkidle')
        print(f"✓ Opened {self.platform}: {url}")
        return page

    async def browse_profiles(self, profile_urls: List[str], concurrent: bool = True):
        """
        Browse multiple profiles quickly

        Args:
            profile_urls: List of profile URLs to open
            concurrent: If True, opens all profiles at once (fast). If False, opens sequentially
        """
        if concurrent:
            # Fast mode: open all profiles concurrently
            print(f"Opening {len(profile_urls)} profiles concurrently...")

            # Create all pages first
            pages = await asyncio.gather(*[
                self.context.new_page() for _ in profile_urls
            ])

            # Navigate all pages concurrently
            await asyncio.gather(*[
                page.goto(url, wait_until='domcontentloaded')
                for page, url in zip(pages, profile_urls)
            ])

            print(f"✓ Opened {len(profile_urls)} profiles successfully")
            return pages
        else:
            # Slow mode: open profiles one by one
            pages = []
            for i, url in enumerate(profile_urls, 1):
                page = await self.context.new_page()
                await page.goto(url, wait_until='domcontentloaded')
                print(f"✓ Opened profile {i}/{len(profile_urls)}: {url}")
                pages.append(page)
            return pages

    async def search_and_browse(self, search_query: str, count: int = 20):
        """
        Search for profiles and open them

        Args:
            search_query: Search query (e.g., "software engineer London")
            count: Number of profiles to open
        """
        # Open search page
        page = await self.context.new_page()

        if self.platform == 'linkedin':
            search_url = f"https://www.linkedin.com/search/results/people/?keywords={search_query.replace(' ', '%20')}"
            await page.goto(search_url, wait_until='networkidle')
            print(f"✓ Searched LinkedIn for: {search_query}")

            # Wait a bit for results to load
            await asyncio.sleep(2)

            # Extract profile links
            profile_links = await page.evaluate("""
                () => {
                    const links = [];
                    const anchors = document.querySelectorAll('a[href*="/in/"]');

                    for (let anchor of anchors) {
                        const href = anchor.href;
                        if (href.includes('/in/') && !href.includes('/search/') && !href.includes('/company/')) {
                            links.push(href);
                        }
                    }

                    // Remove duplicates
                    return [...new Set(links)];
                }
            """)

            # Limit to requested count
            profile_links = profile_links[:count]
            print(f"Found {len(profile_links)} profiles")

            if profile_links:
                # Open all profiles concurrently
                await self.browse_profiles(profile_links, concurrent=True)
            else:
                print("No profiles found. You may need to login first.")

        else:
            print(f"Search not yet implemented for {self.platform}")

    async def wait_for_user(self):
        """Keep browser open until user presses Enter"""
        print("\nBrowser is open. Press Enter to close...")
        await asyncio.get_event_loop().run_in_executor(None, input)


async def main():
    parser = argparse.ArgumentParser(description='Social Browser - Fast automation with session persistence')
    parser.add_argument('platform', nargs='?', default='linkedin',
                       choices=['linkedin', 'facebook', 'twitter'],
                       help='Social platform to open')
    parser.add_argument('--search', '-s', type=str,
                       help='Search query for profiles')
    parser.add_argument('--count', '-c', type=int, default=20,
                       help='Number of profiles to open (default: 20)')
    parser.add_argument('--urls', '-u', nargs='+',
                       help='Specific URLs to open')
    parser.add_argument('--headless', action='store_true',
                       help='Run browser in headless mode')
    parser.add_argument('--wait', '-w', action='store_true',
                       help='Keep browser open until Enter is pressed')

    args = parser.parse_args()

    async with SocialBrowser(platform=args.platform, headless=args.headless) as browser:
        if args.urls:
            # Open specific URLs
            await browser.browse_profiles(args.urls, concurrent=True)
        elif args.search:
            # Search and browse profiles
            await browser.search_and_browse(args.search, count=args.count)
        else:
            # Just open the platform
            await browser.open_platform()

        if args.wait or not args.headless:
            await browser.wait_for_user()


if __name__ == '__main__':
    asyncio.run(main())

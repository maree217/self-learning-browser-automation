#!/bin/bash
# LinkedIn Job Search Workflow using Scripts

set -e

DOMAIN="linkedin.com"
SEARCH_QUERY="${1:-AI Engineer}"  # Default: AI Engineer
LOCATION="${2:-United Kingdom}"   # Default: United Kingdom

echo "========================================="
echo "LinkedIn Job Search Workflow"
echo "========================================="
echo "Search Query: $SEARCH_QUERY"
echo "Location: $LOCATION"
echo "========================================="
echo ""

# Step 1: Navigate to LinkedIn
echo "Step 1: Navigating to LinkedIn..."
node dist/scripts/navigation/navigate.js \
  --url "https://www.linkedin.com/jobs/" \
  --domain "$DOMAIN" \
  --verbose 2>&1 | tee /tmp/linkedin-nav.json

echo ""
echo "✅ Browser opened. If you see a login page, please log in now."
echo "   The browser will stay open. Press Enter when you're logged in..."
read -p ""

# Step 2: Navigate to jobs page again (after login)
echo ""
echo "Step 2: Refreshing jobs page..."
node dist/scripts/navigation/navigate.js \
  --url "https://www.linkedin.com/jobs/" \
  --domain "$DOMAIN" \
  --wait-until "networkidle" 2>&1 | jq -r '.data.title'

# Step 3: Fill search query
echo ""
echo "Step 3: Filling search query: $SEARCH_QUERY"
node dist/scripts/interaction/fill.js \
  --domain "$DOMAIN" \
  --selector "input[aria-label*='Search by title']" \
  --value "$SEARCH_QUERY" \
  --verbose 2>&1 | jq -r '.status'

# Step 4: Fill location
echo ""
echo "Step 4: Filling location: $LOCATION"
node dist/scripts/interaction/fill.js \
  --domain "$DOMAIN" \
  --selector "input[aria-label*='City, state, or zip code']" \
  --value "$LOCATION" \
  --verbose 2>&1 | jq -r '.status'

# Step 5: Press Enter to search
echo ""
echo "Step 5: Pressing Enter to search..."
node dist/scripts/interaction/press.js \
  --domain "$DOMAIN" \
  --key "Enter" \
  --verbose 2>&1 | jq -r '.status'

# Step 6: Wait for results
echo ""
echo "Step 6: Waiting for search results..."
sleep 3
node dist/scripts/interaction/wait-for.js \
  --domain "$DOMAIN" \
  --selector ".jobs-search-results-list" \
  --verbose 2>&1 | jq -r '.status'

# Step 7: Extract top 5 jobs
echo ""
echo "Step 7: Extracting top 5 jobs..."
node dist/scripts/content/evaluate.js \
  --domain "$DOMAIN" \
  --script "
    Array.from(document.querySelectorAll('.job-card-container')).slice(0, 5).map((card, idx) => {
      const titleEl = card.querySelector('.job-card-list__title, .job-card-container__link');
      const companyEl = card.querySelector('.job-card-container__primary-description, .job-card-container__company-name');
      const locationEl = card.querySelector('.job-card-container__metadata-item');

      return {
        rank: idx + 1,
        title: titleEl?.textContent?.trim() || 'N/A',
        company: companyEl?.textContent?.trim() || 'N/A',
        location: locationEl?.textContent?.trim() || 'N/A',
        url: titleEl?.href || 'N/A'
      };
    })
  " 2>&1 | jq '.data.result'

echo ""
echo "========================================="
echo "✅ Job search complete!"
echo "========================================="

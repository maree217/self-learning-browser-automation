#!/bin/bash
# Wrapper script to run social_browser.py with venv activated

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR"

# Activate virtual environment
source venv/bin/activate

# Run the Python script with all arguments
python social_browser.py "$@"

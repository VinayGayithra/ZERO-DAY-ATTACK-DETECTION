# SafeML Real-Time Network Security Project

Clean working copy of the existing SafeML project.

## Included
- Existing FastAPI backend
- Existing network engine
- Existing SafeML engine
- Existing dashboard frontend
- Three CIC-IDS2017 datasets used by the current project
- Packet-capture test
- requirements.txt
- Existing launch/training helper files

## Removed
- Git history
- __pycache__ files
- MATLAB/R implementations
- SafeML papers and presentation files
- SafeML demo website
- unrelated UNSW-NB15 datasets
- generated Excel reports
- temporary uploads

## Setup
1. Create environment:
   python -m venv .venv

2. Activate:
   .venv\Scripts\activate

3. Install:
   pip install -r requirements.txt

4. Install Npcap on Windows:
   https://npcap.com/#download

5. Test REAL packet capture:
   python backend/test_capture.py

6. Start dashboard:
   python run_app.py

Important: simulated/fallback traffic should not be treated as evidence of real attacks.

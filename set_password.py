"""Website ke Refresh button ke liye password set karta hai (ek baar chalana hai).

GitHub token ko aapke password se encrypt (AES-256-GCM, PBKDF2 600k) karke
site/refresh-key.json me rakhta hai. Website par password daalne par hi token khulta hai.

Chalane ke liye (codespace terminal me):
    pip install cryptography
    python set_password.py
Phir:  git add site/refresh-key.json && git commit -m "Set refresh password" && git push
"""

from __future__ import annotations

import base64
import getpass
import hashlib
import json
import os
import sys
from pathlib import Path

try:
    from cryptography.hazmat.primitives.ciphers.aead import AESGCM
except ImportError:
    sys.exit("Pehle chalaayein:  pip install cryptography")

ITERATIONS = 600_000
OUT = Path(__file__).parent / "site" / "refresh-key.json"
b64 = lambda b: base64.b64encode(b).decode()


def main() -> None:
    print("GitHub token banane ka link: https://github.com/settings/personal-access-tokens/new")
    print("  Repository access: Only select repositories -> Share-Market-Analysis")
    print("  Permissions: Actions -> Read and write\n")

    token = getpass.getpass("GitHub token paste karein (dikhega nahi): ").strip()
    if not token.startswith(("github_pat_", "ghp_")):
        sys.exit("Ye GitHub token jaisa nahi lag raha (github_pat_... se shuru hona chahiye).")

    password = getpass.getpass("Naya password (kam se kam 10 characters): ")
    if len(password) < 10:
        sys.exit("Password chhota hai. Kam se kam 10 characters rakhein.")
    if getpass.getpass("Password dobara: ") != password:
        sys.exit("Dono password match nahi hue.")

    salt, iv = os.urandom(16), os.urandom(12)
    key = hashlib.pbkdf2_hmac("sha256", password.encode(), salt, ITERATIONS, dklen=32)
    data = AESGCM(key).encrypt(iv, token.encode(), None)  # ciphertext + tag (WebCrypto jaisa)

    OUT.write_text(json.dumps({"v": 1, "iter": ITERATIONS, "salt": b64(salt), "iv": b64(iv), "data": b64(data)}))
    print(f"\n✅ Password set ho gaya: {OUT.relative_to(Path.cwd()) if OUT.is_relative_to(Path.cwd()) else OUT}")
    print('Ab push karein:  git add site/refresh-key.json && git commit -m "Set refresh password" && git push')


if __name__ == "__main__":
    main()

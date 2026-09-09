"""
CampusSync - Credential encryption
-----------------------------------
VOLP session cookies expire, so a submission scheduled for tomorrow cannot rely
on them. To submit on the student's behalf at the scheduled moment we re-login,
which means the password has to be recoverable — not hashed.

It is therefore encrypted at rest with Fernet (AES-128-CBC + HMAC). The key
lives in the environment, never in the database, so a leak of the users table
alone does not expose anyone's VOLP login.

Setup:
    python -c "from cryptography.fernet import Fernet; print(Fernet.generate_key().decode())"

    .env:
        CAMPUSSYNC_SECRET_KEY = <the key printed above>

Rotating the key invalidates every stored credential; students simply log in
again and the new password is stored under the new key.
"""

import os
from typing import Optional

from cryptography.fernet import Fernet, InvalidToken
from dotenv import load_dotenv

load_dotenv()

_ENV_VAR = "CAMPUSSYNC_SECRET_KEY"


class CredentialCipher:
    """Encrypts and decrypts VOLP passwords. Degrades to a no-op with a loud
    warning when no key is configured, so a misconfigured deployment stores
    nothing rather than silently storing plaintext."""

    def __init__(self):
        raw = os.getenv(_ENV_VAR, "").strip()
        self._fernet: Optional[Fernet] = None
        if not raw:
            print(
                f"[CRYPTO] ⚠️  {_ENV_VAR} is not set — VOLP passwords will NOT be stored, "
                "so scheduled submissions will fail once the session cookie expires.\n"
                "[CRYPTO]    Generate one with: python -c \"from cryptography.fernet import "
                "Fernet; print(Fernet.generate_key().decode())\""
            )
            return
        try:
            self._fernet = Fernet(raw.encode())
        except (ValueError, TypeError) as e:
            print(f"[CRYPTO] ⚠️  {_ENV_VAR} is not a valid Fernet key ({e}). Passwords will NOT be stored.")

    @property
    def enabled(self) -> bool:
        return self._fernet is not None

    def encrypt(self, plaintext: str) -> Optional[str]:
        """Returns the ciphertext, or None when encryption is unavailable."""
        if not self._fernet or not plaintext:
            return None
        return self._fernet.encrypt(plaintext.encode()).decode()

    def decrypt(self, ciphertext) -> Optional[str]:
        """Returns the plaintext, or None when it cannot be recovered."""
        if not self._fernet or not ciphertext:
            return None
        try:
            return self._fernet.decrypt(str(ciphertext).encode()).decode()
        except (InvalidToken, ValueError, TypeError):
            # Wrong key, or a row written before the key was rotated.
            return None

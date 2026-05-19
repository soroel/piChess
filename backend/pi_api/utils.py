import logging
from pathlib import Path
import os
from cryptography.hazmat.primitives import serialization, hashes
from cryptography.hazmat.primitives.asymmetric import padding

logger = logging.getLogger(__name__)


def load_validation_public_key():
    # Allow override via env var; otherwise look in repository public/validation-key.txt
    path = os.environ.get("VALIDATION_KEY_PATH")
    if path:
        p = Path(path)
    else:
        # repo root is three parents up from this file
        p = Path(__file__).resolve().parents[3] / "public" / "validation-key.txt"
    if not p.exists():
        logger.warning("Validation key file not found at %s", p)
        return None
    text = p.read_text()
    # If the file contains PEM, load it
    if "-----BEGIN" in text:
        try:
            key = serialization.load_pem_public_key(text.encode())
            return key
        except Exception:
            logger.exception("Failed to load PEM public key")
            return None
    # Otherwise we don't know the format; return None — caller should provide PEM
    logger.warning(
        "Validation key file does not contain PEM header; please provide PEM-formatted public key"
    )
    return None


def verify_signature(public_key, payload_bytes: bytes, signature_b64: str) -> bool:
    if public_key is None:
        return False
    try:
        import base64
        from cryptography.hazmat.primitives.asymmetric.ed25519 import (
            Ed25519PublicKey,
        )
        from cryptography.hazmat.primitives.asymmetric.rsa import RSAPublicKey

        sig = base64.b64decode(signature_b64)

        # Ed25519: signature is direct
        if isinstance(public_key, Ed25519PublicKey):
            public_key.verify(sig, payload_bytes)
            return True

        # RSA: use PKCS1v15 + SHA256
        if isinstance(public_key, RSAPublicKey):
            public_key.verify(sig, payload_bytes, padding.PKCS1v15(), hashes.SHA256())
            return True

        # Fallback: try generic verify call (may fail for unsupported key types)
        public_key.verify(sig, payload_bytes, padding.PKCS1v15(), hashes.SHA256())
        return True
    except Exception:
        logger.exception("Signature verification failed")
        return False

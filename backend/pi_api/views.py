import json
import logging
from django.http import JsonResponse, HttpResponse
from django.views.decorators.csrf import csrf_exempt
from .utils import load_validation_public_key, verify_signature
from .models import Purchase

logger = logging.getLogger(__name__)

# Minimal product catalog — keep in sync with frontend `lib/product-config.ts`
PRODUCTS = [
    {
        "id": "69bbcacf7ffee4ee3564c7b6",
        "title": "Tip - Small",
        "description": "A small tip",
        "price_in_pi": 0.1,
    },
    {
        "id": "69bc284d03ac4bc03ee7e245",
        "title": "Tip - Medium",
        "description": "A medium tip",
        "price_in_pi": 0.5,
    },
    {
        "id": "69c4e504225cf1a6af321c98",
        "title": "Tip - Large",
        "description": "A large tip",
        "price_in_pi": 1.0,
    },
]


def login_view(request):
    # Placeholder endpoint. If you need to exchange server-side tokens with Pi,
    # implement the exchange here following Pi documentation.
    return JsonResponse(
        {
            "ok": True,
            "note": "login exchange not implemented on server; implement per Pi docs if needed",
        }
    )


def products_view(request):
    return JsonResponse({"products": PRODUCTS})


@csrf_exempt
def webhook_view(request):
    # Receive webhook from Pi backend about purchase events. Require PEM public key
    # in public/validation-key.txt or via VALIDATION_KEY_PATH and a signature header.
    public_key = load_validation_public_key()
    signature = request.headers.get("X-Pi-Signature") or request.headers.get(
        "X-PI-SIGNATURE"
    )
    body = request.body or b""

    if public_key is None:
        logger.error(
            "Webhook received but no PEM public key available for verification"
        )
        return JsonResponse(
            {"ok": False, "error": "No PEM validation key available on server"},
            status=400,
        )

    if not signature:
        logger.error("Webhook received without signature header")
        return JsonResponse(
            {"ok": False, "error": "Missing signature header"}, status=400
        )

    verified = verify_signature(public_key, body, signature)
    if not verified:
        logger.warning("Signature verification failed")
        return JsonResponse(
            {"ok": False, "error": "Signature verification failed"}, status=403
        )

    try:
        payload = json.loads(body.decode("utf-8") or "{}")
    except Exception:
        payload = {"raw": body.decode("utf-8", "ignore")}

    logger.info("Received verified webhook: %s", payload)

    # Persist purchase record (best-effort)
    try:
        product_id = payload.get("product_id") or payload.get("data", {}).get(
            "product_id"
        )
        purchaser = (
            payload.get("buyer") or payload.get("user") or payload.get("account")
        )
        purchase = Purchase.objects.create(
            product_id=product_id or "unknown", purchaser=purchaser, raw_payload=payload
        )
        logger.info("Saved Purchase id=%s product=%s", purchase.id, purchase.product_id)
    except Exception:
        logger.exception("Failed to persist purchase")

    # TODO: add post-processing (entitlements, notifications, etc.)
    return JsonResponse({"ok": True, "verification": "verified"})

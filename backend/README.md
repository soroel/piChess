# Django backend for piChess

This directory contains a minimal Django backend that exposes simple Pi-related API endpoints:

- `POST /v1/login/` — placeholder endpoint for login exchanges (implement exchange logic with Pi as needed)
- `GET  /v1/products/` — returns a product catalog used by the frontend
- `POST /v1/webhook/` — webhook receiver for payment events (attempts signature verification if a PEM key is available)

Quick start

1. Create and activate a virtualenv:

```bash
python -m venv .venv
.venv\Scripts\activate    # Windows
source .venv/bin/activate # macOS / Linux
```

2. Install dependencies:

```bash
pip install -r requirements.txt
```

3. Run migrations and start server (defaults to port 8001):

```bash
python manage.py migrate
python manage.py runserver 8001
```

Notes

- Put a PEM-formatted Pi public key into `public/validation-key.txt` (or set `VALIDATION_KEY_PATH`) to enable webhook signature verification. The server requires a PEM public key and a signature header (`X-Pi-Signature`) on incoming webhooks — otherwise the webhook will be rejected with HTTP 400/403.
- Update `PRODUCTS` in `pi_api/views.py` to match your App Studio catalog.

from django.db import models


# Placeholder models if you want to persist purchases or products later
class Purchase(models.Model):
    product_id = models.CharField(max_length=128)
    purchaser = models.CharField(max_length=256, null=True, blank=True)
    raw_payload = models.JSONField()
    created_at = models.DateTimeField(auto_now_add=True)

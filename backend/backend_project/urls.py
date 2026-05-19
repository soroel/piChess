from django.urls import path, include

urlpatterns = [
    path("v1/", include("pi_api.urls")),
]

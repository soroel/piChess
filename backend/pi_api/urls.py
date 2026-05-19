from django.urls import path
from . import views

urlpatterns = [
    path("login/", views.login_view, name="login"),
    path("products/", views.products_view, name="products"),
    path("webhook/", views.webhook_view, name="webhook"),
]

from django.urls import path
from .views import (
    PaymentMethodListView,
    PaymentHistoryListView,
    PaymentInitiateView,
    MPesaCallbackView,
    SubscriptionDetailView,
    SubscriptionUpgradeView,
    SubscriptionCancelView,
)


app_name = 'payments'

urlpatterns = [
    path('methods/', PaymentMethodListView.as_view(), name='methods'),
    path('history/', PaymentHistoryListView.as_view(), name='history'),
    path('initiate/', PaymentInitiateView.as_view(), name='initiate'),
    path('mpesa/callback/', MPesaCallbackView.as_view(), name='mpesa-callback'),
    path('subscription/', SubscriptionDetailView.as_view(), name='subscription-detail'),
    path('subscription/upgrade/', SubscriptionUpgradeView.as_view(), name='subscription-upgrade'),
    path('subscription/cancel/', SubscriptionCancelView.as_view(), name='subscription-cancel'),
]


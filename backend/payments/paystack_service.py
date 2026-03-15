import requests
from django.conf import settings
import logging
logger = logging.getLogger(__name__)

class PaystackService:
    BASE_URL = 'https://api.paystack.co'

    def __init__(self):
        self.secret_key = getattr(settings, 'PAYSTACK_SECRET_KEY', '')
        if not self.secret_key:
            logger.warning('PAYSTACK_SECRET_KEY is not set. Paystack payments will not work.')
        self.headers = {
            'Authorization': f'Bearer {self.secret_key}',
            'Content-Type': 'application/json',
        }

    def initialize_transaction(self, email: str, amount_kobo: int, reference: str, currency: str = 'NGN') -> dict:
        """Initialize a Paystack transaction. Returns {'authorization_url', 'access_code', 'reference'}"""
        payload = {
            'email': email,
            'amount': amount_kobo,  # In smallest unit: kobo for NGN, cents for USD/GHS
            'reference': reference,
            'currency': currency.upper(),
        }
        resp = requests.post(
            f'{self.BASE_URL}/transaction/initialize',
            json=payload,
            headers=self.headers,
            timeout=15,
        )
        resp.raise_for_status()
        data = resp.json()
        if not data.get('status'):
            raise Exception(data.get('message', 'Paystack initialization failed'))
        return data['data']

    def verify_transaction(self, reference: str) -> dict:
        """Verify a transaction by reference. Returns transaction data dict."""
        resp = requests.get(
            f'{self.BASE_URL}/transaction/verify/{reference}',
            headers=self.headers,
            timeout=15,
        )
        resp.raise_for_status()
        data = resp.json()
        if not data.get('status'):
            raise Exception(data.get('message', 'Paystack verification failed'))
        return data['data']  # {'status': 'success'|'failed', 'amount': int, 'currency': str, ...}

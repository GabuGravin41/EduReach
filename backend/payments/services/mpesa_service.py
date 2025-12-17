import base64
import logging
import os
from typing import Any, Dict

import requests
from django.utils import timezone


logger = logging.getLogger(__name__)


class MPesaConfigurationError(RuntimeError):
    """Raised when required MPesa environment configuration is missing."""


class MPesaService:
    """
    Minimal Safaricom Daraja API helper for STK Push payments.

    Notes:
      * Uses sandbox endpoints by default. Provide MPESA_BASE_URL to switch.
      * Requires env vars: MPESA_CONSUMER_KEY, MPESA_CONSUMER_SECRET,
        MPESA_SHORT_CODE, MPESA_PASSKEY, MPESA_CALLBACK_URL.
      * For production, ensure callback URL is publicly accessible.
    """

    def __init__(self):
        self.consumer_key = os.getenv('MPESA_CONSUMER_KEY')
        self.consumer_secret = os.getenv('MPESA_CONSUMER_SECRET')
        self.short_code = os.getenv('MPESA_SHORT_CODE')
        self.passkey = os.getenv('MPESA_PASSKEY')
        self.callback_url = os.getenv('MPESA_CALLBACK_URL')
        self.base_url = os.getenv('MPESA_BASE_URL', 'https://sandbox.safaricom.co.ke')

        if not all([self.consumer_key, self.consumer_secret, self.short_code, self.passkey, self.callback_url]):
            raise MPesaConfigurationError(
                'Missing MPesa configuration. Ensure MPESA_CONSUMER_KEY, MPESA_CONSUMER_SECRET, '
                'MPESA_SHORT_CODE, MPESA_PASSKEY, and MPESA_CALLBACK_URL are set.'
            )

    def _get_access_token(self) -> str:
        token_url = f'{self.base_url}/oauth/v1/generate?grant_type=client_credentials'
        response = requests.get(
            token_url,
            auth=(self.consumer_key, self.consumer_secret),
            timeout=10,
        )
        response.raise_for_status()
        data = response.json()
        token = data.get('access_token')
        if not token:
            raise RuntimeError('MPesa access token missing from response')
        return token

    def initiate_stk_push(
        self,
        phone_number: str,
        amount: float,
        account_reference: str,
        transaction_desc: str,
    ) -> Dict[str, Any]:
        """
        Sends an STK Push request to the provided phone number.
        Returns the raw JSON response from MPesa.
        """
        token = self._get_access_token()
        timestamp = timezone.now().strftime('%Y%m%d%H%M%S')
        password = base64.b64encode(f'{self.short_code}{self.passkey}{timestamp}'.encode()).decode()

        payload = {
            'BusinessShortCode': self.short_code,
            'Password': password,
            'Timestamp': timestamp,
            'TransactionType': 'CustomerPayBillOnline',
            'Amount': int(amount),
            'PartyA': phone_number,
            'PartyB': self.short_code,
            'PhoneNumber': phone_number,
            'CallBackURL': self.callback_url,
            'AccountReference': account_reference[:12],  # MPesa max length 12
            'TransactionDesc': transaction_desc[:13],
        }

        url = f'{self.base_url}/mpesa/stkpush/v1/processrequest'
        response = requests.post(
            url,
            json=payload,
            headers={'Authorization': f'Bearer {token}'},
            timeout=15,
        )
        response.raise_for_status()
        data = response.json()
        logger.info('MPesa STK response: %s', data)
        return data


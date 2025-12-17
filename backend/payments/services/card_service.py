import logging
from typing import Any, Dict


logger = logging.getLogger(__name__)


class CardPaymentService:
    """
    Placeholder for card processing integration (Stripe/Paystack/etc.).
    Currently simulates an approved transaction and logs payloads so the API
    contract is ready for production credentials later.
    """

    def process_card_payment(self, *, amount: float, currency: str, token: str, description: str) -> Dict[str, Any]:
        """
        Simulate a card payment charge. Replace with actual SDK calls.
        """
        logger.info('Simulating card payment: amount=%s %s desc=%s token=%s', amount, currency, description, token[:6])
        return {
            'status': 'completed',
            'provider': 'card',
            'transaction_id': f'card_{token[-6:]}',
            'message': 'Simulated card payment approved',
        }


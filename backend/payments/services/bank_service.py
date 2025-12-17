import logging
from typing import Any, Dict


logger = logging.getLogger(__name__)


class BankTransferService:
    """
    Handles manual bank transfer verifications.
    For now, returns a pending status so back office staff can reconcile.
    """

    def create_bank_reference(self, *, user_identifier: str, amount: float, currency: str) -> Dict[str, Any]:
        reference = f'BANK-{user_identifier[:4].upper()}'
        logger.info('Generated bank transfer reference %s for amount %s %s', reference, amount, currency)
        return {
            'status': 'pending',
            'reference_code': reference,
            'message': 'Transfer pending verification. Use provided reference when sending funds.',
        }


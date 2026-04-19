from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('payments', '0006_alter_paymentmethod_name'),
    ]

    operations = [
        migrations.AlterField(
            model_name='paymentmethod',
            name='name',
            field=models.CharField(
                choices=[
                    ('mpesa', 'M-Pesa (STK Push)'),
                    ('mpesa_paybill', 'M-Pesa (Paybill)'),
                    ('bank_transfer', 'Bank Transfer'),
                    ('card', 'Card Payment'),
                    ('paypal', 'PayPal / International'),
                    ('paystack', 'Paystack (Card / Bank)'),
                ],
                max_length=50,
                unique=True,
            ),
        ),
        migrations.RunSQL(
            sql="""
                INSERT OR IGNORE INTO payments_paymentmethod (name, display_name, is_active, config, created_at, updated_at)
                VALUES (
                    'paystack',
                    'Paystack (Card / Bank)',
                    1,
                    '{"currencies": ["NGN", "USD", "GHS", "ZAR"]}',
                    CURRENT_TIMESTAMP,
                    CURRENT_TIMESTAMP
                );
            """,
            reverse_sql="DELETE FROM payments_paymentmethod WHERE name = 'paystack';",
        ),
    ]

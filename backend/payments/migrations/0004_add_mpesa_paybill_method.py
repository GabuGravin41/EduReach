from django.db import migrations


def add_mpesa_paybill_method(apps, schema_editor):
    PaymentMethod = apps.get_model('payments', 'PaymentMethod')
    PaymentMethod.objects.get_or_create(
        name='mpesa_paybill',
        defaults={
            'display_name': 'M-Pesa (Paybill)',
            'is_active': True,
            'config': {
                'paybill_number': '123456',
                'account_prefix': 'EDU',
            },
        },
    )


def remove_mpesa_paybill_method(apps, schema_editor):
    PaymentMethod = apps.get_model('payments', 'PaymentMethod')
    PaymentMethod.objects.filter(name='mpesa_paybill').delete()


class Migration(migrations.Migration):

    dependencies = [
        ('payments', '0003_payment_phone_number_subscription_currency_and_more'),
    ]

    operations = [
        migrations.RunPython(add_mpesa_paybill_method, remove_mpesa_paybill_method),
    ]

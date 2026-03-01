from django.db import migrations


def add_paypal_method(apps, schema_editor):
    PaymentMethod = apps.get_model('payments', 'PaymentMethod')
    PaymentMethod.objects.get_or_create(
        name='paypal',
        defaults={
            'display_name': 'PayPal / International',
            'is_active': True,
            'config': {
                'instructions': (
                    'We will email you a PayPal payment link, or pay to the address in your confirmation email. '
                    'Quote your reference when paying. Your subscription will be activated once we confirm receipt.'
                ),
            },
        },
    )


def remove_paypal_method(apps, schema_editor):
    PaymentMethod = apps.get_model('payments', 'PaymentMethod')
    PaymentMethod.objects.filter(name='paypal').delete()


class Migration(migrations.Migration):

    dependencies = [
        ('payments', '0004_add_mpesa_paybill_method'),
    ]

    operations = [
        migrations.RunPython(add_paypal_method, remove_paypal_method),
    ]

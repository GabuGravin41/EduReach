from django.db import migrations


def create_default_methods(apps, schema_editor):
    PaymentMethod = apps.get_model('payments', 'PaymentMethod')
    defaults = [
        ('mpesa', 'M-Pesa (Safaricom)'),
        ('bank_transfer', 'Bank Transfer'),
        ('card', 'Debit/Credit Card'),
    ]
    for name, display in defaults:
        PaymentMethod.objects.get_or_create(name=name, defaults={'display_name': display, 'is_active': True})


def remove_default_methods(apps, schema_editor):
    PaymentMethod = apps.get_model('payments', 'PaymentMethod')
    PaymentMethod.objects.filter(name__in=['mpesa', 'bank_transfer', 'card']).delete()


class Migration(migrations.Migration):

    dependencies = [
        ('payments', '0001_initial'),
    ]

    operations = [
        migrations.RunPython(create_default_methods, remove_default_methods),
    ]


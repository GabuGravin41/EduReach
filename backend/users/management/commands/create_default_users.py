from django.core.management.base import BaseCommand
from users.models import User


class Command(BaseCommand):
    help = 'Creates default users for testing and development'

    def handle(self, *args, **kwargs):
        # Create admin user
        admin_username = 'admin'
        admin_email = 'admin@edureach.com'
        admin_password = 'admin123'
        
        if not User.objects.filter(username=admin_username).exists():
            admin_user = User.objects.create_user(
                username=admin_username,
                email=admin_email,
                password=admin_password,
                tier=User.Tier.ADMIN,
                is_staff=True,
                is_superuser=True
            )
            self.stdout.write(
                self.style.SUCCESS(
                    f'✓ Admin user created successfully!\n'
                    f'  Username: {admin_username}\n'
                    f'  Password: {admin_password}\n'
                    f'  Tier: Admin'
                )
            )
        else:
            self.stdout.write(
                self.style.WARNING(f'Admin user "{admin_username}" already exists')
            )

        # Note: Regular users should sign up themselves through the registration form

        self.stdout.write(
            self.style.SUCCESS(
                '\n' + '='*60 + '\n'
                'DEFAULT ADMIN CREDENTIALS:\n'
                '='*60 + '\n'
                'ADMIN ACCESS:\n'
                '  Username: admin\n'
                '  Password: admin123\n'
                '  (Can switch tiers to view site as different users)\n'
                '\nREGULAR USERS:\n'
                '  Must sign up through the registration form\n'
                '  Will have access based on their subscription tier\n'
                '='*60
            )
        )

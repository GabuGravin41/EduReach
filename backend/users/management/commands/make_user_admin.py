from django.core.management.base import BaseCommand
from django.contrib.auth import get_user_model

User = get_user_model()


class Command(BaseCommand):
    help = 'Make an existing user a platform admin (tier=admin, staff, superuser)'

    def add_arguments(self, parser):
        parser.add_argument(
            'username',
            type=str,
            help='Username of the user to promote to admin',
        )

    def handle(self, *args, **options):
        username = options['username']
        user = User.objects.filter(username=username).first()
        if not user:
            self.stdout.write(self.style.ERROR(f'User "{username}" not found.'))
            return
        user.tier = User.Tier.ADMIN
        user.is_staff = True
        user.is_superuser = True
        user.save(update_fields=['tier', 'is_staff', 'is_superuser'])
        self.stdout.write(
            self.style.SUCCESS(
                f'"{username}" is now an admin. They can:\n'
                '  - Log into the app and see "Admin Panel" in the sidebar\n'
                '  - Open Django Admin (backend /admin/) for user and data management'
            )
        )

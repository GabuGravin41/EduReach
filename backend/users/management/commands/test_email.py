"""
Quick smoke-test for the email backend.

Usage:
    python manage.py test_email --to someone@gmail.com
    python manage.py test_email --to someone@gmail.com --subject "Hello"
"""

from django.core.management.base import BaseCommand
from django.core.mail import send_mail
from django.conf import settings


class Command(BaseCommand):
    help = 'Send a test email to verify SMTP configuration.'

    def add_arguments(self, parser):
        parser.add_argument('--to', required=True, help='Recipient email address')
        parser.add_argument('--subject', default='EduReach — Email Test', help='Subject line')

    def handle(self, *args, **options):
        to = options['to']
        subject = options['subject']
        from_email = getattr(settings, 'DEFAULT_FROM_EMAIL', 'edu.reach.co@gmail.com')

        self.stdout.write(f'Sending test email to {to} via {from_email}...')
        self.stdout.write(f'  BACKEND : {settings.EMAIL_BACKEND}')
        self.stdout.write(f'  HOST    : {settings.EMAIL_HOST}:{settings.EMAIL_PORT}')
        self.stdout.write(f'  USER    : {settings.EMAIL_HOST_USER}')
        self.stdout.write(f'  TLS     : {settings.EMAIL_USE_TLS}')

        try:
            send_mail(
                subject=subject,
                message=(
                    'Hi,\n\n'
                    'This is a test email from EduReach to confirm that SMTP is configured correctly.\n\n'
                    'If you received this, email delivery is working!\n\n'
                    '— The EduReach Team\n'
                    'https://edureach.site'
                ),
                from_email=from_email,
                recipient_list=[to],
                fail_silently=False,
                html_message=(
                    '<div style="font-family:sans-serif;max-width:480px;margin:0 auto;padding:32px;">'
                    '<h2 style="color:#6366f1;">EduReach Email Test ✅</h2>'
                    '<p>Hi,</p>'
                    '<p>This is a test email from <strong>EduReach</strong> to confirm that SMTP is configured correctly.</p>'
                    '<p style="color:#22c55e;font-weight:bold;">If you received this, email delivery is working!</p>'
                    '<hr style="border:none;border-top:1px solid #e2e8f0;margin:24px 0;">'
                    '<p style="color:#94a3b8;font-size:12px;">— The EduReach Team</p>'
                    '</div>'
                ),
            )
            self.stdout.write(self.style.SUCCESS(f'\n✅  Email sent successfully to {to}'))
        except Exception as exc:
            self.stdout.write(self.style.ERROR(f'\n❌  Failed: {exc}'))
            raise

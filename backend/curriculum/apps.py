from django.apps import AppConfig


class CurriculumConfig(AppConfig):
    default_auto_field = 'django.db.models.BigAutoField'
    name = 'curriculum'

    def ready(self):
        from . import signals  # noqa: F401

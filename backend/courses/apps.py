from django.apps import AppConfig


class CoursesConfig(AppConfig):
    default_auto_field = 'django.db.models.BigAutoField'
    name = 'courses'
    def ready(self):
        # Import signals to ensure CourseChannel auto-creation
        try:
            from . import signals  # noqa: F401
        except Exception:
            pass

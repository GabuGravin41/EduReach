from rest_framework.routers import DefaultRouter

from .views import UnitViewSet, PaperExtractionJobViewSet, UnitLessonViewSet

router = DefaultRouter()
router.register(r'units', UnitViewSet, basename='unit')
router.register(r'extraction-jobs', PaperExtractionJobViewSet, basename='extraction-job')
router.register(r'unit-lessons', UnitLessonViewSet, basename='unit-lesson')

urlpatterns = router.urls

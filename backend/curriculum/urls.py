from rest_framework.routers import DefaultRouter

from .views import UnitViewSet, PaperExtractionJobViewSet

router = DefaultRouter()
router.register(r'units', UnitViewSet, basename='unit')
router.register(r'extraction-jobs', PaperExtractionJobViewSet, basename='extraction-job')

urlpatterns = router.urls

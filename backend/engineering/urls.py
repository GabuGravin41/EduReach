from rest_framework.routers import DefaultRouter
from .views import EngineeringProblemViewSet

router = DefaultRouter()
router.register(r'problems', EngineeringProblemViewSet, basename='engineering-problem')

urlpatterns = router.urls

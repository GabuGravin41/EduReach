from rest_framework import serializers

from .models import Unit, UserEnrolledUnit


class UnitSerializer(serializers.ModelSerializer):
    paper_count = serializers.SerializerMethodField()
    is_enrolled = serializers.SerializerMethodField()

    class Meta:
        model = Unit
        fields = [
            'id', 'track', 'name', 'code', 'institution', 'level',
            'syllabus_summary', 'description', 'is_official',
            'paper_count', 'is_enrolled', 'created_at',
        ]
        read_only_fields = ['id', 'is_official', 'paper_count', 'is_enrolled', 'created_at']

    def get_paper_count(self, obj):
        # Engineering papers linked by FK, plus legacy match on unit_code.
        from engineering.models import EngineeringProblem
        if obj.track != Unit.Track.ENGINEERING:
            return 0
        qs = EngineeringProblem.objects.filter(unit=obj)
        if obj.code:
            qs = qs | EngineeringProblem.objects.filter(unit__isnull=True, unit_code__iexact=obj.code)
        return qs.distinct().count()

    def get_is_enrolled(self, obj):
        request = self.context.get('request')
        if not request or not request.user.is_authenticated:
            return False
        return UserEnrolledUnit.objects.filter(user=request.user, unit=obj).exists()


class UserEnrolledUnitSerializer(serializers.ModelSerializer):
    unit = UnitSerializer(read_only=True)

    class Meta:
        model = UserEnrolledUnit
        fields = ['id', 'unit', 'enrolled_at']
        read_only_fields = fields

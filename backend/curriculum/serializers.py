from rest_framework import serializers

from .models import Unit, UserEnrolledUnit


class UnitSerializer(serializers.ModelSerializer):
    paper_count = serializers.SerializerMethodField()
    is_enrolled = serializers.SerializerMethodField()

    class Meta:
        model = Unit
        fields = [
            'id', 'track', 'name', 'code', 'institution', 'level',
            'syllabus_summary', 'description', 'topic_keywords', 'is_official',
            'paper_count', 'is_enrolled', 'created_at',
        ]
        read_only_fields = ['id', 'is_official', 'paper_count', 'is_enrolled', 'created_at']

    def get_paper_count(self, obj):
        # Past papers are Assessment records matching the unit's topic_keywords.
        keywords = [k for k in (obj.topic_keywords or []) if k]
        if not keywords:
            return 0
        from django.db.models import Q
        from assessments.models import Assessment
        topic_q = Q()
        for kw in keywords:
            topic_q |= Q(topic__iexact=kw)
        return Assessment.objects.filter(topic_q, is_public=True).count()

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

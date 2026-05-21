from rest_framework import serializers
from .models import EngineeringProblem


class EngineeringProblemSerializer(serializers.ModelSerializer):
    diagram_url = serializers.SerializerMethodField()
    diagram_image = serializers.ImageField(required=False, allow_null=True, write_only=False)

    class Meta:
        model = EngineeringProblem
        fields = [
            'id', 'source_file', 'unit', 'unit_code', 'unit_name', 'institution',
            'year', 'semester', 'paper_type', 'question_number', 'question_text',
            'marks', 'question_type', 'difficulty', 'tags',
            'has_diagram', 'diagram_image', 'diagram_url', 'diagram_description',
            'model_solution', 'solution_status', 'created_at',
        ]
        read_only_fields = ['id', 'created_at', 'diagram_url']

    def get_diagram_url(self, obj):
        if obj.diagram_image:
            request = self.context.get('request')
            if request:
                return request.build_absolute_uri(obj.diagram_image.url)
            return obj.diagram_image.url
        return None

    def update(self, instance, validated_data):
        # If a new diagram image is uploaded, mark has_diagram=True
        if 'diagram_image' in validated_data:
            img = validated_data['diagram_image']
            if img is None:
                instance.diagram_image.delete(save=False)
                validated_data['has_diagram'] = False
            else:
                validated_data['has_diagram'] = True
        return super().update(instance, validated_data)

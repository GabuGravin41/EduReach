from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('courses', '0003_coursepricing_creatortip_contentpurchase_and_more'),
    ]

    operations = [
        migrations.AddConstraint(
            model_name='course',
            constraint=models.UniqueConstraint(
                fields=('owner', 'title'),
                name='unique_course_title_per_owner',
            ),
        ),
    ]

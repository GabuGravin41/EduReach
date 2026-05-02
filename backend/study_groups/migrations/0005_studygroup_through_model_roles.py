# Manually written — Django doesn't allow AlterField on M2M to add through=.
# Strategy:
#   1. Create StudyGroupMembership table (the new through model)
#   2. Copy existing M2M rows from the auto-created table as STUDENT members
#   3. Drop the old auto-created M2M join table
#   4. Update Django's state so it knows members uses through='StudyGroupMembership'

import django.db.models.deletion
from django.conf import settings
from django.db import migrations, models


def copy_members_to_membership(apps, schema_editor):
    """
    Copy rows from the old M2M table into the new StudyGroupMembership.
    Uses vendor-appropriate SQL so this works on both SQLite and PostgreSQL.
    """
    vendor = schema_editor.connection.vendor
    with schema_editor.connection.cursor() as cursor:
        # Check whether the old table still exists (idempotent)
        if vendor == 'postgresql':
            cursor.execute("""
                SELECT EXISTS (
                    SELECT 1 FROM information_schema.tables
                    WHERE table_name = 'study_groups_studygroup_members'
                )
            """)
        else:
            cursor.execute("""
                SELECT COUNT(*) FROM sqlite_master
                WHERE type='table' AND name='study_groups_studygroup_members'
            """)
        if not cursor.fetchone()[0]:
            return  # already migrated or table never existed

        if vendor == 'postgresql':
            # Use WHERE NOT EXISTS instead of ON CONFLICT — ON CONFLICT needs the
            # unique constraint to be committed, which isn't guaranteed within the
            # same migration transaction when CreateModel just ran above.
            cursor.execute("""
                INSERT INTO study_groups_studygroupmembership
                    (group_id, user_id, role, is_temp_account, joined_at)
                SELECT src.studygroup_id, src.user_id, 'student', false, NOW()
                FROM study_groups_studygroup_members src
                WHERE NOT EXISTS (
                    SELECT 1 FROM study_groups_studygroupmembership m
                    WHERE m.group_id = src.studygroup_id
                      AND m.user_id  = src.user_id
                );
            """)
        else:
            cursor.execute("""
                INSERT OR IGNORE INTO study_groups_studygroupmembership
                    (group_id, user_id, role, is_temp_account, joined_at)
                SELECT studygroup_id, user_id, 'student', 0, CURRENT_TIMESTAMP
                FROM study_groups_studygroup_members;
            """)


def drop_old_members_table(apps, schema_editor):
    with schema_editor.connection.cursor() as cursor:
        cursor.execute("DROP TABLE IF EXISTS study_groups_studygroup_members;")


class Migration(migrations.Migration):

    dependencies = [
        ('study_groups', '0004_studygroup_bulk_payment_active_and_more'),
        migrations.swappable_dependency(settings.AUTH_USER_MODEL),
    ]

    operations = [
        migrations.CreateModel(
            name='StudyGroupMembership',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('role', models.CharField(choices=[('student', 'Student'), ('teacher', 'Teacher'), ('admin', 'Group Admin')], default='student', max_length=10)),
                ('is_temp_account', models.BooleanField(default=False, help_text='True for bulk-created temporary contest accounts.')),
                ('joined_at', models.DateTimeField(auto_now_add=True)),
                ('group', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='memberships', to='study_groups.studygroup')),
                ('user', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='study_group_memberships', to=settings.AUTH_USER_MODEL)),
            ],
            options={
                'ordering': ['joined_at'],
                'unique_together': {('group', 'user')},
            },
        ),
        # Copy existing members → new through table (works on SQLite + PostgreSQL)
        migrations.RunPython(copy_members_to_membership, reverse_code=migrations.RunPython.noop),
        # Drop the old auto-created M2M join table
        migrations.RunPython(drop_old_members_table, reverse_code=migrations.RunPython.noop),
        # Tell Django's state that members now uses through=StudyGroupMembership
        migrations.SeparateDatabaseAndState(
            state_operations=[
                migrations.AlterField(
                    model_name='studygroup',
                    name='members',
                    field=models.ManyToManyField(
                        blank=True,
                        related_name='study_groups',
                        through='study_groups.StudyGroupMembership',
                        to=settings.AUTH_USER_MODEL,
                    ),
                ),
            ],
            database_operations=[],  # table already replaced above
        ),
    ]

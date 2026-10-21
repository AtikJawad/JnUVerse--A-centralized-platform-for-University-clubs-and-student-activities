from django.db import migrations

INTERESTS = [
    "Technology", "Programming", "Robotics", "Research", "Debate", "Cultural",
    "Music", "Photography", "Literature", "Sports", "Social Service",
    "Entrepreneurship", "Environment",
]


def seed(apps, schema_editor):
    Interest = apps.get_model("accounts", "Interest")
    for name in INTERESTS:
        Interest.objects.get_or_create(name=name)


class Migration(migrations.Migration):
    dependencies = [("accounts", "0001_initial")]
    operations = [migrations.RunPython(seed, migrations.RunPython.noop)]
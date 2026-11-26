from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('events', '0002_event_banner'),
    ]

    operations = [
        migrations.AddField(
            model_name='eventregistration',
            name='attended',
            field=models.BooleanField(default=False),
        ),
    ]

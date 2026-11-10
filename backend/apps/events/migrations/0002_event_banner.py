from django.db import migrations, models

import config.images


class Migration(migrations.Migration):

    dependencies = [
        ('events', '0001_initial'),
    ]

    operations = [
        migrations.AddField(
            model_name='event',
            name='banner',
            field=models.ImageField(blank=True, upload_to=config.images.event_banner_path),
        ),
    ]

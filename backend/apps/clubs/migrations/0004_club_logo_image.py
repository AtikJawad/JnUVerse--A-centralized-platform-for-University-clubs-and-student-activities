from django.db import migrations, models

import config.images


class Migration(migrations.Migration):

    dependencies = [
        ('clubs', '0003_club_interests'),
    ]

    operations = [
        migrations.AddField(
            model_name='club',
            name='logo_image',
            field=models.ImageField(blank=True, upload_to=config.images.club_logo_path),
        ),
    ]

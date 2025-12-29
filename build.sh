#!/usr/bin/env bash
set -o errexit

export PYTHONPATH=/opt/render/project/src
export DJANGO_SETTINGS_MODULE=settings

pip install -r requirements.txt

python -c "import settings; print('IMPORT OK')"

python manage.py collectstatic --noinput
python manage.py migrate

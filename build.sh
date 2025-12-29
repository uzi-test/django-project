#!/usr/bin/env bash
set -o errexit

cd /opt/render/project/src
export PYTHONPATH=/opt/render/project/src
export DJANGO_SETTINGS_MODULE=pharmacy_project.settings

pip install -r requirements.txt
python manage.py collectstatic --noinput
python manage.py migrate

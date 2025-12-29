#!/usr/bin/env bash
set -o errexit

cd /opt/render/project/src

python -c "import os,sys; print('PWD=',os.getcwd()); print('FILES=',os.listdir('.')); print('PY=',sys.version)"
python -c "import pharmacy_project.settings; print('IMPORT OK')"

pip install -r requirements.txt
python manage.py collectstatic --noinput
python manage.py migrate

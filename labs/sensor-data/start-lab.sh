#!/bin/sh
set -eu

if [ ! -e /home/lab/Desktop/Lab1/vulnerable_app.py ]; then
    cp -a /opt/lab-home/. /home/lab/
fi

exec /usr/bin/supervisord -n -c /etc/supervisor/conf.d/supervisord.conf

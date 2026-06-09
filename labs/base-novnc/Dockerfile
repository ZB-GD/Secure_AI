FROM ubuntu:20.04

ENV DEBIAN_FRONTEND=noninteractive

# Instala Xvfb, Xfce4 (escritorio ligero), x11vnc, noVNC y supervisord
RUN apt-get update && apt-get install -y \
    xvfb \
    xfce4 \
    xfce4-terminal \
    x11vnc \
    novnc \
    websockify \
    supervisor \
    xdotool \
    && rm -rf /var/lib/apt/lists/*

RUN groupadd --gid 1000 lab && \
    useradd --uid 1000 --gid 1000 --create-home --shell /bin/bash lab

# Redirect root to vnc.html so navigating to the bare port shows the desktop, not a file listing
RUN echo '<meta http-equiv="refresh" content="0; url=vnc.html?autoconnect=1&resize=scale&reconnect=1">' \
    > /usr/share/novnc/index.html

# Configuración de supervisord: arranca todos los procesos necesarios
COPY supervisord.conf /etc/supervisor/conf.d/supervisord.conf

EXPOSE 6080

CMD ["/usr/bin/supervisord", "-n", "-c", "/etc/supervisor/conf.d/supervisord.conf"]

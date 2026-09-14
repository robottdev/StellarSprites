FROM python:3.12-alpine

WORKDIR /app
COPY index.html /app/index.html
COPY serve.py /app/serve.py
COPY web /app/web

# Bust stale image layers when JS changes.
ENV STELLAR_SPRITES_BUILD=a15

CMD ["python", "/app/serve.py"]

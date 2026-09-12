FROM python:3.12-alpine

WORKDIR /app
COPY index.html /app/index.html
COPY web /app/web

CMD ["sh", "-c", "python -m http.server --bind 0.0.0.0 ${PORT:-8080}"]

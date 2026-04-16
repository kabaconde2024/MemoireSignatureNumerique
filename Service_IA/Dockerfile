# Service_IA/Dockerfile
FROM python:3.11-slim

WORKDIR /app

# Copier les dépendances
COPY exigences.txt .

# Installer les dépendances
RUN pip install --no-cache-dir -r exigences.txt

# Copier le code
COPY . .

# Exposer le port
EXPOSE 8000

# Démarrer l'application
CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000"]
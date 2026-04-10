# --- Étape 1 : Construction ---
FROM maven:3.9-eclipse-temurin-21 AS build
WORKDIR /app
COPY Back_end/pom.xml .
COPY Back_end/src ./src
RUN mvn clean package -DskipTests

# --- Étape 2 : Image d'exécution ---
FROM eclipse-temurin:21-jre
WORKDIR /app

# Installation des outils cryptographiques
RUN apt-get update && apt-get install -y \
    softhsm2 \
    opensc \
    libpcsclite1 \
    && rm -rf /var/lib/apt/lists/*

# Configuration de SoftHSM2 pour Render (Utilisation d'un dossier local)
RUN mkdir -p /app/softhsm_tokens
RUN echo "directories.tokendir = /app/softhsm_tokens" > /app/softhsm2.conf

# Initialisation du Token (Slot 0)
# On définit la variable d'env pour que softhsm2-util sache où créer le token
RUN SOFTHSM2_CONF=/app/softhsm2.conf softhsm2-util --init-token --slot 0 --label "MonTokenPFE" --pin 1234 --so-pin 1234

# Droits d'accès pour l'utilisateur Render
RUN chmod -R 777 /app/softhsm_tokens /app/softhsm2.conf

# Copie du JAR
COPY --from=build /app/target/*.jar app.jar

EXPOSE 8080

# Lancement avec la variable d'environnement SOFTHSM2_CONF
ENTRYPOINT ["sh", "-c", "SOFTHSM2_CONF=/app/softhsm2.conf java -Djava.security.debug=sunpkcs11 -jar app.jar"]
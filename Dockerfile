# --- Étape 1 : Build Maven ---
FROM maven:3.9-eclipse-temurin-21 AS build
WORKDIR /app
COPY Back_end/pom.xml .
COPY Back_end/src ./src
RUN mvn clean package -DskipTests

# --- Étape 2 : Image d'exécution ---
FROM eclipse-temurin:21-jre
WORKDIR /app

# Installation des outils PKCS11
RUN apt-get update && apt-get install -y \
    softhsm2 \
    opensc \
    libpcsclite1 \
    && rm -rf /var/lib/apt/lists/*

# Configuration de SoftHSM2 pour environnement sans accès Root (Render)
RUN mkdir -p /app/softhsm_tokens
RUN echo "directories.tokendir = /app/softhsm_tokens" > /app/softhsm2.conf

# Initialisation du Token (Slot 0) 
# On utilise la variable SOFTHSM2_CONF pour forcer l'outil à utiliser notre dossier
RUN SOFTHSM2_CONF=/app/softhsm2.conf softhsm2-util --init-token --slot 0 --label "MonTokenPFE" --pin 1234 --so-pin 1234

# Permissions cruciales pour que Java puisse écrire ses clés dans le dossier
RUN chmod -R 777 /app/softhsm_tokens /app/softhsm2.conf

# Copie du binaire JAR produit à l'étape 1
COPY --from=build /app/target/*.jar app.jar

EXPOSE 8080

# Utilisation de sh -c pour s'assurer que SOFTHSM2_CONF est bien prise en compte par le .so
ENTRYPOINT ["sh", "-c", "SOFTHSM2_CONF=/app/softhsm2.conf java -Djava.security.debug=sunpkcs11 -jar app.jar"]
# --- Étape 1 : Build Maven ---
FROM maven:3.9-eclipse-temurin-21 AS build
WORKDIR /app

# On copie le fichier pom.xml
COPY Back_end/pom.xml ./ 

# FORCE : On télécharge les dépendances de zéro en ignorant le cache éventuel
RUN mvn dependency:go-offline -B

# On copie les sources
COPY Back_end/src ./src

# FORCE : On utilise -U pour "Force Update" des dépendances
RUN mvn clean package -U -DskipTests

# --- Étape 2 : Image d'exécution (Inchangée) ---
FROM eclipse-temurin:21-jre
WORKDIR /app

# Installation des outils PKCS11 (SoftHSM2, etc.)
RUN apt-get update && apt-get install -y \
    softhsm2 \
    opensc \
    libpcsclite1 \
    && rm -rf /var/lib/apt/lists/*

# Configuration de SoftHSM2
RUN mkdir -p /app/softhsm_tokens
RUN echo "directories.tokendir = /app/softhsm_tokens" > /app/softhsm2.conf

# Initialisation du Token
RUN SOFTHSM2_CONF=/app/softhsm2.conf softhsm2-util --init-token --slot 0 --label "MonTokenPFE" --pin 1234 --so-pin 1234

# Permissions
RUN chmod -R 777 /app/softhsm_tokens /app/softhsm2.conf

# Copie du binaire JAR
COPY --from=build /app/target/*.jar app.jar

EXPOSE 8080

ENTRYPOINT ["sh", "-c", "SOFTHSM2_CONF=/app/softhsm2.conf java -Djava.security.debug=sunpkcs11 -jar app.jar"]
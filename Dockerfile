# --- Étape 1 : Build Maven (Correction Forcée) ---
FROM maven:3.9-eclipse-temurin-21 AS build
WORKDIR /app

# 1. On copie le pom.xml
COPY Back_end/pom.xml .

# 2. FORCE : On télécharge explicitement la dépendance manquante avant la compilation
# Cela garantit que le jar est présent dans le dépôt local du container
RUN mvn dependency:get -Dartifact=org.springframework.boot:spring-boot-starter-mail:3.4.2 -B

# 3. On copie le code source
COPY Back_end/src ./src

# 4. On compile avec -U (Force Update) pour écraser les caches défectueux
RUN mvn clean package -U -DskipTests

# --- Étape 2 : Image d'exécution (Conservation de toute la partie SoftHSM2) ---
FROM eclipse-temurin:21-jre
WORKDIR /app

# Installation des outils PKCS11 et dépendances système
RUN apt-get update && apt-get install -y \
    softhsm2 \
    opensc \
    libpcsclite1 \
    && rm -rf /var/lib/apt/lists/*

# Configuration de SoftHSM2 pour environnement sans accès Root (Render)
RUN mkdir -p /app/softhsm_tokens
RUN echo "directories.tokendir = /app/softhsm_tokens" > /app/softhsm2.conf

# Initialisation du Token (Slot 0) 
#RUN SOFTHSM2_CONF=/app/softhsm2.conf softhsm2-util --init-token --slot 0 --label "MonTokenPFE" --pin 1234 --so-pin 1234

# Initialisation plus robuste pour garantir le slot
RUN SOFTHSM2_CONF=/app/softhsm2.conf softhsm2-util --init-token --free --label "MonTokenPFE" --pin 1234 --so-pin 1234
# Permissions cruciales pour l'accès aux clés par l'application Java
RUN chmod -R 777 /app/softhsm_tokens /app/softhsm2.conf

# Copie du JAR produit à l'étape 1
COPY --from=build /app/target/*.jar app.jar

EXPOSE 8080

# Exécution avec support SoftHSM2 et Debug Sécurité activé
ENTRYPOINT ["sh", "-c", "SOFTHSM2_CONF=/app/softhsm2.conf java -Djava.security.debug=sunpkcs11 -jar app.jar"]
# --- Étape 1 : Build Maven (Correction Forcée) ---
FROM maven:3.9-eclipse-temurin-21 AS build
WORKDIR /app

# 1. On copie le pom.xml
COPY Back_end/pom.xml .

# 2. Supprimer l'ancien cache JJWT pour forcer le re-téléchargement
RUN rm -rf ~/.m2/repository/io/jsonwebtoken

# 3. Nettoyer le cache Lombok
RUN rm -rf ~/.m2/repository/org/projectlombok

# 4. On télécharge explicitement les dépendances
RUN mvn dependency:get -Dartifact=org.springframework.boot:spring-boot-starter-mail:3.4.2 -B
RUN mvn dependency:get -Dartifact=io.jsonwebtoken:jjwt-api:0.12.3 -B
RUN mvn dependency:get -Dartifact=io.jsonwebtoken:jjwt-impl:0.12.3 -B
RUN mvn dependency:get -Dartifact=io.jsonwebtoken:jjwt-jackson:0.12.3 -B
RUN mvn dependency:get -Dartifact=org.projectlombok:lombok:1.18.30 -B

# 5. On copie le code source
COPY Back_end/src ./src

# 6. On compile avec Lombok activé explicitement
RUN mvn clean compile -U -DskipTests -Dmaven.compiler.parameters=true

# 7. On package
RUN mvn package -U -DskipTests

# --- Étape 2 : Image d'exécution ---
FROM eclipse-temurin:21-jre
WORKDIR /app

# Installation des outils PKCS11 et dépendances système
RUN apt-get update && apt-get install -y \
    softhsm2 \
    opensc \
    libpcsclite1 \
    && rm -rf /var/lib/apt/lists/*

# Configuration de SoftHSM2
RUN mkdir -p /app/softhsm_tokens
RUN echo "directories.tokendir = /app/softhsm_tokens" > /app/softhsm2.conf

# Initialisation du Token
RUN SOFTHSM2_CONF=/app/softhsm2.conf softhsm2-util --init-token --free --label "MonTokenPFE" --pin 1234 --so-pin 1234
RUN chmod -R 777 /app/softhsm_tokens /app/softhsm2.conf

# Copie du JAR produit à l'étape 1
COPY --from=build /app/target/*.jar app.jar

EXPOSE 8080

# Exécution
ENTRYPOINT ["sh", "-c", "SOFTHSM2_CONF=/app/softhsm2.conf java -jar app.jar"]
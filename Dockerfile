# Étape 1 : Construction
FROM maven:3.9-eclipse-temurin-21 AS build
WORKDIR /app

# Copier le pom.xml et le code source
COPY Back_end/pom.xml .
COPY Back_end/src ./src

# Télécharger les dépendances et construire
RUN mvn clean package -DskipTests

# Étape 2 : Image d'exécution
FROM eclipse-temurin:21-jre
WORKDIR /app

# --- AJOUT DES DÉPENDANCES PKCS11 ---
# libpcsclite1 est nécessaire pour la communication avec les tokens/lecteurs
# softhsm2 permet de simuler un token cryptographique en logiciel
RUN apt-get update && apt-get install -y \
    libpcsclite1 \
    softhsm2 \
    opensc \
    && rm -rf /var/lib/apt/lists/*

# Création du dossier pour les jetons SoftHSM2 (évite les erreurs de permissions)
RUN mkdir -p /var/lib/softhsm/tokens/ && \
    softhsm2-util --init-token --slot 0 --label "MonTokenPFE" --pin 1234 --so-pin 1234
# ------------------------------------

# Copier le JAR
COPY --from=build /app/target/*.jar app.jar

EXPOSE 8080

# On ajoute des paramètres Java pour aider au débogage du Provider si nécessaire
ENTRYPOINT ["java", "-Djava.security.debug=sunpkcs11", "-jar", "app.jar"]
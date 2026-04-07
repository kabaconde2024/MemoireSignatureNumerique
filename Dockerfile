FROM maven:3.8-openjdk-17 AS build
WORKDIR /app

# Copier le pom.xml et le code source
COPY Back_end/pom.xml .
COPY Back_end/src ./src

# Télécharger les dépendances et construire
RUN mvn clean package -DskipTests

# Étape 2 : Image d'exécution
FROM eclipse-temurin:17-jre
WORKDIR /app

# Copier le JAR
COPY --from=build /app/target/*.jar app.jar

EXPOSE 8080

ENTRYPOINT ["java", "-jar", "app.jar"]
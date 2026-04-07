FROM eclipse-temurin:17-jdk AS build
WORKDIR /app

# Copier le wrapper Maven
COPY Back_end/.mvn .mvn
COPY Back_end/mvnw Back_end/mvnw.cmd .
COPY Back_end/pom.xml .

# Rendre le wrapper exécutable
RUN chmod +x mvnw

# Télécharger les dépendances
RUN ./mvnw dependency:go-offline -B

# Copier le code source
COPY Back_end/src ./src

# Construire l'application
RUN ./mvnw clean package -DskipTests

# Étape 2 : Image d'exécution
FROM eclipse-temurin:17-jre
WORKDIR /app

# Copier le JAR
COPY --from=build /app/target/*.jar app.jar

EXPOSE 8080

ENTRYPOINT ["java", "-jar", "app.jar"]
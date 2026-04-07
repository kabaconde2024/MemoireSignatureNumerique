FROM openjdk:17-jdk-slim AS build
WORKDIR /app
COPY Back_end/.mvn .mvn
COPY Back_end/mvnw Back_end/mvnw.cmd .
COPY Back_end/pom.xml .
RUN chmod +x mvnw
RUN ./mvnw dependency:go-offline -B
COPY Back_end/src ./src
RUN ./mvnw clean package -DskipTests

FROM openjdk:17-jdk-slim
WORKDIR /app
COPY --from=build /app/target/*.jar app.jar
EXPOSE 8080
ENTRYPOINT ["java", "-jar", "app.jar"]
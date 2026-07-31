# syntax=docker/dockerfile:1

# ── Build ───────────────────────────────────────────────────────────
# Compile the Spring Boot fat jar with the Gradle wrapper (JDK 25).
FROM eclipse-temurin:25-jdk AS build
WORKDIR /app

# Warm the dependency cache first so code-only changes don't re-download.
COPY gradlew settings.gradle build.gradle ./
COPY gradle ./gradle
RUN chmod +x gradlew && ./gradlew --no-daemon dependencies --refresh-dependencies || true

# Build the boot jar (tests run in CI, not in the image build).
COPY src ./src
RUN ./gradlew --no-daemon clean bootJar -x test

# ── Run ─────────────────────────────────────────────────────────────
FROM eclipse-temurin:25-jre AS runtime
WORKDIR /app
ENV JAVA_OPTS=""

# Single fat jar (plain jar disabled in build.gradle).
COPY --from=build /app/build/libs/*.jar app.jar

EXPOSE 8080
ENTRYPOINT ["sh", "-c", "exec java $JAVA_OPTS -jar /app/app.jar"]

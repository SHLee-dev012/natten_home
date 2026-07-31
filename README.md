# notten-home

낯선대학 10주년 축제(낯텐축제) 홈 서비스. Spring Boot로 만든 축제 랜딩 페이지 —
프로그램·행사 일정(시간×존 매트릭스)·오시는 길을 제공하고, `/api/festival` JSON API로
다른 notten 서비스가 축제 정보를 소비할 수 있습니다.

## 기술 스택

- Spring Boot 4.1 (webmvc + thymeleaf) / Java 25
- Gradle (wrapper 포함, 9.5.1)
- 데이터베이스 없음 — 축제 정보는 `FestivalService`가 제공

## 개발

```bash
./gradlew bootRun        # http://localhost:8080
./gradlew test           # 테스트
```

## 배포 (Docker)

DB가 없어 **단일 컨테이너**로 간단히 배포합니다. 이미지는 GitHub Actions가
빌드해 GHCR에 게시하고, 서버는 그 이미지를 pull만 하면 됩니다.

### CI 파이프라인 (`.github/workflows/docker-build.yml`)

`main` 푸시(또는 수동 실행) 시:
1. JDK 25로 `./gradlew test` 실행
2. Docker 이미지 빌드(Buildx + gha 캐시)
3. **GHCR**(`ghcr.io/shlee-dev012/notten_home`)에 태그(`main`·`sha-<short>`·`latest`) 게시

PR에서는 빌드 검증만 하고 게시하지 않습니다.

### 서버에서 실행 (빌드 없이 pull)

```bash
# GHCR 패키지가 private면 먼저 로그인
echo <PAT-with-read:packages> | docker login ghcr.io -u <github-username> --password-stdin

docker compose pull
docker compose up -d      # http://<host>:8080
```

### 로컬에서 직접 빌드·실행

```bash
docker compose up -d --build
```

- 포트 8080 노출, 헬스체크 포함(`/` 200 확인)
- `JAVA_OPTS` 환경변수로 JVM 옵션 조정 (기본 `-XX:MaxRAMPercentage=75`)
- 특정 태그를 고정하려면 `NOTTEN_HOME_IMAGE=ghcr.io/.../notten_home:sha-abc1234`

앞단에 nginx/Caddy 등 리버스 프록시를 두고 도메인·HTTPS를 연결하면 됩니다.

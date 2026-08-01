# natten-home

낯선대학 10주년 축제(낯텐축제) 홈 서비스. Spring Boot로 만든 축제 랜딩 페이지 —
프로그램·행사 일정(시간×존 매트릭스)·오시는 길을 제공하고, `/api/festival` JSON API로
다른 notten 서비스가 축제 정보를 소비할 수 있습니다.

🔗 **라이브: https://shlee-dev012.github.io/natten_home/**
(로그인·DB가 없어 정적 스냅샷으로 GitHub Pages에 배포됩니다. `main` 푸시마다 자동 갱신)

## 미리보기

![natten-home 데스크톱 화면](docs/screenshot-desktop.png)

<p align="center">
  <img src="docs/screenshot-mobile.png" width="320" alt="natten-home 모바일 화면"/>
</p>

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
3. **GHCR**(`ghcr.io/shlee-dev012/natten_home`)에 태그(`main`·`sha-<short>`·`latest`) 게시

PR에서는 빌드 검증만 하고 게시하지 않습니다.

### 서버에서 실행 (도메인 · HTTPS 포함)

앞단의 **Caddy**가 자동 HTTPS(Let's Encrypt)와 도메인 라우팅을 담당합니다.

```bash
# 1) 도메인 설정
cp deploy.env.example .env      # NATTEN_HOME_DOMAIN(과 필요시 이미지 태그) 편집

# 2) 이미지 받기 (GHCR 패키지가 private면 먼저 docker login)
docker compose pull

# 3) 기동
docker compose up -d
```

- `NATTEN_HOME_DOMAIN`(예: `notten.example.com`)의 A/AAAA 레코드가 이 호스트를 가리키고
  **80/443 포트가 열려 있어야** Caddy가 인증서를 발급합니다.
- 앱의 `:8080`도 그대로 노출되어 도메인 없이 로컬에서 바로 접속·테스트할 수 있습니다.
  (프로덕션에서 Caddy만 공개하려면 compose의 `app.ports` 줄을 지우세요.)
- `JAVA_OPTS`로 JVM 옵션 조정 (기본 `-XX:MaxRAMPercentage=75`), 헬스체크 포함.

### 로컬에서 직접 빌드·실행

```bash
docker compose up -d --build   # 도메인 없이 http://localhost:8080
```

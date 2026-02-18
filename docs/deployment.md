# 배포 가이드 (Netlify / GitHub Pages / Vercel)

이 프로젝트는 `frontend/` 하위의 Vite 앱을 배포 대상으로 사용합니다.

## 공통 전제

- Node.js: `18+` (권장: 20)
- 앱 루트: `frontend/`
- 빌드 산출물: `frontend/dist`
- 기본 배포 브랜치: `main`

로컬 빌드 확인:

```bash
cd frontend
npm run build
```

## 1) Netlify

### A. `netlify.toml` 기반 자동 설정 (권장)

저장소 루트의 `netlify.toml`을 사용하면 Netlify가 빌드 설정을 자동 인식합니다.

핵심 값:

- Base directory: `frontend`
- Build command: `npm ci && npm run build`
- Publish directory: `dist`
- SPA fallback: `/* -> /index.html (200)`

### B. Netlify UI에서 수동 설정

1. Netlify에서 저장소 연결
2. Build settings 입력
- Base directory: `frontend`
- Build command: `npm ci && npm run build`
- Publish directory: `dist`
3. Deploy 실행

### 장애 대응

- 새로고침 시 404:
- SPA redirect 설정 누락입니다. `netlify.toml`의 `[[redirects]]`를 확인하세요.
- 빌드 실패:
- 루트가 아닌 `frontend` 기준으로 빌드하는지 확인하세요.

## 2) Vercel

### A. `vercel.json` 기반 설정

루트의 `vercel.json`이 다음 동작을 정의합니다.

- 설치: `cd frontend && npm ci`
- 빌드: `cd frontend && npm run build`
- 출력 디렉터리: `frontend/dist`
- SPA rewrite: 모든 경로를 `/index.html`로 라우팅

### B. Vercel UI에서 수동 설정 (대안)

1. 프로젝트 Import
2. Root Directory를 `frontend`로 지정
3. Framework Preset을 Vite로 선택
4. Build Command: `npm run build`
5. Output Directory: `dist`

### 장애 대응

- 경로 새로고침 404:
- `rewrites`가 누락되면 발생합니다. `vercel.json`을 확인하세요.
- 정적 파일 경로 실패:
- `outputDirectory`가 `frontend/dist`인지 확인하세요.

## 3) GitHub Pages (Project Pages)

대상 URL 형식:

- `https://<user>.github.io/<repo>/`

이 저장소는 `.github/workflows/deploy-pages.yml`에서 `--base=/<repo>/`로 빌드하여 Project Pages 하위 경로를 지원합니다.

### 사전 설정

1. GitHub 저장소 `Settings -> Pages` 이동
2. Source를 `GitHub Actions`로 선택

### 배포 방식

- `main` 브랜치 푸시 시 자동 배포
- Actions 탭에서 `workflow_dispatch` 수동 실행 가능

### 워크플로우 주요 동작

1. `frontend`에서 `npm ci`
2. `npm run build -- --base=/${{ github.event.repository.name }}/`
3. `frontend/dist`를 Pages artifact로 업로드
4. 배포 실행

### 장애 대응

- Blank page:
- `base`가 잘못되었을 때 발생합니다. 워크플로우의 `--base=/<repo>/` 값을 확인하세요.
- `404` on refresh:
- 정적 호스팅의 SPA 라우팅 문제입니다. Pages는 빌드 산출물을 정확히 배포해야 하며, 경로는 `base`에 맞아야 합니다.
- SW 구버전 캐시:
- 캐시 이름 변경 후 새로 배포하고 브라우저 캐시를 갱신하세요.

## 4) 경로/서비스워커 구현 포인트

GitHub Pages 하위 경로 배포를 위해 다음을 반영했습니다.

- `frontend/index.html`:
- manifest 링크를 `%BASE_URL%manifest.json`으로 변경
- inline SW 등록 스크립트 제거
- `frontend/src/main.tsx`:
- `import.meta.env.BASE_URL` 기반으로 `sw.js` 등록
- `frontend/public/sw.js`:
- `self.registration.scope` 기준으로 캐시 경로 계산
- 캐시 버전: `retirement-sim-v2`

## 5) 빠른 검증 체크리스트

- [ ] `README.md`에서 배포 가이드 링크가 `docs/deployment.md`로 열리는지 확인
- [ ] `netlify.toml`, `vercel.json`, `deploy-pages.yml` 파일이 루트/워크플로우 경로에 있는지 확인
- [ ] GitHub Pages 배포 URL이 `https://<user>.github.io/<repo>/` 형태인지 확인
- [ ] 앱 로드 후 브라우저 콘솔에 SW 등록 에러가 없는지 확인
- [ ] 새로고침 시 라우트 404가 재현되지 않는지 확인

## 6) 참고 파일

- `netlify.toml`
- `vercel.json`
- `.github/workflows/deploy-pages.yml`
- `frontend/index.html`
- `frontend/src/main.tsx`
- `frontend/public/sw.js`

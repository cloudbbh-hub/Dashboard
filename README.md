# F낭시에 팀 대시보드

운영 주소: https://fnancier-dashboard.vercel.app/

Vercel에서 화면과 `/api/state` 서버 함수를 실행하고 Supabase에 일정·포지션을 저장합니다. GitHub Pages 화면도 같은 Vercel API를 사용합니다. 브라우저는 3초 간격으로 변경을 확인합니다.

- 팀 편집코드를 가진 팀원은 같은 일정과 포지션을 조회·수정·삭제합니다.
- 전체 담당 일정은 모든 팀원의 일정에 표시됩니다.
- 동시에 수정하면 버전 충돌을 알리고 먼저 저장된 내용을 덮어쓰지 않습니다.
- 기존 브라우저 내용은 `기존 브라우저 내용 가져오기`로 병합할 수 있습니다.
- 노션 데이터베이스와는 별도의 저장소입니다.

## 저장 구조

`public.fnancier_schedules`에서 일정, `public.fnancier_positions`에서 포지션을 확인합니다. `public.fnancier_state`는 원본 스냅샷과 동시 수정 확인용 버전을 보관합니다. `fnancier_write_state` 함수는 행 잠금·버전 확인 후 세 테이블을 한 트랜잭션으로 갱신합니다.

Table Editor에서 미러 테이블만 직접 변경한 내용은 대시보드에 반영되지 않습니다. 일정 편집은 대시보드에서 진행합니다.

모든 대시보드 테이블에 RLS를 적용하고 anon·authenticated 접근 및 RPC 실행을 차단합니다. 서버만 service_role 권한으로 접근합니다. 비밀키와 팀 편집코드는 공개 소스에 포함하지 않습니다.

## Vercel 배포

저장소 루트를 가져오면 `vercel.json`이 `node scripts/build-vercel.mjs`로 `public/` 화면을 생성하고 `api/state.js`를 서버 함수로 배포합니다. Vercel 화면은 같은 주소의 `/api/state`를 사용합니다. `public/`은 빌드 산출물로 Git에서 제외합니다.

Production 환경 변수:

- `SUPABASE_URL`: Supabase 프로젝트 API URL
- `SUPABASE_SECRET_KEY`: 서버 전용 secret 키 또는 기존 service_role 키
- `TEAM_EDIT_CODE`: 팀 공용 편집코드

환경 변수는 Sensitive로 저장합니다. Preview에는 별도 테스트 DB를 사용하며 운영 키를 넣지 않습니다. 환경 변수 변경 뒤에는 재배포가 필요합니다. Vercel 서버는 Supabase만 사용하며 `STORAGE_BACKEND` 변수가 필요하지 않습니다.

새 데이터베이스를 사용할 때는 `supabase/migrations/20261102072313_fnancier_dashboard.sql`을 먼저 적용합니다. 기존 데이터가 있다면 백업 및 버전 확인 후 RPC로 이전합니다.

## 로컬 확인

Node.js 22.13 이상에서 `npm test`, `npm run build:vercel`을 실행합니다. 테스트는 편집코드·CORS·동시 수정 충돌·Supabase 어댑터·Vercel 서버 함수를 확인합니다.

`npm run dev`는 정적 화면 미리보기이며 운영 API를 사용합니다. 실제 운영 일정 편집에 주의하세요.

## 이전 Sites 서버

이전 Sites/D1 서버 코드와 `drizzle/` 스키마는 복구 참고용으로 보관합니다. `npm run build`는 이전 Worker를 만듭니다. 해당 서버를 다시 사용할 때는 저장소와 API 주소를 먼저 확인해야 합니다. Supabase 오류 시 D1으로 자동 전환하지 않아 저장소가 갈라지는 것을 방지합니다.

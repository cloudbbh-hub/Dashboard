# F낭시에 팀 대시보드

GitHub Pages 화면과 Sites의 공용 API·D1 저장소를 연결한 팀 일정 대시보드입니다.

- 일정과 포지션을 함께 저장하며, 화면을 보고 있는 동안 3초 간격으로 변경을 확인합니다.
- 팀 편집코드는 서버의 `TEAM_EDIT_CODE` 비밀 환경 변수로 관리합니다. 소스에 넣지 않습니다.
- 편집코드를 가진 팀원은 같은 데이터를 조회·수정·삭제할 수 있습니다.
- 동시에 수정하면 버전 충돌을 알리고, 자동으로 다른 사람의 변경을 덮어쓰지 않습니다.
- 기존 브라우저 데이터는 삭제하지 않습니다. 연결 후 `기존 브라우저 내용 가져오기`로 병합할 수 있습니다.
- 노션 데이터베이스와는 별도의 저장소입니다.

## 로컬 확인

Node.js 22.13 이상에서 `npm test`, `npm run build`를 실행합니다.
`npm run dev`는 정적 화면 미리보기이며 공용 API는 배포된 서버를 사용합니다.

GitHub Pages는 저장소의 `index.html`을 통해 `dist/`로 연결됩니다.
서버 변경은 Sites 배포가 별도로 필요합니다. DB 구조는 `drizzle/` 마이그레이션으로 관리합니다.

## Supabase 저장소 전환

Supabase 연결 코드는 준비되어 있으며, 운영 전환 전에는 기존 D1 저장소를 사용합니다.
`supabase/migrations/20261102072313_fnancier_dashboard.sql`을 대상 프로젝트에 적용한 뒤 서버 런타임에 다음 값을 설정합니다.

- `SUPABASE_URL`: 프로젝트 API URL
- `SUPABASE_SECRET_KEY`: 서버 전용 secret 키 또는 기존 service_role 키. 비밀 환경 변수로만 저장합니다.
- `STORAGE_BACKEND`: `supabase`로 설정하면 Supabase를 사용합니다. 미설정 시 D1을 사용하며 `maintenance`는 D1 조회만 허용하고 저장을 잠시 중단합니다.

전환 순서는 새 서버 코드 배포 → maintenance 적용 → 기존 `/api/state` 백업 → `fnancier_write_state` RPC로 상태 이전 → 건수·내용 확인 → supabase 적용입니다. 전환 중 저장 실패 시 화면의 입력 내용을 유지합니다. Supabase 장애 시 D1으로 자동 전환하지 않아 저장소가 갈라지는 것을 방지합니다.

일정은 `public.fnancier_schedules`, 팀원 포지션은 `public.fnancier_positions`에서 확인합니다. `public.fnancier_state`는 충돌 검사용 버전과 대시보드의 원본 상태를 저장합니다. Table Editor에서 미러 테이블만 직접 수정한 내용은 대시보드에 반영되지 않습니다. 일정 편집은 대시보드에서 진행합니다.

모든 테이블에 RLS를 적용하고 익명·일반 사용자 접근을 차단합니다. 브라우저는 기존 팀 편집코드로 공용 API를 호출하며 Supabase 비밀키를 받지 않습니다. 배포 후 실제 일정 추가·조회·변경을 검증하기 전에는 전환 완료로 간주하지 않습니다.

## Vercel 배포

Vercel에서 저장소 루트를 가져오면 `vercel.json`이 `node scripts/build-vercel.mjs`로 화면을 생성하고 `api/state.js`를 서버 함수로 배포합니다. 빌드된 화면은 같은 주소의 `/api/state`를 사용합니다. GitHub Pages용 파일은 그대로 유지됩니다.

Vercel 프로젝트의 Production 환경 변수에 `SUPABASE_URL`, `SUPABASE_SECRET_KEY`, `TEAM_EDIT_CODE`를 설정합니다. 비밀키와 편집코드는 Sensitive로 저장하고 Preview 환경에는 별도 테스트 데이터베이스를 사용합니다. Vercel API는 Supabase만 사용하며 `STORAGE_BACKEND` 설정이 필요하지 않습니다. 비밀 환경 변수는 소스나 브라우저 번들에 포함하지 않습니다.

기존 저장소에서 운영 데이터를 옮긴 뒤, Vercel 주소에서 일정 추가·수정·재접속과 Supabase 실제 행을 확인해야 배포 완료입니다.

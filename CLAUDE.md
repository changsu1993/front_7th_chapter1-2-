# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## 프로젝트 개요

React + TypeScript + Vite + Material-UI 기반의 캘린더 일정 관리 애플리케이션입니다. AI 도구를 활용한 개발 및 테스트 작성에 중점을 둔 과제 프로젝트입니다.

## 개발 명령어

### 애플리케이션 실행
- `pnpm dev` - Express API 서버와 Vite 개발 서버를 동시에 실행
- `pnpm start` - Vite 개발 서버만 실행
- `pnpm server` - Express 서버만 실행 (http://localhost:3000)
- `pnpm server:watch` - Express 서버를 watch 모드로 실행

### 테스트
- `pnpm test` - Vitest로 테스트를 watch 모드로 실행
- `pnpm test:ui` - Vitest UI를 열어서 인터랙티브하게 테스트 디버깅
- `pnpm test:coverage` - 테스트 커버리지 리포트 생성 (`.coverage/` 폴더에 생성됨)

### 빌드 및 린트
- `pnpm build` - TypeScript 타입 체크 후 프로덕션 빌드
- `pnpm lint` - ESLint와 TypeScript 타입 체크 모두 실행
- `pnpm lint:eslint` - ESLint만 실행
- `pnpm lint:tsc` - TypeScript 컴파일러 체크만 실행

## 아키텍처

### 백엔드 API (server.js)
최소한의 Express 서버로 일정 CRUD REST API를 제공합니다:
- 일정 데이터는 `src/__mocks__/response/` 폴더의 JSON 파일에 저장
- 기본적으로 `realEvents.json` 사용, `TEST_ENV=e2e`일 때는 `e2e.json` 사용
- 단일 일정 작업 (`/api/events/:id`)과 일괄 작업 (`/api/events-list`) 모두 지원
- 반복 일정 작업은 `/api/recurring-events/:repeatId` 엔드포인트 사용

### 프론트엔드 아키텍처
훅 기반 아키텍처로 관심사를 명확하게 분리:

**커스텀 훅** (`src/hooks/` 폴더):
- `useEventOperations` - 일정 CRUD 작업 및 API 통신 관리
- `useEventForm` - 폼 상태, 유효성 검사, 시간 오류 체크 처리
- `useCalendarView` - 캘린더 뷰 모드(주간/월간), 네비게이션, 공휴일 가져오기 제어
- `useNotifications` - 알림 시간 설정에 따른 일정 알림 관리
- `useSearch` - 검색어와 현재 캘린더 뷰 기준으로 일정 필터링

**유틸리티** (`src/utils/` 폴더):
- `dateUtils.ts` - 날짜 포맷팅 및 캘린더 주/월 계산
- `eventUtils.ts` - 일정 데이터 변환 및 조작
- `eventOverlap.ts` - 일정 간 시간 충돌 감지
- `timeValidation.ts` - 시작/종료 시간 관계 유효성 검사
- `notificationUtils.ts` - 일정 알림 표시 시점 계산

### 테스트 전략
- **단위 테스트**: `src/__tests__/unit/`에 위치, 개별 유틸리티 함수 테스트
- **훅 테스트**: `src/__tests__/hooks/`에 위치, 커스텀 훅을 독립적으로 테스트
- **통합 테스트**: `src/__tests__/`에 위치, 전체 컴포넌트 상호작용 테스트
- MSW(Mock Service Worker)로 API 모킹 설정됨
- 테스트 파일 네이밍 규칙: `{난이도}.{컴포넌트}.spec.ts(x)`
  - `easy.*` - 기본 기능 테스트
  - `medium.*` - 더 복잡한 시나리오
- `src/setupTests.ts`의 전역 테스트 설정:
  - MSW 서버 초기화
  - 시스템 시간을 '2025-10-01'로 설정한 가짜 타이머
  - beforeEach에서 `expect.hasAssertions()` 강제

### 주요 구현 사항
- UI 컴포넌트는 MUI(Material-UI) v7 사용
- 스낵바 알림은 `notistack` 라이브러리 사용
- 테스트에서 타임존은 UTC로 고정 (`vi.stubEnv('TZ', 'UTC')`)
- 반복 일정 기능은 주석 처리됨 (8주차 과제용으로 표시됨)
- Vite 개발 서버는 `/api` 요청을 `http://localhost:3000`으로 프록시

## 테스트 개발 워크플로우

새 기능 개발이나 버그 수정 시:
1. 기존 테스트 파일 패턴을 따라 테스트부터 작성
2. API 모킹은 `src/__mocks__/handlers.ts`의 MSW 핸들러 사용
3. 인터랙티브 디버깅은 `pnpm test:ui` 사용
4. 커밋 전에 모든 테스트가 통과하는지 확인

단일 테스트 파일 실행:
```bash
pnpm test src/__tests__/unit/easy.dateUtils.spec.ts
```

## 코드 스타일
- ESLint 설정으로 import 순서 강제 (builtin → external → parent/sibling → index)
- Prettier가 통합되어 lint 시 실행됨
- TypeScript strict 모드 활성화
- React 19 + TypeScript 사용

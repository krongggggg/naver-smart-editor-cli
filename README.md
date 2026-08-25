# Naver Smart Editor CLI

Chrome DevTools Protocol(CDP)로 **네이버 블로그 스마트 에디터 ONE**을 원격 제어하는 CLI/라이브러리입니다.

`agent-browser autoconnect 9223`으로 연결된 Chrome에서 동작합니다.

## 요구사항

- Node.js 18+
- agent-browser (또는 CDP 포트 9223이 열린 Chrome)
- 네이버 블로그 글쓰기 페이지가 열려 있어야 함

## 설치

```bash
npm install
chmod +x bin/smart-editor.js
```

## CLI 사용법

```bash
# 연결 테스트
node bin/smart-editor.js connect

# 에디터 상태 확인
node bin/smart-editor.js info

# 모듈 목록
node bin/smart-editor.js modules

# 제목 설정/조회
node bin/smart-editor.js title set "글 제목"
node bin/smart-editor.js title get

# 본문 텍스트
node bin/smart-editor.js text write "본문 내용"
node bin/smart-editor.js text get

# 서식
node bin/smart-editor.js format bold
node bin/smart-editor.js align center

# 툴바 모듈 실행
node bin/smart-editor.js module photo
node bin/smart-editor.js module table
node bin/smart-editor.js toolbar video

# 이미지 URL 삽입
node bin/smart-editor.js image url https://example.com/image.jpg

# 문서 JSON 내보내기
node bin/smart-editor.js document
```

### 저장 / 발행 팝업

```bash
# 저장 (임시저장)
node bin/smart-editor.js save
node bin/smart-editor.js save drafts      # 임시저장 목록

# 발행 팝업
node bin/smart-editor.js publish open
node bin/smart-editor.js publish state    # 현재 설정 읽기
node bin/smart-editor.js publish categories
node bin/smart-editor.js publish category 일상
node bin/smart-editor.js publish tags "일상,메모"
node bin/smart-editor.js publish visibility public   # public|neighbor|both_neighbor|private
node bin/smart-editor.js publish option comment on
node bin/smart-editor.js publish time now          # now|schedule
node bin/smart-editor.js publish confirm           # 최종 발행 클릭
node bin/smart-editor.js publish close

# 한번에 설정
node bin/smart-editor.js publish config --json '{"category":"일상","tags":["메모"],"openType":"public","confirm":false}'
```

## 라이브러리 사용

```javascript
import { connect } from './src/index.js';

const { editor, modules, publish, disconnect } = await connect({ port: 9223 });

await editor.setTitle('제목');
await editor.writeText('본문');
await modules.bold();

// 발행 팝업
await publish.openPublish();
await publish.selectCategory('일상');
await publish.setTags(['일상', '메모']);
await publish.setOpenType('public');
await publish.setOptions({ comment: true, search: true });
await publish.closePublish();

// 또는 configure로 한번에
await publish.configure({
  category: '일상',
  tags: ['메모'],
  openType: 'public',
  options: { comment: true, sympathy: true },
  confirm: false,  // true면 발행까지 실행
});

await publish.save();
await disconnect();
```

## 아키텍처

```
agent-browser (CDP :9223)
    └── blog.naver.com (page)
            └── #mainFrame → PostWriteForm.naver (iframe)
                    └── SE.launcher.getEditor('blogpc001')
                            ├── _documentService   (제목, 본문, JSON)
                            ├── _editingService    (텍스트 입력)
                            ├── _commandManager    (컴포넌트/이미지 삽입)
                            ├── _propertyChangeService (서식)
                            └── toolbar [data-name="..."]
```

## 모듈 (Document Toolbar)

| CLI alias | data-name | 설명 |
|-----------|-----------|------|
| photo | image | 사진 업로드 |
| mybox | social-media-image | MYBOX |
| video | video | 동영상 |
| sticker | sticker | 스티커 |
| quotation | insert-quotation | 인용구 |
| line | insert-horizontal-line | 구분선 |
| link | oglink | OG 링크 |
| file | file | 파일 |
| schedule | schedule | 일정 |
| code | code | 소스코드 |
| table | table | 표 |
| formula | formula | 수식 |
| map | map | 장소 |
| shopping | shopping-connect | 쇼핑커넥트 |

## Command Manager API

| Command | 설명 |
|---------|------|
| insertComponents | 컴포넌트 삽입 |
| insertImagesByUrl | URL로 이미지 삽입 |
| insertImagesByFile | 파일로 이미지 삽입 |
| deleteComponents | 컴포넌트 삭제 |

## 발행 팝업 필드

| 필드 | ID/Selector | CLI |
|------|-------------|-----|
| 카테고리 | `selectbox_button` | `publish category <name>` |
| 주제 | `.set_theme` | `publish.openTopicSelector()` |
| 전체공개 | `#open_public` | `publish visibility public` |
| 이웃공개 | `#open_neighbor` | `publish visibility neighbor` |
| 서로이웃공개 | `#open_both_neighbor` | `publish visibility both_neighbor` |
| 비공개 | `#open_private` | `publish visibility private` |
| 댓글허용 | `#publish-option-comment` | `publish option comment on/off` |
| 공감허용 | `#publish-option-sympathy` | `publish option sympathy on/off` |
| 검색허용 | `#publish-option-search` | `publish option search on/off` |
| 링크허용 | `#publish-option-scrap` | `publish option scrap on/off` |
| 외부공유허용 | `#publish-option-outside` | `publish option outside on/off` |
| 공지사항 | `#set-notice` | `publish option notice on/off` |
| 태그 | `#tag-input` | `publish tags "a,b,c"` |
| 현재/예약 | `#radio_time1/2` | `publish time now/schedule` |
| 발행 확인 | `confirm_btn` | `publish confirm` |
| 저장 | `save_btn` | `save` |

## 분석 스크립트

```bash
npm run analyze          # DOM/툴바/API 전체 분석
node scripts/probe-api.js
node scripts/probe-commands.js
```

분석 결과: `analysis/editor-report.json`

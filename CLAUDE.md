# CLAUDE.md (라우터)

GameReels 플랫폼용 HTML5 스테이지 게임 개발 프로젝트의 가이드 라우터입니다.
실제 작업 규칙은 게임 차원에 맞춰 아래 두 파일 중 **하나**를 따릅니다.

---

## 어떤 가이드를 사용할지

| 차원 | 기술 스택 | 에셋 출처 | 가이드 파일 |
|---|---|---|---|
| **3D** | Three.js r128 + GLTFLoader | Quaternius (CC0) | [CLAUDE_3D.md](./CLAUDE_3D.md) |
| **2D** | PixiJS r7 (+ Matter.js 선택) | Kenney.nl (CC0) | [CLAUDE_2D.md](./CLAUDE_2D.md) |

대상 게임 예시:
- **3D**: 러너, 3D 퍼즐, io 게임 (탑다운/3인칭) 등
- **2D**: 픽셀 아트 플랫포머(Level Devil 류), 물리 퍼즐(Long Cat 류), 종스크롤 슈터, 탑다운 액션 등

---

## 사용 방법

새 게임 프로젝트를 시작할 때, **차원에 맞는 가이드 파일을 Claude Code에게 명시적으로 지시**하세요. 예를 들어:

- "이번 게임은 3D 러너야. **CLAUDE_3D.md를 따라서 작업해줘**."
- "2D 픽셀 아트 플랫포머 만들거야. **CLAUDE_2D.md 가이드대로 진행해**."

또는 프로젝트 시작 시 적합한 가이드 파일을 `CLAUDE.md`로 덮어써서 자동 로드되도록 할 수도 있습니다:
```bash
# 3D 프로젝트 시작 시
cp CLAUDE_3D.md CLAUDE.md

# 2D 프로젝트 시작 시
cp CLAUDE_2D.md CLAUDE.md
```

---

## 두 가이드의 공통 사항 (둘 다에 동일하게 들어 있음)

다음 절들은 두 파일에 **같은 내용**으로 들어 있으며, 차원과 무관하게 동일하게 적용됩니다:

- 1. 프로젝트 개요 (플랫폼, 디바이스, 플레이 시간 등)
- 2. 빌드 / 출력 구조
- 5. 화면 / 뷰포트 / Safe Area (카메라 절대 규칙은 공통, 구현은 차원별로 다름)
- 6. 앱 ↔ 게임 통신 프로토콜 (GameBridge)
- 7. 게임 라이프사이클
- 8. 햅틱 정책
- 9. 사운드 / ASMR 정책
- 10. 시각 효과
- 11. localStorage / 영속 데이터
- 12. 100 스테이지 제작 정책
- 13. 튜닝 / 설정 시스템 (GameTune)
- 14. 성능 / 최적화
- 15. 입력 (터치) 정책
- 16. 에러 / 로깅 / 보안
- 17. 코드 스타일 / 컨벤션
- 18. UI 디자인
- 19. 금지 사항
- 20. 개발 / 테스트 워크플로우
- 21. 작업 시 우선순위

## 앱 ↔ 게임 이벤트 프로토콜 (절대 변경 금지)

> ⚠️ **경고 (Lock-In)** — 이 절의 모든 이벤트 이름, payload 형식, 채널 이름은 Luna 앱과 합의된 **고정 규격**이다. **무슨 일이 있어도 Claude가 임의로 바꾸지 않는다.** 코드 정리, 리팩터링, "더 깔끔하게 보이도록" 같은 어떤 이유로도 변경 불가. 사용자가 명시적으로 "이 규격을 바꿔달라"고 새로운 사양을 적시해 요청하기 전까지는 그대로 유지한다. 위반 시 햅틱·재개·시작·종료 통보가 전부 무음으로 사라져 앱과의 통합이 깨진다.
>
> 변경을 검토해야 하는 유일한 경우: 사용자가 새로운 이벤트 이름/형식을 **직접 명시**하면서 변경을 지시한 경우. 그 외엔 어떤 추측·일반화·통일도 하지 않는다.

### 1. 통신 채널

| 방향 | API |
|---|---|
| **게임 → 앱** (outbound) | `window.FlutterChannel.postMessage(jsonString)` — primary. fallback으로 webkit.messageHandlers.GameReels, AndroidBridge, ReactNativeWebView, flutter_inappwebview, parent.postMessage 순. |
| **앱 → 게임** (inbound) | `window.OnMessageFromFlutter(message)` — 앱이 호출. `message`는 JSON 문자열 또는 객체. |

부팅 race 방지: 스크립트 최상단에서 `window.OnMessageFromFlutter`를 buffering stub으로 즉시 정의해두고, `GameBridge.init()` 도달 시 실제 핸들러로 교체하면서 버퍼된 메시지를 drain한다.

### 2. 게임 → 앱 송신 이벤트 (고정 형식)

모두 `FlutterChannel.postMessage(JSON.stringify(...))`로 송신.

| 시점 | 송신되는 JSON (정확한 형식 — 절대 변경 금지) |
|---|---|
| 자산 로드 완료 (`notifyReady`) | `{"event":"GameStart","data":null}` <br> `{"type":"luna:started"}` <br> `{"event":"started","data":null}` |
| 전체 클리어 (`notifySuccess`) | `{"type":"luna:success"}` <br> `{"event":"success","data":null}` |
| 실패 (`notifyFail`) | `{"type":"luna:fail"}` <br> `{"event":"fail","data":null}` |
| 약한 햅틱 (`lightVibrate`) | **`{"event":"LightVibrate","data":null}`** — 단일 이벤트만. luna:* / kebab-case 변형 송신 금지. |
| 강한 햅틱 (`mediumVibrate`) | **`{"event":"MediumVibrate","data":null}`** — 단일 이벤트만. 위와 동일. |

### 3. 앱 → 게임 수신 이벤트

`OnMessageFromFlutter(message)`로 들어오는 payload. 앱은 wrapping을 거쳐 `{event, data, timestamp}` 형태로 보냄. 핸들러는 `payload.event / type / event_type / action / name / command` 어느 키든 검사해 분기.

| 들어오는 이벤트 키워드 (대소문자 무시) | 동작 |
|---|---|
| `pause`, `GamePause` | `Game.paused = true` |
| `resume`, `GameResume`, `start`, `GameStart` | `Game.paused = false` |
| `uitoggle`, `ui` | HUD 토글 |
| (그 외 모든 메시지) | **방어적으로 resume** (= `paused=false`) — 호스트가 이벤트 이름을 잘못 보내도 멈추지 않게 |

앱이 보내는 정확한 payload 예시 (Flutter 측 코드 기준):

```js
// GameResume
{ event:"GameResume", type:"GameResume", event_type:"resume", source:"flutter", data:"" }
// GamePause
{ event:"GamePause",  type:"GamePause",  event_type:"GamePause", source:"flutter", data:"" }
```

### 4. 라이프사이클 (고정)

```
페이지 로드
  → 스크립트 최상단: OnMessageFromFlutter buffering stub 설치
  → GameBridge.init() : 실제 핸들러 설치 + 버퍼 drain
  → loop() : rAF 렌더 시작
  → Assets.loadAll()
  → _bootGame():
      Game.init() / updateCamera()
      Game.start()              ← 항상 자동 호출. started=true, paused는 그대로 true.
      notifyReady()             ← {luna:started} 등 송신
  → (이 시점 게임은 시작 상태 + paused=true)
  → 앱이 GameResume 송신 → paused=false → 플레이 가능
```

**중요한 invariant** — 절대 위반 금지:
- 게임은 호스트의 `GameStart`를 **기다리지 않는다**. 자산 로드 완료 시 무조건 `Game.start()` 실행.
- `Game.paused`의 기본값은 **`true`**. 호스트의 `GameResume` 없이는 절대 false가 되지 않음 (dev preview의 native bridge 미존재 케이스 제외).
- `Game.started`는 부팅 후 항상 `true`. 외부 이벤트로 변경되지 않음.

### 5. 햅틱 호출 시점 (현재 게임 빌드 기준)

| 시점 | 강도 |
|---|---|
| 모든 유효 탭 (pointerup) | Light |
| 보석 그룹 선택 (selectGroup) | Light |
| 보석이 목적지에 안착 (flight settle) | Light |
| 한 색 완성 (트레이 슬롯 해제) | Medium |
| 전체 클리어 (winSequence) | Medium |

`HapticThrottle` 인터벌: light 30ms, medium 200ms.

### 6. 변경하려는 충동이 들 때

> **하면 안 되는 것**:
> - "햅틱 이름을 sendLuna로 통일하자" — ❌ Luna 앱은 `LightVibrate`/`MediumVibrate`만 수신한다.
> - "GameStart 이벤트도 받아서 게임 시작 트리거로 쓰자" — ❌ Luna 앱은 GameStart를 보내지 않는다. GameResume만 보낸다.
> - "outbound 이벤트 이름이 너무 비일관적이니 다 luna:*로 바꾸자" — ❌ 변경 불가. 호환성 폭발.
> - "buffering stub 없어도 되겠지" — ❌ iOS WebView race condition 재발.
>
> **해도 되는 것**:
> - 햅틱이 호출되는 *코드 위치*를 추가/제거 (어떤 액션에서 햅틱을 울릴지)
> - `HapticThrottle` 인터벌 조정
> - 외부에서 명시한 사양에 맞춰 형식 추가 (예: "새로운 이벤트 X를 추가해줘")

---

## Jewel Coloring 에디터 작업 규정

`jewel_editor.html`에 관한 모든 수정 요청은 아래 두 곳에 **동시에** 반영해야 한다.

1. **`jewel_editor.html` 에디터 코드** — 메인 `<script>` 내 에디터 로직
2. **`jewel_editor.html` 내 스테이지 템플릿** — `<script id="stage-template" type="text/plain">` 태그에 Base64 인코딩된 실제 게임 HTML

둘 중 하나라도 빠뜨리면 에디터에서 보이는 동작과 내보낸 게임 파일의 동작이 달라지므로, 반드시 두 곳 모두 수정한 뒤 확인한다.

## 작업 완료 전 검증 필수 규정

모든 작업이 끝난 후 반드시 아래 절차를 따른다.

1. **직접 열어서 확인** — `jewel_editor.html`을 브라우저 미리보기(preview)로 직접 열어 정상 동작을 눈으로 확인한다.
2. **레퍼런스와 비교** — 수정한 기능이 레퍼런스 이미지/동작과 동일한지 확인한다.
3. **이상 발견 시 자율 수정** — 동작 문제나 레퍼런스와 다른 점이 확인되면, 사용자가 별도로 요청하지 않아도 스스로 수정을 계속한다.
4. **확인 완료 후에만 작업 완료 선언** — 위 검증이 끝난 경우에만 작업이 완료됐다고 사용자에게 알린다.

---

## 작업 우선순위

게임 작업 시 다음 순서로 우선순위를 둔다.

1. **로직 / 게임 메커닉** — 가장 중요. 버그 없는 정확한 동작이 최우선.
2. **아트 / 디자인 톤** — 로직 다음으로 가장 중요. 레퍼런스 이미지와 유사한 컬러감·디자인 톤이 유지되지 않으면 같은 게임이라 부를 수 없다. 기능이 동작해도 톤이 레퍼런스와 다르면 작업 완료가 아니다.
3. 그 외 (사운드, 햅틱, 부가 효과, 미세 UX 등)

사용자가 별도 지시하지 않아도 톤이 레퍼런스와 다르면 스스로 수정한다.

---

## 레퍼런스 컬러 / 톤 보존 규정

게임의 비주얼은 항상 사용자가 제공한 **레퍼런스 이미지의 컬러감과 톤을 최대한 그대로 재현**한다. 픽셀아트, 일러스트, 카툰 등 어떤 스타일이든 적용된다.

1. **색 변형 최소화** — 채도 부스트, 자동 대비 강화 등을 임의로 적용하지 않는다. 레퍼런스의 색 그대로가 1순위.
2. **렌더링 조명에 의한 밝기 보정** — Three.js의 머티리얼 + 라이트는 화면에서 30-40% 밝게 보인다. 팔레트 색을 미리 `luminance × 0.72` 정도 어둡게 두어 최종 렌더가 레퍼런스 밝기에 매칭되도록 한다. 거의 흰색(lum ≥ 220)은 보존.
3. **유사 색 보존** — 레퍼런스에 의도적으로 비슷한 톤 두 가지(예: 연갈색 / 진갈색)가 있으면 둘 다 별도 색으로 보존. 채도/광도를 같은 방향으로 압축해 두 색을 하나로 만들지 않는다.
4. **검증** — 작업 후 결과를 캡쳐해 레퍼런스 이미지와 나란히 비교. 색감이 다르면 자율적으로 재조정.

---

## 3D / 2D 자산 임베딩 규정

게임은 **단일 HTML 파일**로 앱(Luna WebView)에 배포된다. 외부 자산 fetch가 불가능한 환경(오프라인 / CORS 제한 / 미디어 URL 차단) 도 고려해야 하므로, **모든 자산은 HTML 안에 base64로 인라인 임베딩**한다.

### 임베딩 대상
- **3D 빌드**: `.glb` / `.gltf` (Quaternius 모델) — `ASSET_JEWEL_B64`, `ASSET_FRAME_B64` 같은 `const` 상수에 base64 문자열로 박아넣고 `GLTFLoader.parseAsync(base64 → ArrayBuffer)` 로 로드.
- **2D 빌드**: PNG/스프라이트시트 — `data:image/png;base64,...` 형태의 dataURL을 `Texture.from()` / `Assets.load()` 에 그대로 전달.
- **오디오**: 짧은 SFX는 `data:audio/...` 또는 Web Audio로 절차적 생성. 긴 BGM은 base64로 박지 않고 별도 룰 검토.

### 임베딩 패턴 (3D 예시)
```js
const ASSET_JEWEL_B64 = '<base64 string>';

// 로드 시:
const bin = Uint8Array.from(atob(ASSET_JEWEL_B64), c => c.charCodeAt(0));
new THREE.GLTFLoader().parse(bin.buffer, '', (gltf) => {
  // gltf.scene 사용
});
```

### 임베딩이 가져오는 이점
- **단일 파일 배포** — HTML 1개만 CDN/앱에 올리면 됨. 자산 누락 위험 0.
- **HTTP roundtrip 제거** — 페이지 로드 후 추가 fetch 없이 즉시 파싱 가능.
- **CORS / WebView 제한 회피** — 일부 WebView 설정에서 외부 fetch가 차단되더라도 인라인 자산은 항상 접근 가능.
- **오프라인 동작** — 사용자가 네트워크 없이도 게임 진행.

### 임베딩의 비용과 대응
- **HTML 크기 증가** — base64는 원본 binary 대비 ~33% 커짐. 모델은 Quaternius 저폴리(<5K vertices) 기준으로 한 모델당 base64 길이 ~30KB~700KB. 합쳐서 1MB 이내 유지가 목표.
- **draco 압축은 선택지지만 신중히** — base64 GLTFLoader 파싱 경로에서 draco extension 사용 시 추가 디코더 base64 로딩 필요. 압축률 대비 디코더 로딩 비용을 비교해 결정.
- **머티리얼/텍스처 임베드** — GLTF의 `images` / `samplers`가 외부 URI를 참조하면 임베드 효과 사라짐. base64 변환 시 `gltf-pipeline -i model.glb -b -o model_embed.glb`로 텍스처도 GLB 안에 묶을 것.

### 절대 금지
- 외부 URL (`https://...`, `./assets/...`) 에서 자산을 fetch하는 코드 추가 금지. 모든 자산은 인라인.
- 자산을 base64 인라인 없이 별도 파일로 분리하는 빌드 산출물 금지 (jewel_editor.html 의 export 경로 변경 불가).
- 임의로 자산 임베드 방식을 외부 fetch로 "리팩터링"하지 않는다. 단일 파일 원칙은 협상 불가.

---

## 최적화 지침

게임은 모바일 WebView에서 동작하므로 렌더 비용을 최소화한다. 목표 60fps.

### 공통 원칙 (3D / 2D 모두)
- **매 프레임 새 객체 할당 금지** — 임시 Vector/Matrix/배열 등은 모듈 스코프에 캐시해 재사용.
- **색 양자화 시 `Math.min(255, …)` 클램프 필수** — `Math.round(255/8)*8 = 256`이 비트 팩킹 RGB로 들어가면 디코드 시 깨진 값(near-black)이 나옴. 양자화 후 항상 255로 클램프.
- **다중 패스 렌더 시 background 클리어 충돌 주의** — 한 프레임에 `renderer.render`를 여러 번 호출한다면 자동 클리어가 이전 패스를 지울 수 있음. 프레임 시작 시 명시적 clear 1회만 사용.

### Three.js (3D 빌드)
- **렌더러 옵션**
  - `preserveDrawingBuffer: false` (스크린샷 안 쓰는 한 항상 false — GPU 최적화 차단 방지)
  - `stencil: false` (스텐실 미사용 시 버퍼 할당 제거)
  - `renderer.autoClear = false` + 프레임 시작에 명시적 `renderer.clear()` 1회
  - `renderer.info.autoReset = false` (디버그 카운터 매 프레임 리셋 비활성)
- **Scene background**
  - `scene.background = null` 권장. 색 설정 시 매 `renderer.render`마다 그 색으로 클리어 → 다중 패스 시 이전 패스가 지워짐.
- **InstancedMesh**
  - `instanceMatrix.setUsage(THREE.DynamicDrawUsage)` (자주 갱신 시)
  - `frustumCulled = false` — 인스턴스 위치 변경 시 바운딩 자동 갱신 안 됨, 잘못된 컬링 위험.
- **정적/수동-갱신 메시**
  - `matrixAutoUpdate = false`로 두고 position/rotation/scale 변경 직후 반드시 `updateMatrix()` 명시 호출. 안 하면 매트릭스가 stale 상태로 렌더됨.
- **라이트 / 머티리얼**
  - MeshStandardMaterial(PBR) + 다수 라이트는 GPU 비용 큼. 모바일은 조명 3개 이하 권장.
  - 그림자/반사가 불필요한 절은 MeshBasicMaterial 검토.

### PixiJS (2D 빌드)
- **렌더러 설정**
  - `antialias: false` (픽셀아트는 또렷한 경계, 자유선 아트는 케이스별)
  - `resolution: Math.min(window.devicePixelRatio, 2)` 캡 (레티나 4x 픽셀 비용 방지)
- **배치 / 컨테이너 구조**
  - 동일 텍스처/머티리얼 스프라이트는 같은 컨테이너 아래 묶어 자동 batching 적용.
  - Sprite 대량 생성/파괴는 `ObjectPool` 패턴으로 재활용.
- **텍스처**
  - 아틀라스(`spritesheet`)로 묶어 텍스처 스위치 최소화.
  - 미사용 텍스처는 `destroy({ texture: true })`로 GPU 메모리 해제.
- **상태 변경 최소화**
  - 매 프레임 `tint`, `blendMode`, `filters` 변경 회피.

### 입력 / 이벤트
- 매 프레임 발생할 수 있는 입력(pointermove, resize 등)은 throttle/debounce 적용.
- 이벤트 리스너는 한 곳에서 위임(delegate)해 다중 등록 방지.

---

## 차원별 차이점

- 3절 (기술 스택) — Three.js vs PixiJS
- 4절 (에셋) — Quaternius (3D, GLB/GLTF) vs Kenney (2D, PNG/아틀라스)
- 5절 일부 — 카메라/좌표계 구현 (Y-up vs Y-down, perspective vs 월드 컨테이너)
- CLAUDE_2D.md의 22절 — 2D 전용 추가 사항 (스프라이트 시트, 타일맵, 물리, 패럴랙스 등)
- CLAUDE_3D.md의 22절 — 미확정 항목 (3D 전용 추가 절 없음)

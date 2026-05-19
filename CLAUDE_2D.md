# CLAUDE_2D.md (2D 게임 전용 가이드)

GameReels 플랫폼용 **2D HTML5 스테이지 게임** 개발 프로젝트 가이드입니다. (3D 게임은 `CLAUDE_3D.md` 참조)
PixiJS r7 기반, 대상 게임 유형 예시: **Level Devil**(픽셀 아트 사이드뷰 플랫포머), **Long Cat**(카툰 물리 퍼즐).
Claude Code가 이 문서를 기준으로 일관되게 작업하도록 모든 규칙과 제약을 정리합니다.

---

## 1. 프로젝트 개요

- **플랫폼**: GameReels (Flutter 기반 숏폼 게임 앱)
- **타겟 환경**: 모바일 웹뷰 전용 (iOS WKWebView / Android WebView)
- **화면 방향**: 세로형 고정 (Portrait)
- **게임 형태**: 스테이지형 (장르 무관, 프로젝트마다 다름)
- **차원**: **2D 전용** (PixiJS 기반). 3D 게임은 `CLAUDE_3D.md`의 Three.js 가이드를 따름
- **스테이지당 목표 플레이 시간**: **15~60초**, 최대 90초 (숏폼 특성상 짧고 강렬하게)
- **개발 우선순위**: 밸런스보다 **타격감, 만족감, ASMR 요소**가 최우선
- **UI 텍스트 정책**: 게임 내 표시 텍스트는 **영어만 사용** (한국어/일본어/중국어 등 금지). 가능한 한 **텍스트 없이 아이콘·숫자·도형**으로 표현 — 글로벌 가독성 + 짧은 플레이 환경 인식 속도. 상세는 18절 UI 디자인 참조
- **지원 디바이스**: iOS 14+ Safari/WKWebView, Android 8+ Chrome/WebView (WebGL1 기준)

---

## 2. 빌드 / 출력 구조

### 출력 파일
- 각 스테이지는 **완전히 독립적인 단일 HTML 파일**로 빌드됩니다
- 파일명 규칙: `{gamename}_stage{N}.html` (예: `slicer_stage1.html`, `slicer_stage2.html` ... `slicer_stage100.html`)
- 각 HTML 파일은 다른 파일에 의존하지 않고 단독으로 실행되어야 합니다
- 모든 JS/CSS는 인라인 또는 CDN import로 처리 (외부 파일 분리 금지)
- 2D 에셋 파일(PNG, 아틀라스 JSON, 타일맵 JSON 등)은 외부 파일로 두되, 각 HTML에서 동일한 경로를 참조

### 디렉토리 구조 예시
```
project-root/
├── CLAUDE.md
├── assets/
│   ├── sprites/       # 개별 PNG 스프라이트
│   ├── atlases/       # 텍스처 아틀라스 (PNG + JSON)
│   ├── tilemaps/      # Tiled 에디터 출력 JSON (선택)
│   └── sounds/        # Freesound에서 받은 음원
├── src/
│   ├── core/          # 공통 게임 로직 (개발 단계용, 빌드 시 인라인)
│   ├── stages/        # 스테이지별 데이터 (JSON 또는 JS 모듈)
│   └── bridge/        # 앱 통신 모듈
└── dist/
    ├── gamename_stage1.html
    ├── gamename_stage2.html
    └── ...
```

> 개발 단계에서는 모듈로 작성하되, 최종 빌드 시 각 스테이지 HTML에 모든 코드를 인라인으로 포함시킵니다.

---

## 3. 기술 스택

- **2D 렌더러**: PixiJS r7 (WebGL 2D 렌더러)
  - CDN: `https://cdn.jsdelivr.net/npm/pixi.js@7.4.0/dist/pixi.min.js`
- **2D 물리**: Matter.js (필요할 때만 — 강체 충돌/조인트/중력이 핵심인 게임에서만)
  - CDN: `https://cdn.jsdelivr.net/npm/matter-js@0.19.0/build/matter.min.js`
  - 단순한 점프/AABB 충돌만 필요한 게임(Level Devil 류)은 자체 구현 권장 (Matter.js 비용 회피)
- **사운드**: Web Audio API 직접 사용 (별도 라이브러리 없음)
- **개발 언어**: Vanilla JavaScript (ES2020+, ESM 모듈)
- **타입 시스템**: 사용 안 함 (TypeScript ✗) — 단일 HTML 인라인 빌드 단순화 우선
- **빌드 도구**: Node.js 기반 자체 인라인 스크립트 (esbuild 활용, `dist/{gamename}_stage{N}.html` 생성)
- **외부 의존성**: CDN으로만 로드, npm 번들링 사용 안 함
- **게임 프레임워크 사용 안 함** (Phaser, Cocos 등 ✗) — 라이브러리 직접 조합
- **Three.js 사용 금지** (2D에는 오버헤드가 커서 비용 대비 비효율)

### 좌표계 / 단위
- **좌표계**: PixiJS 기본인 **Y-down** (좌상단 (0,0), 오른쪽 +X, 아래 +Y)
- **단위**: 1 unit = 1 px (픽셀 아트는 1u = 1 픽셀)
- **디자인 기준 해상도**: 1080×1920 (9:16). UI/오브젝트 좌표는 이 기준으로 설계 후 실제 화면에 비례 스케일

### 픽셀 아트 vs 카툰/벡터 렌더링
게임 아트 스타일에 따라 PixiJS 설정 분기:

**픽셀 아트 (Level Devil 스타일)**:
```javascript
PIXI.BaseTexture.defaultOptions.scaleMode = PIXI.SCALE_MODES.NEAREST; // 픽셀 보간 끄기
const app = new PIXI.Application({
  /* ...공통 설정... */
  antialias: false,
  roundPixels: true,
});
```
- CSS도 함께: `canvas { image-rendering: pixelated; image-rendering: crisp-edges; }`
- 정수 스케일만 권장 (×1, ×2, ×3) — 비정수 스케일은 픽셀 깨짐
- 캐릭터/타일 사이즈 표준화 (16×16 또는 32×32)

**카툰/벡터 (Long Cat 스타일)**:
- `SCALE_MODES.LINEAR` (기본값) 사용
- `antialias: true`, `roundPixels: false`
- 임의 스케일 가능

---

## 4. 2D 에셋 (Kenney)

### 사용할 형식
- **개별 스프라이트**: PNG (투명 배경, 트림된 사이즈)
- **텍스처 아틀라스**: PNG + JSON (PixiJS `Spritesheet` 형식) — draw call 감소를 위해 적극 사용
- **타일맵**: Tiled 에디터(https://www.mapeditor.org) JSON export (선택)
- 아틀라스 생성 도구: TexturePacker, Free Texture Packer(https://free-tex-packer.com)

### 로드 코드 패턴
```javascript
// 단일 스프라이트
const tex = await PIXI.Assets.load('./assets/sprites/player.png');
const sprite = new PIXI.Sprite(tex);
sprite.anchor.set(0.5); // 중심 정렬 권장

// 텍스처 아틀라스 (스프라이트 시트 + 애니메이션)
const sheet = await PIXI.Assets.load('./assets/atlases/player.json');
const idle = new PIXI.AnimatedSprite(sheet.animations['idle']);
idle.animationSpeed = 0.15;
idle.play();
```

### 라이선스
- **Kenney**: CC0 → 상업적 사용 자유 (출처 표기 불필요, 크레딧 포함 권장)
- **itch.io**: 팩별로 다름 → 다운로드 페이지 라이선스 확인 필수
- **OpenGameArt**: 다양 → 라이선스 개별 확인
- CC-BY는 크레딧 표기 필요

### 에셋 추천 워크플로우 (필수 절차)

게임 컨셉이 정해지면 Claude Code는 **다음 절차를 반드시 따릅니다**:

#### 1단계: 에셋 추천
게임 장르/컨셉에 적합한 Kenney 팩(또는 보조로 itch.io/OpenGameArt)을 사용자에게 추천. 추천 시 다음 정보를 포함:

- **팩 이름**: 정확한 명칭 (예: "Platformer Pack Redux")
- **출처 URL**: Kenney.nl 또는 itch.io 다운로드 링크
- **추천 사유**: 게임 컨셉과의 매칭 포인트
- **활용할 스프라이트 목록**: 캐릭터, 타일, 적, 아이템, 배경 등
- **추가 필요 팩**: 단일 팩으로 부족한 경우 보조 팩 함께 추천

#### 2D 주요 에셋 출처 (우선순위)
1. **Kenney.nl** — 최우선. CC0 라이선스, 방대한 양, 일관된 스타일. https://kenney.nl/assets
2. **itch.io** — 보조. CC0/CC-BY 필터링 필수. https://itch.io/game-assets/free
3. **OpenGameArt** — 다양한 스타일. 라이선스 개별 확인. https://opengameart.org

#### Kenney 주요 팩 참고 목록

**플랫포머 (Level Devil 계열)**:
- `Platformer Pack Redux`: 카툰 종합 (캐릭터, 타일, 적, 아이템, 파워업)
- `Pixel Platformer` / `Pixel Platformer Industrial Expansion`: 16×16 픽셀 아트
- `Platformer Art Deluxe`: 카툰 + 다양한 환경 테마
- `Platformer Characters`: 캐릭터 + 애니메이션 프레임
- `Background Elements Redux`: 패럴랙스 배경

**물리 퍼즐 (Long Cat 계열)**:
- `Physics Assets`: 박스/공/톱니/스프링 등 물리 오브젝트
- `Animal Pack Redux`: 동물 캐릭터
- `Shape Characters`: 단순 도형 캐릭터 (귀여운 표정)

**탑다운/슈터**:
- `Top-Down Tanks Redux`, `Top-Down Shooter`
- `Pixel Shmup`, `Space Shooter Redux`

**UI/아이콘**:
- `Game Icons`: 범용 아이콘 모음
- `UI Pack` / `UI Pack RPG Expansion`: 버튼, 패널 등 (단, GameReels 정책상 메타 UI 금지 — HUD에만 사용)

**효과**:
- `Particle Pack`: 파티클 텍스처
- `Smoke Particles`, `Splat Pack`

> **주의**: Kenney 팩은 수시로 업데이트됨. 정확한 정보는 https://kenney.nl/assets 에서 확인.

#### 2단계: 사용자 다운로드 대기
- Claude Code는 **에셋을 직접 다운로드하지 않습니다**
- 사용자가 직접 Kenney/itch.io에서 다운로드 → `assets/sprites/` 또는 `assets/atlases/` 폴더에 압축 해제
- 사용자가 "에셋 배치 완료"라고 알릴 때까지 대기

#### 3단계: 대기 중 placeholder 개발
- 에셋 배치를 기다리는 동안 **PixiJS `Graphics`로 도형 placeholder를 만들어 게임 로직 우선 개발**
- placeholder 생성 함수는 추후 `Sprite`로 쉽게 교체 가능하도록 모듈화

#### 4단계: 에셋 통합
- 사용자가 에셋 배치를 알리면 `assets/sprites/`, `assets/atlases/` 폴더 스캔
- PNG/JSON 목록 확인 후 placeholder를 `PIXI.Sprite`/`PIXI.AnimatedSprite`로 교체
- 교체 시 사이즈/anchor/회전 등을 게임에 맞게 조정 (`sprite.anchor.set(0.5)`로 중심 정렬 권장)

### 에셋 부재 시 Fallback 정책
사용자가 에셋을 다운로드하기 전이거나, 추천 팩에 적합한 스프라이트가 없는 경우 **PixiJS `Graphics`로 도형을 그려 임의 생성**합니다.

#### 임의 생성 가이드라인
- `PIXI.Graphics`로 사각형/원/다각형/라인 조합
- `beginFill(color)`, `drawRect`, `drawCircle`, `drawPolygon` 등 활용
- 게임 스타일에 맞는 색상 팔레트 사용 (Kenney의 채도 톤과 어울리는 색상 권장)
- 캐릭터: 직사각형 몸통 + 원형 머리 조합 가능
- 환경 오브젝트: 단색 사각형으로 추상화

#### 임의 생성 예시
```javascript
// 간단한 캐릭터 임의 생성
function createPlaceholderPlayer(color = 0x4a90e2) {
  const g = new PIXI.Graphics();
  g.beginFill(color);
  g.drawRect(-16, -32, 32, 64); // 32×64 사각형
  g.endFill();
  return g; // 추후 PIXI.Sprite로 교체
}
```

#### 에셋 사용 우선순위
1. `assets/sprites/` 또는 `assets/atlases/`에 다운로드된 파일이 있으면 그것을 사용
2. 없으면 위 가이드대로 **임의 생성하여 우선 게임을 동작 가능하게** 만들기
3. 임의 생성된 부분은 코드 주석으로 명시 (`// PLACEHOLDER: replace with sprite asset`)
4. 추후 적절한 에셋이 준비되면 `PIXI.Sprite`/`PIXI.AnimatedSprite`로 교체

> **중요**: 에셋이 없다고 게임 개발을 멈추지 마세요. 임의 도형으로라도 게임 로직과 인터랙션을 먼저 완성하는 것이 우선입니다.

### Claude Code의 금지 행동
- ❌ Kenney/itch.io/OpenGameArt 사이트에서 자동 다운로드 시도
- ❌ 사용자 동의 없이 임의로 팩을 결정하여 진행
- ❌ 에셋 추천 단계를 건너뛰고 placeholder만으로 최종 결과물 제출 (사용자가 명시적으로 "placeholder 그대로 가자"라고 한 경우 제외)
## 5. 화면 / 뷰포트 / Safe Area

### 해상도
- **고정 해상도 사용 금지**. 모든 디바이스의 실제 화면 크기에 맞춰 동적으로 대응
- `window.innerWidth`, `window.innerHeight` 기준으로 렌더러/카메라 설정
- 화면 회전 및 리사이즈 이벤트 처리 필수

### 화면 비율 / fit 정책
- **화면 비율 다양성 대응**: 19.5:9 ~ 20:9 폰 모두 대응 필요
- **2D 월드 fit 정책 (기본)**: **cover** — 핵심 플레이 영역이 가장 좁은 19.5:9 폰에서도 잘리지 않도록 디자인. 화면 비율 보정은 월드 컨테이너 스케일로 처리
- 화면 회전/리사이즈 시 PixiJS는 `resizeTo: window` 옵션으로 자동 대응. 직접 처리 시 `app.renderer.resize(w, h)` 호출

### 픽셀 비율 / 렌더러 초기화
```javascript
const app = new PIXI.Application({
  resizeTo: window,
  backgroundAlpha: 0,
  antialias: true,                                       // 픽셀 아트면 false (3절 참조)
  resolution: Math.min(window.devicePixelRatio, 2),      // dpr 2 cap (고DPR 폰 성능 보호)
  autoDensity: true,
});
document.body.appendChild(app.view);
```

### 카메라 절대 규칙
- **사용자의 카메라 조작 금지**: 회전/줌/팬 제스처 등 카메라를 직접 컨트롤하는 입력은 어떤 게임에서도 허용 안 함 (모바일 숏폼은 한 손/엄지 플레이라 카메라 조작 여유 없음)
- 카메라는 **게임 시작 시 정해진 시점/각도를 고정**하고, 위치만 정해진 규칙(플레이어 추적 등)으로 변동
- 카메라 흔들림(셰이크)은 **시스템 이벤트(충돌, 결정타, 큰 폭발 등)에서만 발생** — 사용자 입력으로 흔들리지 않음
- 모든 카메라 보간은 **lerp 기반 부드러운 이동** (`world.x += (target - world.x) * 0.1` 정도). 즉시 스냅 금지

### 2D 카메라 구현 (월드 컨테이너 패턴)
PixiJS에는 진짜 카메라 객체가 없으므로 "월드 컨테이너"의 position을 음수로 이동시켜 시뮬레이트:
```javascript
const layers = {
  bgFar:  new PIXI.Container(),  // 패럴랙스 0.2x (멀리)
  bgNear: new PIXI.Container(),  // 패럴랙스 0.5x
  world:  new PIXI.Container(),  // 1x, 게임 오브젝트
  fx:     new PIXI.Container(),  // 파티클/이펙트 (1x)
  ui:     new PIXI.Container(),  // 카메라 영향 X (화면 고정)
};
Object.values(layers).forEach(l => app.stage.addChild(l));

// 카메라 이동 시 (매 프레임)
function applyCamera(cameraX, cameraY) {
  layers.bgFar.x  = -cameraX * 0.2;  layers.bgFar.y  = -cameraY * 0.2;
  layers.bgNear.x = -cameraX * 0.5;  layers.bgNear.y = -cameraY * 0.5;
  layers.world.x  = -cameraX;        layers.world.y  = -cameraY;
  layers.fx.x     = -cameraX;        layers.fx.y     = -cameraY;
  // ui는 건드리지 않음 (화면 고정)
}
```

### 장르별 카메라 거동

| 장르 | 거동 |
|---|---|
| 사이드뷰 플랫포머 (Level Devil 류) | 플레이어 추적 + 데드존(작은 박스 안에서는 카메라 정지) + 맵 경계 클램프 |
| 물리 퍼즐 (Long Cat 류) | 레벨 전체가 한 화면에 들어오는 고정. 필요 시 짧은 줌인 |
| 종스크롤 슈터 | 자동 스크롤 + 플레이어 X축만 살짝 추적 |
| 탑다운 액션 | 플레이어 추적, 사방 데드존 |

```javascript
// 사이드뷰 플랫포머: 데드존 + lerp 추적
function updateCamera2D(state, player, screen, mapBounds) {
  const tx = clamp(player.x - screen.width / 2,  mapBounds.minX, mapBounds.maxX - screen.width);
  const ty = clamp(player.y - screen.height / 2, mapBounds.minY, mapBounds.maxY - screen.height);
  state.cameraX += (tx - state.cameraX) * GameTune.camera.followLerp;
  state.cameraY += (ty - state.cameraY) * GameTune.camera.followLerp;
  applyCamera(state.cameraX, state.cameraY);
}
```

### Safe Area
GameReels 앱은 별도 safe area 값을 전달하지 않으므로, **CSS 환경 변수로 자체 처리**합니다.

```html
<meta name="viewport" content="width=device-width, initial-scale=1.0, viewport-fit=cover">
```

```css
:root {
  --safe-top: env(safe-area-inset-top, 0px);
  --safe-bottom: env(safe-area-inset-bottom, 0px);
  --top-reserved: 80px; /* 상단 전체 예약 영역 (뒤로가기 버튼 포함) */
}

.ui-top {
  /* 상단 예약 영역 아래부터 UI 시작 */
  padding-top: calc(var(--safe-top) + var(--top-reserved));
}
```

### 상단 금지 영역 (절대 규칙)
- **화면 상단 전체 80px 영역에는 어떠한 UI도 배치 금지**
- 이 영역은 GameReels 앱의 뒤로가기 버튼 등이 차지함
- 점수, 타이머, 메뉴 버튼 등 모든 HUD는 80px 아래쪽 또는 화면 하단/측면에 배치
- safe-area-inset-top과는 별개로 추가 80px 확보 필요 (notch가 있는 기기는 그만큼 더 아래로 밀림)

---

## 6. 앱 ↔ 게임 통신 프로토콜

> **주의**: 아래는 일반적인 웹뷰 통신 패턴 기반의 **임시 구현**입니다.
> GameReels 앱의 정확한 브릿지 사양이 확정되면 `bridge.js` 부분만 교체합니다.

### 게임 ↔ 앱 인터페이스 (단일 모듈로 분리)

```javascript
// === GameReels 앱 통신 브릿지 ===
const GameBridge = {
  // ===== 앱 → 게임 (수신) =====
  // 앱이 window 객체에 직접 함수를 호출하는 패턴
  init() {
    window.UIToggle = (visible) => this.onUIToggle(visible);
    window.GamePause = (paused) => this.onGamePause(paused);
    window.GameStart = () => this.onGameStart();

    // CustomEvent 패턴도 함께 지원 (호환성)
    window.addEventListener('UIToggle', (e) => this.onUIToggle(e.detail));
    window.addEventListener('GamePause', (e) => this.onGamePause(e.detail));
    window.addEventListener('GameStart', () => this.onGameStart());
  },

  // ===== 게임 → 앱 (송신) =====
  send(eventName, data) {
    const payload = { event: eventName, data: data };

    // iOS WKWebView
    if (window.webkit?.messageHandlers?.GameReels) {
      window.webkit.messageHandlers.GameReels.postMessage(payload);
      return;
    }
    // Android WebView
    if (window.AndroidBridge?.postMessage) {
      window.AndroidBridge.postMessage(JSON.stringify(payload));
      return;
    }
    // Flutter InAppWebView (통합 패턴)
    if (window.flutter_inappwebview?.callHandler) {
      window.flutter_inappwebview.callHandler(eventName, data);
      return;
    }
    // 개발 환경 fallback
    console.log('[GameBridge]', payload);
  },

  // 헬퍼
  notifyReady() { this.send('GameStart', null); }, // 게임 로딩 완료 알림
  notifySuccess() { this.send('GameEnd', 'success'); },
  notifyFail() { this.send('GameEnd', 'fail'); },
  lightVibrate() { this.send('LightVibrate', null); },
  mediumVibrate() { this.send('MediumVibrate', null); },

  // 게임 상태 가드 (GameStart 양방향 이름 충돌 방지)
  _started: false,
  _ready: false,

  // 콜백 (실제 게임 로직에서 override)
  onUIToggle(visible) {},
  onGamePause(paused) {},
  onGameStart() {
    // 앱이 보낸 GameStart 수신 → 실제 게임 플레이 시작
    if (!this._ready || this._started) return; // 로딩 미완료 또는 중복 호출 무시
    this._started = true;
    // 실제 게임 로직 시작 (override 또는 별도 핸들러에서)
  },
};
```

### 이벤트 명세 (확정)

#### 앱 → 게임 (수신)
| 이벤트 | 설명 |
|---|---|
| `UIToggle` | UI 표시/숨김 토글 |
| `GamePause` | 게임 일시정지/재개 |
| `GameStart` | 게임 시작 (앱이 보낸 이 이벤트를 받기 전까지는 게임 시작 금지) |

#### 게임 → 앱 (송신)
| 이벤트 | 페이로드 | 설명 |
|---|---|---|
| `GameStart` | - | 게임 로딩 완료, 앱에게 준비 완료 알림 |
| `GameEnd` | `"success"` | 스테이지 성공 |
| `GameEnd` | `"fail"` | 스테이지 실패 |
| `LightVibrate` | - | 가벼운 햅틱 트리거 요청 |
| `MediumVibrate` | - | 중간 햅틱 트리거 요청 |

> **`GameStart` 이름이 양방향에 모두 사용되는 점 주의**: 게임은 로딩 완료 시점에 `GameStart`를 송신하고, 그 후 앱이 응답으로 `GameStart`를 보내면 실제 게임 플레이를 시작합니다.

---

## 7. 게임 라이프사이클 (필수 흐름)

```
1. 페이지 로드
2. 에셋(GLB, 사운드) 프리로드 (5초 타임아웃)
3. 씬 초기화 완료 → GameBridge._ready = true → GameStart 이벤트를 앱에 송신
4. [대기] 앱으로부터 GameStart 이벤트 수신 대기 (로딩/대기 화면 표시)
5. 앱이 GameStart 수신 → AudioContext.resume() → 게임 플레이 시작 + 사운드 자동 재생
6. 플레이 진행 (햅틱/사운드 이벤트 발생)
7. 클리어 또는 실패
   - 성공: GameEnd("success") 송신
   - 실패: GameEnd("fail") 송신
8. 결과창은 GameReels 앱이 표시 → 게임 자체에는 결과창 없음
```

### 절대 규칙
- **앱의 `GameStart` 수신 전까지 게임 시작 금지** (로딩 화면이나 정지 상태로 대기)
- **게임 자체적으로 결과창(승리/패배 화면) 표시 금지**
- **재시작 버튼, 다음 스테이지 버튼 등 메타 UI 금지** (앱이 처리함)

### 로딩 화면
- 에셋 프리로드 중에는 단순한 로딩 화면 표시 (게임 테마와 어울리는 정적 배경 + 진행률 또는 스피너)
- 메타 UI(메뉴, 버튼)는 절대 포함 금지. 단순 시각 피드백만
- `GameBridge.notifyReady()` 호출 후에도 앱의 `GameStart` 수신 전까지는 로딩 화면을 유지하거나 정지 상태 화면 표시

### 에셋 로드 실패 fallback
- 모든 에셋(GLB, 사운드) 프리로드는 **5초 타임아웃** 내 완료 목표
- 5초 초과 시 누락된 에셋은 placeholder 도형 또는 무음으로 대체하고 로딩 진행
- 치명적 실패(코어 라이브러리 로드 실패 등)는 `GameEnd("fail")` 송신 + `console.error` 로깅
- 절대 무한 로딩 상태로 멈추지 말 것

### GamePause 처리
일시정지 수신 시(`GamePause(true)`):
- `requestAnimationFrame` 루프는 계속 돌리되 게임 로직 update에 `delta = 0` 또는 update 자체를 스킵
- `AudioContext.suspend()` 호출 (BGM/SFX 모두 정지)
- 애니메이션 mixer, 파티클 시스템, 타이머 모두 freeze

재개 시(`GamePause(false)`):
- `AudioContext.resume()` 호출
- delta 누적 방지를 위해 다음 프레임의 delta는 직전 프레임 시각 기준으로 재계산

### 게임 종료 후 재시작
- `GameEnd` 송신 후 동일 페이지에서 재시작 호출은 가정하지 않음 (앱이 새 HTML을 로드)
- 따라서 재시작 로직 구현 불필요

---

## 8. 햅틱 정책

### 트리거 분류
- **LightVibrate**: 자주 반복되는 인터랙션
  - 콤보 카운트, 작은 오브젝트 파괴, 코인/아이템 획득, 점프, 짧은 충돌
- **MediumVibrate**: 가끔 발생하는 의미 있는 이벤트
  - 스테이지 클리어 직전 결정타, 보스 처치, 콤보 마일스톤(10/50/100), 레벨업, 상자 열기, 새 스킬 획득

### 스로틀링 (필수)
모바일 디바이스 보호 및 햅틱 피로 방지를 위해 최소 호출 간격 유지. 간격은 `GameTune.haptic`에서 관리 (13절 참조):

```javascript
const HapticThrottle = {
  lastLight: 0,
  lastMedium: 0,

  light() {
    const now = performance.now();
    if (now - this.lastLight < GameTune.haptic.lightInterval) return;
    this.lastLight = now;
    GameBridge.lightVibrate();
  },
  medium() {
    const now = performance.now();
    if (now - this.lastMedium < GameTune.haptic.mediumInterval) return;
    this.lastMedium = now;
    GameBridge.mediumVibrate();
  },
};
```

---

## 9. 사운드 / ASMR 정책

### 라이브러리
- **Web Audio API 직접 사용** (Tone.js, Howler.js 등 사용 금지)
- 사운드 재생 헬퍼 모듈을 `bridge.js`와 함께 인라인으로 포함

### 사운드 출처
- **Freesound** (https://freesound.org) 에서 다운로드
- CC0 또는 CC-BY 라이선스만 사용 (CC-BY는 크레딧 표기 필요)
- 다운로드 후 `assets/sounds/` 폴더에 배치

### ASMR 사운드 가이드
타격감/만족감을 위해 다음 종류의 사운드를 적극 활용:
- 부드러운 충돌음, 절단음, 깨지는 소리
- 동전/구슬이 떨어지거나 굴러가는 소리
- 부드러운 휘파람, 바람, 물 소리
- 깊고 만족스러운 "쿵", "찰칵" 등의 결정음

### 자동 재생 정책
- 게임 시작 시 자동 재생 (앱의 `GameStart` 수신 시점)
- 모바일 브라우저 자동재생 정책 회피를 위해 `AudioContext`는 첫 사용자 인터랙션 시 `resume()` 호출 필요
- GameReels 앱의 `GameStart` 이벤트가 사용자 탭에 의해 발생하므로, 그 시점에 `AudioContext.resume()` 호출

```javascript
let audioCtx = null;
let masterGain = null, bgmGain = null, sfxGain = null;

function initAudio() {
  audioCtx = new (window.AudioContext || window.webkitAudioContext)();
  if (audioCtx.state === 'suspended') audioCtx.resume();

  // 게인 노드 그래프: source → bgm/sfx → master → destination
  // 볼륨은 GameTune.audio에서 가져옴 (13절 참조), onChange 구독으로 런타임 반영
  masterGain = audioCtx.createGain(); masterGain.gain.value = GameTune.audio.master;
  bgmGain    = audioCtx.createGain(); bgmGain.gain.value    = GameTune.audio.bgm;
  sfxGain    = audioCtx.createGain(); sfxGain.gain.value    = GameTune.audio.sfx;
  GameTune.onChange('audio.master', v => masterGain.gain.value = v);
  GameTune.onChange('audio.bgm',    v => bgmGain.gain.value    = v);
  GameTune.onChange('audio.sfx',    v => sfxGain.gain.value    = v);
  bgmGain.connect(masterGain);
  sfxGain.connect(masterGain);
  masterGain.connect(audioCtx.destination);
}
// GameBridge.onGameStart 안에서 initAudio() 호출
```

### BGM / SFX 분리 정책
- **BGM**: 1트랙만 동시 재생, 루프(`source.loop = true`), `bgmGain`에 연결. 게임 종료 시 짧은 fade-out (200~300ms) 후 정지
- **SFX**: 동시 재생 최대 16개로 제한 (이를 초과하면 가장 오래된 source 정리). `sfxGain`에 연결
- 사운드 버퍼는 미리 디코딩하여 `Map<string, AudioBuffer>`로 캐시. 재생 시마다 `AudioBufferSourceNode` 생성

### 기본 볼륨 / 음소거
- 마스터 0.9 / BGM 0.5 / SFX 1.0 (게임마다 튜닝 가능)
- **게임 자체 음소거 토글 UI 제작 금지** (앱이 시스템 레벨에서 처리)
- `GamePause` 수신 시 `audioCtx.suspend()`, 재개 시 `resume()`

### 사운드 로드 실패 fallback
- 개별 사운드 로드 실패 시 무음 처리 (재생 호출은 no-op으로 동작). 게임 진행은 계속

---

## 10. 시각 효과 (타격감 강화)

밸런스보다 만족감이 우선이므로 다음 기법을 적극 활용. 모든 수치는 `GameTune.camera`/`GameTune.effects`에서 가져와 런타임 튜닝 가능 (13절 참조):

> **텍스트 연출은 영어만**: 콤보·점수 팝업, "GREAT!", "PERFECT!", "x2 COMBO", "+100" 등 모든 화면 표시 텍스트는 **영어로 한정**. 한국어/일본어/중국어 표시 금지. 텍스트는 **굵고 짧게** (1~2 단어, 최대 3 단어). 가능하면 **텍스트 없이 큰 숫자 + 컬러 플래시 + 셰이크**만으로 충분히 표현 (1·18절 UI 텍스트 정책).


- **카메라 셰이크**: `GameTune.camera.shakeIntensity` × `GameTune.camera.shakeDuration`ms 흔들림 (기본 0.3 × 200ms)
- **히트스톱(Hit Pause)**: `GameTune.effects.hitStopDuration`ms 시간 정지 (기본 60ms)
- **컬러 플래시**: `GameTune.effects.flashDuration`ms 화면 전체 짧은 플래시 (기본 80ms)
- **파티클**: Three.js `Points` 또는 `Sprite` 기반 자체 구현. 생성 개수에 `GameTune.effects.particleMultiplier`를 곱해 저사양 fallback과 연동
- **숫자/콤보 팝업**: 충돌 지점에서 솟아오르는 숫자 텍스트
- **이징**: 자체 구현 또는 짧은 인라인 이징 함수 사용

---

## 11. localStorage / 영속 데이터

- **localStorage 사용 가능** (GameReels 웹뷰에서 허용됨)
- 보유 아이템 개수, 진행 상황 등은 GameReels 계정 정보와 연동되어 HTML 파일들 간 공유
- key naming 규칙 (충돌 방지):
  ```
  gamereels_{gamename}_{key}
  예: gamereels_slicer_coins, gamereels_slicer_unlocked_skin
  ```
- 민감 정보 저장 금지 (계정 토큰, 결제 정보 등)

### 스키마 버전 / 마이그레이션
- 모든 게임은 `gamereels_{gamename}_schema_version` 키로 스키마 버전 저장 (정수)
- 게임 시작 시 저장된 버전 < 현재 버전이면 마이그레이션 함수 실행
- 마이그레이션 실패 또는 파싱 오류 시: 데이터 초기화 후 진행 (게임 진행은 막지 않음)
- 단일 키 저장 용량은 100KB 이하 권장

---

## 12. 100 스테이지 제작 정책

### 기본 규칙
- **스테이지 제작은 게임 핵심 로직이 완전히 완성된 후 사용자가 명시적으로 요청할 때만 진행**
- 핵심 로직 개발 단계에서는 1~3개 정도의 테스트 스테이지만 만듭니다
- 사용자 요청 없이 100 스테이지를 자동 생성하지 마세요

### 사용자 요청 시 따라야 할 절차
1. 먼저 **스테이지 데이터 스키마 제안** → 사용자 확인 받기
2. **난이도 곡선 가이드라인 제안** → 사용자 확인 받기
   - 권장 곡선: 1~20 튜토리얼/이지, 21~60 노멀, 61~90 하드, 91~100 익스트림
3. **기믹 도입 페이스 제안** → 사용자 확인 받기
   - 예: 5스테이지마다 새 기믹/변형 도입, 10스테이지마다 보스 또는 챌린지
4. 위 3가지 합의 후 일괄 생성

### 스테이지 데이터 분리
- 게임 로직과 스테이지 데이터는 반드시 분리되어야 합니다 (JSON 또는 JS 객체)
- 100개 스테이지 생성 시 로직 코드 변경 없이 데이터만 추가/수정으로 가능해야 합니다

### 권장 최소 스키마 (게임별로 확장)
```javascript
// src/stages/stage_001.js
export default {
  id: 1,                       // 정수, 1부터 시작
  name: 'First Cut',           // 표시명 (선택)
  difficulty: 'easy',          // 'easy' | 'normal' | 'hard' | 'extreme'
  durationLimit: 30,           // 초 단위, 0이면 무제한
  goal: { type: 'score', value: 100 }, // 클리어 조건 (게임마다 정의)
  gimmicks: [],                // 도입 기믹 키 배열
  spawn: { /* 게임별 스폰 데이터 */ },
  environment: { theme: 'default', bgmKey: 'bgm_calm' },
};
```
- 위 스키마는 최소 골격이며, 게임 장르별로 필드를 확장합니다
- 새 게임 시작 시 사용자에게 스키마 확장안을 먼저 제안 후 합의

---

## 13. 튜닝 / 설정 시스템 (GameTune)

게임의 시각·오디오·햅틱·밸런스 관련 **모든 수치는 `window.GameTune` 단일 객체에서 관리**합니다.
게임 코드는 매직 넘버를 직접 쓰지 말고 `GameTune.xxx` 경로를 참조해야 하며, 사용자(개발자/디자이너)는 브라우저 콘솔에서 즉시 값을 바꾸며 튜닝할 수 있어야 합니다.

### 목적
- 콘솔에서 `GameTune.set('camera.shakeIntensity', 0.5)` 한 줄로 즉시 감각 변경
- 셰이크 강도, 히트스톱 길이, 플레이어 속도 등 핵심 변수 빠르게 비교
- 튜닝 결과를 JSON으로 export → 코드 디폴트에 반영
- 저사양 자동 fallback도 GameTune 값을 변경하는 방식으로 일관 처리

### 구조 (필수 카테고리 + 게임별 확장)
```javascript
window.GameTune = TuneSystem.create({
  // ===== 공통 카테고리 (모든 게임 공유) =====
  camera: {
    fov: 60,
    followLerp: 0.1,        // 추적 카메라 보간 계수
    shakeIntensity: 0.3,    // 0~1
    shakeDuration: 200,     // ms
  },
  haptic: {
    lightInterval: 50,      // ms (Light 햅틱 최소 간격)
    mediumInterval: 200,    // ms
  },
  effects: {
    hitStopDuration: 60,    // ms (결정타 시 시간 정지)
    flashDuration: 80,      // ms (화면 플래시)
    particleMultiplier: 1.0,// 0~2 (저사양 fallback 시 0.5)
  },
  audio: {
    master: 0.9,
    bgm: 0.5,
    sfx: 1.0,
  },
  // ===== 게임별 카테고리 (예: 러너) =====
  balance: {
    playerSpeed: 8,
    jumpHeight: 4,
    spawnInterval: 2.0,
    // ...게임마다 자유롭게 확장
  },
});
```

### API
```javascript
// 읽기
GameTune.camera.fov;                        // 직접 접근
GameTune.get('camera.fov');                 // 동일

// 쓰기 (즉시 반영, 구독자에게 알림)
GameTune.set('camera.fov', 70);
GameTune.set('balance.playerSpeed', 12);

// 일괄 패치
GameTune.patch({ camera: { fov: 70, shakeIntensity: 0.5 } });

// 변경 구독 (값이 바뀌면 카메라 재계산 등 후처리)
GameTune.onChange('camera.fov', (v) => {
  camera.fov = v;
  camera.updateProjectionMatrix();
});

// 디폴트로 리셋
GameTune.reset();

// 현재 값을 JSON으로 dump (콘솔에 출력 → 코드에 복붙하기 쉽게)
GameTune.dump();

// localStorage 저장 / 자동 불러오기
GameTune.persist();    // gamereels_{gamename}_tune 키에 저장
GameTune.unpersist();  // 자동 불러오기 해제 + 저장값 삭제
```

### 게임 코드 작성 규칙 (필수)
- ❌ 매직 넘버 직접 사용: `camera.position.lerp(target, 0.1)`
- ✅ `GameTune` 참조: `camera.position.lerp(target, GameTune.camera.followLerp)`
- 매 프레임 읽는 값은 GameTune에서 **직접 참조** (캐시 금지) → 런타임 변경이 즉시 반영
- 한 번만 읽는 값(초기화 시점)은 캐시 가능, 단 값 변경 시 재계산이 필요하면 `onChange` 구독 필수 (예: `camera.fov`)

### 디폴트 값 정책
- 모든 디폴트 값은 게임 메인 파일 상단 `GameTune.create({...})` 정의에 명시 — 디폴트가 source of truth
- `persist()`로 저장된 값은 디폴트를 오버라이드하는 보조 레이어
- 새 카테고리/필드 추가 시 자동 마이그레이션: 저장된 값에 없는 새 필드는 디폴트로 채움

### 디버그 UI (`?debug=1` 시 자동 활성화)
- 화면 우측에 접을 수 있는 튜닝 패널 표시
- 각 카테고리/필드를 슬라이더(숫자) 또는 토글(불리언)로 노출
- "Dump" 버튼: 현재 값을 콘솔에 JSON으로 출력
- "Reset" 버튼: 디폴트 복원
- 프로덕션 빌드(`?debug` 없음)에서는 자동 비활성화

### 저사양 fallback과의 관계
14절(성능) 저사양 fallback이 발동하면 GameTune을 직접 변경:
- `GameTune.set('effects.particleMultiplier', 0.5)`
- `GameTune.set('effects.hitStopDuration', 0)` (히트스톱 비활성)
- 사용자는 `?debug=1` 패널로 다시 오버라이드 가능

---

## 14. 성능 / 최적화

### 목표
- **첫 화면 표시까지 2초 이내** (모바일 4G 환경 기준)
- **단일 HTML 파일 + 에셋 합산 5MB 이하** 권장
- **목표 FPS 60** (저사양 디바이스에서는 30 fallback 허용)
- **draw call**: 씬당 100개 이하 권장 (인스턴싱 적극 사용)

### 최적화 가이드
- GLB 파일은 가능하면 `gltf-transform optimize`로 압축
- 텍스처는 1024×1024 이하 권장
- 파티클 수는 디바이스 성능에 따라 동적 조정
- 그림자(shadow)는 기본 OFF, 필요한 경우만 활성화
- 카메라 frustum culling 적극 활용
- 동일 메시 다수 사용 시 `InstancedMesh` 사용
- 매 프레임 새 객체 생성 금지 (GC 유발) → 풀링 패턴 사용

### FPS 측정 / 저사양 fallback
- 자체 FPS 카운터 구현 (외부 라이브러리 사용 금지). `performance.now()` 기반 1초 평균
- 게임 시작 후 3초 평균 FPS < 45이면 자동으로 저사양 모드 진입. 모든 변경은 GameTune 경유 (13절):
  - `GameTune.set('effects.particleMultiplier', 0.5)`
  - `GameTune.set('effects.hitStopDuration', 0)` (히트스톱 비활성)
  - 그림자 OFF (씬 직접 조작)
  - 후처리 효과 OFF (씬 직접 조작)
  - `renderer.setPixelRatio(1)` 로 강제

### 메모리 / 리소스 정리 (필수)
스테이지 종료 또는 페이지 언로드 시:
- 모든 `geometry.dispose()`
- 모든 `material.dispose()`, 사용한 텍스처도 `texture.dispose()`
- `mixer.uncacheRoot(root)` 호출
- `renderer.dispose()` 호출
- `AudioBufferSourceNode` 정리, `audioCtx.close()`

### 디버그 오버레이
- `?debug=1` 쿼리스트링 시 활성화: FPS, draw call, 메모리, 이벤트 로그 표시
- 프로덕션 빌드(쿼리 없음) 시 자동 비활성화

---

## 15. 입력 (터치) 정책

### 기본 규칙
- 게임 캔버스는 `touch-action: none`으로 브라우저 기본 동작(스크롤, 더블탭 줌 등) 차단
- 마우스 이벤트는 개발 환경 디버깅용으로만 지원, 실제 타겟은 터치 이벤트
- Pointer Events(`pointerdown/move/up`) 사용 권장 (터치/마우스 통합 처리)

### 제스처 표준 임계값
| 제스처 | 정의 |
|---|---|
| Tap | pointerdown ~ up 간격 < 200ms, 이동 < 10px |
| Long Press | pointerdown 유지 ≥ 500ms, 이동 < 10px |
| Swipe | pointerdown ~ up 간격 < 400ms, 이동 ≥ 30px (방향 = 큰 축) |
| Drag | pointerdown 유지 + 이동 ≥ 10px |
| Pinch | 2-pointer 거리 변화율 ≥ 10% |

- 멀티터치 허용 여부는 게임별로 결정. 기본은 단일 터치만 처리

### 좌표 변환
- 터치 좌표는 `(event.clientX, event.clientY)` 기준 → 캔버스 NDC(-1~1)로 변환 후 raycast
- 화면 비율과 무관하게 동작하도록 `getBoundingClientRect()` 기반 정규화

---

## 16. 에러 / 로깅 / 보안

### 에러 처리
- 게임 메인 루프는 `try/catch`로 감싸 한 프레임 에러가 게임을 죽이지 않게
- 치명적 에러(라이브러리 로드 실패, `WebGLRenderingContext` 생성 실패) 발생 시:
  - `console.error` 로깅
  - `GameBridge.notifyFail()` 송신
  - 사용자에게는 단순 fallback 화면 (텍스트 정도)

### 로깅
- 개발 모드(`?debug=1`)에서만 상세 로그 출력
- 프로덕션에서는 `console.error`만 허용 (성능 및 보안)
- 외부 분석 SDK 추가 금지 (19절 금지 사항과 동일)

### 보안
- ❌ `innerHTML`, `outerHTML`, `document.write` 사용 금지 (XSS 방지)
- 텍스트 삽입은 반드시 `textContent` 또는 `createTextNode` 사용
- localStorage 데이터는 신뢰할 수 없는 입력으로 취급 → 파싱 시 try/catch + 스키마 검증
- CDN 리소스는 가능하면 SRI(Subresource Integrity) 해시 부착 권장
- CSP 메타 태그 권장 (인라인 스크립트 허용 + CDN 화이트리스트):
  ```html
  <meta http-equiv="Content-Security-Policy"
        content="default-src 'self'; script-src 'self' 'unsafe-inline' https://cdnjs.cloudflare.com https://cdn.jsdelivr.net; style-src 'self' 'unsafe-inline'; img-src 'self' data: blob:; media-src 'self' blob:;">
  ```

---

## 17. 코드 스타일 / 컨벤션

- **언어**: Vanilla JavaScript (ES2020+), TypeScript 사용 안 함
- **모듈**: 개발 단계는 ESM (`import`/`export`), 빌드 시 인라인으로 변환
- **변수 선언**: `const` 우선, 변경 필요한 경우만 `let`. `var` 금지
- **네이밍**:
  - 함수/변수: `camelCase`
  - 클래스/생성자: `PascalCase`
  - 상수: `UPPER_SNAKE_CASE`
  - 파일: `kebab-case.js` 또는 `snake_case.js` (게임 내에서 일관)
- **Three.js 객체 네이밍**: 메시는 `mesh*`, 그룹은 `group*`, 머티리얼은 `mat*` 접두 권장
- **세미콜론**: 사용
- **들여쓰기**: 스페이스 2칸
- **주석**: WHY를 적되 WHAT은 적지 않음. 게임 로직의 비직관적 부분만
- **다국어 / i18n**: 게임 내 모든 표시 텍스트는 **영어 only** (1·18·19절 UI 텍스트 정책). 한국어/일본어/중국어 등 비영어 텍스트의 게임 화면 표시 금지. CLAUDE.md/주석/커밋 메시지 등 개발 문서는 한국어 유지 가능
- **폰트**: 시스템 기본 폰트 사용 (`-apple-system, BlinkMacSystemFont, 'Apple SD Gothic Neo', sans-serif`). 웹폰트는 패키지 크기 영향으로 기본 사용 안 함

---

## 18. UI 디자인

- UI 디자인 작업 시 **`frontend-design` 스킬을 사용**하여 게임과 어울리도록 디자인
- 디자인 원칙:
  - 상단 80px 영역은 어떤 경우에도 비워둠 (앱 뒤로가기 버튼 등이 차지)
  - 결과창, 재시작 버튼, 일시정지 메뉴 등 메타 UI 금지
  - HUD(점수, 타이머, 콤보 등)는 상단 80px 아래 또는 화면 하단/측면 사용
  - 큰 텍스트와 명확한 시각 피드백 (모바일 짧은 플레이 환경)
  - **텍스트 최소화**: 가능한 한 텍스트 없이 **아이콘·숫자·도형**으로 표현. 텍스트가 꼭 필요하면 짧고 굵게 (1~2 단어, 최대 3 단어)
  - **모든 게임 내 텍스트는 영어 only**: 한국어/일본어/중국어 등 비영어 표시 금지 (1·17·19절). 예: "좋아요!" → "GREAT!", "콤보 3" → "x3 COMBO" 또는 숫자만
  - 미션/목표 표시: 가능하면 **아이콘 + 숫자**로 구성 (예: 다이아몬드 아이콘 + "25"). "Collect" 같은 동사 텍스트 가급적 생략
  - 시각이 텍스트보다 항상 우선: 같은 정보를 색/크기/모션으로 전달 가능하면 텍스트 제거

---

## 19. 금지 사항 (Do Not List)

다음은 절대 하지 말아야 할 것들입니다:

- ❌ 상단 80px 영역에 UI 배치
- ❌ 게임 자체 결과창(승리/패배 화면) 표시
- ❌ 재시작/다음 스테이지/메인메뉴 버튼 추가
- ❌ 음소거 토글 UI 추가
- ❌ 외부 광고 SDK, 분석 도구 추가
- ❌ 사용자 요청 없이 100 스테이지 자동 생성
- ❌ 스테이지별 HTML 파일 간 의존 관계 생성 (각 파일 독립 실행)
- ❌ 고정 해상도 사용 (모든 디바이스 동적 대응)
- ❌ Three.js r128에 없는 API 사용 (`CapsuleGeometry` 등)
- ❌ Quaternius의 OBJ/FBX 직접 사용 (반드시 GLTF/GLB 사용)
- ❌ 민감 정보 localStorage 저장
- ❌ 앱의 `GameStart` 수신 전 게임 시작
- ❌ 3D 에셋이 없다는 이유로 개발 중단 (임의 도형으로라도 우선 진행)
- ❌ Quaternius/itch.io 등에서 에셋 자동 다운로드 시도 (반드시 사용자에게 추천 후 사용자가 직접 다운로드)
- ❌ 에셋 추천 단계 생략하고 placeholder만으로 최종 결과물 제출 (사용자 명시 동의 시 제외)
- ❌ 게임 로직에 튜닝 가능한 매직 넘버 직접 사용 (셰이크 강도, 속도, 인터벌 등은 모두 `GameTune` 경유 — 13절)
- ❌ 사용자 카메라 조작(회전/줌) 허용 (5절 카메라 절대 규칙 위반)
- ❌ 게임 내 화면에 한국어/일본어/중국어 등 비영어 텍스트 표시 (1·17·18절 UI 텍스트 정책)
- ❌ 콤보/점수 연출에 비영어 텍스트 사용 (예: "좋아요!", "完美!" 금지 → "GREAT!", "PERFECT!")
- ❌ 텍스트가 시각 표현보다 먼저 등장하는 디자인 (아이콘·숫자·도형 우선, 텍스트는 보조)
- ❌ "Collect 25 Diamonds" 같이 긴 설명 텍스트로 미션 표시 (아이콘 + 숫자만)

---

## 20. 개발 / 테스트 워크플로우

### 로컬 테스트
- 단일 HTML 파일을 브라우저에서 직접 열어 테스트 가능
- 단, GLB 로드는 CORS 문제로 로컬 서버 필요할 수 있음 → `python3 -m http.server` 사용

### 앱 이벤트 시뮬레이션 (개발 환경)
브라우저 콘솔에서 다음 명령으로 앱 이벤트를 시뮬레이션:
```javascript
window.GameStart();    // 게임 시작
window.GamePause(true);  // 일시정지
window.UIToggle(false); // UI 숨김
```

송신 이벤트는 콘솔 로그로 확인:
```
[GameBridge] { event: "GameEnd", data: "success" }
```

### 디버깅 보조
개발 모드에서만 활성화되는 디버그 오버레이 (FPS, 이벤트 로그) 추가 가능 (프로덕션 빌드 시 제거)

### 모호한 요청 처리 원칙
메커닉 변경/추가 요청이 해석이 2개 이상 가능하면, 구현 전에 해석 후보를 제시하고 확인을 받는다.
"더 어렵게", "더 재밌게", "느낌 바꿔줘" 같은 요청은 구체적 수치·조건으로 번역한 후 동의를 구한다.

### 완료 기준
스테이지 작업 완료 보고 전에 반드시 `dist/` 빌드 후 브라우저에서 직접 열어 게임이 실행됨을 확인한다.
실행 확인 없이 "완료했습니다"라고 보고하지 않는다.

---

## 21. 작업 시 우선순위

### 선결 결정: 에디터 vs 게임 직접 개발 (필수 평가)

본격 작업 시작 전 다음을 **반드시 판단**합니다:

- **에디터 개발이 더 적합한 신호**:
  - 100 스테이지 같은 **대량 콘텐츠** 제작이 목표
  - 사용자가 디자이너 역할로 **다양한 변형**(맵 배치, 기믹 조합 등)을 직접 만들고 싶어함
  - 스테이지 데이터 구조가 복잡해 텍스트로 손코딩이 비효율적 (보드 배치, 적 스폰 패턴, 타이밍 시퀀스 등)
  - 동일한 게임 런타임이 다양한 데이터로 재사용 가능
- **에디터 우선 선택 시**:
  - **게임 자체보다 스테이지/레벨 에디터를 먼저 개발**
  - 에디터 출력 = 게임 런타임이 그대로 로드하는 JSON (12절 데이터 분리 정책)
  - 에디터는 별도 HTML로 (예: `dist/{gamename}_editor.html`) 또는 개발 전용 `?editor=1` 모드
  - 에디터 자체의 GameReels 통합은 불필요 (디자이너 PC 도구)
- **단발성/소규모 게임**은 그대로 게임 직접 개발 (에디터 오버헤드 회피)
- 판단 결과를 **사용자에게 명시적으로 알림**: "이 게임은 에디터부터 만드는 게 효율적이라 에디터를 먼저 제작하겠습니다" 같은 형태로 합의

### 게임 직접 개발 시 우선순위

1. **장르/기믹 결정** (사용자와 협의)
2. **2D 에셋 추천** (Kenney 팩 추천 → 사용자 다운로드 대기, 병렬로 다음 단계 진행 — 4절)
3. **핵심 게임 로직 프로토타입** (PIXI.Graphics placeholder로 1개 스테이지 개발)
4. **앱 통신 브릿지 통합 및 테스트**
5. **에셋 통합** (사용자가 에셋 배치 완료 시 placeholder를 `Sprite`/`AnimatedSprite`로 교체)
6. **타격감/사운드/햅틱 튜닝** (GameTune 콘솔로 즉시 조정)
7. **UI 디자인** (`frontend-design` 스킬 활용, 영어 텍스트만 — 1·18절)
8. **성능 최적화**
9. **(사용자 요청 시) 100 스테이지 데이터 생성** (또는 위에서 에디터로 생성)
10. **빌드 → 스테이지별 독립 HTML 파일로 출력**

---

## 22. 2D 게임 추가 사항

본 절은 PixiJS 기반 2D 게임 제작에 추가로 필요한 세부 사항(스프라이트, 타일맵, 물리, GameTune 확장, 효과 구현)을 정리합니다. 라이프사이클·통신·햅틱·사운드·UI 등 공통 사항은 6~21절을 그대로 따릅니다.

---

### 22.1 스프라이트 / 스프라이트 시트
- **단일 스프라이트**: PNG, 투명 배경, 트림된 사이즈
- **스프라이트 시트(아틀라스)**: PixiJS `Spritesheet` JSON 형식 (4절 참조)
  - draw call 감소 → 모바일 성능 향상에 필수
- **애니메이션**: `PIXI.AnimatedSprite` 사용 (프레임 배열 + fps 지정)
- **표준 캐릭터 사이즈**:
  - 픽셀 아트: 16×16 또는 32×32 (런타임에 정수 배율로 확대)
  - 카툰: 64×64 또는 128×128 디자인 사이즈

---

### 22.2 타일 기반 레벨 (선택)
사이드뷰 플랫포머에서 타일맵 사용 시:
- **에디터**: Tiled (https://www.mapeditor.org) → JSON export
- **타일 사이즈**: 게임 시작 시 결정 (16/32/64). 게임 전체에서 통일
- **로딩**: 자체 JSON 파서로 PixiJS `Sprite` 배열로 변환
- **간단한 레벨**: 2D 배열로 직접 정의 가능 (코드 내 또는 별도 JSON, 12절 스테이지 데이터 스키마와 통합)
  ```javascript
  // 예: 0=빈칸, 1=벽, 2=가시, 3=골
  level: [
    [0,0,0,0,0,0,0,0],
    [0,0,0,0,0,0,0,0],
    [1,1,0,0,2,0,0,3],
    [1,1,1,1,1,1,1,1],
  ]
  ```

---

### 22.3 2D 물리 (선택)

**Matter.js 사용 기준** (3절 참조):
- ✅ 사용: Long Cat처럼 강체/조인트/로프/중력/마찰 상호작용이 게임의 핵심
- ❌ 사용 안 함: Level Devil처럼 점프 + 단순 AABB 충돌만 필요한 경우 → 자체 구현이 가벼움

#### 자체 구현 (Level Devil 류)
- AABB 충돌, 중력, 점프, 벽 슬라이드는 직접 구현
- "거짓말하는" 트랩(움직이는 벽, 사라지는 발판, 가짜 발판)은 게임 로직에서 처리 — 물리 엔진 불필요

#### Matter.js 통합 패턴 (Long Cat 류)
```javascript
const engine = Matter.Engine.create();
engine.gravity.y = GameTune.physics.gravityY;

function tick(deltaMs) {
  if (paused) return;
  Matter.Engine.update(engine, deltaMs);
  // PixiJS sprite와 Matter body 동기화
  for (const ent of entities) {
    ent.sprite.x = ent.body.position.x;
    ent.sprite.y = ent.body.position.y;
    ent.sprite.rotation = ent.body.angle;
  }
}
```

**Long Cat 같은 늘어남 캐릭터 구현 힌트**:
- 캐릭터를 여러 개의 작은 강체 segment로 분할
- segment 간 `Matter.Constraint`로 연결 (스프링 또는 고정 거리)
- 사용자 입력 시 새 segment 추가, 길이를 lerp로 보간

---

### 22.4 2D GameTune 권장 카테고리 (13절 확장)
2D 게임 시작 시 `GameTune`에 다음 카테고리를 추가:
```javascript
window.GameTune = TuneSystem.create({
  // ...공통 (camera, haptic, effects, audio)
  physics: {
    gravityY: 1.5,
    jumpVelocity: 12,
    moveSpeed: 6,
    friction: 0.85,
  },
  pixel: {
    artScale: 3,         // 픽셀 아트 정수 배율
  },
  // ...게임별 balance
});
```

---

### 22.5 시각 효과 (2D 구현)
10절과 동일 원칙. 2D에서의 구현 차이만 명시:
- **카메라 셰이크**: world 컨테이너의 position에 랜덤 오프셋 가산 (`GameTune.camera.shakeIntensity` × duration)
- **히트스톱**: 게임 update 일시 정지 (RAF는 계속 돌리되 update 스킵)
- **컬러 플래시**: 화면 전체 크기의 흰색 `Graphics` 또는 `Sprite` 추가, alpha를 lerp로 0까지
- **파티클**: PixiJS `ParticleContainer` 사용 (일반 Container보다 10배 빠름) + 자체 풀링
- **숫자/콤보 팝업**: `PIXI.Text` 풀에서 꺼내 위로 솟아오르는 트윈

---

### 22.6 성능 (2D 추가 가이드)
14절 성능 정책에 더해:
- 동일 텍스처 다수 그릴 때 반드시 `ParticleContainer` 사용
- 스프라이트 시트(아틀라스)로 draw call 감소 — 개별 PNG 다수 로드 금지
- `cullable = true` + 카메라 외부 오브젝트는 hide
- 파티클 수는 `GameTune.effects.particleMultiplier`와 연동
- 텍스트 다수 표시 시 `BitmapText` 고려 (`PIXI.Text`보다 가벼움)

---

### 22.7 작업 우선순위 (2D 차이만)
21절 작업 우선순위에서 2D 게임 시 변경:
- 2단계: **2D Kenney 팩 추천** (4절 참조 — 3D Quaternius와 동일한 워크플로우)
- 3단계: 핵심 로직 프로토타입 시 **PixiJS Graphics로 placeholder** 생성
- 5단계: 사용자가 스프라이트 배치 완료 시 `Sprite`/`AnimatedSprite`로 교체

---

### 22.8 2D 추가 금지 사항 (19절 확장)
- ❌ 2D 게임에 Three.js 사용 (오버헤드 큼 — PixiJS 사용)
- ❌ Phaser, Cocos2d 등 게임 프레임워크 사용 (라이브러리만 직접 조합)
- ❌ Kenney/itch.io/OpenGameArt 자동 다운로드 (4절 참조)
- ❌ 픽셀 아트 게임에 안티에일리어싱 ON, 비정수 스케일 (블러 발생)
- ❌ 모든 스프라이트를 개별 텍스처로 로드 (반드시 아틀라스 사용. 5장 이내 소형 게임은 예외 가능)
- ❌ 단일 게임 내에서 픽셀 아트와 카툰/벡터 스타일 혼용 (일관성)

## 23. 미확정 / 추후 확인 항목

다음 항목들은 추후 확정 시 이 문서를 업데이트:

- [ ] GameReels 앱의 정확한 통신 브릿지 사양 (현재는 일반 패턴으로 임시 구현)
- [ ] 앱이 제공하는 사용자 계정 정보 접근 방식 (localStorage 키 명세)
- [ ] 빌드 자동화 스크립트 상세 구현 (esbuild 기반 인라인 변환 — 첫 게임 프로젝트 시 작성)
- [ ] 디바이스별 실측 성능 매트릭스 (저사양 fallback 임계값 튜닝)

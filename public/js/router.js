// ============================================================
// router.js
// ハッシュ URL（#/home など）による画面切り替え。
// 各画面は Screen を継承し、mount()/unmount() を実装します。
// ルートを足したいときは registerRoute() を呼ぶだけ。
// ============================================================

// すべての画面の基底クラス
export class Screen {
  constructor(app) {
    this.app = app;          // { root, navigate }
    this.root = app.root;    // 描画先の DOM 要素
    this._cleanups = [];     // unmount 時にまとめて解除する処理
  }
  // 画面表示時に呼ばれる（params はルートから渡る任意データ）
  mount(/* params */) {}
  // 画面離脱時に呼ばれる
  unmount() {
    for (const fn of this._cleanups) { try { fn(); } catch { /* noop */ } }
    this._cleanups = [];
    this.root.innerHTML = '';
  }
  // unmount で自動解除したい後始末を登録
  addCleanup(fn) { this._cleanups.push(fn); }
}

export class Router {
  constructor(root) {
    this.root = root;
    this.routes = new Map();     // path -> ScreenClass
    this.current = null;
    this.app = {
      root,
      navigate: (path) => this.navigate(path),
    };
    window.addEventListener('hashchange', () => this._resolve());
  }

  registerRoute(path, ScreenClass) {
    this.routes.set(path, ScreenClass);
  }

  start(defaultPath = '/home') {
    if (!location.hash) location.hash = `#${defaultPath}`;
    this._resolve();
  }

  navigate(path) {
    if (location.hash === `#${path}`) this._resolve();
    else location.hash = `#${path}`;
  }

  _resolve() {
    const raw = location.hash.replace(/^#/, '') || '/home';
    // "/battle?room=ABCD" のようなクエリも許可
    const [path, query = ''] = raw.split('?');
    const params = Object.fromEntries(new URLSearchParams(query));

    const ScreenClass = this.routes.get(path) || this.routes.get('/home');
    if (this.current) this.current.unmount();
    this.current = new ScreenClass(this.app);
    this.current.mount(params);
  }
}

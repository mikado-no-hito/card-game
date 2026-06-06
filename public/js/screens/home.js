// ============================================================
// screens/home.js  —  トップメニュー
// ============================================================

import { Screen } from '../router.js';
import { el } from '../util.js';
import { store } from '../store.js';
import { orientation } from '../orientation.js';
import { loadImageDownscaled, toIconDataURL } from '../cardImage.js';
import { createCropper } from '../components/imageCropper.js';

const TEMPLATE_ICONS = ['🐉', '⚔️', '🧙', '🛡️', '🦁', '🌟', '🔥', '💎', '👑', '🎯'];

export class HomeScreen extends Screen {
  mount() {
    orientation.setPreferred(null);
    this.showProfileEdit = false;
    this.profileEditing = null;  // { name, iconSource, iconTransform, icon }
    this.profileCropper = null;
    this._render();
  }

  unmount() {
    if (this.profileCropper) { this.profileCropper.destroy(); this.profileCropper = null; }
    super.unmount();
  }

  _render() {
    const cardCount = store.getCards().length;
    const deckCount = store.getDecks().length;

    const tile = (title, desc, path, badge) =>
      el('button.tile', { onclick: () => this.app.navigate(path) },
        el('span.tile-title', {}, title),
        el('span.tile-desc', {}, desc),
        badge != null ? el('span.tile-badge', {}, badge) : null,
      );

    this.root.innerHTML = '';
    this.root.append(
      el('div.screen', {},
        el('header.bar', {},
          el('h2', {}, '自作カードバトル'),
          this._renderProfileBtn(),
        ),
        el('div.home-screen-body', {},
          el('p.home-sub', {}, 'カードを作ってデッキを組んで友達と対戦しよう。'),
          el('div.tiles', {},
            tile('① カード作成', 'オリジナルのカードを作る', '/cards/new'),
            tile('② コレクション / デッキ編成', '作ったカードの確認とデッキ作り', '/decks', `カード${cardCount} / デッキ${deckCount}`),
            tile('③ オンライン対戦', 'パスワード部屋 or CPU と対戦', '/battle'),
          ),
        ),
        this.showProfileEdit ? this._renderProfileEditModal() : null,
      ),
    );
  }

  // ---- ヘッダー右上の小さいプロフィールボタン ----
  _renderProfileBtn() {
    const p = store.getProfile();
    const iconEl = p.icon
      ? el('img', { src: p.icon, alt: '' })
      : el('span', {}, p.name ? p.name[0].toUpperCase() : '?');

    return el('button.profile-header-btn', {
      onclick: () => {
        const prof = store.getProfile();
        this.profileEditing = {
          name: prof.name || '',
          iconSource: prof.iconSource || '',
          iconTransform: prof.iconTransform || null,
          icon: prof.icon || '',
        };
        this.showProfileEdit = true;
        this._render();
      },
    },
      el('div.profile-header-icon', {}, iconEl),
      el('span.profile-header-name', {}, p.name || 'プレイヤー'),
      el('span.profile-header-edit', {}, '変更'),
    );
  }

  // ---- プロフィール編集モーダル ----
  _renderProfileEditModal() {
    const ed = this.profileEditing;

    // アイコンプレビュー
    const previewIcon = el('div.icon-preview-circle', {},
      ed.icon ? el('img', { src: ed.icon, alt: '' }) : el('span', {}, '?'),
    );

    // クロッパー領域
    const cropArea = el('div', { style: 'display:flex;flex-direction:column;gap:8px;align-items:center' });

    if (ed.iconSource) {
      if (this.profileCropper) { this.profileCropper.destroy(); this.profileCropper = null; }
      this.profileCropper = createCropper({
        src: ed.iconSource,
        transform: ed.iconTransform || undefined,
        aspect: 1,
        maxZoom: 6,
        onChange: (t) => {
          ed.iconTransform = t;
          // リアルタイムプレビュー更新
          toIconDataURL(ed.iconSource, t, 128).then((url) => {
            if (url) {
              ed.icon = url;
              const img = previewIcon.querySelector('img');
              if (img) { img.src = url; }
              else { previewIcon.innerHTML = ''; previewIcon.append(el('img', { src: url, alt: '' })); }
            }
          });
        },
      });
      // クロッパー要素にスタイルを上書き（正円表示のためのクラスを使用）
      this.profileCropper.element.className = 'icon-cropper-frame';

      const zoomSlider = el('input.zoom-slider', {
        type: 'range', min: '1', max: '6', step: '0.01',
        value: String((ed.iconTransform && ed.iconTransform.zoom) || 1),
        oninput: (e) => this.profileCropper && this.profileCropper.setZoom(+e.target.value),
      });

      cropArea.append(this.profileCropper.element, el('div.zoom-row', { style: 'width:100%;max-width:220px' }, el('span', {}, '🔍'), zoomSlider));
    }

    // 画像選択ボタン
    const fileInput = el('input', {
      type: 'file', accept: 'image/*', style: 'display:none',
      onchange: async (e) => {
        const file = e.target.files?.[0];
        if (!file) return;
        try {
          const src = await loadImageDownscaled(file, 1024);
          ed.iconSource = src;
          ed.iconTransform = null;
          // プレビュー用に即変換
          const url = await toIconDataURL(src, null, 128);
          ed.icon = url || src;
          this._render();
        } catch { alert('画像の読み込みに失敗しました'); }
      },
    });
    const fileBtn = el('label.file-btn', { style: 'display:inline-block;cursor:pointer' }, '📷 画像を選択', fileInput);

    // テンプレートアイコン
    const templateRow = el('div.profile-templates', {},
      ...TEMPLATE_ICONS.map((emoji) =>
        el('button', {
          title: emoji,
          onclick: () => {
            const svg = `data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 64 64'><text y='52' font-size='52'>${encodeURIComponent(emoji)}</text></svg>`;
            ed.icon = svg;
            ed.iconSource = svg;
            ed.iconTransform = null;
            if (this.profileCropper) { this.profileCropper.destroy(); this.profileCropper = null; }
            this._render();
          },
        }, emoji),
      ),
    );

    // 名前入力
    const nameInput = el('input.profile-name-edit', {
      type: 'text', value: ed.name, placeholder: 'プレイヤー名',
      maxlength: 20,
      oninput: (e) => { ed.name = e.target.value; },
    });

    const save = async () => {
      const prof = store.getProfile();
      prof.name = ed.name.trim() || 'プレイヤー';
      if (ed.iconSource && ed.iconTransform) {
        prof.iconSource = ed.iconSource;
        prof.iconTransform = ed.iconTransform;
        prof.icon = await toIconDataURL(ed.iconSource, ed.iconTransform, 256);
      } else if (ed.icon) {
        prof.icon = ed.icon;
        prof.iconSource = ed.iconSource || '';
        prof.iconTransform = ed.iconTransform || null;
      }
      store.saveProfile(prof);
      if (this.profileCropper) { this.profileCropper.destroy(); this.profileCropper = null; }
      this.showProfileEdit = false;
      this.profileEditing = null;
      this._render();
    };

    const close = () => {
      if (this.profileCropper) { this.profileCropper.destroy(); this.profileCropper = null; }
      this.showProfileEdit = false;
      this.profileEditing = null;
      this._render();
    };

    return el('div.profile-edit-overlay', { onclick: (e) => { if (e.target === e.currentTarget) close(); } },
      el('div.profile-edit-card', {},
        el('div.profile-edit-header', {},
          el('h3', {}, 'プロフィール編集'),
          el('button', { onclick: close }, '✕ 閉じる'),
        ),
        el('div.profile-edit-body', {},
          el('div.pe-section', {},
            el('h4', {}, 'プレイヤー名'),
            nameInput,
          ),
          el('div.pe-section', {},
            el('h4', {}, 'アイコン'),
            el('div', { style: 'display:flex;align-items:center;gap:12px;margin-bottom:8px' },
              previewIcon,
              fileBtn,
            ),
            cropArea,
          ),
          el('div.pe-section', {},
            el('h4', {}, 'テンプレートアイコン'),
            templateRow,
          ),
          el('div.actions', {},
            el('button.primary', { onclick: save }, '保存'),
            el('button', { onclick: close }, 'キャンセル'),
          ),
        ),
      ),
    );
  }
}

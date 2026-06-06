// ============================================================
// screens/cardCreator.js  —  ① カード作成
// 項目: ①名前 ②コスト(1〜3) ③画像(アルバム選択+拡大縮小/移動) ④説明 ⑤タグ
// スマホでは縦画面を推奨。
// ルート: #/cards/new（新規） / #/cards/edit?id=..（編集）
// ============================================================

import { Screen } from '../router.js';
import { el, fitText } from '../util.js';
import { store } from '../store.js';
import { createCard, validateCard, COST_VALUES } from '../models.js';
import { createCropper, layoutFrame, ART_ASPECT } from '../components/imageCropper.js';
import { loadImageDownscaled, invalidateCardImage } from '../cardImage.js';
import { orientation } from '../orientation.js';

export class CardCreatorScreen extends Screen {
  mount(params) {
    orientation.setPreferred('portrait');   // スマホは縦推奨

    const editing = params.id ? store.getCard(params.id) : null;
    this.card = createCard(editing || {});
    this.cropper = null;
    this.artNat = { w: 0, h: 0 };

    // --- カードのライブプレビュー ---
    this.pvName = el('div.pv-name');
    this.pvCost = el('div.pv-cost', {}, this.card.cost);
    this.pvArtImg = el('img.pv-art-img', { alt: '', draggable: 'false' });
    this.pvArt = el('div.pv-art', {}, this.card.imageSource ? this.pvArtImg : el('span.pv-art-ph', {}, '画像なし'));
    this.pvText = el('div.pv-text');
    this.pvTags = el('div.pv-tags');
    const preview = el('div.card-preview', {},
      this.pvCost, this.pvName, this.pvArt, this.pvText, this.pvTags);

    if (this.card.imageSource) {
      this.pvArtImg.addEventListener('load', () => {
        this.artNat = { w: this.pvArtImg.naturalWidth, h: this.pvArtImg.naturalHeight };
        this._refreshPreviewArt();
      });
      this.pvArtImg.src = this.card.imageSource;
    }

    // --- 入力フォーム ---
    const errorBox = el('div.errors');

    const nameInput = el('input', {
      type: 'text', value: this.card.name, placeholder: 'カード名', maxlength: 40,
      oninput: (e) => { this.card.name = e.target.value; this._refreshName(); },
    });

    // ② コスト 1〜3（セグメント）
    const costSeg = el('div.cost-seg', {},
      ...COST_VALUES.map((v) => el('button',
        { class: v === this.card.cost ? 'active' : '',
          onclick: (e) => {
            this.card.cost = v;
            costSeg.querySelectorAll('button').forEach((b) => b.classList.remove('active'));
            e.currentTarget.classList.add('active');
            this.pvCost.textContent = v;
          } }, v)),
    );

    // ③ 画像選択（アルバム）＋ 調整
    const fileInput = el('input', {
      type: 'file', accept: 'image/*',
      onchange: (e) => this._onPickImage(e.target.files?.[0]),
    });
    this.cropperWrap = el('div.cropper-wrap');
    this.zoomSlider = el('input', {
      type: 'range', min: '1', max: '4', step: '0.01', value: this.card.imageTransform.zoom,
      class: 'zoom-slider', disabled: this.card.imageSource ? null : true,
      oninput: (e) => this.cropper && this.cropper.setZoom(Number(e.target.value)),
    });
    const imageBlock = el('div.image-block', {},
      el('div.image-controls', {},
        el('label.file-btn', {}, 'アルバムから画像を選ぶ', fileInput),
      ),
      this.cropperWrap,
      el('div.zoom-row', {}, el('span', {}, '−'), this.zoomSlider, el('span', {}, '＋')),
      el('p.hint', {}, 'ドラッグで位置、ピンチ/ホイール/スライダーで拡大縮小。枠は必ず画像で埋まります。'),
    );
    if (this.card.imageSource) this._initCropper();

    // ④ 説明文
    const textArea = el('textarea',
      { rows: 3, placeholder: 'カードの説明文',
        oninput: (e) => { this.card.text = e.target.value; this._refreshText(); } },
      this.card.text);

    // ⑤ タグ
    this.tagsWrap = el('div.tags-input');
    const tagField = el('input', {
      type: 'text', placeholder: 'タグを入力して Enter（カンマ区切りも可）',
      onkeydown: (e) => {
        if (e.key === 'Enter' || e.key === ',') { e.preventDefault(); this._addTags(e.target.value); e.target.value = ''; }
      },
      onblur: (e) => { if (e.target.value.trim()) { this._addTags(e.target.value); e.target.value = ''; } },
    });
    this._renderTags();

    const save = () => {
      const errors = validateCard(this.card);
      errorBox.replaceChildren(...errors.map((m) => el('div.error', {}, m)));
      if (errors.length) return;
      this.card.imageTransform = this.cropper ? this.cropper.getTransform() : this.card.imageTransform;
      invalidateCardImage(this.card.id);
      try {
        store.saveCard(this.card);
        this.app.navigate('/decks?tab=cards');
      } catch (err) {
        errorBox.replaceChildren(el('div.error', {}, '保存に失敗しました（画像が大きすぎる可能性）。別の画像をお試しください。'));
      }
    };

    const field = (label, ...inner) =>
      el('label.field', {}, el('span.field-label', {}, label), ...inner);

    this.root.append(
      el('div.screen creator-screen', {},
        el('header.bar', {},
          el('button.back', { onclick: () => this.app.navigate('/home') }, '← 戻る'),
          el('h2', {}, editing ? 'カードを編集' : 'カードを作成'),
        ),
        el('div.creator', {},
          el('div.form', {},
            field('① カード名', nameInput),
            field('② コスト（1〜3）', costSeg),
            field('③ イラスト', imageBlock),
            field('④ 説明文', textArea),
            field('⑤ タグ', this.tagsWrap, tagField),
            errorBox,
            el('div.actions', {}, el('button.primary', { onclick: save }, '保存')),
          ),
          el('div.preview-wrap', {},
            el('span.preview-caption', {}, 'プレビュー'),
            preview,
          ),
        ),
      ),
    );

    this._refreshName();
    this._refreshText();
  }

  // --- 画像 -------------------------------------------------
  async _onPickImage(file) {
    if (!file) return;
    try {
      this.card.imageSource = await loadImageDownscaled(file, 1024);
      this.card.imageTransform = { zoom: 1, cx: 0.5, cy: 0.5 };
      this.zoomSlider.disabled = false;
      this.zoomSlider.value = 1;
      // プレビュー側の img を差し替え
      this.pvArt.replaceChildren(this.pvArtImg);
      this.pvArtImg.onload = () => {
        this.artNat = { w: this.pvArtImg.naturalWidth, h: this.pvArtImg.naturalHeight };
        this._refreshPreviewArt();
      };
      this.pvArtImg.src = this.card.imageSource;
      this._initCropper();
    } catch {
      alert('画像の読み込みに失敗しました');
    }
  }

  _initCropper() {
    if (this.cropper) this.cropper.destroy();
    this.cropper = createCropper({
      src: this.card.imageSource,
      transform: this.card.imageTransform,
      onChange: (t) => {
        this.card.imageTransform = t;
        this.zoomSlider.value = t.zoom;
        this._refreshPreviewArt();
      },
    });
    this.cropperWrap.replaceChildren(this.cropper.element);
    this.addCleanup(() => this.cropper && this.cropper.destroy());
  }

  _refreshPreviewArt() {
    if (!this.artNat.w) return;
    layoutFrame(this.pvArt, this.pvArtImg, this.artNat.w, this.artNat.h, this.card.imageTransform);
  }

  // --- 名前/説明 --------------------------------------------
  _refreshName() {
    this.pvName.textContent = this.card.name || '（カード名）';
    // はみ出さないよう自動縮小
    requestAnimationFrame(() => fitText(this.pvName, { max: 22, min: 9 }));
  }
  _refreshText() {
    this.pvText.textContent = this.card.text || '（説明文）';
  }

  // --- タグ -------------------------------------------------
  _addTags(raw) {
    const parts = raw.split(',').map((s) => s.trim()).filter(Boolean);
    for (const p of parts) if (!this.card.tags.includes(p)) this.card.tags.push(p);
    this._renderTags();
  }
  _renderTags() {
    this.tagsWrap.replaceChildren(
      ...this.card.tags.map((tag, i) =>
        el('span.tag-chip', {}, tag,
          el('button.tag-x', { onclick: () => { this.card.tags.splice(i, 1); this._renderTags(); } }, '×'))),
    );
    this._renderPreviewTags();
  }
  _renderPreviewTags() {
    this.pvTags.replaceChildren(...this.card.tags.map((t) => el('span.pv-tag', {}, t)));
  }
}

// ============================================================
// main.js  —  アプリ起動
// ルートを登録してルーターを開始するだけ。
// 画面を増やすときは、ここに registerRoute を 1 行足します。
// ============================================================

import { Router } from './router.js';
import { HomeScreen } from './screens/home.js';
import { CardCreatorScreen } from './screens/cardCreator.js';
import { DeckBuilderScreen } from './screens/deckBuilder.js';
import { BattleScreen } from './screens/battle.js';

const root = document.getElementById('app');
const router = new Router(root);

router.registerRoute('/home', HomeScreen);
router.registerRoute('/cards/new', CardCreatorScreen);   // ① 作成
router.registerRoute('/cards/edit', CardCreatorScreen);  // ① 編集
router.registerRoute('/decks', DeckBuilderScreen);       // ② コレクション/デッキ
router.registerRoute('/battle', BattleScreen);           // ③ 対戦

router.start('/home');

# Дроп золота з монстрів — звіт

## Що зроблено

- `public/assets/data/loot.json` — `_pickup` + `gold` для skeleton / zombie / necro_warrior (значення з design.md).
- `src/gameplay/Loot.ts` — `parseLoot` (валідація, ключі з `_` службові), `rollGold`
  (`max(1, floor(round(base·(1+U))·mult))`, RNG суми лише при успіху), `dropPosition` (рівномірно в колі
  `GOLD_SCATTER`, непрохідний тайл → точне місце смерті), `pileTier`.
- `src/config.ts` — `GOLD_SCATTER`, `ZONE_GOLD_MULT`, `GOLD_PILE_TIERS`, `GOLD_PILE_PICK`.
- Компоненти `GoldDrop`, `GoldPile`, `Wallet` (f64).
- `src/ecs/world.ts` — `spawnHero(..., gold)`, `spawnMonster(..., gold?)`, `spawnGoldPile`; `createStep(map, spawn, rng, pickup)`,
  порядок `input → ai → movement → combat → loot → animation → cleanup`.
- `src/ecs/systems/loot.ts` — дроп з `[Dead, GoldDrop, Position]`, відлік `delay`, автопідбір у `pickupRadius`
  (кап `MAX_SAFE_INTEGER`, купка отримує `Dead` і видаляється в `cleanup`).
- `src/ecs/systems/render.ts` — ромби 3 розмірів з тінню, `cullable`, `zIndex = s.y − TILE_H/2`,
  `alpha 0.5` поки `delay > 0`, один спільний підпис «N золота» над купкою під курсором.
- `src/ecs/systems/input.ts` — `pickPile`, пріоритет кліку монстр > купка > земля.
- `src/ui/Hud.ts` — монета + число в лівому верхньому куті, перемальовка лише при зміні.
- `src/save/Storage.ts` — `createStorage(backend)` з асинхронними `load`/`save`/`loadGold`/`saveGold`
  (JSON; не ціле / < 0 / битий / відсутній → 0).
- `src/main.ts` / `src/core/Game.ts` — завантаження `loot.json` і стартової суми, `rng` створюється до
  `createStep`, HUD, запис гаманця при зміні суми.
- Тести: `tests/gameplay/Loot.test.ts`, `tests/save/Storage.test.ts`, опційний `tests/ecs/loot.test.ts`.

## Відхилення від плану (і чому)

- **`GOLD_PILE_PICK` у `config.ts`** (не було в плані) — радіус хітбоксу купки (px), спільний для кліку в
  `input.ts` і наведення в `render.ts`, щоб системи не викликали одна одну.
- **Один спільний `Text`-підпис** замість підпису на кожній купці — до ~1500 купок на карті.
- **`Storage.ts` — фабрика `createStorage(backend)`** замість модульних функцій: так бекенд інжектиться в
  тестах без глобального `localStorage`; `main.ts` створює екземпляр з `localStorage` і передає в `Game`.
- **`Статус: done` не виставлено** (крок 8) — за вказівкою оркестратора статус лишається `approved`.
- **Prettier відформатував `design.md` / `plan.md`** — без цього `npm run lint` падав ще до змін.
- Додано опційний ECS-тест системи `loot`. Таймер `delay` у f32 може потребувати на 1 крок більше за
  `pickupDelay / FIXED_DT` (≈16 мс) — тест це допускає.
- Опційні «підстрибування» й «мерехтіння» купки з design.md не робились (їх немає в плані).

## Результат lint / test

- `npm run lint` — ESLint без помилок, Prettier: «All matched files use Prettier code style!»
- `npm run test` — 7 файлів, 25 тестів, усі пройшли (було 4 / 10).
- `npx tsc --noEmit` — 0 помилок; `vite build` збирається.
- `npm run data:check` у `package.json` відсутній; валідацію `loot.json` робить `parseLoot` на старті.

## Що перевірити вручну

1. `npm run dev`: у лівому верхньому куті HUD — жовта монета і «0» (або сума з минулої сесії).
2. Убити кілька скелетів / зомбі / некро-воїнів: приблизно на 40–60 % місць смерті з'являються притемнені
   жовті ромби різного розміру (≤ 5, 6–15, > 15) в межах 0.3 тайла, ніколи — у скелях / деревах.
3. Через ~2 с купка стає яскравою. Навести курсор — над нею «N золота».
4. Стати на купку одразу після вбивства — вона зникає рівно коли яскравіє, HUD зростає на N.
5. Пройти поверх яскравої купки — підбирається миттєво.
6. Клікнути по купці здалеку — герой іде й підбирає; клік по монстру, що стоїть на купці, — атака.
7. Вбити зграю в одному місці, почекати 2 с і пройти — підбираються всі, HUD = сума.
8. Померти — після респауну сума в HUD та сама, купки на карті лишаються.
9. Перезавантажити сторінку — сума в HUD збереглась (ключ `nevendaar.gold` у `localStorage`).
   Зіпсувати запис у DevTools (напр. `abc`, `-5`, `1.5`), перезавантажити — HUD показує 0, гра не падає.
10. Купка під ногами героя малюється під ним, а не поверх ніг.

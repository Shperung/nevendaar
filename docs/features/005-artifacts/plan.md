# Артефакти — план розробки

Статус: done

## Підсумок

Додаємо артефакти: дані (бази, unique, афікси) у JSON, чистий генератор у `gameplay/` на сідованому RNG
(`ilvl` від монстра, 4 рідкості, тири афіксів, назви з узгодженням роду). Монстр при смерті кладе золото й
артефакти в **одну** сутність луту: лише золото — стара купка 001, є артефакт — мішечок з аурою рідкості.
Автопідбір віддає золото в гаманець, артефакти — в кінець безлімітного списку героя, який зберігається в
`Storage` і показується в сітці рюкзака вікна 004 з пергаментною карткою при наведенні. Іконки генеруються
окремим кроком; код працює з фолбеками, якщо будь-якого арту немає.

Відкриті питання `design.md` плануємо за рекомендованими варіантами: **1A** (екіпірування — наступна фіча),
**2A** (інвентар зберігається поруч із золотом), **3A** (лише золото → купка 001, є артефакт → мішечок),
**4A** (сітка 10 колонок, рядки додаються, прокрутка колесом), **5A** (`level` у `monsters.json`),
**6A** (рідкість окремим підрядком «Рідкісний артефакт · рівень 5»).

## Зміни по файлах

| Файл                                                                                                      | Дія          | Що саме                                                                                                                                                                                                                                                                                                                                                                                                              |
| --------------------------------------------------------------------------------------------------------- | ------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `public/assets/data/monsters.json`                                                                        | змінити      | `level`: skeleton 1, zombie 2, necro_warrior 3                                                                                                                                                                                                                                                                                                                                                                       |
| `public/assets/data/loot.json`                                                                            | змінити      | `_rarity` і `items { rolls, chance }` у монстрів — як у `design.md` §Дані                                                                                                                                                                                                                                                                                                                                            |
| `public/assets/data/items.json`                                                                           | новий        | 20 баз, 12 unique, `rareNames` — з таблиць `design.md`                                                                                                                                                                                                                                                                                                                                                               |
| `public/assets/data/affixes.json`                                                                         | новий        | 7 префіксів + 6 суфіксів з таблиць `design.md`                                                                                                                                                                                                                                                                                                                                                                       |
| `src/gameplay/Monster.ts`                                                                                 | змінити      | `MonsterDef.level: number`                                                                                                                                                                                                                                                                                                                                                                                           |
| `src/gameplay/Loot.ts`                                                                                    | змінити      | `LootTable.rarity: Record<Rarity, number>`, `monsters[id].items?: { rolls, chance }`; валідація в `parseLoot`                                                                                                                                                                                                                                                                                                        |
| `src/gameplay/Items.ts`                                                                                   | новий        | Типи `Rarity`, `ItemType`, `Stat`, `BaseDef`, `UniqueDef`, `AffixDef`, `ItemData`, `Item`; `ITEMS_URL`, `AFFIXES_URL`; `parseItemData(items, affixes)` з валідацією й перехресними перевірками (unique.base існує, типи/стати з дозволених списків, у префікса є форми `m/f/pl`, тири зростають за `minIlvl`); `restoreItems(raw, data)` — сейв → `Item[]`, пропуск зниклих `base`/`unique`/`affix` з `console.warn` |
| `src/gameplay/ItemGenerator.ts`                                                                           | новий        | `rollItem(data, rarityWeights, ilvl, rng, uid): Item` — кроки 1–6 «Генерація»; допоміжний `weighted(rng, entries)`                                                                                                                                                                                                                                                                                                   |
| `src/ui/ItemText.ts`                                                                                      | новий        | Чисте форматування без DOM/Pixi: `itemName(data, item)` (common/magic з родом/rare/unique), `describeItem(data, item)` → модель картки `{ name, baseName?, subtitle, typeLine, baseLine?, affixLines, flavor?, rarity }`, `sackLabel(gold, items)` з відмінюванням «артефакт/-и/-ів», `topRarity(items)`, кольори `RARITY_INK` (картка) і `RARITY_GLOW` (аура/журнал), `TYPE_NAMES`                                  |
| `src/config.ts`                                                                                           | змінити      | `BACKPACK_CAP = 10_000`                                                                                                                                                                                                                                                                                                                                                                                              |
| `src/ecs/components/ItemDrop.ts`                                                                          | новий        | `defineComponent({ rolls: ui8, chance: f32, ilvl: ui8 })`                                                                                                                                                                                                                                                                                                                                                            |
| `src/ecs/components/SackItems.ts`                                                                         | новий        | Side-map `Map<eid, Item[]>` (як `Path`): артефакти в сутності луту на землі                                                                                                                                                                                                                                                                                                                                          |
| `src/ecs/components/Backpack.ts`                                                                          | новий        | Side-map `Map<eid, Item[]>`: упорядкований список артефактів героя                                                                                                                                                                                                                                                                                                                                                   |
| `src/ecs/world.ts`                                                                                        | змінити      | `spawnHero(..., items: Item[])` → `Backpack.set`; `spawnMonster(..., items?)` додає `ItemDrop` (`ilvl = def.level + DEPTH − 1`); `spawnGoldPile(..., items = [])` → `SackItems.set`, якщо непорожній; `createStep` приймає `loot: LootTable`, `items: ItemData`, `firstUid` замість `pickup`                                                                                                                         |
| `src/ecs/systems/loot.ts`                                                                                 | змінити      | Після `rollGold` — `rolls` спроб з `chance` → `rollItem`; нічого не випало → сутності немає; одна сутність на монстра; підбір: золото в `Wallet`, `SackItems` → кінець `Backpack` (понад `BACKPACK_CAP` — `console.warn`, решта губиться); лічильник `uid` у замиканні                                                                                                                                               |
| `src/ecs/systems/cleanup.ts`                                                                              | змінити      | `SackItems.delete(eid)` поруч з `Path.delete(eid)`                                                                                                                                                                                                                                                                                                                                                                   |
| `src/ecs/systems/render.ts`                                                                               | змінити      | Сутність з `SackItems` → мішечок (`loot_sack` або фолбек-`Graphics`: коричневий ромб із зав'язкою) + аура-еліпс кольору `topRarity` з пульсацією 1.5 с (common — без аури); підпис наведення через `sackLabel`, колір — найвища рідкість                                                                                                                                                                             |
| `src/ui/FindLog.ts`                                                                                       | новий        | Pixi-контейнер: `push(text, color)`, `update(dtMs)`; ≤ 5 рядків, кожен живе 4 с і згасає; ліворуч знизу ігрової області                                                                                                                                                                                                                                                                                              |
| `src/ui/InventoryWindow.ts`                                                                               | змінити      | `setItems(items, data)`: перебудова клітинок (мін. `cols × rows`, далі цілими рядками), іконка `<img>` з фолбеком-плейсхолдером, рамка кольору рідкості; картка `.inv-card` (наведення на клітинку, делегування подій на `.inv-pack`), позиція через `cardPosition`                                                                                                                                                  |
| `src/ui/InventoryLayout.ts`                                                                               | змінити      | Чиста `cardPosition(cursor, card, view)` — картка біля курсора, зсув усередину екрана                                                                                                                                                                                                                                                                                                                                |
| `src/ui/inventory.css`                                                                                    | змінити      | Рюкзак: `grid-auto-rows: 40px`, `overflow-y: auto`, рамка клітинки за `data-rarity`, плейсхолдер (квадрат + літера типу); картка 300 px: `parchment.png`, `border-image: card_frame.png` поверх простого `border` (фолбек), іконка 64×64 у `card_icon_frame.png`, розділювач — CSS (лінія з ромбом), fade 100 мс                                                                                                     |
| `src/save/Storage.ts`                                                                                     | змінити      | `loadInventory(): Promise<unknown[]>` (не масив → `[]`), `saveInventory(items)`; ключ `nevendaar.inventory`                                                                                                                                                                                                                                                                                                          |
| `src/main.ts`                                                                                             | змінити      | Завантажити й `parseItemData` (items + affixes), `restoreItems(await storage.loadInventory())`; `loot_sack` вантажиться окремо з `.catch` (немає файлу → фолбек)                                                                                                                                                                                                                                                     |
| `src/core/Game.ts`                                                                                        | змінити      | Передати дані в `createStep`/`spawnMonster`/`spawnHero`; `firstUid = max(uid) + 1`; у тікері: зросла довжина `Backpack` → нові назви у `FindLog`, `inventoryWindow.setItems`, `storage.saveInventory` (як `saveGold`)                                                                                                                                                                                                |
| `tools/uiArt.ts`                                                                                          | змінити      | Іконки з `items.json` (`bases[].icon`, `uniques[].icon`) → записи `items/<icon>` 128×128; `mkdir` підтеки; фільтр CLI `items` бере всю групу; записи `card_frame`, `card_icon_frame`                                                                                                                                                                                                                                 |
| `public/assets/ui/items/*.png`, `public/assets/ui/card_*.png`, `public/assets/atlases/loot/loot_sack.png` | нові         | Вихід арт-кроку (див. крок 6)                                                                                                                                                                                                                                                                                                                                                                                        |
| `AGENTS.md`                                                                                               | змінити      | §3: `public/assets/ui/items/` — іконки артефактів; §4 «Лут і стати»: генерація в `ItemGenerator.ts`, список героя — side-map `Backpack`, лут на землі — `GoldPile` + `SackItems`                                                                                                                                                                                                                                     |
| `tests/...`                                                                                               | нові/змінити | Див. «Тести»                                                                                                                                                                                                                                                                                                                                                                                                         |

Порядок систем, акумулятор, `Input.ts`, `Hud.ts`, `manifest.ts` не змінюються. Нових залежностей немає.

## Кроки

1. [x] `data:` JSON-дані (`monsters.json` `level`, `loot.json`, `items.json`, `affixes.json`);
       `MonsterDef.level`; `parseLoot` з `_rarity`/`items`; `src/gameplay/Items.ts` (`parseItemData`);
       завантаження в `main.ts` (поки не використовується). Тести `Loot.test.ts`, `Items.test.ts`.
2. [x] `feat:` `src/gameplay/ItemGenerator.ts` (`rollItem`) + `tests/gameplay/ItemGenerator.test.ts`.
3. [x] `feat:` `src/ui/ItemText.ts` (назви, модель картки, підпис мішечка, кольори) + `tests/ui/ItemText.test.ts`.
4. [x] `feat:` ECS: `ItemDrop`, `SackItems`, `Backpack`; `world.ts`, `loot.ts`, `cleanup.ts`; під'єднання в
       `Game.ts` (`firstUid = 1`, поки без сейву). Мішечок поки рендериться як купка золота. `tests/ecs/loot.test.ts`.
5. [x] `feat:` Збереження: `Storage.loadInventory/saveInventory`, `restoreItems`; `main.ts` → `Game`
       (`firstUid` з відновлених), збереження при зміні довжини `Backpack`. Тести `Storage.test.ts`, `Items.test.ts`.
6. [x] `tools:` Арт (виконує оркестратор, див. «Арт» нижче; developer зробив лише зміни в `tools/uiArt.ts`): зміни в `tools/uiArt.ts`; генерація сирих
       файлів; `node tools/uiArt.ts items card_frame card_icon_frame`; `node tools/keyCutout.ts
art/concepts/loot/loot_sack.png public/assets/atlases/loot/loot_sack.png 128 green`. Коміт лише виходу.
7. [x] `feat:` Мішечок на землі в `render.ts` (спрайт/фолбек, аура з пульсацією, підпис) + `loot_sack` у `main.ts`.
8. [x] `feat:` `src/ui/FindLog.ts` + під'єднання в `Game.ts` (нові предмети в `Backpack` → рядки журналу).
9. [x] `feat:` Вікно: `setItems`, клітинки з іконками/плейсхолдерами, прокрутка, картка; `cardPosition` +
       кейс у `tests/ui/InventoryLayout.test.ts`.
10. [x] `docs:` `AGENTS.md`; `npm run lint && npm run test && npm run build`; ручна перевірка; скріншот у теку фічі.

## Арт (крок 6)

**Скільки іконок: 20 баз + 12 unique = 32.** Одна іконка на **базу**, а не на тип (10): у типі `weapon1h`
тесак, серп і булава — різні силуети, і назва «Цвинтарний серп» під тесаком читалася б як баг. Magic/rare
окремих іконок не мають — беруть іконку бази (як у D2), рідкість видно рамкою й кольором назви. Unique
отримують свої — це головна «нагорода» за рідкісний дроп і саме те, що просив користувач («різні
артефакти»). ~25 КБ × 32 ≈ 0.8 МБ — далеко від ліміту 5 МБ.

Пріоритет генерації (якщо бюджет обмежений): спершу 20 баз (покривають усі предмети), потім 12 unique.
Фолбек-ланцюжок у коді: іконка unique → іконка бази → плейсхолдер (кольоровий квадрат + перша літера типу).

| Сирий файл                                   | Вихід                                      | Розмір виходу                   | Ключ     | Обробка                                            |
| -------------------------------------------- | ------------------------------------------ | ------------------------------- | -------- | -------------------------------------------------- |
| `art/concepts/ui/items/item_<base>.png` × 20 | `public/assets/ui/items/item_<base>.png`   | 128×128                         | magenta  | `uiArt.ts`, `contain`, box 4/4/120/120, без грейду |
| `art/concepts/ui/items/unique_<id>.png` × 12 | `public/assets/ui/items/unique_<id>.png`   | 128×128                         | magenta¹ | те саме                                            |
| `art/concepts/ui/card_frame.png`             | `public/assets/ui/card_frame.png`          | 600×600 (9-slice, кути ≈ 64 px) | magenta  | `stretch`, `STONE`                                 |
| `art/concepts/ui/card_icon_frame.png`        | `public/assets/ui/card_icon_frame.png`     | 160×160                         | magenta  | `stretch`, `STONE`                                 |
| `art/concepts/loot/loot_sack.png`            | `public/assets/atlases/loot/loot_sack.png` | ширина 128                      | green    | `keyCutout.ts` (як `gold_pouch`)                   |

Імена й промпти — з таблиць `design.md` §«Візуал і ассети» (шаблон іконки + `<subject>`, для unique —
`faint <color> magical glow`). ¹ `removeSampledKey` бере колір фону з кутів, тож для
`unique_hollow_sockets` (фіолетове світіння) генеруємо на **зеленому** фоні — інакше ключ з'їсть світіння.
Невдалі варіанти — `<name>_vN.png` поруч.

**Не генеруємо:** `fx_loot_aura` (аура — тонований `Graphics`-еліпс з пульсацією альфи, досить для
placeholder-віхи) і `card_divider` (CSS-лінія з ромбом). Обидва можна додати пізніше без змін логіки.

**`tools/uiArt.ts`:** читає `public/assets/data/items.json` (`readFileSync`), будує
`{ name: 'items/' + icon, w: 128, h: 128, mode: 'contain', box: { x: 4, y: 4, w: 120, h: 120 } }` для кожної
іконки баз і unique; `rawPath`/`OUT` працюють з підтекою як є, лише `mkdirSync(dirname(out), { recursive: true })`
перед записом; `wanted(name)` також приймає першу частину шляху (`node tools/uiArt.ts items`). Плюс два
записи `card_frame` і `card_icon_frame`.

## Тести

- `tests/gameplay/Loot.test.ts` — `_rarity` і `items` парсяться; невалідні ваги/`chance`/`rolls` → помилка
  `loot.json: …`; монстр без `items` — `items` undefined.
- `tests/gameplay/Items.test.ts`
  - справжні `items.json` + `affixes.json` (JSON-імпорт, як у 004) парсяться: 20 баз, 12 unique, 13 афіксів;
  - помилки: unique з неіснуючою базою, невідомий тип/стат, префікс без форми роду, порожні тири;
  - `restoreItems`: валідний предмет відновлюється; зниклий `base`/`unique`/`affix` → пропуск + `warn`;
    сміття (не масив, не об'єкт) → `[]`.
- `tests/gameplay/ItemGenerator.test.ts` (багато ролів на фіксованому seed)
  - однаковий seed → однакові предмети;
  - `base.qlvl ≤ ilvl`; тир афікса `minIlvl ≤ ilvl`; значення в `[min, max]` тиру;
  - magic: 1–2 афікси, не більше 1 префікса й 1 суфікса; rare: 3–4, ≤ 2 + 2; без повторів `group`;
  - unique: стати в діапазонах; на `ilvl`, нижчому за `minIlvl` усіх unique бази → `rare`;
  - крайові (на синтетичних даних): база з 1 префіксом і без суфіксів → rare лишається з 1 афіксом; база без
    жодного афікса → `common`; частоти рідкостей на 10 000 ролах близькі до 60/30/9/1 (допуск).
- `tests/ui/ItemText.test.ts` — назви: common «Іржавий шолом»; magic «Лютий щербатий тесак Тризни», форми
  `f`/`pl` («Люта бойова коса», «Міцні стоптані чоботи»); rare — два слова + `baseName`; unique — фіксована;
  `subtitle` «Чарівний артефакт · рівень 5»; `baseLine` «Шкода: 9–17» / «Броня: 6» / немає для кільця;
  рядки статів для кожного `stat`; `sackLabel`: «Мішечок: 12 золота, 2 артефакти», «Мішечок: 1 артефакт»,
  «5 артефактів»; `topRarity`.
- `tests/ecs/loot.test.ts` — монстр з `ItemDrop chance 1` → одна сутність з `SackItems` і золотом; лише золото
  → без `SackItems`; нічого не випало → сутності немає; підбір додає в кінець `Backpack` у порядку генерації й
  золото в `Wallet`; `BACKPACK_CAP` не перевищується; мертвий герой не підбирає (є).
- `tests/save/Storage.test.ts` — `saveInventory` → `loadInventory` повертає те саме; зіпсований JSON → `[]`.
- `tests/ui/InventoryLayout.test.ts` — `cardPosition`: праворуч-знизу від курсора; біля правого/нижнього краю
  переноситься ліворуч/вгору; не виходить за `0`.

DOM (`InventoryWindow`), Pixi (`render.ts`, `FindLog`) і I/O-гілки `uiArt.ts` юніт-тестами не покриваються.

## Ризики та рішення

- **Лут на землі: окремий компонент чи наявний `GoldPile`.**
  - А (рекомендація): лишити `GoldPile { amount, delay }` як «купку луту» (`amount` може бути 0) + side-map
    `SackItems`. Підбір, `pickupDelay`, пріоритет кліку, хіт-бокс — уже працюють, `input.ts` не змінюється.
  - Б: перейменувати в `LootPile` — чистіша назва, але правки в 6 файлах без зміни поведінки. Відкладаємо.
- **Змінна довжина в ECS.** Списки предметів не лягають у typed arrays bitECS → side-map, як `Path`;
  очищення лише в `cleanup.ts` (AGENTS.md §4). Системи між собою не викликаються: `loot` пише `Backpack`,
  `Game` читає довжину (UI, журнал, сейв) — без черги подій.
- **Відтворюваність RNG.** Ролі предметів ідуть одразу після ролу золота, до `dropPosition`; порядок
  ролів у `rollItem` фіксований (база → рідкість → unique/афікси → значення). Послідовність купок 001 з тим
  самим seed зміниться — це прийнятно, seed поки не зберігається.
- **`uid`.** Лічильник у замиканні `createLootSystem`, старт `max(uid збережених) + 1`. Не залежить від RNG.
- **Узгодження роду в назві.** Форма префікса за `gender` бази; назва бази після префікса — з малої літери
  («Лютий щербатий тесак»). Суфікс — родовий відмінок, без узгодження. Rare — слова без узгодження.
- **Мішечок без арту.** `loot_sack` у бандл маніфесту **не** додаємо: 404 зламав би `loadBundle('game')`.
  Вантажимо окремо з `.catch`, `render.ts` перевіряє `Assets.cache.has('loot_sack')`, інакше — `Graphics`.
- **Іконки без арту.** `<img>` з `onerror` → прибрати; під ним завжди плейсхолдер-квадрат з літерою типу.
  Картка: `border-image` не завантажився → лишається звичайний `border` у тонах бронзи.
- **Картка в масштабованому `<dialog>`.** Картка — дочірній елемент діалогу (top layer). `transform: scale` на
  діалозі робить його блоком позиціонування, тож координати курсора переводимо: `(client − rect) / scale`;
  межі екрана — так само. Математика винесена в `cardPosition`.
- **Продуктивність.** `setItems` викликається лише при зміні довжини списку (не щокадру). Тисячі клітинок
  при `BACKPACK_CAP` — теоретичні; в реальній грі десятки–сотні.
- **Сейв.** `localStorage` на кожен підбір — ок для сотень предметів (~100 Б на предмет). Перехід на IndexedDB —
  віха 6, API `Storage` уже асинхронний.
- **Стати поки не діють** (рішення 1A): `StatCalc` не чіпаємо; картка лише показує значення.

## Як перевірити вручну

1. `npm run dev`, відкрити гру; у консолі немає помилок завантаження даних.
2. Вбивати монстрів: частина лишає купку монет 001, частина — мішечок; навколо мішечка з magic/rare/unique —
   пульсуюча аура відповідного кольору, у common — без аури. До кінця `pickupDelay` мішечок притемнений.
3. Навести на мішечок — підпис «Мішечок: N золота, K артефакт(и/ів)» кольором найвищої рідкості.
4. Підійти — мішечок зникає, золото в HUD росте, ліворуч знизу з'являються рядки «Знайдено: …» кольором
   рідкості, згасають за ~4 с, не більше 5 одночасно.
5. `I` — у рюкзаку клітинки з іконками (або плейсхолдерами) у порядку підбору, рамка кольору рідкості.
   Наведення — пергаментна картка: іконка в рамці, назва кольором рідкості, для rare — назва бази, підрядок
   «… артефакт · рівень N», тип і базовий стат, афікси, для unique — flavor курсивом. Біля краю екрана
   картка не вилазить за межі.
6. Набрати > 40 предметів (тимчасово підняти `items.chance` у `loot.json` до 1) — з'являються нові рядки,
   рюкзак прокручується колесом.
7. Перезавантажити сторінку — предмети в рюкзаку ті самі, в тому ж порядку; нові знахідки йдуть у кінець.
8. Тимчасово перейменувати одну іконку в `public/assets/ui/items/` і `loot_sack.png` — гра працює з
   плейсхолдером і `Graphics`-мішечком.

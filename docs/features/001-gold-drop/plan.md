# Дроп золота з монстрів — план розробки

Статус: approved

## Підсумок

Мертвий монстр із шансом із `loot.json` залишає купку золота (сутність `Position + GoldPile`), яка лежить
вічно. Нова система `loot` (між `combat` і `animation`) ролить дроп сідованим RNG забігу і через
`pickupDelay` автопідбирає купки в радіусі героя в його гаманець (`Wallet`); до того купка притемнена.
HUD показує лічильник, гаманець зберігається між сесіями в `localStorage` через `src/save/Storage.ts`.

## Зміни по файлах

| Файл                             | Дія     | Що саме                                                                                                                                                                                 |
| -------------------------------- | ------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `public/assets/data/loot.json`   | новий   | `_pickup: { pickupDelay: 2, pickupRadius: 0.6 }` + `gold: { chance, base, spread }` для 3 монстрів (значення з design.md)                                                               |
| `src/gameplay/Loot.ts`           | новий   | Типи `GoldDef`, `PickupParams`, `LootTable`; `LOOT_URL`; чисті `parseLoot(json)`, `rollGold(def, rng, mult)`, `dropPosition(x, y, rng, walkable)`, `pileTier(amount)`                   |
| `src/config.ts`                  | змінити | `GOLD_SCATTER = 0.3`, `ZONE_GOLD_MULT = 1`, `GOLD_PILE_TIERS = [5, 15]`                                                                                                                 |
| `src/ecs/components/GoldDrop.ts` | новий   | `{ chance, base, spread }` на монстрі — що він дропне при смерті                                                                                                                        |
| `src/ecs/components/GoldPile.ts` | новий   | `{ amount: ui32, delay: f32 }` — сума і секунди до доступності підбору                                                                                                                  |
| `src/ecs/components/Wallet.ts`   | новий   | `{ gold: f64 }` на герої (f64 — щоб не втрачати точність понад 2²⁴)                                                                                                                     |
| `src/ecs/world.ts`               | змінити | `spawnHero` додає `Wallet` зі стартовою сумою; `spawnMonster` — `GoldDrop`, якщо є запис; `spawnGoldPile()`; `lootSystem` у порядку систем; `createStep` отримує `rng` і `PickupParams` |
| `src/ecs/systems/loot.ts`        | новий   | `createLootSystem(map, rng, pickup)`: дроп для `[Dead, GoldDrop, Position]`, відлік `delay`, автопідбір                                                                                 |
| `src/ecs/systems/input.ts`       | змінити | `pickPile()`; пріоритет кліку монстр > купка > земля; клік по купці = шлях до її позиції                                                                                                |
| `src/ecs/systems/render.ts`      | змінити | Окремі enter/exit/query для `[Position, GoldPile]`: placeholder-ромб 3 розмірів, притемнення поки `delay > 0`, підпис «N золота» при наведенні                                          |
| `src/ui/Hud.ts`                  | новий   | Контейнер Pixi: жовте коло-монета + `Text` з числом, `update(gold)`                                                                                                                     |
| `src/save/Storage.ts`            | новий   | Тонка обгортка: `load(key)` / `save(key, value)` поверх `localStorage`; `loadGold()` / `saveGold()` з валідацією (битий/відсутній запис → 0)                                            |
| `src/main.ts`                    | змінити | Завантажити `loot.json` (`parseLoot`) і стартову суму (`loadGold`), передати в `Game`                                                                                                   |
| `src/core/Game.ts`               | змінити | Передати таблицю дропу при спавні монстрів, `rng` і `pickup` у `createStep`; HUD; збереження гаманця при зміні                                                                          |
| `tests/gameplay/Loot.test.ts`    | новий   | Специфікації чистої логіки дропу і парсингу                                                                                                                                             |
| `tests/save/Storage.test.ts`     | новий   | Обгортка з in-memory бекендом: збереження/читання, битий запис → 0                                                                                                                      |

`monsters.json` і `MonsterDef` не змінюються.

## Кроки

1. [x] `data:` + `feat:` Дані й чиста логіка. `loot.json`; `gameplay/Loot.ts`:
   - `parseLoot(json)` → `{ pickup, monsters: Record<id, { gold?: GoldDef }> }` (ключі з `_` — службові);
   - `rollGold(def, rng, mult)`: `rng() < chance` → `max(1, round(base · (1 + (rng() · 2 − 1) · spread)) · mult)`,
     інакше `0`; RNG для суми викликається лише при успіху;
   - `dropPosition(x, y, rng, walkable)`: зсув до `GOLD_SCATTER` тайла, непрохідний тайл → точно `(x, y)`;
   - `pileTier(amount)` → 0/1/2 за `GOLD_PILE_TIERS`.
     Константи в `config.ts`. Тести. Гра поводиться як раніше.
2. [x] `feat:` Компоненти та спавн. `GoldDrop`, `GoldPile`, `Wallet`; `spawnHero(world, x, y, gold)`,
       `spawnMonster(..., def, gold?: GoldDef)`; `spawnGoldPile(world, x, y, amount, delay)`.
       `main.ts` вантажить `loot.json` і передає в `Game`; `Game.ts` бере `loot.monsters[UNITS[unit]]?.gold` при спавні.
3. [x] `feat:` Система `loot`. `createLootSystem(map, rng, pickup)`:
   - для кожного `[Dead, GoldDrop, Position]` — `rollGold` → якщо > 0, `spawnGoldPile` у `dropPosition`
     з `delay = pickupDelay`; монстр видаляється в `cleanup` того ж кроку, тож рол рівно один раз;
   - `GoldPile.delay = max(0, delay − FIXED_DT)` для всіх купок;
   - для героя `[Player, Wallet, Position, Not(Dead)]` — усі купки з `delay === 0` у `pickupRadius`:
     `Wallet.gold = min(MAX_SAFE_INTEGER, gold + amount)`, купці `addComponent(Dead)` (видалить `cleanup`).
     Герой, що стоїть на купці, забирає її в крок, коли `delay` дійде до 0, — окремої логіки не треба.
     Порядок у `createStep`: `input → ai → movement → combat → loot → animation → cleanup`.
4. [x] `feat:` Рендер купок. У `render.ts` — окремий `Map` views для `[Position, GoldPile]`:
       жовтий ромб `Graphics` трьох розмірів за `pileTier`, тінь, `cullable`, `zIndex = s.y − TILE_H / 2`;
       `alpha = 0.5`, поки `GoldPile.delay > 0`, інакше 1. Підпис «N золота» (`Text`) над купкою під `Input.pointer`.
5. [x] `feat:` Клік по купці. `pickPile(world, p)` у `input.ts` — хітбокс навколо екранної точки купки;
       якщо монстра під курсором немає, а купка є — `followPath` до `Position` купки (замість `toTile` кліку).
6. [x] `feat:` HUD. `ui/Hud.ts` (коло-монета + `Text`) у лівому верхньому куті, `update(Wallet.gold[hero])`
       у ticker `Game.ts` (перемальовує `Text` лише при зміні суми).
7. [x] `feat:` Збереження гаманця. `save/Storage.ts`: `load`/`save` (бекенд `localStorage` за
       замовчуванням, інжектиться в тестах), `loadGold()` (не число / < 0 / не ціле / немає → 0), `saveGold()`.
       `main.ts` читає суму до старту, `Game.ts` пише, коли `Wallet.gold` змінився з минулого кадру. Тести.
8. [x] `docs:` `Статус: done` у plan.md, `npm run lint && npm run test`.

## Тести

- `tests/gameplay/Loot.test.ts`:
  - `parseLoot`: читає `_pickup`, не вважає його монстром; монстр без `gold` → `gold` відсутній;
  - `rollGold` з фіксованим seed детермінований; `chance = 0` → завжди 0, `chance = 1` → завжди ≥ 1;
  - на 10 000 ролів `base = 10, spread = 0.3` сума завжди в `[7, 13]`, частка дропів ≈ `chance` (±0.02);
  - `spread = 0` → завжди `base`; `base = 1, spread = 0.9` → ніколи < 1; `mult = 2` подвоює;
  - `dropPosition`: зсув ≤ `GOLD_SCATTER`; з `walkable = () => false` повертає точно `(x, y)`;
  - `pileTier`: межі 5/6 і 15/16 → 0/1/1/2.
- `tests/save/Storage.test.ts` (in-memory бекенд замість `localStorage`): `saveGold(42)` → `loadGold() === 42`;
  порожньо, `"abc"`, `"-5"`, `"1.5"`, `"{"` → 0.
- ECS-системи в репо зараз не тестуються; за бажанням — `tests/ecs/loot.test.ts` (bitECS без Pixi працює
  у Vitest): купка недоступна до `pickupDelay`, підбір у радіусі / поза ним, мертвий герой не підбирає.

## Ризики та рішення

- **`localStorage` замість IndexedDB (суперечить AGENTS.md §2).** Стек фіксує збереження через `idb`.
  **Рішення користувача:** лишити `localStorage` як тимчасовий бекенд (§2 оновлено оркестратором).
  `Storage.ts` — єдине місце доступу до сховища, `load`/`save` асинхронні (`Promise`), щоб перехід на
  IndexedDB не змінив жодного виклику в `main.ts` / `Game.ts`.
- **Де писати сейв.** Системи ECS не роблять IO, тож запис — у ticker `Game.ts` за зміною `Wallet.gold`.
  Пише щонайбільше раз на кадр при підборі — для одного числа в `localStorage` це дешево; троттлінг не потрібен.
- **Як система знає дроп монстра.** Компонент `GoldDrop`, заповнений при спавні з `loot.json`, а не
  пошук за `Sprite.unit` у системі: `loot` не залежить від візуальних id і JSON.
- **Формула й округлення.** `round(...) · zoneGoldMult` дає неціле число, коли множник стане дробовим.
  **Рішення:** `max(1, floor(round(base · (1 + U)) · mult))`; за `mult = 1` результат ідентичний формулі design.md.
- **RNG.** Спільний `rng` забігу (той самий, що для спавну). Порядок викликів фіксований: шанс → сума →
  зсув, сума/зсув лише при успіху — забіг відтворюваний за seed і однакових діях. Seed поки новий кожен
  запуск (`Game.ts`), тож відтворюваність з'явиться разом зі збереженням seed.
- **Таймер затримки у фіксованому кроці.** `delay` зменшується на `FIXED_DT` у `loot`; при паузі/згортанні
  вкладки акумулятор обмежений 0.25 с, тож купка не «дозріє» миттєво після повернення.
- **Сортування глибини.** Пласка купка з `zIndex = s.y` перекривала б ноги героя на ній; `s.y − TILE_H / 2`
  тримає її під юнітом.
- **Продуктивність.** До ~1500 вічних купок на карті (600 зграй × ~5 × ~0.5); підбір — лінійний прохід
  щокроку, рендер — `cullable`. Для вертикального зрізу достатньо; просторовий індекс — якщо стане помітно.
- **Валідація даних.** `npm run data:check` з AGENTS.md §6 у `package.json` немає; `parseLoot` робить
  мінімальну перевірку (числа, `0 ≤ spread < 1`, `0 ≤ chance ≤ 1`) і кидає помилку на старті при битих даних.
- **Залежності.** Нових немає (за варіанта (а) щодо сховища).

## Як перевірити вручну

1. `npm run dev`: у куті HUD — монета і «0» (або сума з минулої сесії).
2. Убити кілька скелетів/зомбі/некро-воїнів: приблизно на половині місць смерті з'являються притемнені
   жовті ромби різного розміру поруч із місцем смерті, ніколи — у скелях/деревах.
3. Через ~2 с купка стає яскравою. Навести курсор — «N золота».
4. Стати на купку одразу після вбивства — вона зникає рівно коли яскравіє, HUD зростає на N.
5. Пройти поверх яскравої купки — підбирається миттєво.
6. Клікнути по купці здалеку — герой іде й підбирає; клік по монстру, що стоїть на купці, — атака.
7. Вбити зграю в одному місці, почекати 2 с і пройти — підбираються всі, HUD = сума.
8. Померти — після респауну сума в HUD та сама, купки на карті лишаються.
9. Перезавантажити сторінку — сума в HUD збереглась. У DevTools зіпсувати запис у `localStorage`,
   перезавантажити — HUD показує 0, гра не падає.

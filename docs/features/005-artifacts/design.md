# Артефакти — геймдизайн

## Ідея

У грі з'являються артефакти — предмети з рівнем, базовим типом, рідкістю й випадковими параметрами, як у
Diablo. Падають із монстрів не розкиданими по землі, а в мішечку разом із золотом. Мішечок підбирається
автоматично, увесь вміст іде в безлімітний інвентар. Артефакт показується пергаментною карткою в стилі
`reference.png`. Розміщення в слотах і сітці — наступна фіча.

**Оригінальність (`AGENTS.md` §1).** З референсу беремо лише композицію картки (пергамент, іконка в тонкій
кам'яній рамці по центру, жирна назва, під нею опис звичайним текстом). Назви, іконки й орнаменти — свої.
Жодних назв предметів чи афіксів із Diablo або Disciples.

## Як це в серії Diablo

- **D1:** рівень предмета (`ilvl`) = рівень монстра. Рідкості: звичайні, magic (префікс + суфікс), unique.
  Назва magic збирається як «префікс + база + суфікс». Предмети лежать на землі, підбираються кліком, рюкзак
  із «тетрісом». Unique рідкісні й часто слабші за хороші magic.
- **D2:** еталон системи. `ilvl` монстра обмежує, які бази й тири афіксів можуть випасти (у кожного афікса
  `minLevel`). Рідкості: normal, magic (1–2 афікси), rare (до 3+3, випадкова назва з двох слів), set, unique
  (фіксований набір статів із діапазонами). Невдалий рол unique падає в rare. Гравці хвалять: кожен
  предмет — «лотерейний квиток», назва одразу каже, що це. Лають: багато сміття на землі, підбір кліком.
- **D3:** на старті забагато луту й «дощ» легендарок, після RoS — менше, але цікавіше (smart loot).
  Автопідбір лише золота; предмети — кліком. Кольоровий промінь над предметом за рідкістю.
- **D4:** rarity ті самі + legendary aspects, ilvl/item power, жовті/помаранчеві підписи. Гравці лаяли
  «стіну статів» на картці предмета й нечитабельні афікси; у Season 4 ріжуть кількість афіксів до 2–3 —
  урок про стислість картки.
- **Immortal:** автопідбір усього, лут іде одразу в сумку, ліміт сумки м'який. Підтверджує, що для
  швидкого hack-and-slash автопідбір кращий за кліки.
- **Висновки:**
  - Беремо: `ilvl` від монстра обмежує бази й тири (D2); 4 рідкості з `AGENTS.md`; magic = до 1 префікса +
    1 суфікса, rare = 3–4 афікси з назвою з двох слів, unique — ручні з діапазонами (D2); невдалий unique →
    rare (D2); коротка картка без «стіни статів» (урок D4); автопідбір усього (Immortal).
  - Своє: лут у мішечку разом із золотом (вимога користувача) — нуль сміття на землі, один об'єкт на монстра.
  - Відкидаємо: set-предмети, сокети, міцність, вимоги до статів/рівня (у героя їх немає), ідентифікацію,
    продаж, legendary aspects, smart loot.

## Як це працює в Nevendaar

### Модель артефакту

Артефакт = **база** + **рідкість** + **рівень предмета** + **ролені афікси**. Зберігається лише результат
ролу (не seed), тож дані предмета не залежать від зміни таблиць.

| Поле       | Опис                                                                        |
| ---------- | --------------------------------------------------------------------------- |
| `uid`      | унікальний номер у межах сейву (лічильник)                                  |
| `base`     | id бази з `items.json` (тип, іконка, базові стати)                          |
| `rarity`   | `common` / `magic` / `rare` / `unique`                                      |
| `ilvl`     | рівень предмета, ціле ≥ 1                                                   |
| `affixes`  | `[{ id, tier, value }]` — ролені значення; для unique — `[{ stat, value }]` |
| `unique`   | id unique, якщо `rarity = unique`                                           |
| `rareName` | `[i, j]` — індекси слів назви rare                                          |

**Типи баз** — ті самі, що в `inventory.json` `accepts`: `weapon1h, weapon2h, shield, helm, armor, gloves,
belt, boots, ring, amulet`. Так наступна фіча (розміщення) не міняє формат.

**Базові стати** фіксовані для бази (без ролу, як простіше за D2): зброя — `Шкода: min–max`, броня/щит/
шолом/рукавиці/пояс/чоботи — `Броня: N`, кільця й амулети — без базових статів.

**Стати афіксів** (лише відображення; на героя поки не діють — див. відкриті питання):

| `stat`           | Рядок на картці                       |
| ---------------- | ------------------------------------- |
| `damage`         | `+N до шкоди`                         |
| `damagePct`      | `+N% шкоди`                           |
| `attackSpeedPct` | `+N% швидкості атаки`                 |
| `life`           | `+N до здоров'я`                      |
| `lifeOnKill`     | `+N здоров'я за кожне вбивство`       |
| `lifeSteal`      | `N% завданої шкоди повертає здоров'я` |
| `armor`          | `+N до броні`                         |
| `armorPct`       | `+N% броні`                           |
| `moveSpeedPct`   | `+N% швидкості руху`                  |

### Рівень предмета

`ilvl = monster.level + (depth − 1)`. `level` — нове поле в `monsters.json`: скелет 1, зомбі 2,
некро-воїн 3. `depth` зараз 1 (`config.DEPTH`), пізніше — рівень підземелля. Тири афіксів відкриваються на
`ilvl` 1 / 3 / 6, тож зараз доступні тири 1–2, а тир 3 чекає глибших рівнів.

### Генерація (усе на сідованому `mulberry32` забігу, порядок ролів фіксований)

1. **База:** зважений вибір серед баз з `qlvl ≤ ilvl` (вага з бази).
2. **Рідкість:** зважений вибір за `_rarity` у `loot.json` (common 60, magic 30, rare 9, unique 1).
3. **unique:** зважений вибір серед unique цієї бази з `minIlvl ≤ ilvl`. Немає таких → предмет стає `rare`
   (як у D2). Значення кожного стату — ціле рівномірне в `[min, max]`.
4. **magic:** кількість афіксів 1 або 2 (50/50); при 2 — один префікс + один суфікс; при 1 — префікс чи
   суфікс 50/50.
5. **rare:** 3 або 4 афікси (50/50), максимум 2 префікси й 2 суфікси.
6. **Вибір афікса:** серед афіксів потрібного виду (`prefix`/`suffix`), що підходять за `types` і мають хоч
   один тир з `minIlvl ≤ ilvl`, і чий `group` ще не зайнятий на предметі (без двох `+% шкоди`). Зважено за
   `weight`. Далі тир — рівномірно серед доступних (вищі тири не гарантовані, як у D2, де нижчі тири
   лишаються в пулі). Значення — ціле рівномірне в `[min, max]` тиру.
7. **Назва:**
   - common — назва бази: «Іржавий шолом».
   - magic — «[префікс] база [суфікс]»: «Лютий щербатий тесак Тризни». Префікс-прикметник узгоджується за
     родом бази (`gender`: `m`/`f`/`pl`), тому в префікса три форми. Суфікс — іменник у родовому відмінку,
     узгодження не потребує.
   - rare — два випадкові слова з `rareNames` у `items.json`: іменник + іменник у родовому («Жало Ворона»),
     під назвою на картці — назва бази. Узгодження не потрібне.
   - unique — фіксована назва з `items.json`.

### Мішечок (дроп)

- Тригер той самий, що в золота (001): монстр отримав `Dead`. Спершу рол золота (як зараз), потім предмети:
  `items.rolls` незалежних спроб із шансом `items.chance`; кожна вдала спроба генерує артефакт.
- Усе, що випало з одного монстра, кладеться в **одну** сутність луту (одна на монстра, як купка в 001):
  `gold` + список артефактів. Нічого не випало → нічого не з'являється.
- Візуал: лише золото → стара купка монет 001 (без змін). Є хоч один артефакт → мішечок; відблиск-аура
  кольору найвищої рідкості всередині (common — без аури).
- Позиція, `pickupDelay`, `pickupRadius`, пріоритет кліку (монстр > лут > земля), «лежить вічно» — точно як
  у купки золота (001). Мішечок не зберігається між сесіями (як купки).

### Підбір

- Автопідбір за правилами 001: золото — в гаманець, артефакти — в кінець інвентаря в порядку генерації.
- Інвентар безлімітний: підбір ніколи не відмовляє. Запобіжник — 10 000 предметів; понад це артефакти
  мішечка губляться з попередженням у консоль (не очікується в грі).
- Мертвий герой не підбирає (як у 001).

### Інвентар (список)

- Упорядкований список артефактів героя, без позицій і слотів. Новий — у кінець.
- Окремо від сітки 10×4 з фічі 004: її клітинки в цій фічі показують список (див. «Що бачить гравець»),
  але координати предметам не призначаються.
- Збереження — див. відкриті питання (рекомендація: зберігати поруч із золотом).

### Крайові випадки

- Одна база без жодного доступного афікса потрібного виду (напр. суфікс лише для чобіт) → рол пропускається,
  предмет може вийти magic з одним афіксом або rare з трьома; rare, якому не вистачило навіть 3 → лишається
  з тим, що набрав (мінімум 1), інакше стає common.
- Дублікати unique дозволені.
- Таблиці даних змінились після збереження і `base`/`unique`/`affix` зник → предмет пропускається при
  завантаженні з попередженням у консоль.

## Дані

**`public/assets/data/monsters.json`** — нове поле `level` (1 / 2 / 3).

**`public/assets/data/loot.json`** — `_rarity` і `items` у монстрів (місце вже зарезервоване в 001):

```json
{
  "_pickup": { "pickupDelay": 2, "pickupRadius": 0.6 },
  "_rarity": { "common": 60, "magic": 30, "rare": 9, "unique": 1 },
  "skeleton": {
    "gold": { "chance": 0.4, "base": 4, "spread": 0.5 },
    "items": { "rolls": 1, "chance": 0.08 }
  },
  "zombie": {
    "gold": { "chance": 0.5, "base": 6, "spread": 0.4 },
    "items": { "rolls": 1, "chance": 0.12 }
  },
  "necro_warrior": {
    "gold": { "chance": 0.6, "base": 10, "spread": 0.3 },
    "items": { "rolls": 2, "chance": 0.12 }
  }
}
```

Пул баз спільний (без `pool` на монстра, як було в чернетці 001) — менше даних, рівень уже обмежує бази.

**`public/assets/data/items.json`** — бази, unique, слова назв rare:

```json
{
  "bases": [
    {
      "id": "notched_cleaver",
      "name": "Щербатий тесак",
      "gender": "m",
      "type": "weapon1h",
      "qlvl": 1,
      "weight": 10,
      "damage": [3, 7],
      "icon": "item_notched_cleaver"
    },
    {
      "id": "rusted_helm",
      "name": "Іржавий шолом",
      "gender": "m",
      "type": "helm",
      "qlvl": 1,
      "weight": 10,
      "armor": 3,
      "icon": "item_rusted_helm"
    }
  ],
  "uniques": [
    {
      "id": "ashen_oath",
      "name": "Попелиста Присяга",
      "base": "headsman_sword",
      "minIlvl": 3,
      "weight": 1,
      "stats": [
        { "stat": "damagePct", "min": 40, "max": 60 },
        { "stat": "lifeOnKill", "min": 4, "max": 6 }
      ],
      "flavor": "Клинок, яким стинали клятвопорушників, досі пам'ятає кожне ім'я.",
      "icon": "unique_ashen_oath"
    }
  ],
  "rareNames": {
    "first": [
      "Жало",
      "Шепіт",
      "Тінь",
      "Плач",
      "Шрам",
      "Вирок",
      "Іскра",
      "Обітниця",
      "Кайдани",
      "Ікло"
    ],
    "second": [
      "Ворона",
      "Могили",
      "Попелу",
      "Згарища",
      "Чуми",
      "Смерку",
      "Відьми",
      "Каплиці",
      "Безодні",
      "Вовкулаки"
    ]
  }
}
```

**`public/assets/data/affixes.json`**:

```json
[
  {
    "id": "cruel",
    "kind": "prefix",
    "group": "damagePct",
    "stat": "damagePct",
    "weight": 10,
    "types": ["weapon1h", "weapon2h"],
    "names": { "m": "Лютий", "f": "Люта", "pl": "Люті" },
    "tiers": [
      { "minIlvl": 1, "min": 5, "max": 10 },
      { "minIlvl": 3, "min": 11, "max": 20 },
      { "minIlvl": 6, "min": 21, "max": 35 }
    ]
  },
  {
    "id": "of_wake",
    "kind": "suffix",
    "group": "lifeOnKill",
    "stat": "lifeOnKill",
    "weight": 8,
    "types": ["weapon1h", "weapon2h", "gloves", "ring", "amulet"],
    "name": "Тризни",
    "tiers": [
      { "minIlvl": 1, "min": 2, "max": 4 },
      { "minIlvl": 3, "min": 5, "max": 8 }
    ]
  }
]
```

### Стартовий набір

**Бази (20).** Гендер у дужках; стати — `Шкода` для зброї, `Броня` для решти.

| id                 | Назва                   | Тип      | qlvl | Стати      |
| ------------------ | ----------------------- | -------- | ---- | ---------- |
| `notched_cleaver`  | Щербатий тесак (m)      | weapon1h | 1    | шкода 3–7  |
| `grave_sickle`     | Цвинтарний серп (m)     | weapon1h | 1    | шкода 2–8  |
| `bone_mace`        | Кістяна булава (f)      | weapon1h | 2    | шкода 4–7  |
| `war_scythe`       | Бойова коса (f)         | weapon2h | 2    | шкода 6–16 |
| `headsman_sword`   | Катівський меч (m)      | weapon2h | 3    | шкода 9–17 |
| `iron_buckler`     | Залізний баклер (m)     | shield   | 1    | броня 4    |
| `pavise`           | Облуплена павеза (f)    | shield   | 3    | броня 9    |
| `rusted_helm`      | Іржавий шолом (m)       | helm     | 1    | броня 3    |
| `visored_bascinet` | Бацинет із забралом (m) | helm     | 3    | броня 6    |
| `pilgrim_cassock`  | Ряса прочанина (f)      | armor    | 1    | броня 3    |
| `padded_gambeson`  | Стьобаний гамбезон (m)  | armor    | 1    | броня 5    |
| `scale_hauberk`    | Лускатий обладунок (m)  | armor    | 3    | броня 10   |
| `leather_gloves`   | Шкіряні рукавиці (pl)   | gloves   | 1    | броня 1    |
| `chain_gauntlets`  | Кольчужні рукавиці (pl) | gloves   | 2    | броня 3    |
| `rope_girdle`      | Мотузяний пояс (m)      | belt     | 1    | броня 1    |
| `riveted_belt`     | Окутий пояс (m)         | belt     | 2    | броня 2    |
| `worn_boots`       | Стоптані чоботи (pl)    | boots    | 1    | броня 1    |
| `iron_shod_boots`  | Окуті чоботи (pl)       | boots    | 2    | броня 3    |
| `iron_band`        | Залізний перстень (m)   | ring     | 1    | —          |
| `fang_charm`       | Оберіг з ікла (m)       | amulet   | 1    | —          |

Ваги: `qlvl 1` — 10, `qlvl 2` — 7, `qlvl 3` — 5; кільце й амулет — 6.

**Префікси (7)** — прикметник у формах `m / f / pl`; тири на `ilvl` 1 / 3 / 6.

| id         | Форми                        | stat           | Типи                                          | Тири               |
| ---------- | ---------------------------- | -------------- | --------------------------------------------- | ------------------ |
| `cruel`    | Лютий / Люта / Люті          | damagePct      | зброя                                         | 5–10, 11–20, 21–35 |
| `jagged`   | Зазубрений / -а / -і         | damage         | зброя, рукавиці, кільце                       | 1–2, 3–4, 5–7      |
| `hasty`    | Квапливий / -а / -і          | attackSpeedPct | зброя, рукавиці                               | 5–8, 9–14          |
| `sturdy`   | Міцний / Міцна / Міцні       | armor          | щит, шолом, обладунок, рукавиці, пояс, чоботи | 2–4, 5–8, 9–14     |
| `hallowed` | Освячений / -а / -і          | armorPct       | щит, шолом, обладунок                         | 10–20, 21–35       |
| `ghoulish` | Упирячий / Упиряча / Упирячі | lifeSteal      | зброя, кільце, амулет (`minIlvl` 3)           | 2–3, 4–6           |
| `stalwart` | Живучий / Живуча / Живучі    | life           | усе, крім зброї                               | 5–10, 11–20, 21–35 |

**Суфікси (6)** — іменник у родовому, без узгодження.

| id           | Назва            | stat           | Типи                                   | Тири               |
| ------------ | ---------------- | -------------- | -------------------------------------- | ------------------ |
| `of_marrow`  | Кісткового Мозку | life           | обладунок, пояс, кільце, амулет, шолом | 5–10, 11–20, 21–35 |
| `of_wrath`   | Гніву            | damage         | зброя, кільце, амулет                  | 1–3, 4–6           |
| `of_wake`    | Тризни           | lifeOnKill     | зброя, рукавиці, кільце, амулет        | 2–4, 5–8           |
| `of_flight`  | Втечі            | moveSpeedPct   | чоботи                                 | 5–10, 11–15        |
| `of_vigil`   | Нічної Варти     | armor          | щит, шолом, обладунок, пояс            | 2–4, 5–9           |
| `of_carnage` | Різанини         | attackSpeedPct | зброя, рукавиці, кільце                | 5–8, 9–14          |

Ваги афіксів: 10, крім `ghoulish` і `of_flight` — 5.

**Unique (12).** Значення — діапазони `[min–max]`.

| id                  | Назва                      | База                | minIlvl | Стати                                    | Flavor                                                           |
| ------------------- | -------------------------- | ------------------- | ------- | ---------------------------------------- | ---------------------------------------------------------------- |
| `ashen_oath`        | Попелиста Присяга          | Катівський меч      | 3       | +40–60% шкоди, +4–6 здоров'я за вбивство | Клинок, яким стинали клятвопорушників, досі пам'ятає кожне ім'я. |
| `nameless_sickle`   | Серп Безіменного Цвинтаря  | Цвинтарний серп     | 1       | 3–5% вампіризм, +10–15% швидкості атаки  | Ним косили траву над тими, кого не відспівали.                   |
| `quiet_confession`  | Булава Тихої Сповіді       | Кістяна булава      | 2       | +3–5 до шкоди, +20–30% шкоди             | Кожен удар — питання, на яке не відповідають.                    |
| `bellringer_scythe` | Коса Дзвонаря              | Бойова коса         | 2       | +25–40% шкоди, +10–15 до здоров'я        | Дзвін давно розбитий, а коса все ще відбиває години.             |
| `crucified_pavise`  | Павеза Розіп'ятого Лицаря  | Облуплена павеза    | 3       | +30–45% броні, +15–25 до здоров'я        | Цвяхи з неї так ніхто й не витяг.                                |
| `hollow_sockets`    | Шолом Порожніх Очниць      | Іржавий шолом       | 1       | +4–6 до броні, +2–3 здоров'я за вбивство | Під забралом — лише темрява, що дивиться у відповідь.            |
| `silent_abbot`      | Корона Мовчазного Абата    | Бацинет із забралом | 3       | +20–30 до здоров'я, +20–30% броні        | Він дав обітницю мовчання. Шолом її дотримує.                    |
| `last_pilgrim`      | Саван Останнього Прочанина | Ряса прочанина      | 1       | +15–25 до здоров'я, +5–8% швидкості руху | Дорога скінчилась. Прочанин — ні.                                |
| `bellringer_hands`  | Пальці Дзвонаря            | Кольчужні рукавиці  | 2       | +15–20% швидкості атаки, +2–3 до шкоди   | Руки пам'ятають ритм, якого вже ніхто не чує.                    |
| `penitent_chain`    | Ланцюг Покутника           | Окутий пояс         | 2       | +20–30 до здоров'я, +4–6 до броні        | Важчає з кожним гріхом, що його носять.                          |
| `ash_trail`         | Сліди Попелу               | Окуті чоботи        | 2       | +15–20% швидкості руху, +3–5 до броні    | Там, де він пройшов, більше нічого не росте.                     |
| `black_candle`      | Перстень Чорної Свічі      | Залізний перстень   | 2       | 2–4% вампіризм, +10–15% шкоди            | Горить лише в темряві й лише для мертвих.                        |

Примітка: `bellringer_scythe` і `bellringer_hands` — тематична пара без set-бонусу.

## Що бачить гравець

**На землі.** Мішечок — placeholder: коричневий ромбик із «зав'язкою» і кольоровою аурою рідкості
(magic `#6f8fd0`, rare `#d9a441`, unique `#c0392b`, пульсація 1.5 с). Поки діє `pickupDelay` — притемнений,
як купка 001. Наведення — підпис «Мішечок: 12 золота, 2 артефакти» (колір — найвища рідкість).

**Підбір.** Мішечок зникає, золото в HUD росте. Ліворуч знизу над HUD — журнал знахідок: рядок на кожен
артефакт «Знайдено: Попелиста Присяга» кольором рідкості, живе 4 с і згасає, максимум 5 рядків
(placeholder — Pixi Text).

**Інвентар (вікно 004).** Сітка рюкзака показує артефакти в порядку підбору: клітинка = іконка
(placeholder — кольоровий квадрат з першою літерою типу), рамка клітинки тоне кольором рідкості. Якщо
предметів більше за 40 — рядки додаються, смуга рюкзака прокручується колесом. Порожні клітинки — як зараз.
Наведення на клітинку з предметом → картка артефакту поруч із курсором.

**Картка артефакту (за референсом).** Ширина 300 дизайн-px, висота за вмістом, фон — `parchment.png`
(вже є), тонка кам'яно-бронзова рамка з кутовими орнаментами (`card_frame`, 9-slice). Згори вниз:

1. Іконка 64×64 (арт 128×128) у тонкій кам'яній квадратній рамці (`card_icon_frame`), по центру.
2. Назва — жирний засічковий шрифт, по центру, колір рідкості (темні чорнила, читаються на пергаменті):
   common `#2a2118`, magic `#2c3f73`, rare `#7a5410`, unique `#7a1c14`.
3. Rare — під назвою назва бази тим самим кольором, звичайною вагою.
4. Підрядок курсивом, приглушений: «Чарівний артефакт · рівень 5» (Звичайний / Чарівний / Рідкісний /
   Унікальний).
5. Тип і базові стати: «Дворучна зброя», «Шкода: 9–17» / «Броня: 6».
6. Тонкий орнаментальний розділювач, далі рядки афіксів звичайним текстом (як опис у референсі), кольором
   `#2c3f73` для magic/rare/unique.
7. Unique — flavor курсивом унизу, колір `#5a2a1e`.

Без анімацій, крім fade 100 мс. Картка не виходить за межі екрана (зсувається від курсора).

## Візуал і ассети

**Арт-дирекшен.** Іконки — як мальовані мініатюри старого бестіарію: один предмет, фронтально з легким
нахилом, тепле світло згори ліворуч, приглушена охра, умбра, потемніле залізо, бронза, кістка, вицвіла
тканина. Предмети зношені й «прожиті»: щерби, іржа, засохла кров, воскові патьоки, ремінці, нитки. Магічні
акценти (тьмяне світіння) — лише в unique, і стримано: один колір, не неон. Звичайні бази — без світіння.
Силует має читатися в 64 px: великий центральний об'єм, без тонких деталей по краях. Сирі генерації —
`art/concepts/ui/items/` на magenta-фоні (для `tools/uiArt.ts`), вихід 128×128 PNG у
`public/assets/ui/items/`. Мішечок на землі — ізометричний спрайт, фон зелений (`tools/keyCutout.ts`).

**Шаблон промпту іконки** (підставити `<subject>` з таблиць нижче):

- +: `single <subject>, game inventory icon, one object centered, slight three-quarter tilt, worn and aged,
soft warm light from top left, subtle grain, flat magenta background, front orthographic view, dark gothic
fantasy, painterly oil illustration, muted earthy palette, dramatic soft lighting, highly detailed, grim
atmosphere`
- −: `cartoon, anime, chibi, pixel art, flat colors, bright saturated, cel shading, modern, sci-fi, text,
watermark, multiple objects, hands, character, frame, border, background scenery, isometric, cropped,
neon glow, gemstones everywhere`

Для unique до позитиву додати `faint <color> magical glow` з колонки «Світіння».

**Бази:**

| Ассет                   | `<subject>`                                                                                   |
| ----------------------- | --------------------------------------------------------------------------------------------- |
| `item_notched_cleaver`  | heavy butcher cleaver with a notched chipped blade, rust stains, leather-wrapped wooden grip  |
| `item_grave_sickle`     | curved iron sickle with a cracked bone handle, dirt and grass stains on the blade             |
| `item_bone_mace`        | short war mace with a head made of fused yellowed bones bound by iron bands                   |
| `item_war_scythe`       | war scythe with the blade straightened on a long dark ash shaft, iron collar, frayed cloth    |
| `item_headsman_sword`   | broad two-handed headsman's sword with a blunt square tip, plain iron crossguard, dark stains |
| `item_iron_buckler`     | small round iron buckler with dented rim and a central boss, rust patches                     |
| `item_pavise`           | tall rectangular wooden pavise shield with peeling grey paint and iron rim                    |
| `item_rusted_helm`      | open-faced rusted iron kettle helmet with dents and a torn chin strap                         |
| `item_visored_bascinet` | pointed bascinet helmet with a closed snout visor, darkened steel, rivets                     |
| `item_pilgrim_cassock`  | folded coarse brown pilgrim cassock with a rope belt and patched sleeves                      |
| `item_padded_gambeson`  | quilted padded gambeson, dirty off-white linen, frayed stitching                              |
| `item_scale_hauberk`    | scale armor hauberk of overlapping dark iron scales on leather, some scales missing           |
| `item_leather_gloves`   | pair of cracked brown leather gloves with worn fingertips                                     |
| `item_chain_gauntlets`  | pair of chainmail gauntlets with leather cuffs, rusted rings                                  |
| `item_rope_girdle`      | knotted hemp rope girdle with a small iron ring                                               |
| `item_riveted_belt`     | wide leather belt with iron rivets and a heavy square buckle                                  |
| `item_worn_boots`       | pair of worn tall leather boots, mud-caked, soles coming loose                                |
| `item_iron_shod_boots`  | pair of leather boots with iron shin plates and toe caps                                      |
| `item_iron_band`        | plain thick iron ring, pitted surface, dark patina                                            |
| `item_fang_charm`       | amulet made of a large beast fang on a braided leather cord with small bone beads             |

**Unique:**

| Ассет                      | `<subject>`                                                                                                | Світіння              |
| -------------------------- | ---------------------------------------------------------------------------------------------------------- | --------------------- |
| `unique_ashen_oath`        | two-handed headsman's sword with ash-grey blade, names scratched along the fuller, black cloth on the grip | dim ember orange      |
| `unique_nameless_sickle`   | blackened sickle with a handle of a human forearm bone, tiny unmarked grave tag on a cord                  | pale sickly green     |
| `unique_quiet_confession`  | bone mace with a rosary of dark beads wound around the head, wax drips                                     | faint candle yellow   |
| `unique_bellringer_scythe` | war scythe with a small cracked bronze bell tied below the blade                                           | dull bronze           |
| `unique_crucified_pavise`  | tall pavise shield with old iron nails driven through it in a cross pattern, faded blood-red paint         | dim crimson           |
| `unique_hollow_sockets`    | rusted helmet whose eye slits show only deep darkness inside                                               | cold void violet      |
| `unique_silent_abbot`      | bascinet helmet with a monk's hood fused to the steel and the visor sealed with lead                       | faint ash white       |
| `unique_last_pilgrim`      | tattered pilgrim cassock folded like a burial shroud, a cockle-less tin badge pinned to it                 | pale moonlight        |
| `unique_bellringer_hands`  | chainmail gauntlets with frayed bell rope wound around the wrists                                          | dull bronze           |
| `unique_penitent_chain`    | belt made of heavy iron chain links with a small padlock                                                   | dim crimson           |
| `unique_ash_trail`         | iron-shod boots covered in grey ash, soles smouldering                                                     | dim ember orange      |
| `unique_black_candle`      | iron ring with a tiny black wax candle stub set in place of a stone                                        | faint cold blue flame |

**Мішечок і UI:**

- **`loot_sack`** (світ, 128×128 2×)
  - +: `small tied leather loot pouch lying on the ground, worn stitched hide, drawstring, a few tarnished
coins spilling out, dirty snow flecks, soft shadow, isolated on flat green background, dark gothic fantasy,
pre-rendered 2D sprite, painterly oil illustration, muted earthy palette, dramatic soft lighting,
isometric 30 degree view, highly detailed, grim atmosphere`
  - −: базовий негатив + `, green objects, chest, bag of money with dollar sign, glowing, hand, ground texture`
- **`fx_loot_aura`** (4–6 кадрів, тонується в коді за рідкістю)
  - +: `soft round column of faint light rising from the ground, dim haze, subtle, isolated on pure black
background, painterly oil illustration, dark gothic fantasy`
  - −: базовий негатив + `, lens flare, rainbow, objects, beam to sky`
- **`card_frame`** (9-slice, 600×600 2×)
  - +: `thin ornamental border frame for a parchment card, weathered grey stone strips with darkened bronze
corner ornaments of original gothic interlace, empty transparent inner area, flat magenta background,
front orthographic view, dark gothic fantasy, painterly oil illustration, muted earthy palette, soft
lighting from top left, highly detailed`
  - −: базовий негатив + `, parchment inside, symbols, letters, heraldry, perspective, thick frame`
- **`card_icon_frame`** (160×160 2×)
  - +: `thin square frame of carved weathered stone with small bronze corner studs, empty transparent center,
flat magenta background, front orthographic view, painterly oil illustration, muted earthy palette, soft
lighting from top left, highly detailed`
  - −: базовий негатив + `, object inside, gem, circle, perspective, thick border`
- **`card_divider`** (520×24 2×)
  - +: `thin horizontal ornamental divider line, dark bronze ink flourish with a small central knot, flat
magenta background, front orthographic view, painterly, muted earthy palette`
  - −: базовий негатив + `, letters, symbols, color`

## Поза скоупом

- Розміщення в сітці й слотах, drag&drop, екіпірування й вплив на стати (`StatCalc`).
- Викидання, продаж, знищення, сортування, фільтри, сховище.
- Set-предмети, сокети, міцність, ідентифікація, вимоги до рівня/статів, порівняння з одягненим.
- Розкидання предметів по землі (D-стиль), підбір предметів кліком, лут зі скринь.
- Кілька мішечків з монстра, елітні монстри з бонусним лутом, Magic Find.
- Звуки мішечка й картки; журнал знахідок як окреме вікно.

## Відкриті питання

1. **Екіпірування й вплив на стати.**
   A) Поза скоупом — робимо разом із розміщенням у наступній фічі (рекомендація: інакше доведеться робити
   тимчасовий UI вибору слота).
   B) Мінімально зараз: клік по артефакту в списку одягає його у перший вільний підходящий слот, стати через
   `StatCalc`.
2. **Збереження інвентаря між сесіями.**
   A) Зберігати список предметів через `save/Storage.ts` поруч із золотом (ключ `nevendaar.inventory`) —
   рекомендація, бо золото вже зберігається, і втрата луту при перезавантаженні дратуватиме.
   B) Не зберігати до пункту 6 віхи (IndexedDB).
3. **Мішечок vs купка золота.**
   A) Один об'єкт луту на монстра: лише золото → купка монет 001, є артефакт → мішечок (рекомендація: видно
   цінний дроп здалеку).
   B) Завжди мішечок, навіть із самим золотом — купки 001 прибираємо.
4. **Як показати безлімітний список у вікні 004.**
   A) Сітка рюкзака 10 колонок, рядки додаються, прокрутка колесом; позиції не зберігаються (рекомендація:
   менше переробки, наступна фіча просто «закріпить» позиції).
   B) Замість сітки — вертикальний список рядків «іконка + назва кольором рідкості» з прокруткою.
5. **Звідки рівень предмета.**
   A) Нове поле `level` у `monsters.json` (рекомендація: рівень — властивість монстра, знадобиться для
   досвіду й шкоди).
   B) Поле `ilvl` у записі монстра в `loot.json` — лише для луту.
6. **Підпис «(Артефакт)» як у референсі.**
   A) Окремим підрядком «Рідкісний артефакт · рівень 5» (рекомендація: назва коротша, рідкість читається).
   B) Прямо в назві: «Попелиста Присяга (Артефакт)», рідкість — лише кольором.

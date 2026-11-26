# Арт бічної панелі HUD — геймдизайн

## Ідея

Редизайн правої бічної панелі за `reference.png`: процедурне оформлення (Pixi Graphics) замінюється
згенерованими растровими текстурами — рама й тло з темного різьбленого каменю та бронзи, рамки мінікарти й
портрета, кругла «циферблатна» композиція кнопок унизу, кнопки-медальйони зі станами. Механіка, склад і
розкладка панелі з фічі `002-side-panel-hud` не змінюються.

**Оригінальність (`AGENTS.md` §1).** Від референсу беремо лише стиль: вертикальну композицію (корона →
темне вікно мапи → ряд кнопок → портрет + пергамент → циферблат із самоцвітом → фініал), матеріали
(потемніла бронза, сіро-коричневий камінь, кістяна слонова кістка), палітру й настрій. Не копіюємо
конкретних деталей: барельєфних фігур, іконок, орнаментів, самоцвітів, пропорцій окремих елементів. Кожен
ассет генерується з нуля за текстовим описом. Перед комітом ассет перевіряємо поруч із референсом: жодна
деталь не має збігатися 1:1.

## Як це в серії Diablo

- **D1:** важка нижня кам'яна панель, ~30 % екрана. Сфери здоров'я й мани — скляні посудини, які тримають
  кам'яні демони. Кнопки — вдавлені кам'яні таблички. Панель сприймається як фізичний предмет із
  каменю й заліза, тобто як частина світу.
- **D2:** та сама ідея, але тонша: камінь із бронзовими/золотими накладками, сфери в постаментах зі
  статуями ангела й демона, мініпанель — дрібні кнопки в металевих рамках. У D2R текстури перемальовані в
  HD у тому ж стилі; гравці це хвалили.
- **D3:** нижня смуга з металу й шкіри, сфери тримають крилаті фігури. Слоти навичок — темні вдавлені
  квадрати в бронзових рамках. Палітру критикували як надто яскраву й «мультяшну» для серії.
- **D4:** повернення до темного готичного металу й каменю, але HUD мінімальний і плаский. Гравці лаяли
  його за «бідність» і дрібні елементи на тлі старих частин.
- **Висновки:**
  - Беремо: панель як фізичний предмет із каменю й бронзи; одне джерело світла (зверху ліворуч) для всіх
    деталей; кнопки — окремі медальйони, що «сидять» у поглибленнях; сфера здоров'я — скляна посудина з
    рідиною всередині оправи; темні вдавлені вікна для мапи й портрета.
  - Відкидаємо: великі скульптури, що з'їдають площу (у нас ширина фіксована, 200 px); яскраву палітру D3;
    пласкість D4.

## Як це працює в Nevendaar

**Що не змінюється.** Блоки та їхні висоти (`PanelLayout.ts`: `crown 80`, `minimap 160`, `row 64`,
`column` тягнеться, `portrait 112`, `depth 32`, `ring 176`, `finial 40`), масштаб `clamp(h/800, 0.7, 1.4)`,
координати й радіуси медальйонів, хітбокси (кола), тултіпи, поглинання вводу, мінікарта, рідина самоцвіта,
тексти (ім'я, здоров'я, золото, глибина) як `Text`.

**Що змінюється.** Усе, що зараз малюється через `Graphics` як декор, стає спрайтами з текстур:

| Шар (знизу вгору)      | Звідки                                                     | Як тягнеться                                                                                                                                                                      |
| ---------------------- | ---------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Тло — кам'яна текстура | `panel_stone`                                              | тайлиться (TilingSprite) на всю висоту екрана                                                                                                                                     |
| Бічні молдинги         | `panel_edge` (лівий), той самий з `scale.x = −1` (правий)  | розтягується по вертикалі; візерунок однаковий уздовж Y, тож розтяг непомітний                                                                                                    |
| Пояси між блоками      | `panel_band`                                               | фіксований, на межі кожного блоку + низ (як `band()` зараз)                                                                                                                       |
| Декор блоків           | `panel_crown`, `panel_dial`, `panel_finial`, `panel_depth` | фіксовані, у своїх блоках                                                                                                                                                         |
| Ніша-колона            | `panel_niche`                                              | 9-slice (NineSliceSprite): бічні й кутові частини фіксовані, середина — вертикальні канелюри, однакові вздовж Y, тягнеться лише по висоті; ховається при `columnH ≤ 24`, як зараз |
| Рамки вікон            | `frame_minimap`, `frame_portrait`, `gem_mount`             | фіксовані; вікно всередині прозоре, вміст (мапа, герой, рідина) лежить під рамкою                                                                                                 |
| Пергамент              | `parchment`                                                | фіксований                                                                                                                                                                        |
| Медальйони             | `medallion_*` + `icon_*`                                   | одна підкладка, масштабується до радіуса кнопки; іконка — окремий спрайт поверх                                                                                                   |

**Чому без вбудованих гнізд у плитах.** Згенерований арт ніколи не влучить точно в координати кнопок. Тож
плити й циферблат генеруються без гнізд, а «поглиблення» запечене в саму підкладку медальйона (темне
кільце тіні по зовнішньому краю). Медальйон тоді виглядає вбудованим будь-де, і координати з `Hud.ts` не
змінюються. Вікна мапи й портрета — окремі рамки, які код ставить точно.

**Медальйон: підкладка + іконка.**

- Підкладка `medallion_*` — квадрат 64×64 дизайн-px. Кільце займає радіус 30, решта — запас під тінь
  поглиблення. Масштаб = `size / 30`, тож одна текстура обслуговує всі радіуси (11, 19, 21, 22, 28).
- Іконка — квадрат 40×40 дизайн-px, світла слонова кістка, масштаб = `(size · 0.9) / 20`, центр збігається
  з центром медальйона. Пустий слот (ПКМ) — без іконки.
- Бейдж пояса (цифра 1–4) і цифра глибини лишаються `Text`.

**Стани кнопок** (логіка як у `Medallion.ts`, міняється лише текстура/тинт):

| Стан      | Коли                                    | Вигляд                                                                                                              |
| --------- | --------------------------------------- | ------------------------------------------------------------------------------------------------------------------- |
| normal    | спокій                                  | `medallion_normal`, іконка 100 %                                                                                    |
| hover     | курсор над робочою кнопкою чи заглушкою | `medallion_hover`: кільце світліше, з теплим золотим відблиском по краю                                             |
| pressed   | затиснуто                               | `medallion_pressed`: темніше, з внутрішньою тінню; підкладка й іконка зсуваються на 1 px вниз                       |
| disabled  | заглушка (`stub`)                       | `medallion_disabled`: знебарвлена сіра патина; іконка 45 % альфа; hover усе одно показує тултіп і `medallion_hover` |
| indicator | ЛКМ-слот                                | як normal, без hover і pressed                                                                                      |

Підкладку генеруємо **один раз** (normal). Інші три стани виводяться з неї детерміновано скриптом у `tools/`
(яскравість, теплий тинт, насиченість, внутрішня тінь), щоб усі чотири були піксель у піксель однієї форми
(див. відкрите питання 2).

**Самоцвіт здоров'я.** Рідина й рівень — як зараз (процедурна заливка під маскою кола r 30). Растрова лише
оправа `gem_mount` (бронзовий безель із 4 пазурами) поверх рідини. Відблиск скла — частина оправи
(напівпрозорий блік у верхній лівій чверті вікна) або лишається процедурним, якщо після вирізання блік
погано тримає альфу.

**Крайові випадки.**

- Масштаб 0.7: текстури 2× зменшуються в ~2.9 раза, тож для UI-текстур потрібні міпмапи, інакше дрібні
  деталі мерехтять.
- Масштаб 1.4 на екрані з DPR 2 дає 2.8 фізичних px на дизайн-px: 2× трохи збільшується. Для мальованого
  стилю це прийнятно; 3× подвоїть вагу без помітної різниці.
- Дуже низьке вікно: низ обрізається, як і зараз; ніша не малюється при `columnH ≤ 24`.
- Повноекранна кнопка міняє іконку `icon_fullscreen` ↔ `icon_collapse`.

## Дані

Нових ігрових JSON не потрібно: це UI, а не ігрові дані. Ассети:

- Сирі генерації — `art/concepts/ui/panel/` (поза git).
- Готові PNG — `public/assets/atlases/ui/`, далі пакуються одним атласом `ui_panel` через
  `tools/pack_atlas.ts` (рішення за `tech-planner`). Камінь — окремий файл, бо тайлиться.
- Ціль за вагою: увесь набір ≤ 1.5 МБ.

**Перелік ассетів.** Розміри в дизайн-px і у файлі (2×). «Ключ» — фон для `tools/keyCutout.ts`. Скрізь
`magenta`: у бронзі й камені є оливкові відтінки, які зелений ключ з'їсть.

| Файл                                             | Дизайн-px | Файл, px | Генерація (aspect)   | Обробка                             | Де стоїть (дизайн-px, у блоці)                                        |
| ------------------------------------------------ | --------- | -------- | -------------------- | ----------------------------------- | --------------------------------------------------------------------- |
| `panel_stone.png`                                | 128×128   | 256×256  | 1:1                  | без ключа → `tools/seamless.ts` 256 | тло всієї панелі, тайл                                                |
| `panel_edge.png`                                 | 14×200    | 28×400   | 9:16, вирізати смугу | magenta                             | x = 0 і дзеркально біля правого краю, на всю висоту                   |
| `panel_band.png`                                 | 200×14    | 400×28   | 16:9, вирізати смугу | magenta                             | центр на межі кожного блоку                                           |
| `panel_crown.png`                                | 200×80    | 400×160  | 16:9                 | magenta                             | `crown`, (0, 0); стрілчаста арка за центральним медальйоном (100, 40) |
| `frame_minimap.png`                              | 176×136   | 352×272  | 4:3                  | magenta, вікно прозоре              | `minimap`, (12, 2); вікно 160×120 — точно (20, 10)                    |
| `panel_niche.png`                                | 148×96    | 296×192  | 3:4 → кадрувати      | magenta                             | `column`, x = 26; 9-slice: ліво/право 16, верх/низ 28                 |
| `frame_portrait.png`                             | 92×92     | 184×184  | 1:1                  | magenta, вікно прозоре              | `portrait`, (6, 10); вікно 76×76 — точно (14, 18)                     |
| `parchment.png`                                  | 90×80     | 180×160  | 4:3                  | magenta (обпалений край)            | `portrait`, (100, 16)                                                 |
| `panel_depth.png`                                | 200×32    | 400×64   | 16:9 → кадрувати     | magenta                             | `depth`, (0, 0); емалевий диск r 10 у (100, 16) під цифрою            |
| `panel_dial.png`                                 | 176×176   | 352×352  | 1:1                  | magenta                             | `ring`, центр (100, 88): диск r 85, жолоб орбіти r 62                 |
| `gem_mount.png`                                  | 84×84     | 168×168  | 1:1                  | magenta, вікно r 30 прозоре         | `ring`, центр (100, 88)                                               |
| `panel_finial.png`                               | 200×40    | 400×80   | 16:9 → кадрувати     | magenta                             | `finial`, (0, 0)                                                      |
| `medallion_normal.png`                           | 64×64     | 128×128  | 1:1                  | magenta                             | кожен медальйон, масштаб `size/30`                                    |
| `medallion_hover.png` / `_pressed` / `_disabled` | 64×64     | 128×128  | —                    | виводяться з `normal` скриптом      | —                                                                     |
| `icon_{name}.png` × 11                           | 40×40     | 80×80    | 1:1                  | magenta                             | центр медальйона                                                      |

Іконки (`name`): `menu`, `bell` (звук), `fullscreen`, `collapse`, `helmet` (персонаж), `sack` (інвентар),
`book` (навички), `scroll` (журнал), `compass` (велика карта), `flask` (пояс), `sword` (ЛКМ).

**Обробка після `keyCutout`.** Скрипт обрізає прозорі поля й масштабує за шириною, тож висота може не
збігтися з цільовою. Для рамок і блоків потрібен фінальний крок «вписати в точний розмір із прозорими
полями, по центру». Для рамок мапи й портрета прозоре вікно має лягти на свої координати: генерувати з
вікном по центру, а потім вирівняти за межами вікна.

## Що бачить гравець

- Та сама панель і ті самі кнопки на тих самих місцях, але мальовані: потріскана сіро-коричнева кам'яна
  плита, обабіч бронзові молдинги, між блоками — залізні пояси з заклепками й маленькими ромбиками тьмяного
  золота.
- Угорі — корона зі стрілчастою аркою й шипами, у ній три медальйони.
- Чорне вікно мінікарти в масивній бронзовій рамці з накладками на кутах.
- Ряд із чотирьох медальйонів; під ним ніша з вертикальними канелюрами, яка тягнеться по висоті.
- Портрет героя у квадратній різьбленій рамці, поруч жовтуватий пергамент з обпаленим краєм.
- Унизу — кам'яний диск-«циферблат» із жолобом, на ньому шість медальйонів, у центрі гранатовий самоцвіт у
  пазуристій оправі, рідина всередині падає з утратою здоров'я. Над циферблатом — кругла табличка глибини.
- Наведення: кільце медальйона теплішає й світлішає. Натискання: медальйон темніє й осідає на 1 px.
  Заглушки — сіра знебарвлена патина з притемненою іконкою.
- Тултіп поки процедурний (див. «Поза скоупом»).

## Візуал і ассети

**Арт-дирекшен.**

- Матеріали: потемніла бронза-гарматний метал із зеленкувато-коричневою патиною в заглибинах; сіро-коричневий
  вивітрений камінь із тріщинами; кістяно-слонова кістка для іконок; жовтуватий пергамент.
- Орнамент (оригінальний): кручені колючі лози, ребристі кістяні арки, стрілчасті готичні вікна-ажури,
  ланцюгові ланки, дрібні заклепки, ромбики тьмяного золота як акценти. Без людських/звіриних фігур, облич,
  гербів, написів і рун.
- Світло: одне, м'яке, зверху ліворуч; темна оклюзія в заглибинах; ледь помітна зернистість.
- Палітра: камінь `#2a2620`–`#5a5244`, бронза `#6b5a3a`/`#8a7a55`, відблиски `#c8a96a`, іконки `#d8ccae`,
  пергамент `#cfc2a0`, гранат `#7a1010`. Насичене — лише самоцвіт і ромбики.
- Ракурс: UI фронтальний, без ізометрії й перспективи. Усі деталі мають читатися при 0.7× (≈ 140 px
  ширини панелі): великі форми, без дрібного «шуму».

**Як генерувати (Cursor `GenerateImage`).**

- У `GenerateImage` немає окремого поля для негативного промпту, тож негатив дописується в кінець
  опису реченням `Avoid: ...`.
- Порядок: спершу `medallion_normal` і `panel_stone`. Далі вдалі результати передаються в
  `reference_image_paths` наступних генерацій, щоб матеріал і світло були однакові в усьому наборі.
  Чи передавати `reference.png` — відкрите питання 1.
- Кожен ассет — один об'єкт по центру, з полями, на суцільному `#FF00FF` без тіні на фоні (крім
  `panel_stone`).

UI-хвіст (базовий хвіст, у якому ізометрію замінено на фронтальний вигляд):
`dark gothic fantasy, pre-rendered 2D game UI element, painterly oil illustration, muted earthy palette, dramatic soft lighting from top left, flat front view, highly detailed, grim atmosphere`

Фон: `centered, generous empty margins, isolated on a perfectly flat solid magenta #FF00FF background, no shadow on the background`

Базовий негатив:
`Avoid: cartoon, anime, chibi, pixel art, flat colors, bright saturated, cel shading, modern, sci-fi, text, watermark, letters, runes, coat of arms, faces, human figures, perspective, isometric angle, chrome, glossy plastic`

Нижче «+» означає опис + UI-хвіст + фон, «−» — те, що дописується до базового негативу.

- **panel_stone** (1:1, без фону-ключа)
  - +: `seamless texture of dark weathered grey-brown carved stone slab, fine cracks, faint chisel marks, soot stains, subtle grain, evenly lit, no distinct objects, fills the whole frame` + UI-хвіст
  - −: `, borders, frame, vignette, ornaments, bright spots`
- **panel_edge** (9:16)
  - +: `tall vertical bronze molding strip for the side edge of a game panel, parallel grooves and beads running straight top to bottom, identical along its whole length, tarnished gunmetal bronze with greenish patina in grooves`
  - −: `, ornaments that change along length, corners, caps, curves`
- **panel_band** (16:9)
  - +: `long thin horizontal band of dark forged iron with round rivets evenly spaced and one small dull gold rhombus stud in the middle, worn edges`
  - −: `, chain, rope, gems glowing`
- **panel_crown** (16:9)
  - +: `ornate gothic crown piece topping a narrow vertical game side panel, wide and low, dark carved stone with tarnished bronze trim, central pointed arch niche, small thorny spikes and twisted vine tracery along the top edge, empty dark recesses`
  - −: `, buttons, icons, statues, gems glowing, symmetry broken`
- **frame_minimap** (4:3)
  - +: `rectangular heavy frame of tarnished bronze around an empty pure black window, double molding, clawed corner caps with small rivets, worn and scratched, window occupies most of the frame`
  - −: `, map, glass reflection, gems, ornaments inside window`
- **panel_niche** (3:4)
  - +: `tall recessed gothic stone niche with straight vertical fluted grooves inside, rounded bronze-trimmed top and bottom caps, dark shadowed interior, flutes perfectly uniform vertically`
  - −: `, statue, figure, window, arch tracery inside flutes`
- **frame_portrait** (1:1)
  - +: `square heavy gothic picture frame of dark carved stone and tarnished bronze, rivets in corners, thin inner bevel, empty pure black square center`
  - −: `, portrait, person, picture inside, ornate gold`
- **parchment** (4:3)
  - +: `small rectangular sheet of aged yellowed parchment, stains, faint creases, slightly burnt darkened edges, empty, flat front view`
  - −: `, writing, letters, map, seal, ribbon, curled scroll`
- **panel_depth** (16:9)
  - +: `short horizontal iron bar with a small round bronze plaque in the center, the plaque holds a pale ivory enamel disc, empty disc, rivets at bar ends`
  - −: `, numbers, letters, symbols on disc`
- **panel_dial** (1:1)
  - +: `large round carved dark stone disc like an ancient dial, a shallow circular groove ring at two thirds of the radius, faint radial carved ribs like bone, bronze rim around the edge, empty recessed center`
  - −: `, clock hands, numbers, sockets, buttons, gems, zodiac signs`
- **gem_mount** (1:1)
  - +: `round tarnished bronze bezel mount with four curved claws on the diagonals, empty pure black circular hole in the center, engraved rim, small rivets`
  - −: `, gem inside, glow, liquid`
- **panel_finial** (16:9)
  - +: `downward pointing gothic finial ornament closing the bottom of a narrow vertical panel, dark stone and bronze, inverted pointed arch shape, small dull gold rhombus stud at its center`
  - −: `, buttons, statues, glowing gems`
- **medallion_normal** (1:1)
  - +: `single round button medallion, thick tarnished bronze ring with fine engraving and four tiny rivets on the diagonals, smooth dark near-black inner disc, soft dark shadow ring around the outside as if set into stone, viewed straight on`
  - −: `, icon, symbol, letters, coin face, gem, shiny gold, bevel highlight on the disc`
- **icon\_{name}** (1:1, одна генерація на іконку)
  - +: `single embossed icon of <object>, pale bone ivory color with soft shading, bold simple silhouette readable at small size, centered`
  - −: `, multiple objects, frame, ring, disc, background scene, thin details`
  - `<object>`: `menu` — `three horizontal carved bars`; `bell` — `a small bronze-age hand bell`; `fullscreen` — `four corner brackets pointing outward`; `collapse` — `four corner brackets pointing inward`; `helmet` — `a closed knight helm`; `sack` — `a tied leather pouch`; `book` — `an open heavy tome`; `scroll` — `a rolled parchment scroll`; `compass` — `a four-pointed compass rhombus star`; `flask` — `a round-bellied potion flask, empty`; `sword` — `a straight sword pointing up-right`.

## Поза скоупом

- Будь-які зміни механіки, складу кнопок, хоткеїв, розкладки блоків і координат.
- Новий стиль тултіпа (9-slice-табличка), курсора, шрифтів.
- Анімації: пульсація самоцвіта, блиск при наведенні, частинки.
- Растрова рідина самоцвіта, варіанти панелі для біомів, ліва/нижня розкладка.
- Портрет героя як окремий арт (лишається кадр атласу).

## Відкриті питання

1. **`reference.png` як вхід для `GenerateImage`.**
   - А: передавати як референс стилю з приміткою «style only, do not copy elements». Так буде ближче до
     референсу, але вищий ризик повторити його деталі, тож кожен ассет обов'язково звіряти вручну.
   - Б: лише текстові промпти, а консистентність тримати через уже згенеровані наші ассети. Так менше схожості,
     зате ризику копіювання немає.
2. **Стани кнопок.**
   - А: генерувати один `medallion_normal`, а hover / pressed / disabled виводити з нього скриптом у `tools/`
     у три PNG. Форма гарантовано однакова, у рантаймі без фільтрів (запропоновано).
   - Б: одна текстура й тинт/альфа в рантаймі (як зараз `face.tint`). Менше файлів, але hover буде лише
     «світлішим», без золотого відблиску.
3. **Іконки.**
   - А: растрові згенеровані іконки слонової кістки (ближче до референсу).
   - Б: лишити процедурні лінійні іконки з `Medallion.ts`, перефарбовані в слонову кістку, на растровій
     підкладці. Чіткіше на малих радіусах (кнопка Tab, r 11), менше генерацій.
4. **Нарізка тла.**
   - А: модульно — тайл каменю, молдинги, пояси, окремі шматки декору й рамок (запропоновано). Координати
     кнопок і вікон не змінюються, висота панелі будь-яка.
   - Б: дві великі цілісні композиції: верх (`crown` + `minimap` + `row`, 200×304 ≈ 3:4) і низ (`portrait` …
     `finial`, 200×360 ≈ 9:16), між ними 9-slice-ніша. Виглядає цілісніше, як референс, але гнізда й вікна
     запечені в арт, тож координати в `Hud.ts` доведеться підганяти під згенероване.

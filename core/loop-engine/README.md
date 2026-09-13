# Universal Loop Engine · ЦЕХ

Цикл «**контекст → генерация → валидация → фидбек → повтор**» для студии ЦЕХ.
Двигатель ничего не знает ни про сайты, ни про Python, ни про JSON: только три контракта
(`Generator`, `Validator`, `ContextBuilder`) и конфиг.

**Node ≥ 18 · ноль npm-зависимостей · только встроенные модули** (закон цеха из README.md).
Живёт в `core/loop-engine/`, не импортируется сайтом (`src/`), не трогает `scripts/`,
`validators/`, `gates/`, `package.json`, `.github/` и корневой `.gitignore`.

---

## Быстрый старт

```bash
# 1. офлайн-самопроверка движка (без сети и ключей): провал → фидбек → исправление → приёмка
node core/loop-engine/cli.mjs --selftest

# 2. прогон шаблона проекта (по умолчанию generator.type: mock — тоже офлайн)
node projects/_LOOP_TEMPLATE/run.mjs "выдай ES-модуль с функцией hello"
node core/loop-engine/cli.mjs projects/_LOOP_TEMPLATE --dry-run --task "собери hero"

# 3. настоящий прогон с моделью (OpenAI-совместимый эндпоинт)
OPENAI_API_KEY=sk-… node core/loop-engine/cli.mjs projects/<имя> --provider openai --model gpt-4o-mini

# 4. автоприёмка сайта существующими воротами цеха (validate.mjs V-01…V-17 + линтеры)
node core/loop-engine/cli.mjs projects/<имя> --validator ceh_project --checks validate,lint-slop,lint-copy

# 5. тесты самого движка (115 проверок)
node --test core/loop-engine/tests/*.test.mjs
```

Exit code: **0** — артефакт принят валидатором, **1** — цикл не сошёлся.
Отчёт идёт в stdout (коды `L-xx`, `V-xx`, `B-xx`, `E-xx`), служебный лог — в stderr
(`LOOP_ENGINE_LOG=debug|info|warn|error|silent`).

---

## Структура

```text
core/loop-engine/
├── index.mjs              публичный API (barrel)
├── base.mjs               контракты: Artifact, Feedback, LoopState, LoopConfig + ошибки
├── runner.mjs             UniversalLoopRunner: Generate → Validate → Loop
├── context-builder.mjs    StudioContextBuilder: читает архив студии, рендерит фидбек
├── template.mjs           Jinja-подобный рендерер ({{ }}, {% if %}, {% for %}, {# #})
├── config.mjs             загрузка loop.config.yaml/json + свой парсер подмножества YAML
├── registry.mjs           REGISTRY + buildRunnerFromConfig (DI) + loadConfigAndRun + saveResult
├── cli.mjs                точка входа с отчётом в стиле цеха и --selftest
├── logger.mjs             структурный логгер (уровни, stderr)
├── text.mjs               code-fences, извлечение JSON, безопасные пути, обрезка
├── subprocess.mjs         runCommand: shell:false, timeout+SIGKILL, обрезка вывода
├── workspace.mjs          materialize артефакта, манифест записи, копирование tests/
├── generators/
│   ├── llm.mjs            LlmGenerator: openai-совместимый / anthropic / внешний SDK-клиент
│   ├── mock.mjs           MockGenerator: детерминированный офлайн (--dry-run, CI, selftest)
│   └── index.mjs          реестр + createGeneratorFromConfig
├── validators/
│   ├── ceh-project.mjs    ★ прогон scripts/validate.mjs и линтеров (ворота G3/G4, К-09)
│   ├── node-code.mjs      node --check → node --test → smoke
│   ├── python-code.mjs    py_compile → ruff → pytest (опционально, для Python-артефактов)
│   ├── schema.mjs         подмножество JSON Schema (без pydantic/ajv)
│   ├── llm-judge.mjs      вторая модель как арт-директор: {"score","reasoning","fixes"}
│   └── index.mjs          реестр валидаторов
└── tests/                 115 тестов на node:test (без зависимостей)
```

Шаблон проекта — `projects/_LOOP_TEMPLATE/` (копируй в `projects/<имя>/`).

---

## Контракты

```js
// Generator
generate(context: string, state: LoopState) → Artifact | Promise<Artifact>
// Validator
validate(artifact: Artifact, state: LoopState) → Feedback | Promise<Feedback>
// ContextBuilder
build(task: string, state: LoopState, studioRoot: string) → string
```

Типизация — структурная (как `Protocol` в патче): наследование не требуется, достаточно
метода с нужной сигнатурой. Описание типов — в JSDoc `base.mjs`.

```js
Artifact = { content: string | Record<string,string>, metadata: {} }
Feedback = { ok: boolean, errors: string[], codes: string[], raw: any, metrics: {} }
LoopState = { iteration, temperature, history[], taskInput, studioRoot, projectName, workspaceDir }
LoopResult = { ok, artifact, feedback, state, iterations, successIteration, elapsedMs, reason }
```

`content`-карта файлов (`{"site/index.html": "…"}`) позволяет генерировать сайт целиком:
валидатор сам развернёт её в `workspace/` (или в проект — см. предохранитель ниже).

### Ручная сборка без конфига

```js
import {
  UniversalLoopRunner, StudioContextBuilder, LlmGenerator, NodeCodeValidator, createLoopConfig,
} from "./core/loop-engine/index.mjs";

const runner = new UniversalLoopRunner({
  generator: new LlmGenerator({ provider: "openai", model: "gpt-4o-mini", apiKeyEnv: "OPENAI_API_KEY" }),
  validator: new NodeCodeValidator({ studioRoot, projectDir, workspaceDir, entry: "main.mjs" }),
  contextBuilder: new StudioContextBuilder({ studioRoot, projectName: "demo" }),
  config: createLoopConfig({ max_iterations: 5, temperature_schedule: [0.3, 0.1, 0.0] }),
  workspaceDir,
});
const result = await runner.run("собери секцию hero", studioRoot, "demo");
```

---

## Конфиг (`loop.config.yaml`)

Ключи принимаются и в `snake_case`, и в `camelCase`. Полный пример с комментариями —
в `projects/_LOOP_TEMPLATE/loop.config.yaml`. Проверить разбор:

```bash
node core/loop-engine/config.mjs projects/<имя>/loop.config.yaml
```

| Секция | Ключи | Смысл |
| --- | --- | --- |
| `loop` | `max_iterations`, `temperature_schedule`, `stop_on_first_success`, `context_char_limit`, `history_window`, `max_total_seconds`, `persist_iterations`, `throw_on_failure` | бюджет и поведение цикла |
| `generator` | `type` (`mock`/`llm`), `provider` (`openai`/`anthropic`), `model`, `client.{type,api_key_env,base_url}`, `max_tokens`, `timeout_ms`, `max_retries`, `response_format` (`text`/`json`/`files`), `json_mode` | кто генерирует |
| `validator` | `type` (`ceh_project`/`node_code`/`python_code`/`json_schema`/`llm_judge`) + свои ключи | кто принимает |
| `context_builder` | `type`, `include.{mechanics,gates,skills,references,motion,dossier,docs,examples}`, `max_examples`, `max_files_per_section`, `max_chars_per_file`, `max_chars_per_section` | что читаем из архива |
| `output` | `file`, `dir`, `summary_file` | куда сохранять итог |

DI: каждый класс объявляет `static requires = [...]`, фабрика `buildRunnerFromConfig`
инжектит `studioRoot`, `projectName`, `projectDir`, `workspaceDir`, `judge`. Пути из
фабрики имеют приоритет над yaml — конфиг не может увести запись за пределы проекта.

### Валидаторы

| type | что делает | коды |
| --- | --- | --- |
| `ceh_project` | `node scripts/validate.mjs <проект>` + `lint-slop` / `lint-copy` / `lint-marketing` / `lint-contrast` / `typographer` / `lint-style-archetype` / `lint-video-engine`; разбирает отчёты `OK/FAIL V-xx`, `file:line B-xx`, `M-xx` | `V-xx`, `B-xx`, `M-xx`, `E-CHECK-RUN`, `E-WRITE-GUARD` |
| `node_code` | `node --check` → `node --test <файлы>` → smoke-запуск; тесты проекта копируются в `workspace/tests` | `E-SYN`, `E-TEST`, `E-RUN`, `E-NO-TESTS`, `E-TIMEOUT`, `E-PATH` |
| `python_code` | `python3 -m py_compile` → `ruff` → `pytest` (при отсутствии тулза — честный пропуск в `metrics`) | `E-PY-SYN`, `E-PY-LINT`, `E-PY-TEST`, `E-PY-RUN`, `E-PY-MISSING` |
| `json_schema` | подмножество JSON Schema: `type/required/properties/items/enum/pattern/format/$ref/allOf/anyOf/oneOf/not/nullable` | `E-SCHEMA`, `E-SCHEMA-PARSE` |
| `llm_judge` | вторая модель оценивает по рубрике, порог `pass_threshold` | `E-JUDGE-SCORE`, `E-JUDGE-PARSE`, `E-JUDGE-SCHEMA` |

Прочие коды: `E-CTX` (сборка контекста), `E-GEN-*` (ключ/сеть/таймаут/разбор ответа),
`E-VAL`, `E-CONFIG-*`, `E-BUDGET`, `E-LOOP-EXHAUSTED`.

---

## Контекст: что читается из архива

| Секция | Источник в цехе | Аналог в Python-патче |
| --- | --- | --- |
| `mechanics` | `CONSTITUTION.md`, `anti-slop/BANNED.md`, `anti-slop/QUOTAS.md`, `AGENTS.md` | `studio/mechanics/` |
| `gates` | `gates/G1…G4` | — |
| `skills` | `skills/` (индекс первым) | `studio/skills/` |
| `references` | `references/` + `REF-*.meta.yaml` (takeaway) | `studio/examples/` |
| `motion` | `motion/RECIPES.md`, `easing-curves.json`, `recipe.yaml` | — |
| `dossier` | `SEED/DIRECTION/STRUCTURE/SOURCES/MARKETING/COPYWRITING` текущего проекта (`site/` и `workspace/` исключены) | — |
| `docs` | `docs/`, `config/` (по умолчанию выключено) | — |
| `examples` | `projects/_history/` + досье ≤`max_examples` чужих проектов | `studio/examples/` |

Провальная итерация возвращается модели блоком **«ПРЕДЫДУЩАЯ ПОПЫТКА ПРОВАЛЕНА»**:
коды валидатора, предыдущий вывод, список ошибок, сырой вывод. Глубина — `history_window`.

Бюджеты: `max_chars_per_file` → `max_chars_per_section` → `context_char_limit`.
При переполнении режутся хвостовые секции (examples первыми, **mechanics последними**).
Каталоги обходятся с ограничением глубины, `node_modules/.git/dist/workspace` пропускаются,
чтение кэшируется в экземпляре (не глобально).

---

## Безопасность и гарантии

- **Ноль новых зависимостей.** LLM вызывается встроенным `fetch`; YAML парсится своим
  парсером; JSON Schema — своя реализация подмножества. `package.json` не изменён.
- **Сайт не затронут.** `core/` не импортируется из `src/`, `tsconfig.include = ["src"]`,
  сборка `vite build` даёт байт-в-байт те же chunk'и, что и до внедрения.
- **Существующие скрипты не меняются.** `scripts/*.mjs` вызываются отдельным процессом
  (`shell: false`, аргументы массивом → инъекция команд невозможна), с `timeout` и `SIGKILL`.
- **Запись только в `workspace/`.** Все пути артефакта проходят `safeResolveInside`:
  `../../…` и абсолютные пути отклоняются (`E-PATH`).
- **Предохранитель проекта.** При `validator.materialize_target: project` движок отказывается
  писать в `projects/<имя>/`, пока явно не выставлен `allow_project_writes: true` (`E-WRITE-GUARD`).
  Принятые проекты нельзя испортить случайным прогоном.
- **Ключи не логируются.** API-ключ читается из переменной окружения (`api_key_env`),
  в отчётах и `describe()` — только флаг `apiKeyPresent`.
- **Вложенные тесты не глохнут.** `NODE_TEST_CONTEXT` вычищается из окружения дочерних
  процессов, иначе `node --test` под раннером возвращал бы пустой stdout и ложный вердикт.

---

## Отличия от исходного Python-патча

Патч был написан под репозиторий с каталогом `studio/` и Python-стеком; здесь корень
репозитория и есть студия, а стек — Node/ESM. Поэтому структура перенесена 1:1 по смыслу,
а не по буквам. Заодно исправлены дефекты, из-за которых код патча не запускался:

| № | Было в патче | Стало |
| --- | --- | --- |
| 1 | `read_text() if exists() << "DEFAULT TEMPLATE MISSING"` — **SyntaxError** | корректный дефолт + `ConfigError` со списком доступных типов |
| 2 | шаблон в Jinja (`{{ task }}`), рендер через `str.format()` → `KeyError` на CSS/JSON | свой рендерер `template.mjs`: `{{ }}`, `{% if %}`, `{% for %}`, `{# #}`, `{var}` — неизвестное не роняет сборку |
| 3 | температура читалась из метаданных **предыдущего** артефакта → сдвиг на итерацию | `state.temperature` ставит раннер по расписанию до вызова генератора |
| 4 | `stop_on_first_success` игнорировался | учитывается; при `false` прогон продолжается, возвращается успешный артефакт |
| 5 | `functools.lru_cache` на методе экземпляра (ключ с `self`, неограниченный рост) | кэш в `Map` экземпляра с лимитом и FIFO-выбросом + `clearCache()` |
| 6 | `schema.py`: ветка пути не создавала `_schema_dict` → `AttributeError` | ленивый `loadSchema()` для объекта/пути/класса, ошибки с кодами |
| 7 | `run.py`: `sys.path.insert(studio/)` + `import studio.core…` — несовместимые пути | ESM-импорт по относительному пути, корень вычисляется от файла |
| 8 | тесты искались в `workspace/`, а шаблон клал их в `tests/` → тесты не запускались | `tests/` копируются в `workspace/tests`, передаются файлами (Node ≥22 не принимает каталог в `--test`) |
| 9 | `raise RuntimeError` при исчерпании итераций | `LoopResult{ok:false}` + `exit 1` (правило цеха: отчёт, а не стектрейс); `throw_on_failure` — опция |
| 10 | `print` в библиотеке, subprocess без `shell:false`, нет защиты путей, `python` без fallback | логгер в stderr, `shell:false`, `safeResolveInside`, `process.execPath`/`python3` |
| 11 | pydantic + PyYAML + openai/anthropic как новые зависимости | stdlib Node: свои модели данных, свой YAML, свой JSON Schema, `fetch` |
| 12 | валидаторы не знали про ворота студии | `ceh_project` гоняет настоящие `validate.mjs`/линтеры и возвращает `V-xx`/`B-xx`/`M-xx` в фидбек |

---

## Что добавлено сверх патча

- `validators/ceh-project.mjs` — автоприёмка воротами цеха (главная интеграция).
- `--dry-run` / `MockGenerator` / `--selftest` — прогон цикла без сети, ключей и затрат.
- Персист итераций: `workspace/iterations/iter-NN/{artifact.txt,feedback.json}` (evidence).
- `workspace/loop-result.json` — итог прогона для REVIEW.md и разбора полётов.
- Бюджеты контекста, wall-clock бюджет, ретраи с backoff и `retry-after`, снятие code-fences.
- `response_format: files` — генерация нескольких файлов сайта за итерацию.
- Хук `onIteration` и `describe()` у всех компонентов — для отчётов и наблюдений.

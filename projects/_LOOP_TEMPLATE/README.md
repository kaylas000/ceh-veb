# `_LOOP_TEMPLATE` — шаблон проекта для Universal Loop Engine

Заготовка под цикл «контекст → генерация → валидация → фидбек». Скопируй папку,
поправь конфиг и промпты — движок трогать не нужно.

```bash
cp -r projects/_LOOP_TEMPLATE projects/<имя>
cd projects/<имя>
node run.mjs "твоя задача"            # офлайн: generator.type = mock
node run.mjs "твоя задача" --dry-run  # то же, принудительно без сети
```

Полный список опций: `node core/loop-engine/cli.mjs --help`.
Документация движка: `core/loop-engine/README.md`.

## Состав

```text
projects/_LOOP_TEMPLATE/
├── loop.config.yaml         декларативный конфиг цикла (loop/generator/validator/context_builder/output)
├── prompts/
│   ├── system.md            системный промпт: рендерится на каждой итерации ({{ task }}, {{ project_name }}…)
│   └── context-template.md  шаблон пользовательского сообщения: секции архива + блок провальной итерации
├── tests/
│   └── artifact.test.mjs    пример проверок (node:test). ПЕРЕПИШИ под свою задачу
├── run.mjs                  точка входа (~38 строк): конфиг → фабрика → прогон → сохранение
└── workspace/               рабочая зона движка (в git не попадает: workspace/.gitignore)
    ├── main.mjs             артефакт последней итерации
    ├── tests/               копия tests/ проекта (её запускает валидатор)
    ├── iterations/iter-NN/  артефакт + feedback.json каждой итерации (evidence)
    ├── result.txt           итоговый артефакт (для output.file)
    ├── out/                 итоговые файлы (если артефакт — карта файлов)
    └── loop-result.json     итог прогона: вердикт, коды, история, метрики
```

## Три сценария

### 1. Офлайн-проверка связки (по умолчанию)

`generator.type: mock` + `validator.type: node_code`. Сеть и ключи не нужны — проверяется,
что контекст собирается, артефакт пишется, тесты запускаются, фидбек возвращается в промпт.

```bash
node run.mjs "выдай ES-модуль с функцией hello"
```

### 2. Генерация кода настоящей моделью

В `loop.config.yaml` убери `type: "mock"` и раскомментируй блок `type: "llm"`:

```yaml
generator:
  type: "llm"
  provider: "openai"          # любой OpenAI-совместимый эндпоинт: OpenAI, OpenRouter, vLLM, Ollama
  model: "gpt-4o-mini"
  client:
    api_key_env: "OPENAI_API_KEY"   # ключ — только из окружения, никогда из файла
    base_url: "https://api.openai.com/v1"
  response_format: "text"     # text | json | files
```

```bash
OPENAI_API_KEY=sk-… node run.mjs "собери модуль расчёта стоимости"
```

### 3. Сборка сайта с автоприёмкой воротами цеха

Для проектов с досье (`SEED/DIRECTION/STRUCTURE/SOURCES`) переключи валидатор на `ceh_project` —
он прогонит **существующие** `scripts/validate.mjs` (V-01…V-17) и линтеры, а их вердикт
вернётся модели как фидбек следующей итерации:

```yaml
generator:
  type: "llm"
  provider: "openai"
  model: "gpt-4o-mini"
  response_format: "files"    # модель выдаёт {"site/index.html": "…", "site/styles.css": "…"}

validator:
  type: "ceh_project"
  checks: ["validate", "lint-slop", "lint-copy", "lint-marketing"]
  ignore_codes: []            # например ["V-15"], если code-video в проекте не нужен
  materialize: true
  materialize_target: "project"   # запись в projects/<имя>/site/
  allow_project_writes: true      # БЕЗ этого флага движок откажется писать в проект (E-WRITE-GUARD)
```

Проверка на уже принятом проекте (ничего не пишем, только прогоняем ворота):

```bash
node core/loop-engine/cli.mjs projects/pcpolimer --validator ceh_project --checks validate,lint-slop --dry-run
```

## Правила, которые шаблон не отменяет

Конституция цеха действует целиком: код не пишется до принятого на G1 `DIRECTION.md` (К-01),
каждое решение — строкой в `SOURCES.md` (К-02), приём без источника — слоп (К-04),
easing только из `motion/easing-curves.json` (К-05). Цикл лишь автоматизирует проверку
и возврат на правки (К-10) — вердикт арт-директора в `REVIEW.md` остаётся за человеком (К-09).

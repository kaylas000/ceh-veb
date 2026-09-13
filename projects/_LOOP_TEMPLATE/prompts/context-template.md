{#- Шаблон пользовательского сообщения. Рендерится core/loop-engine/template.mjs
    (Jinja-подобный: {{ var }}, {% if %}, {% for %}, фильтры |truncate(N), |join(", "), |upper).
    Одинарные скобки {var} тоже работают — только для известных ключей. -#}
# ЗАДАЧА
{{ task }}

Проект: **{{ project_name }}** · итерация {{ iteration }}{% if max_iterations %} из {{ max_iterations }}{% endif %} · temperature {{ temperature }}

{% if mechanics %}
## МЕХАНИКА И ПРАВИЛА (ОБЯЗАТЕЛЬНО)
{{ mechanics }}
{% endif %}

{%- if gates %}
## ВОРОТА ПРИЁМКИ G1–G4
{{ gates | truncate(6000) }}
{% endif %}

{%- if skills %}
## СКИЛЫ И ПРИЁМЫ АРХИВА
{{ skills }}
{% endif %}

{%- if references %}
## РЕФЕРЕНСЫ (каждый приём — со ссылкой сюда)
{{ references | truncate(8000) }}
{% endif %}

{%- if motion %}
## ДВИЖЕНИЕ (easing только из реестра)
{{ motion | truncate(6000) }}
{% endif %}

{%- if dossier %}
## ДОСЬЕ ПРОЕКТА
{{ dossier }}
{% endif %}

{%- if docs %}
## ПЛЕЙБУКИ
{{ docs | truncate(6000) }}
{% endif %}

{%- if examples %}
## ПРИМЕРЫ (FEW-SHOT)
{{ examples | truncate(8000) }}
{% endif %}

{%- if history %}
## PREVIOUS ATTEMPT FAILED (ПРЕДЫДУЩАЯ ПОПЫТКА ПРОВАЛЕНА)
{% for attempt in history %}
### Итерация {{ attempt.iteration }} · коды: {{ attempt.codes | join(", ") }}

Твой предыдущий вывод:
```
{{ attempt.output }}
```

Ошибки валидации (исправь РОВНО их):
{% for err in attempt.errors %}- {{ err }}
{% endfor %}

Сырой вывод валидатора:
```
{{ attempt.raw_output | truncate(1500) }}
```
{% endfor %}
**Проанализируй ошибки выше. Примени МЕХАНИКУ и СКИЛЫ. Выдай ИСПРАВЛЕННЫЙ вариант —
без изменений в тех частях, к которым претензий не было.**
{% endif %}

## ВЫДАЧА
Только артефакт. Без пояснений.

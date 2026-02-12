---
name: BreviAI Şablon Sihirbazı
description: seed_templates.ts dosyasına eklenecek yeni Kestirme (Shortcut) verilerini oluşturur.
---

# BreviAI Şablon Sihirbazı

Sen **BreviAI** projesinin veri uzmanısın. Görevin, uygulamanın kullandığı şablon verilerini (`seed_templates.ts`) genişletmek ve yönetmek.

## Görevin
Kullanıcı yeni bir kestirme fikri verdiğinde, bunu `ShortcutTemplate` arayüzüne (interface) tam uyumlu bir TypeScript objesine dönüştürmek.

## Veri Yapısı (ShortcutTemplate)
```typescript
interface ShortcutTemplate {
    id: string;          // Benzersiz ID (örn: 'prod-10')
    title: string;       // Türkçe Başlık
    title_en?: string;   // İngilizce Başlık
    description: string; // Açıklama
    description_en?: string;
    category: 'Battery' | 'Security' | 'Productivity' | 'Lifestyle' | 'Social' | 'Health' | 'Travel';
    author: string;      // Yazar adı (Genelde 'BreviAI' veya kullanıcı adı)
    downloads: string;   // Gösterim amaçlı indirme sayısı (örn: '1.2k')
    tags: string[];      // Arama etiketleri
    template_json: object; // Kestirme mantığı (SKILL: BreviAI Kestirme Oluşturucu'dan gelir)
}
```

## Kurallar
1. **Kategori**: Sadece izin verilen kategorileri kullan (Battery, Security, vs.).
2. **ID**: Çakışma olmamasını sağla. Eğer kategori `Health` ise ID `hth-X` gibi olmalı.
3. **template_json**: Bu alan boş `{}` olabilir, ancak doluysa `BreviAI Kestirme Oluşturucu` formatına uymalıdır.

## Örnek Çıktı
```typescript
{
    id: 'prod-new-1',
    title: 'Hızlı E-posta',
    title_en: 'Quick Email',
    description: 'Yöneticine "Rapor hazır" maili atar.',
    description_en: 'Sends "Report ready" email to manager.',
    category: 'Productivity',
    author: 'BreviAI',
    downloads: '0',
    tags: ['email', 'is', 'rapor'],
    template_json: {
        shortcut_name: "Rapor Maili",
        steps: [
            { step_id: 1, type: "INTENT_ACTION", action: "SEND_EMAIL", params: { subject: "Rapor", body: "Ektedir." } }
        ]
    }
}
```
---
name: Template & Seed Data Wizard
description: Converts user ideas into structured data objects that conform to an existing schema. Use when the user wants to add, expand, or manage seed/template data in a project — regardless of language, framework, or data format.
---

# Template & Seed Data Wizard

You are a data modeling expert. Your job is to take a user's idea — however rough — and turn it into a clean, schema-compliant data object ready to drop into a project's seed file, database, or configuration.

## Before Writing Anything

1. **Get the schema.** Ask the user to share the existing interface, type, schema, or an example object. If they've already shared one, use it as the ground truth.
2. **Understand the constraints.** Are there enum values? Required fields? ID formats? Naming conventions? Extract these from the schema or existing data.
3. **Check for conflicts.** If IDs, slugs, or keys must be unique, ask what already exists — or make a clearly marked placeholder the user should verify.

---

## Core Principles

### 1. Schema First, Always
Never invent fields. Never omit required fields. If a field is optional and you're unsure of the value, either omit it or use a clearly marked placeholder like `"TODO"`.

### 2. Consistency Over Creativity
Match the style of existing entries exactly — casing, naming patterns, ID formats, tag style, number formatting. If existing entries use `snake_case` tags, don't introduce `camelCase` tags.

### 3. Completeness
Produce a full, copy-pasteable object. No `...` or partial stubs unless the user explicitly asks for a skeleton.

### 4. Placeholder Discipline
If a value is unknown (e.g., a real download count, a user-provided ID), use a clearly identifiable placeholder:
- `"TODO: replace with real value"`
- `0` for counts
- `""` for unknown strings (and note it)

Never silently fabricate realistic-looking data for fields that should come from a real source.

---

## Workflow

### Step 1 — Extract the Schema
From the user's message or codebase, identify:
- All fields (required vs optional)
- Field types and allowed values (enums, string patterns, etc.)
- Any cross-field rules (e.g., "if category is X, ID prefix is Y")

### Step 2 — Clarify if Needed
Ask **one question** if something critical is missing. Examples:
- "What ID should this use, or should I generate one based on your existing pattern?"
- "Is there a category this falls under, or should I suggest one?"

Don't ask for information you can reasonably infer from context or existing data.

### Step 3 — Generate the Object
Produce the full object, formatted to match existing entries. Include a comment block above it noting:
- Any assumptions made
- Any fields that need human review (mark with `// TODO`)
- Which file it should be added to (if known)

### Step 4 — Offer Variants (Optional)
If the idea is ambiguous or could fit multiple categories/shapes, produce 2 variants and let the user pick.

---

## Output Format

Always output:

1. The ready-to-paste object (complete, formatted)
2. A short note section: assumptions, TODOs, and where to add it

Example output structure:

```typescript
// Assumptions: category inferred from description, ID follows existing 'prod-N' pattern
// TODO: verify ID 'prod-11' doesn't already exist in seed file
// Add to: src/data/seed_templates.ts

{
  id: 'prod-11',
  title: 'Weekly Digest',
  description: "Summarizes the week's activity into a single report.",
  category: 'Productivity',
  tags: ['summary', 'report', 'weekly'],
}
```

---

## Handling Enums and Constrained Fields

When a field only allows specific values:
- List the allowed values in your reasoning
- Pick the best fit based on the idea's description
- If it's genuinely ambiguous, present 2 options and ask

---

## Handling IDs and Keys

Common ID patterns to recognize and follow:

| Pattern | Example | Rule |
|---|---|---|
| Category-prefix numeric | `prod-3`, `hth-7` | Increment from highest existing number in that category |
| UUID | `a1b2c3d4-...` | Generate a valid UUID v4 |
| Slug | `quick-email` | Kebab-case of the title, lowercased |
| Sequential | `template_042` | Zero-padded increment |

Always note: "I generated this ID — please verify it doesn't conflict with existing entries."

---

## Bulk Generation

If the user wants multiple entries at once:
- Generate them as an array
- Ensure IDs are sequential and non-conflicting within the batch
- Note that the whole batch needs a conflict check against existing data

---

## What NOT to Do

- Don't invent enum values that aren't in the schema
- Don't fabricate realistic-looking fake data for fields like "downloads", "rating", or "created_at" without marking them as placeholders
- Don't produce partial objects — always complete every required field
- Don't restructure the schema, even if it seems inconsistent — match what exists

---

## Language & Format Agnostic

This skill works regardless of the data format. Adapt output syntax to match the project:

- **TypeScript/JavaScript object literal** — `{ key: 'value' }`
- **JSON** — `{ "key": "value" }`
- **Python dict** — `{ "key": "value" }` or `dict(key="value")`
- **SQL INSERT** — `INSERT INTO table (col1, col2) VALUES ('val1', 'val2');`
- **YAML** — `key: value`

Match whatever format the existing seed data uses.
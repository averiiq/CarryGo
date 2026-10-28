# CarryGo — Bilingual Legal and Informational Content

## 1. Purpose
Add a minimal English/Hindi language option for the app's Terms & Conditions, disclaimers, notices, and other informational/legal content that is currently English-only.

## 2. Why this change is needed
- Let users read this content in either English or Hindi.
- Keep the existing app behavior and UI stable while making the smallest practical change.
- Avoid a broad app-wide localization rewrite that is not requested.

## 3. Scope
### Included
- Identify existing locations/screens/components that display Terms & Conditions, disclaimers, notices, or informational/legal copy.
- Provide English and Hindi versions of that in-scope content.
- Add a simple English/Hindi toggle or selector where users access the in-scope content.
- English is the default language when no valid saved/user-selected preference exists.
- Switching language changes the displayed in-scope text without breaking navigation or the surrounding screen.
- Keep the change compatible with the project's existing architecture and libraries.

### Explicitly excluded unless separately approved
- Translating the entire app, onboarding, buttons, menus, notifications, or unrelated UI copy.
- Changing business rules, parcel flows, authentication, payments, APIs, database schemas, or backend behavior solely for this feature.
- Redesigning screens or adding new language features beyond the toggle described here.
- Adding a new localization library if the existing codebase can support this narrowly scoped change without one.
- Automatically translating legal text at runtime or inventing Hindi legal wording.

## 4. Required behavior
1. English must be selected by default for users who have not selected a language.
2. The user can explicitly switch between English and Hindi.
3. Every in-scope content block must have an English version and a Hindi version.
4. Language selection must not alter the underlying meaning, obligations, warnings, or legal effect of the content.
5. The language toggle must be minimal and consistent with the current UI patterns.
6. Do not change unrelated screens or behavior.

## 5. Implementation instructions for the coding agent
1. Inspect the repository and identify the current framework, navigation structure, existing localization utilities, and all locations containing the in-scope content.
2. Before editing, report the files/components that will be changed and the exact in-scope content locations found. Do not modify unrelated files.
3. Reuse existing localization/content patterns if present. Otherwise, implement the smallest maintainable local mapping for English and Hindi using the project's existing conventions.
4. Keep the English source text unchanged unless a correction is explicitly requested. Do not invent missing content.
5. For Hindi copy, use an existing approved translation if one exists. If no approved translation exists, create clearly marked draft translations and list them for human/legal review; do not claim they are legally approved.
6. Add the language selector only to the relevant content area(s), unless the existing app already has a language setting that can be safely reused without expanding scope.
7. Persist the choice only if an existing preference mechanism is available and it is safe to reuse. Otherwise, keep selection behavior local to the relevant flow and report this limitation instead of adding new persistence infrastructure without approval.
8. Do not add dependencies, alter backend contracts, or migrate data unless repository inspection proves it is necessary; if necessary, stop and explain why before proceeding.
9. Keep existing styling, layout, accessibility, and navigation behavior intact.
10. Summarize every changed file and explain why it was necessary.

## 6. Acceptance criteria
- [ ] English is displayed by default for a user with no language selection.
- [ ] The user can switch in-scope content to Hindi and back to English.
- [ ] All identified Terms & Conditions, disclaimer, notice, and informational/legal content locations in scope support both languages.
- [ ] Switching language does not change unrelated app copy or business logic.
- [ ] No existing content is silently deleted or rewritten.
- [ ] No unapproved dependency, API, database, or architecture change is introduced.
- [ ] Navigation and existing app flows still work.
- [ ] Tests or a clear manual verification checklist cover both languages and the default state.
- [ ] Any draft Hindi legal translations are explicitly flagged for review.

## 7. Do not assume
- Do not assume which screens are in scope until the repository has been inspected.
- Do not assume a Hindi translation is legally approved.
- Do not assume a global app-wide language switch is wanted; the requested scope is the specified legal/informational content.
- Do not assume new storage, backend, or third-party localization services are allowed.
- Do not remove, simplify, or replace existing Terms & Conditions, disclaimers, notices, or informational copy.

## 8. Required final report
Provide:
- The content locations found and covered.
- Files changed and the purpose of each change.
- How the default English state and language toggle work.
- Tests/manual checks performed and their results.
- Hindi text that still requires human/legal review.
- Any blocker or decision that needs the product owner's approval.

## 9. Change-control rule
Implement only the requirements in this document. Do not add features, remove existing features, refactor unrelated code, or make assumptions to fill product gaps. If an implementation decision cannot be made from the repository and this specification, ask a concise question before making that decision.

# Multi-File LaTeX Compilation with Asset Support

## Problem
LaTeX compilation via texlive.net fails when the document references image files (e.g. `\includegraphics{brasao.png}`) because only `document.tex` is sent. Images uploaded in the editor are stored as base64 but commented out in the generated LaTeX.

## Solution
Send image assets alongside the LaTeX source using texlive.net's existing multi-file FormData API (`filecontents[]` / `filename[]`). Support importing `.zip` archives containing a `.tex` file and its assets.

## Asset Registry
A centralized `Map<string, AssetEntry>` managed by `useDocumentAssets` hook:
```ts
interface AssetEntry {
  filename: string        // "brasao_ufba.png"
  mimeType: string        // "image/png"
  dataUrl: string         // "data:image/png;base64,..."
  origin: 'upload' | 'import'
}
```

## Key Changes

### New files
- `src/hooks/useDocumentAssets.ts` — asset registry hook

### Modified files
- `src/utils/latexEngine.ts` — accept `assets[]`, append as blobs to FormData
- `src/utils/compilePdf.ts` — pass assets through to engine
- `src/utils/uploadTex.ts` — accept `.zip`, extract with JSZip, return `{ tex, assets }`
- `src/hooks/usePdfCompiler.ts` — receive assets and pass to compile
- `src/latex/generateLatex.ts` — base64 images generate real `\includegraphics{filename}` instead of comments
- `src/components/editor/ImageInsertModal.tsx` — register uploaded files as assets
- `src/App.tsx` — wire useDocumentAssets into upload and compile flows

### New dependency
- `jszip`

## ZIP Import Flow
1. Input accepts `.tex` and `.zip`
2. If `.zip`: extract with JSZip, find the single `.tex` (error if multiple), register all other files as assets
3. The `.tex` goes through the existing `parseLatex` flow

## Compilation Flow
```
Editor → generateLatex(doc) → LaTeX with \includegraphics{name.png}
                                   ↓
                        compileLatexSource(latex, assets[])
                                   ↓
                        FormData: document.tex + name.png + ...
                                   ↓
                             texlive.net → PDF
```

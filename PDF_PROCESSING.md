# Multi-Page PDF Processing

This application now supports automatic detection and processing of multi-page PDF documents.

## How It Works

### 1. PDF Detection
When a document is submitted for extraction, the system automatically detects if it's a PDF by examining the file header.

### 2. Page Conversion
If a PDF is detected:
- Each page is extracted individually
- Each page is converted to a high-quality JPG image (scale 2.0, 95% quality)
- The conversion maintains readability for OCR and vision models

### 3. Sequential Processing
Each page is processed sequentially:
- Sent to the Ollama vision model (e.g., qwen2.5-vl:7b)
- The LLM receives context about which page it's processing (Page X of Y)
- Each page is analyzed according to the expected schema

### 4. Result Combination
After all pages are processed, the results are intelligently combined:

**For Array Fields:**
- Values from all pages are concatenated into a single array
- Example: If each page has an array of items, the final result contains all items from all pages

**For Object Fields:**
- Objects are merged, with non-null values from any page included
- Nested arrays within objects are concatenated

**For Primitive Fields:**
- The first non-null/non-empty value is used
- Useful for document-level metadata (like document title, date, etc.)

### 5. Response Structure
The combined response includes:
```json
{
  "_metadata": {
    "totalPages": 5,
    "processedPages": 5
  },
  "field1": "extracted value",
  "field2": ["combined", "array", "from", "all", "pages"],
  "_pageData": [
    {
      "page": 1,
      "data": { ... }
    },
    {
      "page": 2,
      "data": { ... }
    }
  ]
}
```

### Benefits

1. **Context Preservation**: Each page is processed with awareness of its position in the document
2. **Comprehensive Extraction**: No data loss across multiple pages
3. **Detailed Tracking**: The `_pageData` field shows exactly what was extracted from each page
4. **Error Handling**: If one page fails, others continue processing
5. **Automatic Detection**: No special configuration needed - PDFs are automatically detected and processed

### Example Use Cases

- **Multi-page invoices**: Extract line items from invoices spanning multiple pages
- **Contracts**: Extract clauses and terms from lengthy legal documents
- **Reports**: Pull data tables and summaries from multi-page reports
- **Forms**: Process multi-page application or survey forms

### Performance Notes

- Processing time increases linearly with page count
- Each page requires a separate LLM call
- Timeout has been increased to 120 seconds to accommodate longer documents
- Console logs show progress for each page being processed

### API Usage

No changes to the API interface are required. Simply send PDF documents as base64-encoded data in the `filedata` field, and the system automatically handles multi-page processing.

```json
{
  "filedata": "base64_encoded_pdf_here",
  "fileurl": "https://example.com/document.pdf",
  "filename": "document.pdf",
  "filetype": "pdf",
  "description": "Multi-page invoice document",
  "remark": "Extract all line items"
}
```

### Technical Details

**Dependencies:**
- `pdfjs-dist`: Mozilla's PDF.js library for PDF parsing (using legacy build for Node.js compatibility)
- `canvas`: Node.js canvas implementation for rendering PDF pages to images

**Node.js Compatibility:**
The system uses `pdfjs-dist/legacy/build/pdf.mjs` which is optimized for Node.js environments and includes:
- DOMMatrix polyfill for missing browser APIs
- Custom NodeCanvasFactory for proper canvas handling in Node.js
- System font support without CDN dependencies
- Direct buffer-to-JPEG conversion without DOM APIs

**Process Flow:**
1. Base64 PDF → Buffer → Uint8Array
2. Load PDF with pdf.js (legacy build)
3. For each page:
   - Render to canvas at 2x scale
   - Convert canvas to JPEG buffer at 95% quality
   - Encode to base64 for LLM transmission
4. Send each image to Ollama with page context
5. Combine results intelligently based on schema types
6. Return comprehensive result with metadata

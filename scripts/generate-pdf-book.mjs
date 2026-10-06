import fs from "node:fs";
import path from "node:path";
import { execSync } from "node:child_process";

const rootDir = process.cwd();
const markdownPath = path.join(rootDir, "ONE_FRONT_DOOR_SYSTEM_BOOK.md");
const htmlOutputPath = path.join(rootDir, "One_Front_Door_System_Architecture_Book.html");
const pdfOutputPath = path.join(rootDir, "One_Front_Door_System_Architecture_Book.pdf");

console.log("📖 Reading Markdown Book...");
const mdContent = fs.readFileSync(markdownPath, "utf-8");

// Simple markdown to HTML conversion with beautiful styling
function formatMarkdownToHtml(md) {
  let html = md
    // Escape HTML special chars except those we use
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    // Code blocks with syntax highlighting simulation
    .replace(/```([a-zA-Z]*)\n([\s\S]*?)```/g, (_match, lang, code) => {
      return `<pre class="code-block"><div class="code-header">${lang || "text"}</div><code>${code.trim()}</code></pre>`;
    })
    // Inline code
    .replace(/`([^`]+)`/g, "<code>$1</code>")
    // Headers
    .replace(/^# (.*$)/gim, '<h1 class="chapter-title">$1</h1>')
    .replace(/^## (.*$)/gim, '<h2 class="section-title">$1</h2>')
    .replace(/^### (.*$)/gim, '<h3 class="subsection-title">$1</h3>')
    .replace(/^#### (.*$)/gim, '<h4 class="sub-subsection-title">$1</h4>')
    // Bold & Italic
    .replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>")
    .replace(/\*([^*]+)\*/g, "<em>$1</em>")
    // Blockquotes
    .replace(/^\> (.*$)/gim, "<blockquote>$1</blockquote>")
    // Horizontal rules
    .replace(/^---$/gim, '<hr class="page-divider"/>')
    // Markdown Tables
    .replace(/((?:\|[^\n]+\|\r?\n)+)/g, (tableMatch) => {
      const rows = tableMatch.trim().split("\n");
      let tableHtml = '<table class="doc-table">\n';
      rows.forEach((row, idx) => {
        if (row.includes("---")) return; // skip separator row
        const cells = row.split("|").slice(1, -1);
        tableHtml += "  <tr>\n";
        cells.forEach((cell) => {
          const content = cell.trim();
          tableHtml += idx === 0 ? `    <th>${content}</th>\n` : `    <td>${content}</td>\n`;
        });
        tableHtml += "  </tr>\n";
      });
      tableHtml += "</table>\n";
      return tableHtml;
    })
    // Lists
    .replace(/^- (.*$)/gim, "<li>$1</li>")
    .replace(/(<li>.*<\/li>)/s, "<ul>$1</ul>")
    // Paragraphs
    .replace(/\n\n/g, "</p><p>")
    .replace(/\n/g, "<br/>");

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>One Front Door — Complete System Architecture & Engineering Book</title>
  <style>
    @import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@300;400;500;600;700;800&family=JetBrains+Mono:wght@400;500;700&display=swap');

    @page {
      size: A4;
      margin: 20mm 15mm 20mm 15mm;
      @bottom-right {
        content: counter(page);
      }
    }

    * {
      box-sizing: border-box;
    }

    body {
      font-family: 'Plus Jakarta Sans', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      font-size: 11pt;
      line-height: 1.65;
      color: #1e293b;
      background: #ffffff;
      margin: 0;
      padding: 30px;
    }

    .book-cover {
      text-align: center;
      padding: 60px 20px 80px 20px;
      page-break-after: always;
      border-bottom: 2px solid #e2e8f0;
      margin-bottom: 40px;
    }

    .book-badge {
      display: inline-block;
      padding: 6px 16px;
      background: #eff6ff;
      color: #2563eb;
      border: 1px solid #bfdbfe;
      border-radius: 20px;
      font-weight: 600;
      font-size: 12px;
      letter-spacing: 0.5px;
      text-transform: uppercase;
      margin-bottom: 24px;
    }

    .book-title {
      font-size: 32pt;
      font-weight: 800;
      color: #0f172a;
      letter-spacing: -1px;
      line-height: 1.15;
      margin: 0 0 16px 0;
    }

    .book-subtitle {
      font-size: 14pt;
      color: #64748b;
      max-width: 650px;
      margin: 0 auto 30px auto;
      line-height: 1.5;
    }

    .book-meta {
      display: inline-flex;
      gap: 20px;
      font-size: 11px;
      color: #94a3b8;
      border-top: 1px solid #e2e8f0;
      padding-top: 20px;
    }

    h1.chapter-title {
      font-size: 20pt;
      font-weight: 800;
      color: #0f172a;
      border-bottom: 2px solid #3b82f6;
      padding-bottom: 8px;
      margin-top: 40px;
      margin-bottom: 20px;
      page-break-before: always;
    }

    h1.chapter-title:first-of-type {
      page-break-before: avoid;
    }

    h2.section-title {
      font-size: 15pt;
      font-weight: 700;
      color: #1e293b;
      margin-top: 30px;
      margin-bottom: 14px;
      border-left: 4px solid #3b82f6;
      padding-left: 10px;
    }

    h3.subsection-title {
      font-size: 12pt;
      font-weight: 600;
      color: #334155;
      margin-top: 20px;
      margin-bottom: 10px;
    }

    p {
      margin: 0 0 14px 0;
      color: #334155;
    }

    ul, ol {
      margin: 0 0 16px 0;
      padding-left: 24px;
      color: #334155;
    }

    li {
      margin-bottom: 6px;
    }

    blockquote {
      border-left: 4px solid #60a5fa;
      background: #f8fafc;
      padding: 12px 18px;
      margin: 16px 0;
      border-radius: 0 8px 8px 0;
      color: #475569;
      font-style: italic;
    }

    .code-block {
      background: #0f172a;
      color: #f8fafc;
      border-radius: 8px;
      padding: 0;
      margin: 16px 0;
      overflow-x: auto;
      font-family: 'JetBrains Mono', Consolas, monospace;
      font-size: 9.5pt;
      line-height: 1.5;
      page-break-inside: avoid;
    }

    .code-header {
      background: #1e293b;
      color: #94a3b8;
      padding: 6px 14px;
      font-size: 8pt;
      font-weight: 600;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      border-top-left-radius: 8px;
      border-top-right-radius: 8px;
    }

    .code-block code {
      display: block;
      padding: 14px 16px;
      background: transparent;
      color: #f1f5f9;
    }

    code {
      font-family: 'JetBrains Mono', Consolas, monospace;
      font-size: 9pt;
      background: #f1f5f9;
      color: #2563eb;
      padding: 2px 6px;
      border-radius: 4px;
      border: 1px solid #e2e8f0;
    }

    .doc-table {
      width: 100%;
      border-collapse: collapse;
      margin: 20px 0;
      font-size: 9.5pt;
      page-break-inside: avoid;
    }

    .doc-table th, .doc-table td {
      border: 1px solid #cbd5e1;
      padding: 10px 12px;
      text-align: left;
    }

    .doc-table th {
      background: #f1f5f9;
      color: #0f172a;
      font-weight: 700;
    }

    .doc-table tr:nth-child(even) td {
      background: #f8fafc;
    }

    .page-divider {
      border: none;
      border-top: 1px solid #e2e8f0;
      margin: 30px 0;
    }

    @media print {
      body {
        padding: 0;
      }
      .book-cover {
        padding: 100px 0;
      }
    }
  </style>
</head>
<body>
  <div class="book-cover">
    <div class="book-badge">Comprehensive Architectural Whitepaper</div>
    <div class="book-title">One Front Door</div>
    <div class="book-subtitle">System Architecture, Multi-Agent LangGraph Workflows, Autonomous Action Engines, and Codebase Blueprint</div>
    <div class="book-meta">
      <span>Bennett University AI Copilot</span>
      <span>•</span>
      <span>Version 1.0 Production Edition</span>
      <span>•</span>
      <span>Full TypeScript Stack</span>
    </div>
  </div>

  <div class="book-body">
    <p>${html}</p>
  </div>
</body>
</html>`;
}

console.log("🎨 Converting to publication-grade HTML...");
const htmlContent = formatMarkdownToHtml(mdContent);
fs.writeFileSync(htmlOutputPath, htmlContent, "utf-8");
console.log(`✅ Saved HTML version: ${htmlOutputPath}`);

// Try converting to PDF using Windows Microsoft Edge or Google Chrome Headless
console.log("📄 Generating PDF Document...");
const browsers = [
  "msedge",
  '"C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe"',
  '"C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe"',
  '"C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe"',
  '"C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe"',
];

let pdfGenerated = false;

for (const browser of browsers) {
  try {
    const cmd = `${browser} --headless --disable-gpu --run-all-compositor-stages-before-draw --print-to-pdf="${pdfOutputPath}" "${htmlOutputPath}"`;
    execSync(cmd, { stdio: "pipe" });
    if (fs.existsSync(pdfOutputPath)) {
      console.log(`🎉 Successfully generated PDF book: ${pdfOutputPath}`);
      pdfGenerated = true;
      break;
    }
  } catch (err) {
    // try next browser path
  }
}

if (!pdfGenerated) {
  console.log("ℹ️ HTML Book is ready. You can open it in any browser and press Ctrl+P -> Save as PDF!");
}

import { execFile } from "node:child_process";
import { promisify } from "node:util";
import fs from "node:fs/promises";
import path from "node:path";

import { Document } from "@langchain/core/documents";

const execFileAsync = promisify(execFile);

const TESSERACT_PATH =
  "C:\\Program Files\\Tesseract-OCR\\tesseract.exe";

const POPPLER_COMMAND =
  "C:\\Program Files\\poppler-26.09.0\\Library\\bin\\pdftoppm.exe";

const PDFINFO_COMMAND =
  "C:\\Program Files\\poppler-26.09.0\\Library\\bin\\pdfinfo.exe";

function normalizeText(text: string): string {
  return text
    .replace(/\s+/g, " ")
    .trim()
    .toLowerCase();
}

export async function loadPDFWithOCR(
  filePath: string,
  sourceName: string
): Promise<Document[]> {
  const documents: Document[] = [];

  const tempDirectory = path.resolve(
    process.cwd(),
    "tmp",
    "ocr"
  );

  await fs.mkdir(tempDirectory, {
    recursive: true,
  });

  const documentName = path.parse(sourceName).name;

  const outputPrefix = path.join(
    tempDirectory,
    documentName
  );

  /*
   * --------------------------------------------------
   * 1. Determine the actual number of PDF pages
   * --------------------------------------------------
   */

  const { stdout: pdfInfo } = await execFileAsync(
    PDFINFO_COMMAND,
    [filePath]
  );

  const pageMatch = pdfInfo.match(
    /Pages:\s+(\d+)/
  );

  if (!pageMatch) {
    throw new Error(
      `Could not determine page count for ${sourceName}`
    );
  }

  const pageCount = Number(pageMatch[1]);

  console.log(
    `PDF contains ${pageCount} page(s).`
  );

  /*
   * --------------------------------------------------
   * 2. Convert PDF pages to PNG images
   * --------------------------------------------------
   */

  console.log(
    "Converting PDF pages to images..."
  );

  await execFileAsync(POPPLER_COMMAND, [
    "-png",
    "-r",
    "150",
    "-f",
    "1",
    "-l",
    String(pageCount),
    filePath,
    outputPrefix,
  ]);

  /*
   * --------------------------------------------------
   * 3. Find the generated PNG files
   * --------------------------------------------------
   */

  const files = await fs.readdir(
    tempDirectory
  );

  const pageFiles = files
    .filter(
      (file) =>
        file.startsWith(documentName) &&
        file.endsWith(".png")
    )
    .sort((a, b) => {
      const pageA = Number(
        a.match(/-(\d+)\.png$/)?.[1] ?? 0
      );

      const pageB = Number(
        b.match(/-(\d+)\.png$/)?.[1] ?? 0
      );

      return pageA - pageB;
    });

  console.log(
    `Rendered ${pageFiles.length} PDF page(s).`
  );

  /*
   * --------------------------------------------------
   * 4. Safety check
   * --------------------------------------------------
   */

  if (pageFiles.length !== pageCount) {
    console.warn(
      `Warning: expected ${pageCount} image(s), but found ${pageFiles.length}.`
    );
  }

  /*
   * --------------------------------------------------
   * 5. OCR each page
   * --------------------------------------------------
   */

  let previousText = "";

  for (
    let i = 0;
    i < pageFiles.length;
    i++
  ) {
    const pageNumber = i + 1;

    const imagePath = path.join(
      tempDirectory,
      pageFiles[i]
    );

    console.log(
      `OCR processing page ${pageNumber}/${pageFiles.length}...`
    );

    const { stdout } = await execFileAsync(
      TESSERACT_PATH,
      [
        imagePath,
        "stdout",
        "-l",
        "eng",
      ],
      {
        maxBuffer: 20 * 1024 * 1024,
      }
    );

    const text = stdout.trim();

    /*
     * ------------------------------------------------
     * 6. Avoid consecutive duplicate OCR pages
     * ------------------------------------------------
     */

    const normalizedCurrent =
      normalizeText(text);

    const normalizedPrevious =
      normalizeText(previousText);

    if (
      normalizedCurrent.length > 0 &&
      normalizedCurrent !== normalizedPrevious
    ) {
      documents.push(
        new Document({
          pageContent: text,
          metadata: {
            source: sourceName,
            page: pageNumber,
            extractionMethod: "ocr",
          },
        })
      );
    } else if (
      normalizedCurrent.length > 0
    ) {
      console.log(
        `Skipping duplicate OCR content on page ${pageNumber}.`
      );
    }

    previousText = text;

    /*
     * ------------------------------------------------
     * 7. Delete temporary image
     * ------------------------------------------------
     */

    await fs.unlink(imagePath);
  }

  return documents;
}
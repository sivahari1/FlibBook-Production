import { execFile } from "child_process";
import { promisify } from "util";
import fs from "fs";
import path from "path";

const execFileAsync = promisify(execFile);

export async function convertPdfToImages({
  pdfPath,
  outputDir,
  dpi = 200,
}: {
  pdfPath: string;
  outputDir: string;
  dpi?: number;
}) {
  if (!fs.existsSync(outputDir)) fs.mkdirSync(outputDir, { recursive: true });

  await execFileAsync("pdftoppm", [
    "-jpeg",
    "-r",
    dpi.toString(),
    "-cropbox",
    "-aa",
    "yes",
    "-aaVector",
    "yes",
    pdfPath,
    path.join(outputDir, "page"),
  ]);
}
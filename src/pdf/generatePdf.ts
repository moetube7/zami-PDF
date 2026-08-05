import puppeteer from "puppeteer";

export interface GeneratePdfOptions {
  format?: "A4" | "Letter";
}

// 로컬 실행 전제 — 서버리스 배포를 고려하지 않으므로 일반 puppeteer(번들 크로미움)를 그대로 사용한다.
export async function generatePdf(reportUrl: string, opts: GeneratePdfOptions = {}): Promise<Buffer> {
  const browser = await puppeteer.launch();
  try {
    const page = await browser.newPage();
    await page.goto(reportUrl, { waitUntil: "networkidle0" });
    await page.evaluateHandle("document.fonts.ready");

    const pdf = await page.pdf({
      format: opts.format ?? "A4",
      printBackground: true,
      preferCSSPageSize: false,
      margin: { top: "25mm", bottom: "20mm", left: "20mm", right: "20mm" },
      displayHeaderFooter: true,
      headerTemplate: `<div></div>`,
      footerTemplate: `
        <div style="width:100%; font-size:9px; text-align:center; color:#999; font-family: sans-serif;">
          <span class="pageNumber"></span> / <span class="totalPages"></span>
        </div>`,
    });

    return Buffer.from(pdf);
  } finally {
    await browser.close();
  }
}

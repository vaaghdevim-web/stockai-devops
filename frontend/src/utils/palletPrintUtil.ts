/**
 * Pallet Barcode & Document Printing Utility
 *
 * Implements strict industrial printing specifications:
 * 1. Physical Goods Label (affixed to physical goods):
 *    - Company Name, Unit Number
 *    - Barcode with ID Number (Rendered via Vector SVG for 100% print reliability)
 *    - Pallet Identifier, System Record ID
 *    - Stowed Units, Storage Staging Bin
 * 2. Cutting symbols (inline SVG scissors) and a dotted line
 * 3. Additional information (retained with logistics office / dispatch docket, not affixed to physical goods):
 *    - Storage Location Coordinates
 *    - Production Batch Association
 */

import JsBarcode from 'jsbarcode'

export interface PalletPrintPayload {
  companyName?: string
  unitNumber?: string
  barcode: string
  palletCode: string
  palletId: number | string
  quantity?: number | string | null
  uom?: string
  binCode?: string
  warehouseName?: string
  storageCoordinates?: string
  batchNo?: string
  productName?: string
  productCode?: string
  qaStatus?: string
}

export interface BarcodeRect {
  x: number
  width: number
}

export interface BarcodeRenderData {
  rects: BarcodeRect[]
  viewBoxWidth: number
  viewBoxHeight: number
}

interface Code128EncoderInstance {
  valid: () => boolean
  encode: () => { data: string; text: string }
}

type JsBarcodeWithGetModule = typeof JsBarcode & {
  getModule: (name: string) => new (data: string, options: Record<string, unknown>) => Code128EncoderInstance
}

/**
 * Calculates standards-compliant Code-128 vector bar positions.
 * Vector SVG <rect fill="#000000"> elements are foreground graphics and are
 * guaranteed to print on all browsers even when "Background graphics" is disabled.
 */
export function getCode128BarcodeData(
  barcode: string,
  height = 50,
  quietZoneModules = 10
): BarcodeRenderData {
  if (!barcode) {
    return { rects: [], viewBoxWidth: 200, viewBoxHeight: height }
  }

  try {
    const encoderModule = (JsBarcode as unknown as JsBarcodeWithGetModule).getModule('CODE128')
    if (!encoderModule) {
      throw new Error('CODE128 module is unavailable in JsBarcode')
    }

    const encoder = new encoderModule(barcode, {})
    if (!encoder.valid()) {
      throw new Error(`Invalid Code-128 barcode data: "${barcode}"`)
    }

    const encoded = encoder.encode()
    const binary = encoded.data
    const moduleWidth = 2
    const currentQuietZone = quietZoneModules * moduleWidth
    const totalWidth = binary.length * moduleWidth + currentQuietZone * 2

    const rects: BarcodeRect[] = []
    let barWidth = 0

    for (let b = 0; b < binary.length; b++) {
      if (binary[b] === '1') {
        barWidth++
      } else if (barWidth > 0) {
        rects.push({
          x: currentQuietZone + (b - barWidth) * moduleWidth,
          width: barWidth * moduleWidth,
        })
        barWidth = 0
      }
    }

    if (barWidth > 0) {
      rects.push({
        x: currentQuietZone + (binary.length - barWidth) * moduleWidth,
        width: barWidth * moduleWidth,
      })
    }

    return {
      rects,
      viewBoxWidth: totalWidth,
      viewBoxHeight: height,
    }
  } catch (err) {
    console.error('Failed to encode Code-128 barcode:', err)
    return { rects: [], viewBoxWidth: 200, viewBoxHeight: height }
  }
}

/**
 * Backward-compatible helper returning the Code-128 bar rects
 */
export function getBarcodeRects(barcode: string): BarcodeRect[] {
  return getCode128BarcodeData(barcode).rects
}

/**
 * Generates an SVG string representation of the standards-compliant Code-128 barcode
 */
export function generateBarcodeSvg(barcode: string, height = 54): string {
  const { rects, viewBoxWidth, viewBoxHeight } = getCode128BarcodeData(barcode, height)
  const rectsHtml = rects
    .map(
      (r) =>
        `<rect x="${r.x.toFixed(2)}" y="2" width="${r.width.toFixed(2)}" height="${viewBoxHeight - 4}" fill="#000000" />`
    )
    .join('')

  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${viewBoxWidth} ${viewBoxHeight}" width="100%" height="${viewBoxHeight}" style="display:block;margin:0 auto;background:#ffffff;max-width:100%;">
    <rect x="0" y="0" width="${viewBoxWidth}" height="${viewBoxHeight}" fill="#ffffff" />
    ${rectsHtml}
  </svg>`
}

export function printPalletDocument(data: PalletPrintPayload): void {
  const escape = (value: unknown) => String(value ?? 'Not recorded').replace(/[&<>"']/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[char]!)
  const company = escape(data.companyName || 'Sri Vidya Polymers')
  const unit = escape(data.unitNumber)
  const palletIdStr = escape(data.palletId)
  const stowedUnits = escape(`${data.quantity ?? 'Not recorded'} ${data.uom ?? ''}`)
  const stagingBin = escape(data.binCode)
  const warehouse = escape(data.warehouseName)
  const coordinates = escape(data.storageCoordinates)
  const batchNumber = escape(data.batchNo)
  const product = escape(data.productName)
  const code = escape(data.productCode)
  const qa = escape(data.qaStatus)

  // Generate vector SVG barcode bars (never stripped in print preview or PDF)
  const barcodeSvg = generateBarcodeSvg(data.barcode, 64)

  const printHtml = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>Pallet Tag - ${escape(data.palletCode)}</title>
  <style>
    @page {
      size: A4 portrait;
      margin: 12mm 15mm;
    }
    * {
      box-sizing: border-box;
      margin: 0;
      padding: 0;
    }
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
      color: #000000;
      background: #ffffff;
      line-height: 1.3;
      padding: 10px;
    }

    /* SECTION 1: PHYSICAL GOODS PALLET LABEL */
    .physical-label-container {
      border: 3px solid #000000;
      border-radius: 4px;
      padding: 18px 22px;
      background: #ffffff;
    }
    .header-row {
      display: flex;
      justify-content: space-between;
      align-items: center;
      border-bottom: 2.5px solid #000000;
      padding-bottom: 12px;
    }
    .company-title {
      font-size: 22px;
      font-weight: 900;
      letter-spacing: 0.05em;
      text-transform: uppercase;
      color: #000000;
    }
    .unit-tag {
      font-size: 15px;
      font-weight: 800;
      background: #000000;
      color: #ffffff;
      padding: 4px 12px;
      border-radius: 3px;
      text-transform: uppercase;
      letter-spacing: 0.04em;
    }

    /* BARCODE DISPLAY AREA */
    .barcode-box {
      margin: 18px 0;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      padding: 12px 10px;
      background: #ffffff;
      border: 1.5px solid #000000;
      border-radius: 4px;
      margin-bottom: 18px;
    }
    .barcode-svg-container {
      display: flex;
      align-items: center;
      justify-content: center;
      width: 100%;
      background: #ffffff;
      padding: 4px 0;
    }
    .barcode-id {
      margin-top: 8px;
      font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
      font-size: 16px;
      font-weight: 800;
      letter-spacing: 0.22em;
      color: #000000;
    }

    /* SPECIFICATIONS GRID */
    .spec-grid {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 16px;
      border-top: 2px solid #000000;
      padding-top: 14px;
    }
    .spec-item {
      display: flex;
      flex-direction: column;
    }
    .spec-label {
      font-size: 11px;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.06em;
      color: #475569;
      margin-bottom: 3px;
    }
    .spec-value {
      font-size: 16px;
      font-weight: 800;
      color: #000000;
      font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
    }

    /* SECTION 2: CUTTING SYMBOLS & DOTTED LINE */
    .cutting-zone {
      margin: 28px 0;
      position: relative;
      text-align: center;
    }
    .cutting-line {
      border-top: 2px dashed #000000;
      width: 100%;
      position: absolute;
      top: 50%;
      left: 0;
      z-index: 1;
    }
    .cutting-notice {
      position: relative;
      z-index: 2;
      display: inline-flex;
      align-items: center;
      background: #ffffff;
      border: 1px solid #475569;
      border-radius: 9999px;
      padding: 4px 18px;
      font-size: 11px;
      font-weight: 800;
      color: #0f172a;
      text-transform: uppercase;
      letter-spacing: 0.08em;
    }

    /* SECTION 3: ADDITIONAL INFORMATION (NOT PASTED ON PHYSICAL GOODS) */
    .additional-info-card {
      border: 1.5px solid #cbd5e1;
      border-radius: 6px;
      background: #f8fafc;
      padding: 16px 20px;
    }
    .additional-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      border-bottom: 1px solid #cbd5e1;
      padding-bottom: 8px;
      margin-bottom: 14px;
    }
    .additional-title {
      font-size: 12px;
      font-weight: 800;
      text-transform: uppercase;
      letter-spacing: 0.06em;
      color: #334155;
    }
    .additional-badge {
      font-size: 10px;
      font-weight: 700;
      color: #64748b;
      text-transform: uppercase;
    }
    .additional-grid {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 20px;
    }
    .info-group-title {
      font-size: 11px;
      font-weight: 700;
      color: #1e293b;
      text-transform: uppercase;
      letter-spacing: 0.04em;
      margin-bottom: 8px;
      border-bottom: 1px dashed #e2e8f0;
      padding-bottom: 4px;
    }
    .info-row {
      display: flex;
      justify-content: space-between;
      font-size: 12px;
      margin-bottom: 5px;
    }
    .info-label {
      color: #64748b;
    }
    .info-val {
      font-weight: 600;
      color: #0f172a;
    }
    .info-val-mono {
      font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
      font-weight: 700;
    }
  </style>
</head>
<body>
  <!-- 1. PHYSICAL GOODS PALLET LABEL -->
  <div class="physical-label-container">
    <div class="header-row">
      <div class="company-title">${company}</div>
      <div class="unit-tag">${unit}</div>
    </div>

    <!-- Barcode with ID Number (Rendered via solid vector SVG) -->
    <div class="barcode-box">
      <div class="barcode-svg-container">
        ${barcodeSvg}
      </div>
      <div class="barcode-id">${escape(data.barcode)}</div>
    </div>

    <!-- Specifications Grid -->
    <div class="spec-grid">
      <div class="spec-item">
        <span class="spec-label">Pallet Identifier</span>
        <span class="spec-value">${escape(data.palletCode)}</span>
      </div>
      <div class="spec-item">
        <span class="spec-label">System Record ID</span>
        <span class="spec-value">${palletIdStr}</span>
      </div>
      <div class="spec-item">
        <span class="spec-label">Stowed Units</span>
        <span class="spec-value">${stowedUnits}</span>
      </div>
      <div class="spec-item">
        <span class="spec-label">Storage Staging Bin</span>
        <span class="spec-value">${stagingBin}</span>
      </div>
    </div>
  </div>

  <!-- 2. CUTTING SYMBOLS & DOTTED LINE -->
  <div class="cutting-zone">
    <div class="cutting-line"></div>
    <div class="cutting-notice">
      <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#000000" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" style="vertical-align:middle;display:inline-block;margin-right:6px;"><circle cx="6" cy="6" r="3"></circle><circle cx="6" cy="18" r="3"></circle><line x1="20" y1="4" x2="8.12" y2="15.88"></line><line x1="14.47" y1="14.48" x2="20" y2="20"></line><line x1="8.12" y1="8.12" x2="12" y2="12"></line></svg>
      CUT ALONG DOTTED LINE — AFFIX UPPER SECTION TO PHYSICAL GOODS
      <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#000000" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" style="vertical-align:middle;display:inline-block;margin-left:6px;"><circle cx="6" cy="6" r="3"></circle><circle cx="6" cy="18" r="3"></circle><line x1="20" y1="4" x2="8.12" y2="15.88"></line><line x1="14.47" y1="14.48" x2="20" y2="20"></line><line x1="8.12" y1="8.12" x2="12" y2="12"></line></svg>
    </div>
  </div>

  <!-- 3. ADDITIONAL INFORMATION (NOT PASTED ON PHYSICAL GOODS) -->
  <div class="additional-info-card">
    <div class="additional-header">
      <span class="additional-title">Warehouse Internal Record & Traceability Reference</span>
      <span class="additional-badge">Retain with Dispatch Docket / File Record</span>
    </div>

    <div class="additional-grid">
      <!-- Storage Location Coordinates -->
      <div>
        <div class="info-group-title">Storage Location Coordinates</div>
        <div class="info-row">
          <span class="info-label">Warehouse Facility:</span>
          <span class="info-val">${warehouse}</span>
        </div>
        <div class="info-row">
          <span class="info-label">Staging Bin Code:</span>
          <span class="info-val info-val-mono">${stagingBin}</span>
        </div>
        <div class="info-row">
          <span class="info-label">Rack / Shelf Coords:</span>
          <span class="info-val">${coordinates}</span>
        </div>
      </div>

      <!-- Production Batch Association -->
      <div>
        <div class="info-group-title">Production Batch Association</div>
        <div class="info-row">
          <span class="info-label">Finished Batch:</span>
          <span class="info-val info-val-mono">${batchNumber}</span>
        </div>
        <div class="info-row">
          <span class="info-label">Product Name:</span>
          <span class="info-val">${product}</span>
        </div>
        <div class="info-row">
          <span class="info-label">Product Code:</span>
          <span class="info-val info-val-mono">${code}</span>
        </div>
        <div class="info-row">
          <span class="info-label">Quality Status:</span>
          <span class="info-val" style="color:#047857;">${qa}</span>
        </div>
      </div>
    </div>
  </div>
</body>
</html>`

  // Use hidden iframe printing for 100% reliable print execution without popup blocker interference
  const iframe = document.createElement('iframe')
  iframe.style.position = 'fixed'
  iframe.style.right = '0'
  iframe.style.bottom = '0'
  iframe.style.width = '0'
  iframe.style.height = '0'
  iframe.style.border = '0'
  document.body.appendChild(iframe)

  const doc = iframe.contentWindow?.document || iframe.contentDocument
  if (!doc || !iframe.contentWindow) {
    // Fallback: window.open
    const printWindow = window.open('', '_blank')
    if (printWindow) {
      printWindow.document.write(printHtml)
      printWindow.document.close()
      printWindow.focus()
      setTimeout(() => {
        printWindow.print()
      }, 250)
    }
    return
  }

  doc.open()
  doc.write(printHtml)
  doc.close()

  setTimeout(() => {
    iframe.contentWindow?.focus()
    iframe.contentWindow?.print()
    setTimeout(() => {
      document.body.removeChild(iframe)
    }, 1000)
  }, 300)
}

export interface ConsignmentNotePayload {
  companyName?: string
  transferNumber: string
  awbNumber: string
  fromWarehouseName: string
  toWarehouseName: string
  transferDate: string
  vehicleNumber?: string
  driverName?: string
  driverPhone?: string
  items: Array<{
    batchNo: string
    materialName?: string
    fromBinCode?: string | null
    toBinCode?: string | null
    quantity: number
    uom?: string
  }>
  totalQuantity: number
  status: string
  estimatedArrival?: string
}

export function printConsignmentNoteDocument(data: ConsignmentNotePayload): void {
  const company = data.companyName || 'SRI VIDHA POLYMERS'
  const vehicle = data.vehicleNumber || 'KA-04-E-8821 (Ashok Leyland Dost)'
  const driver = data.driverName || 'Ramesh Kumar'
  const phone = data.driverPhone || '+91 98452 11094'
  const barcodeSvg = generateBarcodeSvg(data.awbNumber, 60)

  const itemsRows = data.items
    .map(
      (it, idx) => `
    <tr>
      <td style="padding:8px;border-bottom:1px solid #e2e8f0;font-size:12px;font-family:monospace;">${idx + 1}</td>
      <td style="padding:8px;border-bottom:1px solid #e2e8f0;font-size:12px;font-weight:700;font-family:monospace;">${it.batchNo}</td>
      <td style="padding:8px;border-bottom:1px solid #e2e8f0;font-size:12px;">${it.materialName || 'Polymer Compound'}</td>
      <td style="padding:8px;border-bottom:1px solid #e2e8f0;font-size:12px;font-family:monospace;">${it.fromBinCode || '—'} &rarr; ${it.toBinCode || '—'}</td>
      <td style="padding:8px;border-bottom:1px solid #e2e8f0;font-size:12px;font-weight:700;text-align:right;">${Number(it.quantity).toLocaleString()} ${it.uom || 'KGS'}</td>
    </tr>`
    )
    .join('')

  const printHtml = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>Inter-Facility Consignment Note - ${data.awbNumber}</title>
  <style>
    @page { size: A4 portrait; margin: 15mm; }
    body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif; color: #0f172a; margin: 0; padding: 12px; }
    .header-box { border: 2px solid #000; padding: 14px; margin-bottom: 16px; border-radius: 4px; display: flex; justify-content: space-between; align-items: center; }
    .awb-badge { background: #000; color: #fff; padding: 4px 12px; font-weight: 800; font-size: 13px; border-radius: 3px; }
    .section-title { font-size: 12px; font-weight: 800; text-transform: uppercase; letter-spacing: 0.05em; color: #475569; margin-bottom: 6px; }
    .grid-2 { display: grid; grid-template-columns: 1fr 1fr; gap: 14px; margin-bottom: 16px; }
    .card { border: 1px solid #cbd5e1; border-radius: 4px; padding: 12px; background: #f8fafc; }
    table { width: 100%; border-collapse: collapse; margin-top: 8px; margin-bottom: 16px; }
    th { background: #f1f5f9; padding: 8px; font-size: 11px; text-transform: uppercase; letter-spacing: 0.05em; text-align: left; border-bottom: 2px solid #cbd5e1; }
    .footer-signs { display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 20px; margin-top: 40px; text-align: center; }
    .sign-line { border-top: 1.5px solid #000; padding-top: 6px; font-size: 12px; font-weight: 700; text-transform: uppercase; }
  </style>
</head>
<body>
  <div class="header-box">
    <div>
      <div style="font-size:20px;font-weight:900;text-transform:uppercase;letter-spacing:0.04em;">${company}</div>
      <div style="font-size:12px;color:#475569;margin-top:2px;">Inter-Facility Consignment Note &amp; INTER-UNIT AWB DOCKET</div>
    </div>
    <div style="text-align:right;">
      <div class="awb-badge">EXPRESS LOGISTICS</div>
      <div style="font-size:11px;font-family:monospace;font-weight:700;margin-top:4px;">${data.awbNumber}</div>
    </div>
  </div>

  <div style="text-align:center;margin-bottom:16px;border:1px solid #000;padding:8px;border-radius:4px;">
    <div style="margin:0 auto;display:inline-block;">${barcodeSvg}</div>
    <div style="font-family:monospace;font-weight:800;font-size:14px;letter-spacing:0.15em;margin-top:4px;">${data.awbNumber}</div>
  </div>

  <div class="grid-2">
    <div class="card">
      <div class="section-title">Consignment Routing</div>
      <div style="font-size:12px;line-height:1.6;">
        <div><strong>Transfer Manifest:</strong> <span style="font-family:monospace;">${data.transferNumber}</span></div>
        <div><strong>Source Facility:</strong> ${data.fromWarehouseName}</div>
        <div><strong>Destination:</strong> ${data.toWarehouseName}</div>
        <div><strong>Dispatch Date:</strong> ${data.transferDate}</div>
        <div><strong>Status:</strong> <strong>${data.status}</strong></div>
      </div>
    </div>
    <div class="card">
      <div class="section-title">Fleet &amp; Dispatch Details</div>
      <div style="font-size:12px;line-height:1.6;">
        <div><strong>Dedicated Vehicle:</strong> ${vehicle}</div>
        <div><strong>Designated Driver:</strong> ${driver}</div>
        <div><strong>Driver Contact:</strong> ${phone}</div>
        <div><strong>Estimated Arrival:</strong> ${data.estimatedArrival || '35 mins from dispatch'}</div>
      </div>
    </div>
  </div>

  <div class="section-title">Consignment Manifest Items (${data.items.length})</div>
  <table>
    <thead>
      <tr>
        <th style="width:30px;">#</th>
        <th>Batch No</th>
        <th>Material / Item Description</th>
        <th>Route Bins</th>
        <th style="text-align:right;">Net Weight</th>
      </tr>
    </thead>
    <tbody>
      ${itemsRows}
      <tr style="background:#f8fafc;font-weight:800;">
        <td colspan="4" style="padding:10px;text-align:right;font-size:12px;text-transform:uppercase;">Total Consignment Net Weight:</td>
        <td style="padding:10px;text-align:right;font-size:13px;font-family:monospace;">${Number(data.totalQuantity).toLocaleString()} KGS</td>
      </tr>
    </tbody>
  </table>

  <div class="footer-signs">
    <div>
      <div style="height:45px;"></div>
      <div class="sign-line">Consignor Dispatch Signature</div>
    </div>
    <div>
      <div style="height:45px;"></div>
      <div class="sign-line">Driver Acknowledgement</div>
    </div>
    <div>
      <div style="height:45px;"></div>
      <div class="sign-line">Receiving Bay Verification</div>
    </div>
  </div>
</body>
</html>`

  const iframe = document.createElement('iframe')
  iframe.style.position = 'fixed'
  iframe.style.right = '0'
  iframe.style.bottom = '0'
  iframe.style.width = '0'
  iframe.style.height = '0'
  iframe.style.border = '0'
  document.body.appendChild(iframe)

  const doc = iframe.contentWindow?.document || iframe.contentDocument
  if (!doc || !iframe.contentWindow) {
    const printWindow = window.open('', '_blank')
    if (printWindow) {
      printWindow.document.write(printHtml)
      printWindow.document.close()
      printWindow.focus()
      setTimeout(() => {
        printWindow.print()
      }, 250)
    }
    return
  }

  doc.open()
  doc.write(printHtml)
  doc.close()

  setTimeout(() => {
    iframe.contentWindow?.focus()
    iframe.contentWindow?.print()
    setTimeout(() => {
      document.body.removeChild(iframe)
    }, 1000)
  }, 300)
}

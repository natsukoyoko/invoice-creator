// ============================================================
// PDF読み込み・フォーム復元機能
// ============================================================

// PDF.js worker 設定
if (typeof pdfjsLib !== 'undefined') {
    pdfjsLib.GlobalWorkerOptions.workerSrc =
        'https://cdn.jsdelivr.net/npm/pdfjs-dist@3.11.174/build/pdf.worker.min.js';
}

// PDFから全テキストを抽出する（Y座標をもとに実際の行単位で改行を復元する）
async function extractTextFromPdf(file) {
    const arrayBuffer = await file.arrayBuffer();
    const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
    let fullText = '';
    for (let i = 1; i <= pdf.numPages; i++) {
        const page = await pdf.getPage(i);
        const content = await page.getTextContent();
        let lastY = null;
        let line = '';
        content.items.forEach(function(item) {
            const y = item.transform[5];
            if (lastY !== null && Math.abs(y - lastY) > 2) {
                fullText += line.trim() + '\n';
                line = '';
            }
            line += item.str + ' ';
            lastY = y;
        });
        if (line.trim()) fullText += line.trim() + '\n';
    }
    return fullText;
}

// PDFテキストを解析してフォームに復元する
async function parsePdfAndRestore(file) {
    const statusDiv = document.getElementById('pdfRestoreStatus');
    const msgDiv    = document.getElementById('pdfRestoreMsg');
    statusDiv.classList.remove('hidden');
    msgDiv.className = 'text-sm font-medium px-4 py-2 rounded-md bg-blue-100 text-blue-700';
    msgDiv.textContent = '⏳ PDFを解析中...';

    let text;
    try {
        text = await extractTextFromPdf(file);
    } catch(e) {
        msgDiv.className = 'text-sm font-medium px-4 py-2 rounded-md bg-red-100 text-red-700';
        msgDiv.textContent = '❌ PDF読み込みに失敗しました。このフォームで発行したPDFか確認してください。';
        return;
    }

    // このフォームで発行されたPDFかチェック
    if (!text.includes('Invoice') && !text.includes('請求書')) {
        msgDiv.className = 'text-sm font-medium px-4 py-2 rounded-md bg-red-100 text-red-700';
        msgDiv.textContent = '❌ このフォームで発行されたPDFではないようです。';
        return;
    }

    // ---- 請求書番号（-Rなしで復元）----
    const invNoMatch = text.match(/No\.\s*(INV-[\d]+-[\w-]+)/);
    if (invNoMatch) {
        document.getElementById('invoiceNumber').value = invNoMatch[1].replace(/-R$/, '');
    }

    // ---- 請求日 / 支払期限 ----
    const invDateMatch = text.match(/Invoice Date\s*[\/\s請求日:：]*\s*([\d]{4}[-\/\.][\d]{1,2}[-\/\.][\d]{1,2})/);
    if (invDateMatch) {
        const d = invDateMatch[1].replace(/\//g, '-').replace(/\./g, '-');
        const el = document.querySelector('[name="invoiceDate"]');
        if (el) el.value = d;
    }
    const dueDateMatch = text.match(/Due Date\s*[\/\s支払期限:：]*\s*([\d]{4}[-\/\.][\d]{1,2}[-\/\.][\d]{1,2})/);
    if (dueDateMatch) {
        const d = dueDateMatch[1].replace(/\//g, '-').replace(/\./g, '-');
        const el = document.querySelector('[name="dueDate"]');
        if (el) el.value = d;
    }

    // フォームの各項目は1つの<div>＝1行で出力されているため、行単位で照合する
    const allLines = text.split('\n').map(function(l) { return l.trim(); }).filter(Boolean);

    // ---- 担当者（Attn）----
    // "Attn:" とその値は同じ行にあるので、行全体から直接取り出す
    const attnLine = allLines.find(function(l) { return /^Attn[：:]/.test(l); });
    if (attnLine) {
        const m = attnLine.match(/^Attn[：:]\s*(.+)$/);
        if (m) {
            const el = document.querySelector('[name="clientContact"]');
            if (el) el.value = m[1].trim();
        }
    }

    // ---- 発行者情報（FROM セクション）----
    // BILL TO側の固定文言（〒104-0045・Phone: +81 03-6869-7976 等）と誤って
    // マッチしないよう、"FROM" 〜 "Invoice Items" の範囲だけを対象にする
    const fromIdx = text.indexOf('FROM');
    const itemsIdx = text.indexOf('Invoice Items');
    const fromSection = fromIdx !== -1
        ? text.slice(fromIdx, itemsIdx !== -1 ? itemsIdx : undefined)
        : text;
    const fromLines = fromSection.split('\n').map(function(l) { return l.trim(); }).filter(Boolean);

    if (fromSection.includes('Corporation') || fromSection.includes('法人')) {
        const el = document.querySelector('[name="issuerType"]');
        if (el) el.value = 'corporation';
    } else if (fromSection.includes('Sole Proprietor') || fromSection.includes('個人事業主')) {
        const el = document.querySelector('[name="issuerType"]');
        if (el) el.value = 'sole';
    } else if (fromSection.includes('Freelancer') || fromSection.includes('フリーランス')) {
        const el = document.querySelector('[name="issuerType"]');
        if (el) el.value = 'freelance';
    }

    // issuerName・tradeName
    // ラベルを持たないため、「FROM」行（〜あれば発行者区分の行）の次の行を発行者名として扱う
    const issuerTypeLabels = ['Corporation / 法人', 'Sole Proprietor / 個人事業主', 'Freelancer / フリーランス'];
    let fromLineIdx = fromLines.findIndex(function(l) { return l === 'FROM' || l.indexOf('FROM') === 0; });
    if (fromLineIdx !== -1) {
        fromLineIdx++;
        if (fromLineIdx < fromLines.length && issuerTypeLabels.indexOf(fromLines[fromLineIdx]) !== -1) {
            fromLineIdx++;
        }
        if (fromLineIdx < fromLines.length) {
            const el = document.querySelector('[name="issuerName"]');
            if (el) el.value = fromLines[fromLineIdx];
            fromLineIdx++;
        }
        if (fromLineIdx < fromLines.length) {
            const tm = fromLines[fromLineIdx].match(/^\(([^)]+)\)$/);
            if (tm) {
                const el = document.querySelector('[name="tradeName"]');
                if (el) el.value = tm[1].trim();
            }
        }
    }

    // 以降はすべて「ラベル: 値」が1行で完結しているため、行単位でマッチさせる
    let hasCountry = false;
    fromLines.forEach(function(line) {
        let m;
        if ((m = line.match(/^法人番号[：:]\s*([\d]+)/))) {
            const el = document.querySelector('[name="corporateNumber"]');
            if (el) el.value = m[1].trim();
        } else if ((m = line.match(/^適格事業者番号[：:]\s*(T[\d\w-]+)/i))) {
            const el = document.querySelector('[name="issuerTNumber"]');
            if (el) el.value = m[1].trim();
        } else if ((m = line.match(/^Country[：:]\s*(.+)$/))) {
            const el = document.querySelector('[name="countryOfResidence"]');
            if (el) el.value = m[1].trim();
            hasCountry = true;
        } else if ((m = line.match(/^〒([\d\-]+)/))) {
            const el = document.querySelector('[name="postalCode"]');
            if (el) el.value = m[1].trim();
        } else if ((m = line.match(/^Email[：:]\s*([\w.+-]+@[\w.-]+\.[a-zA-Z]{2,})/))) {
            const el = document.querySelector('[name="issuerEmail"]');
            if (el) el.value = m[1].trim();
        } else if ((m = line.match(/^Phone[：:]\s*([+\d\s\-()]+)/))) {
            const el = document.querySelector('[name="issuerPhone"]');
            if (el) el.value = m[1].trim();
        }
    });

    // residesInJapan
    const residesValue = hasCountry ? 'no' : 'yes';
    const radioBtn = document.querySelector('input[name="residesInJapan"][value="' + residesValue + '"]');
    if (radioBtn) {
        radioBtn.checked = true;
        radioBtn.dispatchEvent(new Event('change', { bubbles: true }));
    }

    // ---- 支払い方法 ----
    let detectedPayment = null;
    if (text.includes('Bank Name / 銀行名') && (text.includes('Branch Number') || text.includes('支店番号'))) {
        if (text.includes('SWIFT') || text.includes('IBAN') || text.includes('Recipient')) {
            detectedPayment = 'international';
        } else {
            detectedPayment = 'domestic';
        }
    } else if (text.includes('PayPal')) {
        detectedPayment = 'paypal';
    }

    if (detectedPayment) {
        const pmEl = document.querySelector('[name="paymentMethod"]');
        if (pmEl) {
            pmEl.value = detectedPayment;
            if (typeof showPaymentFields === 'function') showPaymentFields(detectedPayment);
        }

        if (detectedPayment === 'domestic') {
            const fields = {
                domesticBankName:      /Bank Name \/ 銀行名[：:]\s*([^\n]+)/,
                domesticBranchName:    /Branch Name \/ 支店名[：:]\s*([^\n]+)/,
                domesticBranchNumber:  /Branch Number \/ 支店番号[：:]\s*([^\n]+)/,
                domesticAccountType:   /Account Type \/ 口座種別[：:]\s*([^\n]+)/,
                domesticAccountNumber: /Account Number \/ 口座番号[：:]\s*([^\n]+)/,
                domesticAccountHolder: /Account Holder \/ (?:受取人名|口座名義)[：:]\s*([^\n]+)/
            };
            Object.entries(fields).forEach(function([name, regex]) {
                const m = text.match(regex);
                if (m) {
                    const el = document.querySelector('[name="' + name + '"]');
                    if (el) el.value = m[1].trim();
                }
            });
        } else if (detectedPayment === 'international') {
            const fields = {
                intlCountry:               /Recipient's Country \/ 受取人居住国[：:]\s*([^\n]+)/,
                intlEmail:                 /Recipient's Email \/ 受取人メール[：:]\s*([^\n]+)/,
                intlAddress:               /Recipient's Address \/ 受取人住所[：:]\s*([^\n]+)/,
                intlPhone:                 /Recipient's Phone \/ 受取人電話[：:]\s*([^\n]+)/,
                intlDOB:                   /Date of Birth \/ 生年月日[：:]\s*([^\n]+)/,
                intlBankName:              /Bank Name \/ 銀行名[：:]\s*([^\n]+)/,
                intlInstitutionCode:       /Institution Code \/ 金融機関コード[：:]\s*([^\n]+)/,
                intlBranchName:            /Branch Name \/ 支店名[：:]\s*([^\n]+)/,
                intlBankAddress:           /Bank Address \/ 銀行住所[：:]\s*([^\n]+)/,
                intlAccountNumber:         /Account Number・IBAN \/ 口座番号[：:]\s*([^\n]+)/,
                intlSwiftCode:             /SWIFT Code(?:\s*\/\s*SWIFTコード)?[：:]\s*([^\n]+)/,
                intlAccountName:           /Account Holder \/ 口座名義[：:]\s*([^\n]+)/,
                intlAccountType:           /Account Type \/ 口座種別[：:]\s*([^\n]+)/,
                intlAdditionalBankingInfo: /Additional Info \/ その他銀行情報[：:]\s*([^\n]+)/
            };
            Object.entries(fields).forEach(function([name, regex]) {
                const m = text.match(regex);
                if (m) {
                    const el = document.querySelector('[name="' + name + '"]');
                    if (el) el.value = m[1].trim();
                }
            });
        } else if (detectedPayment === 'paypal') {
            const m = text.match(/PayPal (?:Identity|Email)[^：:]*[：:]\s*([^\n]+)/);
            if (m) {
                const el = document.querySelector('[name="paypalEmail"]');
                if (el) el.value = m[1].trim();
            }
        }
    }

    // ---- 請求項目の復元 ----
    const itemContainer = document.getElementById('itemsContainer');
    if (itemContainer) {
        const lines = text.split('\n');
        const headerIdx = lines.findIndex(function(l) {
            return (l.includes('Department') && l.includes('Job Category')) ||
                   (l.includes('部署') && l.includes('業務カテゴリ'));
        });

        if (headerIdx !== -1) {
            // 2行目以降の既存行を削除
            const existingRows = itemContainer.querySelectorAll('.item-row');
            existingRows.forEach(function(row, idx) {
                if (idx > 0) row.remove();
            });

            const dataLines = [];
            for (let i = headerIdx + 1; i < lines.length; i++) {
                const l = lines[i];
                if (!l.trim()) continue;
                if (l.includes('Subtotal / 小計') || l.includes('Total / 合計') ||
                    l.includes('Tax') || l.includes('Withholding') ||
                    l.includes('Payment Information') || l.includes('支払い方法') ||
                    l.includes('Invoice Items') || l.includes('請求項目')) break;
                const amountMatches = l.match(/[¥$€£₩][\d,]+|[\d,]{4,}/g);
                if (amountMatches && amountMatches.length >= 2) {
                    dataLines.push(l);
                }
            }

            for (let rowIdx = 0; rowIdx < dataLines.length; rowIdx++) {
                const line = dataLines[rowIdx];

                if (rowIdx > 0) {
                    const addBtn = document.getElementById('addItemBtn');
                    if (addBtn) addBtn.click();
                }

                const rows = itemContainer.querySelectorAll('.item-row');
                const row = rows[rowIdx];
                if (!row) continue;

                const nums = line.match(/[\d,]+/g) || [];
                const cleanNums = nums
                    .map(function(n) { return parseInt(n.replace(/,/g, ''), 10); })
                    .filter(function(n) { return n > 0; });

                let qty = 1, unitPrice = 0;
                if (cleanNums.length >= 3) {
                    qty       = cleanNums[cleanNums.length - 3];
                    unitPrice = cleanNums[cleanNums.length - 2];
                } else if (cleanNums.length === 2) {
                    qty       = 1;
                    unitPrice = cleanNums[0];
                } else if (cleanNums.length === 1) {
                    unitPrice = cleanNums[0];
                }

                // 部署をセット
                const deptKeys = ['A-01', 'A-02', 'B-01', 'C-01', 'C-02', 'X-01'];
                let deptValue = '';
                for (let k = 0; k < deptKeys.length; k++) {
                    if (line.includes(deptKeys[k])) { deptValue = deptKeys[k]; break; }
                }
                if (deptValue) {
                    const deptSel = row.querySelector('[name="department[]"]');
                    if (deptSel) {
                        deptSel.value = deptValue;
                        deptSel.dispatchEvent(new Event('change', { bubbles: true }));
                    }
                }

                (function(r, q, u, l) {
                    setTimeout(function() {
                        const qtyEl   = r.querySelector('[name="quantity[]"]');
                        const priceEl = r.querySelector('[name="unitPrice[]"]');
                        if (qtyEl)   qtyEl.value = q;
                        if (priceEl) {
                            priceEl.value = u;
                            priceEl.dispatchEvent(new Event('input', { bubbles: true }));
                        }
                        // Job Category をテキストマッチで設定
                        const jobSel = r.querySelector('.item-job-category');
                        if (jobSel) {
                            const lineClean = l.replace(/[★●]/g, '').trim();
                            const matched = Array.from(jobSel.options).find(function(o) {
                                return o.value && lineClean.includes(o.value.substring(0, 8));
                            });
                            if (matched) {
                                jobSel.value = matched.value;
                                jobSel.dispatchEvent(new Event('change', { bubbles: true }));
                            }
                        }
                    }, 150 * rowIdx);
                })(row, qty, unitPrice, line);
            }
        }
    }

    // ---- 完了メッセージ ----
    msgDiv.className = 'text-sm font-medium px-4 py-2 rounded-md bg-green-100 text-green-700';
    msgDiv.textContent = '✅ PDFからフォームを復元しました！内容を確認し、必要であれば「再発行」ボタンを押してください。';

    // localStorageに保存（発行者・銀行情報を引き継ぎ）
    if (typeof saveFormData === 'function') saveFormData();
}

// ドロップゾーンのイベント設定（DOMContentLoaded後に呼び出す）
function initPdfDropZone() {
    const pdfInput    = document.getElementById('pdfFileInput');
    const pdfDropZone = document.getElementById('pdfDropZone');
    if (!pdfInput || !pdfDropZone) return;

    pdfInput.addEventListener('change', function() {
        if (this.files && this.files[0]) {
            parsePdfAndRestore(this.files[0]);
            this.value = '';
        }
    });

    pdfDropZone.addEventListener('dragover', function(e) {
        e.preventDefault();
        this.classList.add('bg-indigo-100', 'border-indigo-500');
    });
    pdfDropZone.addEventListener('dragleave', function() {
        this.classList.remove('bg-indigo-100', 'border-indigo-500');
    });
    pdfDropZone.addEventListener('drop', function(e) {
        e.preventDefault();
        this.classList.remove('bg-indigo-100', 'border-indigo-500');
        const file = e.dataTransfer.files[0];
        if (file && file.type === 'application/pdf') {
            parsePdfAndRestore(file);
        } else {
            const msgDiv = document.getElementById('pdfRestoreMsg');
            document.getElementById('pdfRestoreStatus').classList.remove('hidden');
            msgDiv.className = 'text-sm font-medium px-4 py-2 rounded-md bg-red-100 text-red-700';
            msgDiv.textContent = '❌ PDFファイルのみ対応しています。';
        }
    });
}

// ============================================================
// PDF読み込み・フォーム復元機能
// ============================================================

// PDF.js worker 設定
if (typeof pdfjsLib !== 'undefined') {
    pdfjsLib.GlobalWorkerOptions.workerSrc =
        'https://cdn.jsdelivr.net/npm/pdfjs-dist@3.11.174/build/pdf.worker.min.js';
}

// ブラウザの印刷→PDF変換の際、フォントのToUnicode CMapの都合で一部の漢字が
// 見た目は同じだが別のUnicode（康熙部首）に置き換わって出力されることがある
// （例: 人→⼈、日→⽇、支→⽀、子→⼦、目→⽬）。自前のラベル文字列の照合が
// 失敗しないよう、該当箇所は正規表現内で両方の文字を許容する。
const RADICAL_VARIANTS = { '人': '⼈', '日': '⽇', '支': '⽀', '子': '⼦', '目': '⽬' };
// 抽出したテキスト・値の中の康熙部首文字を標準の漢字に戻す（表示・照合の両方で使う）
function normalizeRadicals(str) {
    return str.replace(/[⼈⽇⽀⼦⽬]/g, function(ch) {
        return Object.keys(RADICAL_VARIANTS).find(function(k) { return RADICAL_VARIANTS[k] === ch; });
    });
}
function tolerantPattern(label) {
    return label.replace(/[\s\S]/g, function(ch) {
        const variant = RADICAL_VARIANTS[ch];
        if (variant) return '[' + ch + variant + ']';
        return ch.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    });
}

// Y座標が近いアイテム群を1行のテキストにまとめる（Y降順で処理する）。
// PDF.jsは同じ単語内でも1文字ごとに別アイテムとして返すことが多いが、
// アイテム間の実際の隙間（空白アイテムやX座標のギャップ）は既にstrに
// 含まれているため、ここで余分な空白を追加してはならない。
function buildLinesFromItems(items) {
    const sorted = items.slice().sort(function(a, b) { return b.transform[5] - a.transform[5]; });
    let lastY = null;
    let line = '';
    let out = '';
    sorted.forEach(function(item) {
        const y = item.transform[5];
        if (lastY !== null && Math.abs(y - lastY) > 2) {
            out += line.trim() + '\n';
            line = '';
        }
        line += item.str;
        lastY = y;
    });
    if (line.trim()) out += line.trim() + '\n';
    return out;
}

// 請求項目テーブルを行・列単位で抽出する。
// 表は横幅が内容に応じて可変（table-layout: auto）のため、業務カテゴリ名や
// タスク詳細が長いと見出し・データのどちらも複数行に折り返る。そのため、
// 「同じY座標＝同じ行」という単純な仮定は成立しない。代わりに、
// (1) 列見出しは折り返っても先頭の単語は分割されないため、先頭の単語で
//     列のX座標境界を特定し、
// (2) 各データ行の開始は必ず部署コード（A-01等）で始まるため、これを
//     行の境切りとして使い、次の部署コードが現れるまでの全アイテムを
//     1行分として扱う。
// という2段構えで、折り返りの影響を受けずに列を特定する。
function extractItemRows(items) {
    const DEPT_KEYS = ['A-01', 'A-02', 'B-01', 'C-01', 'C-02', 'X-01'];
    const colAnchors = [
        { key: 'department',  word: 'Department' },
        { key: 'jobCategory', word: 'Job' },
        { key: 'taskDetails', word: 'Task' },
        { key: 'project',     word: 'Project' },
        { key: 'delivery',    word: 'Delivery' },
        { key: 'qty',         word: 'Qty' },
        { key: 'unitPrice',   word: 'Unit' },
        { key: 'subtotal',    word: 'Subtotal' }
    ];

    const itemsHeaderItem = items.find(function(it) { return it.str.indexOf('Invoice Items') !== -1; });
    if (!itemsHeaderItem) return [];
    const tableTopY = itemsHeaderItem.transform[5];

    // 表の終端（★=...の注記や小計行）のYを境界として、見出し・項目行の探索範囲を絞る
    const endCandidates = items.filter(function(it) {
        return it.transform[5] < tableTopY - 5 &&
            (it.str.indexOf('Subtotal /') === 0 || it.str.indexOf('= Subject') !== -1 || it.str.indexOf('= No Tax') !== -1);
    });
    const endY = endCandidates.length
        ? Math.max.apply(null, endCandidates.map(function(it) { return it.transform[5]; }))
        : -Infinity;

    // 列見出しは先頭の単語（Department/Job/Task/Project/Delivery/Qty/Unit/Subtotal）
    // で判定する。折り返っていなければラベル全体がこの単語で始まる形でマッチする。
    const headerAnchorItems = colAnchors.map(function(c) {
        return items.find(function(it) {
            return it.transform[5] < tableTopY + 2 && it.transform[5] > endY && it.str.trim().indexOf(c.word) === 0;
        });
    });
    if (headerAnchorItems.some(function(it) { return !it; })) return [];

    const boundaries = headerAnchorItems
        .map(function(it, idx) { return { key: colAnchors[idx].key, x: it.transform[4] }; })
        .sort(function(a, b) { return a.x - b.x; });
    // Department〜Deliveryは左寄せの自由記述で、業務カテゴリ等が長いと折り返って
    // 見出しの直下より右まで文字が続くことがあるため、「超えない最大の見出しX座標」
    // で判定する。一方Qty/Unit Price/Subtotalは右寄せで値が短いため、見出しの
    // X座標と値のX座標がずれる。そのため右寄せ3列は「最も近い見出し」で判定する。
    const RIGHT_ALIGNED_KEYS = ['qty', 'unitPrice', 'subtotal'];
    const leftBoundaries = boundaries.filter(function(b) { return RIGHT_ALIGNED_KEYS.indexOf(b.key) === -1; });
    const rightBoundaries = boundaries.filter(function(b) { return RIGHT_ALIGNED_KEYS.indexOf(b.key) !== -1; });
    const deliveryBoundary = boundaries.find(function(b) { return b.key === 'delivery'; });
    const qtyBoundary = boundaries.find(function(b) { return b.key === 'qty'; });
    const regionSplitX = (deliveryBoundary.x + qtyBoundary.x) / 2;
    function columnForX(x) {
        if (x < regionSplitX) {
            let colKey = leftBoundaries[0].key;
            for (let bi = 0; bi < leftBoundaries.length; bi++) {
                if (x >= leftBoundaries[bi].x - 2) colKey = leftBoundaries[bi].key;
            }
            return colKey;
        }
        let nearest = rightBoundaries[0];
        rightBoundaries.forEach(function(b) {
            if (Math.abs(x - b.x) < Math.abs(x - nearest.x)) nearest = b;
        });
        return nearest.key;
    }
    const deptX = headerAnchorItems[0].transform[4];

    // 部署コードのセルを行の開始位置として使う
    const rowStarts = items
        .filter(function(it) {
            return DEPT_KEYS.indexOf(it.str.trim()) !== -1 &&
                Math.abs(it.transform[4] - deptX) < 5 &&
                it.transform[5] < tableTopY - 5 &&
                it.transform[5] > endY;
        })
        .sort(function(a, b) { return b.transform[5] - a.transform[5]; });
    if (rowStarts.length === 0) return [];

    return rowStarts.map(function(startItem, i) {
        const rowTopY = startItem.transform[5] + 2;
        const rowBottomY = (i + 1 < rowStarts.length) ? rowStarts[i + 1].transform[5] + 2 : endY;

        const rowItems = items.filter(function(it) {
            const y = it.transform[5];
            return y <= rowTopY && y > rowBottomY && it.str.trim() !== '';
        });

        // 列に振り分け、同じ列内で複数行に折り返っている場合は行の切れ目に
        // スペースを補って連結する（折り返り位置には元々空白があったはず）
        const cols = {};
        colAnchors.forEach(function(c) { cols[c.key] = { text: '', lastY: null }; });
        rowItems
            .slice()
            .sort(function(a, b) {
                if (Math.abs(a.transform[5] - b.transform[5]) > 2) return b.transform[5] - a.transform[5];
                return a.transform[4] - b.transform[4];
            })
            .forEach(function(it) {
                const colKey = columnForX(it.transform[4]);
                const col = cols[colKey];
                if (col.lastY !== null && Math.abs(it.transform[5] - col.lastY) > 2) {
                    col.text += ' ';
                }
                col.text += it.str;
                col.lastY = it.transform[5];
            });

        const result = {};
        colAnchors.forEach(function(c) { result[c.key] = cols[c.key].text.trim(); });
        return result;
    });
}

// PDFから全テキストと請求項目の行データを抽出する。
// 通常の1カラム部分はY座標をもとに実際の行単位で改行を復元する。
// BILL TO / FROM はCSS Gridの2カラムレイアウトのため、PDF内では視覚的な行順
// （左右のカラムが交互）でテキストが並ぶことがある。そのままY座標だけで行を
// 復元すると左右の内容が混ざってしまうため、この区間だけはX座標で列を分離
// してから行を復元する（BILL TO側を全て出力してからFROM側を出力する）。
async function extractTextFromPdf(file) {
    const arrayBuffer = await file.arrayBuffer();
    const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
    let fullText = '';
    let itemRows = [];
    for (let i = 1; i <= pdf.numPages; i++) {
        const page = await pdf.getPage(i);
        const content = await page.getTextContent();

        const billToItem = content.items.find(function(it) { return it.str.includes('BILL TO'); });
        const fromItem = content.items.find(function(it) { return it.str.trim() === 'FROM'; });
        const itemsHeaderItem = content.items.find(function(it) { return it.str.includes('Invoice Items'); });

        if (billToItem && fromItem && itemsHeaderItem) {
            const billToY = billToItem.transform[5];
            const itemsHeaderY = itemsHeaderItem.transform[5];
            const midX = (billToItem.transform[4] + fromItem.transform[4]) / 2;

            const beforeItems = [];
            const leftItems  = [];
            const rightItems = [];
            const afterItems = [];

            content.items.forEach(function(item) {
                const y = item.transform[5];
                if (y > billToY + 2) {
                    beforeItems.push(item);
                } else if (y > itemsHeaderY + 2) {
                    if (item.transform[4] < midX) leftItems.push(item); else rightItems.push(item);
                } else {
                    afterItems.push(item);
                }
            });

            fullText += buildLinesFromItems(beforeItems);
            fullText += buildLinesFromItems(leftItems);
            fullText += buildLinesFromItems(rightItems);
            fullText += buildLinesFromItems(afterItems);
        } else {
            fullText += buildLinesFromItems(content.items);
        }

        itemRows = itemRows.concat(extractItemRows(content.items));
    }
    return { text: fullText, itemRows: itemRows };
}

// PDFテキストを解析してフォームに復元する
async function parsePdfAndRestore(file) {
    const statusDiv = document.getElementById('pdfRestoreStatus');
    const msgDiv    = document.getElementById('pdfRestoreMsg');
    statusDiv.classList.remove('hidden');
    msgDiv.className = 'text-sm font-medium px-4 py-2 rounded-md bg-blue-100 text-blue-700';
    msgDiv.textContent = '⏳ PDFを解析中...';

    let text, itemRows;
    try {
        const extracted = await extractTextFromPdf(file);
        text = normalizeRadicals(extracted.text);
        itemRows = extracted.itemRows.map(function(row) {
            const normalized = {};
            Object.keys(row).forEach(function(k) { normalized[k] = normalizeRadicals(row[k]); });
            return normalized;
        });
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

    // フォームの各項目は1つの<div>＝1行で出力されているため、行単位で照合する
    const allLines = text.split('\n').map(function(l) { return l.trim(); }).filter(Boolean);

    // ---- 請求書番号（-Rなしで復元）----
    const invNoMatch = text.match(/No\.\s*(INV-[\d]+-[\w-]+)/);
    if (invNoMatch) {
        document.getElementById('invoiceNumber').value = invNoMatch[1].replace(/-R$/, '');
    }

    // ---- 請求日 / 支払期限 ----
    // ラベルと値は<br>で改行されているため別の行になる。タイトル部分と請求日欄は
    // 横並びのため、PDF内では両者の行が前後することがあるので、ラベル行より後ろの
    // 範囲（BILL TOより手前）を順に探して最初に見つかった日付を値とする
    // （ラベルの日本語部分は文字化けの影響を受けうるため英語部分のみで判定する）。
    const billToLineIdx = allLines.findIndex(function(l) { return l.indexOf('BILL TO') === 0; });
    const headerLines = billToLineIdx !== -1 ? allLines.slice(0, billToLineIdx) : allLines;
    function dateAfterLabel(labelPrefix) {
        const idx = headerLines.findIndex(function(l) { return l.indexOf(labelPrefix) === 0; });
        if (idx === -1) return null;
        for (let i = idx + 1; i < headerLines.length; i++) {
            const m = headerLines[i].match(/([\d]{4})[-\/\.]([\d]{1,2})[-\/\.]([\d]{1,2})/);
            if (m) return m[1] + '-' + m[2].padStart(2, '0') + '-' + m[3].padStart(2, '0');
        }
        return null;
    }
    const invoiceDateValue = dateAfterLabel('Invoice Date');
    if (invoiceDateValue) {
        const el = document.querySelector('[name="invoiceDate"]');
        if (el) el.value = invoiceDateValue;
    }
    const dueDateValue = dateAfterLabel('Due Date');
    if (dueDateValue) {
        const el = document.querySelector('[name="dueDate"]');
        if (el) el.value = dueDateValue;
    }

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

    // 発行者タイプは "英語ラベル / 日本語ラベル" の形式で必ず英語部分が出力される
    // ため、文字化けの影響を受けない英語部分だけで判定する。
    const issuerTypeDefs = [
        { key: 'corporation', prefix: 'Corporation' },
        { key: 'sole',        prefix: 'Sole Proprietor' },
        { key: 'freelance',   prefix: 'Freelancer' }
    ];
    const issuerTypeLineIdx = fromLines.findIndex(function(l) {
        return issuerTypeDefs.some(function(d) { return l.indexOf(d.prefix) === 0; });
    });
    if (issuerTypeLineIdx !== -1) {
        const def = issuerTypeDefs.find(function(d) { return fromLines[issuerTypeLineIdx].indexOf(d.prefix) === 0; });
        const el = document.querySelector('[name="issuerType"]');
        if (el) el.value = def.key;
    }

    // issuerName・tradeName
    // ラベルを持たないため、「FROM」行（〜あれば発行者区分の行）の次の行を発行者名として扱う
    const claimedIdx = {};
    let fromLineIdx = fromLines.findIndex(function(l) { return l === 'FROM' || l.indexOf('FROM') === 0; });
    if (fromLineIdx !== -1) {
        claimedIdx[fromLineIdx] = true;
        fromLineIdx++;
        if (fromLineIdx === issuerTypeLineIdx) {
            claimedIdx[fromLineIdx] = true;
            fromLineIdx++;
        }
        if (fromLineIdx < fromLines.length) {
            const el = document.querySelector('[name="issuerName"]');
            if (el) el.value = fromLines[fromLineIdx];
            claimedIdx[fromLineIdx] = true;
            fromLineIdx++;
        }
        if (fromLineIdx < fromLines.length) {
            const tm = fromLines[fromLineIdx].match(/^\(([^)]+)\)$/);
            if (tm) {
                const el = document.querySelector('[name="tradeName"]');
                if (el) el.value = tm[1].trim();
                claimedIdx[fromLineIdx] = true;
            }
        }
    }

    // 以降はすべて「ラベル: 値」が1行で完結しているため、行単位でマッチさせる
    const corpNumRe = new RegExp('^' + tolerantPattern('法人番号') + '[：:]\\s*([\\d]+)');
    const tNumRe = new RegExp('^' + tolerantPattern('適格事業者番号') + '[：:]\\s*(T[\\d\\w-]+)', 'i');
    let hasCountry = false;
    let emailLineIdx = -1;
    fromLines.forEach(function(line, idx) {
        let m;
        if ((m = line.match(corpNumRe))) {
            const el = document.querySelector('[name="corporateNumber"]');
            if (el) el.value = m[1].trim();
            claimedIdx[idx] = true;
        } else if ((m = line.match(tNumRe))) {
            const el = document.querySelector('[name="issuerTNumber"]');
            if (el) el.value = m[1].trim();
            claimedIdx[idx] = true;
        } else if ((m = line.match(/^Country[：:]\s*(.+)$/))) {
            const el = document.querySelector('[name="countryOfResidence"]');
            if (el) el.value = m[1].trim();
            hasCountry = true;
            claimedIdx[idx] = true;
        } else if ((m = line.match(/^〒([\d\-]+)/))) {
            const el = document.querySelector('[name="postalCode"]');
            if (el) el.value = m[1].trim();
            claimedIdx[idx] = true;
        } else if ((m = line.match(/^Email[：:]\s*([\w.+-]+@[\w.-]+\.[a-zA-Z]{2,})/))) {
            const el = document.querySelector('[name="issuerEmail"]');
            if (el) el.value = m[1].trim();
            claimedIdx[idx] = true;
            emailLineIdx = idx;
        } else if ((m = line.match(/^Phone[：:]\s*([+\d\s\-()]+)/))) {
            const el = document.querySelector('[name="issuerPhone"]');
            if (el) el.value = m[1].trim();
            claimedIdx[idx] = true;
        }
    });

    // issuerAddress
    // ラベルを持たず、氏名/屋号より後・Emailより前に残る未使用の行（複数行の場合あり）が住所
    if (emailLineIdx !== -1) {
        const addressLines = [];
        for (let i = 0; i < emailLineIdx; i++) {
            if (!claimedIdx[i] && fromLines[i]) addressLines.push(fromLines[i]);
        }
        if (addressLines.length > 0) {
            const el = document.querySelector('[name="issuerAddress"]');
            if (el) el.value = addressLines.join('\n');
        }
    }

    // residesInJapan
    const residesValue = hasCountry ? 'no' : 'yes';
    const radioBtn = document.querySelector('input[name="residesInJapan"][value="' + residesValue + '"]');
    if (radioBtn) {
        radioBtn.checked = true;
        radioBtn.dispatchEvent(new Event('change', { bubbles: true }));
    }

    // ---- 支払い方法 ----
    let detectedPayment = null;
    if (text.includes('Bank Name / 銀行名') && (text.includes('Branch Number') || text.match(tolerantPattern('支店番号')))) {
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
                domesticBankName:      new RegExp('Bank Name \\/ 銀行名[：:]\\s*([^\\n]+)'),
                domesticBranchName:    new RegExp('Branch Name \\/ ' + tolerantPattern('支店名') + '[：:]\\s*([^\\n]+)'),
                domesticBranchNumber:  new RegExp('Branch Number \\/ ' + tolerantPattern('支店番号') + '[：:]\\s*([^\\n]+)'),
                domesticAccountType:   new RegExp('Account Type \\/ 口座種別[：:]\\s*([^\\n]+)'),
                domesticAccountNumber: new RegExp('Account Number \\/ 口座番号[：:]\\s*([^\\n]+)'),
                domesticAccountHolder: new RegExp('Account Holder \\/ (?:' + tolerantPattern('受取人名') + '|口座名義)[：:]\\s*([^\\n]+)')
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
                intlCountry:               new RegExp('Recipient\'s Country \\/ ' + tolerantPattern('受取人居住国') + '[：:]\\s*([^\\n]+)'),
                intlEmail:                 new RegExp('Recipient\'s Email \\/ ' + tolerantPattern('受取人') + 'メール[：:]\\s*([^\\n]+)'),
                intlAddress:               new RegExp('Recipient\'s Address \\/ ' + tolerantPattern('受取人住所') + '[：:]\\s*([^\\n]+)'),
                intlPhone:                 new RegExp('Recipient\'s Phone \\/ ' + tolerantPattern('受取人電話') + '[：:]\\s*([^\\n]+)'),
                intlDOB:                   new RegExp('Date of Birth \\/ ' + tolerantPattern('生年月日') + '[：:]\\s*([^\\n]+)'),
                intlBankName:              new RegExp('Bank Name \\/ 銀行名[：:]\\s*([^\\n]+)'),
                intlInstitutionCode:       new RegExp('Institution Code \\/ 金融機関コード[：:]\\s*([^\\n]+)'),
                intlBranchName:            new RegExp('Branch Name \\/ ' + tolerantPattern('支店名') + '[：:]\\s*([^\\n]+)'),
                intlBankAddress:           new RegExp('Bank Address \\/ 銀行住所[：:]\\s*([^\\n]+)'),
                intlAccountNumber:         new RegExp('Account Number・IBAN \\/ 口座番号[：:]\\s*([^\\n]+)'),
                intlSwiftCode:             new RegExp('SWIFT Code(?:\\s*\\/\\s*SWIFTコード)?[：:]\\s*([^\\n]+)'),
                intlAccountName:           new RegExp('Account Holder \\/ 口座名義[：:]\\s*([^\\n]+)'),
                intlAccountType:           new RegExp('Account Type \\/ 口座種別[：:]\\s*([^\\n]+)'),
                intlAdditionalBankingInfo: new RegExp('Additional Info \\/ その他銀行情報[：:]\\s*([^\\n]+)')
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
    // 表のX座標から列単位で抽出したitemRowsを使うことで、タスク詳細・
    // プロジェクト名のような自由記述項目も含めて正確に復元できる。
    const itemContainer = document.getElementById('itemsContainer');
    if (itemContainer && itemRows.length > 0) {
        const existingRows = itemContainer.querySelectorAll('.item-row');
        existingRows.forEach(function(row, idx) {
            if (idx > 0) row.remove();
        });

        const deptKeys = ['A-01', 'A-02', 'B-01', 'C-01', 'C-02', 'X-01'];

        itemRows.forEach(function(data, rowIdx) {
            if (rowIdx > 0) {
                const addBtn = document.getElementById('addItemBtn');
                if (addBtn) addBtn.click();
            }

            const rows = itemContainer.querySelectorAll('.item-row');
            const row = rows[rowIdx];
            if (!row) return;

            const deptValue = deptKeys.find(function(k) { return data.department.indexOf(k) !== -1; });
            if (deptValue) {
                const deptSel = row.querySelector('[name="department[]"]');
                if (deptSel) {
                    deptSel.value = deptValue;
                    deptSel.dispatchEvent(new Event('change', { bubbles: true }));
                }
            }

            const qty = parseFloat(data.qty.replace(/[^\d.]/g, '')) || 1;
            const unitPrice = parseFloat(data.unitPrice.replace(/[^\d.]/g, '')) || 0;

            (function(r, q, u, jobCategoryText, taskDetails, projectName) {
                setTimeout(function() {
                    const qtyEl   = r.querySelector('[name="quantity[]"]');
                    const priceEl = r.querySelector('[name="unitPrice[]"]');
                    const taskEl  = r.querySelector('[name="taskDetails[]"]');
                    const projEl  = r.querySelector('[name="projectName[]"]');
                    if (qtyEl) qtyEl.value = q;
                    if (priceEl) {
                        priceEl.value = u;
                        priceEl.dispatchEvent(new Event('input', { bubbles: true }));
                    }
                    if (taskEl) taskEl.value = taskDetails;
                    if (projEl) projEl.value = projectName;

                    const jobSel = r.querySelector('.item-job-category');
                    if (jobSel) {
                        // 列の折り返り復元時に空白が失われることがあるため、
                        // 空白を除いた文字列同士で前方一致を判定する
                        const lineClean = jobCategoryText.replace(/[★●\s]/g, '');
                        const matched = Array.from(jobSel.options).find(function(o) {
                            return o.value && lineClean.includes(o.value.replace(/\s/g, '').substring(0, 8));
                        });
                        if (matched) {
                            jobSel.value = matched.value;
                            jobSel.dispatchEvent(new Event('change', { bubbles: true }));
                        }
                    }
                }, 150 * rowIdx);
            })(row, qty, unitPrice, data.jobCategory, data.taskDetails, data.project);
        });
    }

    // ---- 備考 ----
    // "Notes / 備考:" 見出し（英語部分で判定）の後ろに続く行を、宣誓文の注記が
    // 始まる手前まで連結する
    const notesLineIdx = allLines.findIndex(function(l) { return l.indexOf('Notes') === 0; });
    if (notesLineIdx !== -1) {
        const notesLines = [];
        for (let i = notesLineIdx + 1; i < allLines.length; i++) {
            if (/^✓|^Declaration/.test(allLines[i])) break;
            notesLines.push(allLines[i]);
        }
        if (notesLines.length > 0) {
            const el = document.querySelector('[name="notes"]');
            if (el) el.value = notesLines.join('\n');
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

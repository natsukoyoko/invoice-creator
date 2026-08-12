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
// 康熙部首 → 通常漢字 の対応表（PDFフォント変換で発生するすべての置換を網羅）
const RADICAL_VARIANTS = {
    '人': '⼈', '日': '⽇', '支': '⽀', '子': '⼦', '目': '⽬',
    '行': '⾏', '八': '⼋', '金': '⾦', '比': '⽐', '口': '⼝',
    '小': '⼩', '入': '⼊', '手': '⼿', '用': '⽤'
};
// 逆引きマップ（康熙部首 → 通常漢字）を事前生成して高速化
const RADICAL_REVERSE = {};
Object.keys(RADICAL_VARIANTS).forEach(function(k) { RADICAL_REVERSE[RADICAL_VARIANTS[k]] = k; });
// 抽出したテキスト・値の中の康熙部首文字を標準の漢字に戻す（表示・照合の両方で使う）
function normalizeRadicals(str) {
    return str.replace(/[⼈⽇⽀⼦⽬⾏⼋⾦⽐⼝⼩⼊⼿⽤]/g, function(ch) {
        return RADICAL_REVERSE[ch] || ch;
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

// 請求サマリーテーブル（作業報告書付きPDF専用）を行・列単位で抽出する。
// 列構成: Department / Job Category / Qty / Amount（Unit Price・Task・Projectなし）
// 「Invoice Summary」見出しから「Payment Information」までの範囲が対象。
function extractSummaryRows(items) {
    const DEPT_KEYS = ['A-01', 'A-02', 'B-01', 'C-01', 'C-02', 'X-01'];

    // 「Invoice Summary」を含むアイテムのYを上端とする
    const summaryHeaderItem = items.find(function(it) {
        return it.str.indexOf('Invoice Summary') !== -1;
    });
    if (!summaryHeaderItem) return [];
    const tableTopY = summaryHeaderItem.transform[5];

    // 「Payment Information」のYを下端とする
    const paymentInfoItem = items.find(function(it) {
        return it.str.indexOf('Payment Information') !== -1 ||
               it.str.indexOf('Subtotal /') === 0;
    });
    const endY = paymentInfoItem ? paymentInfoItem.transform[5] + 2 : tableTopY - 200;

    // 列ヘッダーのX座標を特定
    const deptHeader    = items.find(function(it) { return it.transform[5] < tableTopY + 2 && it.transform[5] > endY && it.str.indexOf('Department') === 0; });
    const jobHeader     = items.find(function(it) { return it.transform[5] < tableTopY + 2 && it.transform[5] > endY && it.str.indexOf('Job Category') === 0; });
    const qtyHeader     = items.find(function(it) { return it.transform[5] < tableTopY + 2 && it.transform[5] > endY && it.str.indexOf('Qty') === 0; });
    const amountHeader  = items.find(function(it) { return it.transform[5] < tableTopY + 2 && it.transform[5] > endY && it.str.indexOf('Amount') === 0; });

    if (!deptHeader || !jobHeader || !qtyHeader || !amountHeader) return [];

    const deptX    = deptHeader.transform[4];
    const jobX     = jobHeader.transform[4];
    const qtyX     = qtyHeader.transform[4];
    const amountX  = amountHeader.transform[4];

    // 部署コード（A-01等）が来るアイテムを行の開始マーカーとして使う
    const rowStarts = items
        .filter(function(it) {
            return DEPT_KEYS.indexOf(it.str.trim()) !== -1 &&
                Math.abs(it.transform[4] - deptX) < 10 &&
                it.transform[5] < tableTopY - 5 &&
                it.transform[5] > endY;
        })
        .sort(function(a, b) { return b.transform[5] - a.transform[5]; });

    if (rowStarts.length === 0) return [];

    // ※注記行（「※」や「See detailed breakdown」等）のY座標を検出して
    // 各データ行の下端を注記行より上に設定する
    const remarkItem = items.find(function(it) {
        return it.str.indexOf('※') === 0 || it.str.indexOf('See detailed breakdown') === 0;
    });
    const remarkY = remarkItem ? remarkItem.transform[5] : null;

    return rowStarts.map(function(startItem, i) {
        const rowTopY = startItem.transform[5] + 2;
        let rowBottomY;
        if (i + 1 < rowStarts.length) {
            rowBottomY = rowStarts[i + 1].transform[5] + 2;
        } else if (remarkY !== null) {
            // 最終データ行の下端は注記行の少し上まで
            rowBottomY = remarkY + 1;
        } else {
            rowBottomY = endY;
        }

        const rowItems = items.filter(function(it) {
            const y = it.transform[5];
            // 注記行（※で始まるアイテム）は除外
            if (it.str.indexOf('※') === 0) return false;
            return y <= rowTopY && y > rowBottomY && it.str.trim() !== '';
        });

        // 列に振り分け（X座標で判定）
        const cols = { department: '', jobCategory: '', qty: '', amount: '' };
        rowItems
            .slice()
            .sort(function(a, b) {
                if (Math.abs(a.transform[5] - b.transform[5]) > 2) return b.transform[5] - a.transform[5];
                return a.transform[4] - b.transform[4];
            })
            .forEach(function(it) {
                const x = it.transform[4];
                // amountX（右端）に最も近い → amount列
                // qtyX に近い → qty列
                // jobX 以上 amountX 未満 → jobCategory列
                // deptX 付近 → department列
                if (Math.abs(x - amountX) < 30) {
                    cols.amount += it.str;
                } else if (Math.abs(x - qtyX) < 20) {
                    cols.qty += it.str;
                } else if (x >= jobX - 5) {
                    cols.jobCategory += it.str;
                } else {
                    cols.department += it.str;
                }
            });

        // department列から先頭の部署コード（A-01等）だけを取り出す
        const deptCodeMatch = cols.department.match(/^([A-Z]-\d{2})\s*(.*)/);
        const deptCode    = deptCodeMatch ? deptCodeMatch[1] : cols.department.trim();
        const deptSuffix  = deptCodeMatch ? deptCodeMatch[2].trim() : '';

        return {
            department:  deptCode + (deptSuffix ? ' ' + deptSuffix : ''),
            jobCategory: cols.jobCategory.trim(),
            qty:         cols.qty.replace(/[^\d.]/g, ''),
            amount:      cols.amount.replace(/[¥$€£₩,]/g, '').trim()
        };
    });
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

// 作業報告書（2ページ目以降）の詳細行を抽出する。
// 列構成: No. / Task / Project / Delivery / Qty / Unit Price / Subtotal
// 部署セクションの見出し（■ A-01 ソリューション | PM業務...）で分割されている場合でも、
// 全セクションを走査して行番号1始まりの行データをまとめて返す。
// 戻り値: { department, jobCategory, taskDetails, projectName, qty, unitPrice }[] の配列
function extractWorkReportRows(items) {
    // ヘッダ行を特定（No. / Task / Project / Delivery / Qty / Unit Price / Subtotal）
    const noHeader       = items.find(function(it) { return it.str.trim() === 'No.'; });
    const taskHeader     = items.find(function(it) { return it.str.indexOf('Task /') === 0; });
    const projectHeader  = items.find(function(it) { return it.str.indexOf('Project /') === 0; });
    const deliveryHeader = items.find(function(it) { return it.str.indexOf('Delivery /') === 0; });
    const qtyHeader      = items.find(function(it) { return it.str.indexOf('Qty /') === 0; });
    const unitPriceHeader= items.find(function(it) { return it.str.indexOf('Unit Price /') === 0; });
    const subtotalHeader = items.find(function(it) { return it.str.indexOf('Subtotal /') === 0; });

    if (!noHeader || !taskHeader || !unitPriceHeader) return [];

    const headerY    = noHeader.transform[5];
    const noX        = noHeader.transform[4];       // ≈74
    const taskX      = taskHeader.transform[4];     // ≈87
    const projectX   = projectHeader ? projectHeader.transform[4] : taskX + 86;   // ≈173
    const deliveryX  = deliveryHeader ? deliveryHeader.transform[4] : projectX + 102; // ≈275
    const qtyX       = qtyHeader ? qtyHeader.transform[4] : deliveryX + 103;      // ≈378
    const unitPriceX = unitPriceHeader.transform[4]; // ≈420
    const subtotalX  = subtotalHeader ? subtotalHeader.transform[4] : unitPriceX + 60; // ≈480

    // 列境界（各列の右端＝次の列の左端付近）を定義
    // noX → taskX境界, taskX → projectX境界, projectX → deliveryX境界, ...
    function colForX(x) {
        if (x < taskX - 2)        return 'no';
        if (x < projectX - 2)     return 'task';
        if (x < deliveryX - 2)    return 'project';
        if (x < qtyX - 2)         return 'delivery';
        if (x < unitPriceX - 2)   return 'qty';
        if (x < subtotalX - 2)    return 'unitPrice';
        return 'subtotal';
    }

    // ■セクション見出しはヘッダ行より上にあることが多い（headerY + 60 程度の範囲）
    // → 全アイテムから先に■行を抽出してセクション情報を保持しておく
    const sectionHeaderItems = items.filter(function(it) {
        return it.str.indexOf('■') === 0 || it.str === '■ A-01' ||
               (it.str.indexOf('■') !== -1 && /[A-Z]-\d{2}/.test(it.str));
    }).sort(function(a, b) { return b.transform[5] - a.transform[5]; });

    // セクション見出し行のY座標と情報を配列に保持
    // ※PDFの折り返しにより jobCategory の末尾が次のY行に分割される場合があるため、
    //   ■行のY座標から最大30px下の行まで左端テキスト（x<200）を続きとして連結する
    const sectionYMap = [];
    sectionHeaderItems.forEach(function(secItem) {
        const secY = secItem.transform[5];
        // 同じY座標のアイテムを全部結合してセクション文字列を作る
        const sameYItems = items.filter(function(it) {
            return Math.abs(it.transform[5] - secY) < 3;
        }).sort(function(a, b) { return a.transform[4] - b.transform[4]; });
        let secText = sameYItems.map(function(it) { return it.str; }).join('');

        // jobCatが途中で折り返している場合（末尾が閉じ括弧で終わっていない）、
        // 直下の行（secY より 5〜30px 低い Y）の左端テキストを続きとして追加する
        if (secText.indexOf('|') !== -1 && !/\)\s*$/.test(secText.replace(/\s/g, ''))) {
            // secYより下で最も近いY行を探す
            const allY = items.map(function(it) { return it.transform[5]; });
            const lowerYs = allY.filter(function(y) { return secY - y > 4 && secY - y < 35; });
            if (lowerYs.length > 0) {
                const nextY = Math.max.apply(null, lowerYs); // secYの直下
                // 次行の左端アイテム（x < 250、右端の小計等は除外）を連結
                const nextItems = items.filter(function(it) {
                    return Math.abs(it.transform[5] - nextY) < 3 && it.transform[4] < 250;
                }).sort(function(a, b) { return a.transform[4] - b.transform[4]; });
                if (nextItems.length > 0) {
                    secText += nextItems.map(function(it) { return it.str; }).join('');
                }
            }
        }

        const secMatch = secText.match(/■\s*([A-Z]-\d{2})\s+([^\|]+)\|\s*(.+)/);
        let dept = '', jobCat = '';
        if (secMatch) {
            dept = secMatch[1].trim() + ' ' + secMatch[2].trim();
            jobCat = secMatch[3].trim();
        } else {
            const deptMatch = secText.match(/■\s*([A-Z]-\d{2})\s*(.*)/);
            if (deptMatch) dept = deptMatch[1].trim();
        }
        sectionYMap.push({ y: secY, dept: dept, jobCat: jobCat });
    });

    // ヘッダ行より下のアイテムだけ対象（ページフッタ・URLは除外）
    const dataItems = items.filter(function(it) {
        const y = it.transform[5];
        if (y >= headerY - 2) return false;   // ヘッダ行以上は除外
        if (it.str.trim() === '') return false;
        // フッタ行（日付・URL・ページ番号）を除外
        if (/^\d+\/\d+\/\d+,/.test(it.str)) return false;
        if (it.str.indexOf('https://') === 0) return false;
        if (/^\d+\/\d+$/.test(it.str.trim())) return false;
        return true;
    });

    // Y座標でグループ化（同じ行 = Y差が2以内）
    const sortedItems = dataItems.slice().sort(function(a, b) {
        return b.transform[5] - a.transform[5];
    });
    const yGroups = [];
    let lastY = null;
    let curGroup = [];
    sortedItems.forEach(function(it) {
        const y = it.transform[5];
        if (lastY !== null && Math.abs(y - lastY) > 3) {
            if (curGroup.length) yGroups.push(curGroup);
            curGroup = [];
        }
        curGroup.push(it);
        lastY = y;
    });
    if (curGroup.length) yGroups.push(curGroup);

    // 各行グループを列に振り分け
    // "■ A-01 ..." のセクション見出し行を検出して部署・jobCategory情報を保持する
    // データ行をY座標グループ単位で処理
    // セクション情報は sectionYMap から「現在の行Yより上で最も近い■行」で決まる
    const rows = [];

    yGroups.forEach(function(group) {
        const rowText = group.map(function(it) { return it.str; }).join('');
        const rowY = group[0].transform[5];

        // 先頭が数字（行番号）で始まるかチェック
        const sortedGroup = group.slice().sort(function(a, b) { return a.transform[4] - b.transform[4]; });
        const firstItem = sortedGroup[0];
        if (!firstItem || !/^\d+$/.test(firstItem.str.trim())) return; // 行番号なし → skip

        // この行より上で最も近いセクション見出しを探す
        let currentDept = '';
        let currentJobCategory = '';
        let closestSecY = -Infinity;
        sectionYMap.forEach(function(sec) {
            if (sec.y > rowY && sec.y > closestSecY) {
                closestSecY = sec.y;
                currentDept = sec.dept;
                currentJobCategory = sec.jobCat;
            }
        });

        // 列に振り分け
        const cols = { no: '', task: '', project: '', delivery: '', qty: '', unitPrice: '', subtotal: '' };
        sortedGroup.forEach(function(it) {
            cols[colForX(it.transform[4])] += it.str;
        });

        // ¥付き金額をパース（¥3,438 → 3438）
        function parseAmount(str) {
            return parseFloat(str.replace(/[¥$€£₩,\s]/g, '')) || 0;
        }

        const qtyVal       = parseFloat(cols.qty.replace(/[^\d.]/g, '')) || 1;
        // unitPrice列に¥が含まれた形式（¥3,438）で入る
        const unitPriceVal = parseAmount(cols.unitPrice);
        // unitPrice が取れなかった場合は subtotal / qty から逆算
        const resolvedUnitPrice = unitPriceVal > 0
            ? unitPriceVal
            : (qtyVal > 0 ? Math.round(parseAmount(cols.subtotal) / qtyVal) : 0);

        // task列の先頭に★や●マーカーが付いている場合、それを取り出して
        // jobCategory に前置する（後続の★●復元処理で参照するため）
        const taskText = cols.task.trim();
        const markerMatch = taskText.match(/^([★●\s]+)/);
        const markers = markerMatch ? markerMatch[1].replace(/\s/g, '') : '';
        const taskClean = markerMatch ? taskText.slice(markerMatch[0].length).trim() : taskText;

        rows.push({
            department:   currentDept,
            // sectionYMapから取得したjobCategoryに★●マーカーを前置（行レベルマーカー用）
            jobCategory:  markers + currentJobCategory,
            taskDetails:  taskClean,
            projectName:  cols.project.trim(),
            delivery:     cols.delivery.trim(),
            qty:          String(qtyVal),
            unitPrice:    String(resolvedUnitPrice),
            amount:       ''
        });
    });

    return rows;
}

// PDFから全テキストと請求項目の行データを抽出する。
// 通常の1カラム部分はY座標をもとに実際の行単位で改行を復元する。
// TO / FROM はCSS Gridの2カラムレイアウトのため、PDF内では視覚的な行順
// （左右のカラムが交互）でテキストが並ぶことがある。そのままY座標だけで行を
// 復元すると左右の内容が混ざってしまうため、この区間だけはX座標で列を分離
// してから行を復元する（TO側を全て出力してからFROM側を出力する）。
// ※作業報告書付きPDFでは「TO」/「FROM」のラベルが使われ、Invoice Itemsの代わりに
//   「Invoice Summary」テーブルが1ページ目にある。extractSummaryRows()で対応。
async function extractTextFromPdf(file) {
    const arrayBuffer = await file.arrayBuffer();
    const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
    let fullText = '';

    // 2パス方式: 全ページの行候補を種別ごとに収集してから優先順位を決定する。
    // ページ単位で判定すると「Page1:summaryRows(1行) + Page2:workRows(16行) = 17行」
    // のように混在してしまうため、全ページ横断で優先度を適用する。
    // 優先度: stdRows(通常テーブル) > workRows(作業報告書詳細) > summaryRows(作業報告書サマリー)
    let stdRowsAll     = [];
    let workRowsAll    = [];
    let summaryRowsAll = [];

    for (let i = 1; i <= pdf.numPages; i++) {
        const page = await pdf.getPage(i);
        const content = await page.getTextContent();

        // TO/FROM 分割用のアンカーを探す（「BILL TO」または「TO」）
        const billToItem = content.items.find(function(it) {
            return it.str.includes('BILL TO') || it.str.trim() === 'TO';
        });
        const fromItem = content.items.find(function(it) { return it.str.trim() === 'FROM'; });
        // Invoice Items テーブル（通常フォーム）または Invoice Summary（作業報告書付き）
        const itemsHeaderItem = content.items.find(function(it) {
            return it.str.includes('Invoice Items') || it.str.includes('Invoice Summary');
        });

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

        // 各ページの行を種別ごとに蓄積（優先順位の適用は全ページ処理後）
        const stdRows     = extractItemRows(content.items);
        const workRows    = extractWorkReportRows(content.items);
        const summaryRows = extractSummaryRows(content.items);

        if (stdRows.length > 0)     stdRowsAll     = stdRowsAll.concat(stdRows);
        if (workRows.length > 0)    workRowsAll    = workRowsAll.concat(workRows);
        if (summaryRows.length > 0) summaryRowsAll = summaryRowsAll.concat(summaryRows);
    }

    // 全ページ横断で優先順位を適用:
    //   stdRows が1行でもあれば通常テーブルとして確定
    //   workRows が1行でもあれば作業報告書詳細行を使用（summaryRowsを無視）
    //   どちらもなければ summaryRows を使用
    let itemRows = [];
    if (stdRowsAll.length > 0) {
        itemRows = stdRowsAll;
    } else if (workRowsAll.length > 0) {
        itemRows = workRowsAll;
    } else {
        itemRows = summaryRowsAll;
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
    // 通常版: "Invoice Date / 請求日:" と値が別行（<br>区切り）
    // 作業報告書版: "Invoice Date / 請求日: 2026-08-03 | Due Date / 支払期限: 2026-08-31"
    //   が1行に結合されているため、同一行内のインライン値も抽出する必要がある。
    //
    // billToLineIdx の検出も注意:
    //   通常版: "BILL TO:" or 単独 "TO" の行
    //   作業報告書版: "TO FROM" という1行 → indexOf('TO') === 0 で検出
    const billToLineIdx = allLines.findIndex(function(l) {
        return l.indexOf('BILL TO') === 0 || l === 'TO' || l.indexOf('TO FROM') === 0 || l.indexOf('TO ') === 0;
    });
    const headerLines = billToLineIdx !== -1 ? allLines.slice(0, billToLineIdx) : allLines;

    // 日付抽出: ラベルを含む行そのもの（インライン値）と、その次の行の両方を探す
    function extractDate(labelPrefix) {
        // 全行を対象に「ラベルを含む行」を探す（headerLines 外でも可）
        for (let i = 0; i < allLines.length; i++) {
            const l = allLines[i];
            if (l.indexOf(labelPrefix) === -1) continue;
            // 同一行内に日付があればそれを返す（"Invoice Date / ...: 2026-08-03" 形式）
            const after = l.slice(l.indexOf(labelPrefix) + labelPrefix.length);
            const inline = after.match(/([\d]{4})[-\/\.]([\d]{1,2})[-\/\.]([\d]{1,2})/);
            if (inline) return inline[1] + '-' + inline[2].padStart(2, '0') + '-' + inline[3].padStart(2, '0');
            // 次の行以降に日付があれば返す（通常版の <br> 改行形式）
            for (let j = i + 1; j < allLines.length; j++) {
                const m = allLines[j].match(/([\d]{4})[-\/\.]([\d]{1,2})[-\/\.]([\d]{1,2})/);
                if (m) return m[1] + '-' + m[2].padStart(2, '0') + '-' + m[3].padStart(2, '0');
                // 別ラベルが来たら打ち切り
                if (/^(Invoice|Due|BILL|TO |FROM|Sole|Freelan|Corporation)/.test(allLines[j])) break;
            }
        }
        return null;
    }
    const invoiceDateValue = extractDate('Invoice Date');
    if (invoiceDateValue) {
        const el = document.querySelector('[name="invoiceDate"]');
        if (el) el.value = invoiceDateValue;
    }
    const dueDateValue = extractDate('Due Date');
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
    // TO/BILL TO側の固定文言（〒104-0045・Phone: +81 03-6869-7976 等）と誤って
    // マッチしないよう、"FROM" 〜 "Invoice Items"（または "Invoice Summary"）
    // の範囲だけを対象にする
    const fromIdx = text.indexOf('FROM');
    const itemsIdx = (function() {
        const idxItems   = text.indexOf('Invoice Items');
        const idxSummary = text.indexOf('Invoice Summary');
        if (idxItems === -1) return idxSummary;
        if (idxSummary === -1) return idxItems;
        return Math.min(idxItems, idxSummary);
    })();
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
    // 作業報告書版では "TO FROM" という1行になっているため indexOf('FROM') !== -1 でも検出する
    const claimedIdx = {};
    let fromLineIdx = fromLines.findIndex(function(l) { return l === 'FROM' || l.indexOf('FROM') !== -1; });
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
    // 適格事業者番号は本来「T」で始まるが、Tなしで登録されているPDFも
    // 存在するため、先頭のTは必須にしない
    const tNumRe = new RegExp('^' + tolerantPattern('適格事業者番号') + '[：:]\\s*([\\w-]+)', 'i');
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
            // 通常版と作業報告書版でラベルが異なるフィールドは両方のパターンを試みる
            // 通常版:  "Country / 居住国:" / "Email:" / "Address / 住所:" / "Phone / 電話:"
            // 作業報告書版: "Recipient's Country / 受取人居住国:" / "Recipient's Email / 受取人メール:" 等
            const fields = {
                intlCountry:               [
                    new RegExp("Recipient's Country[^：:\n]*[：:]\\s*([^\\n]+)"),
                    new RegExp('Country \\/ ' + tolerantPattern('居住国') + '[：:]\\s*([^\\n]+)')
                ],
                intlEmail:                 [
                    new RegExp("Recipient's Email[^：:\n]*[：:]\\s*([^\\n]+)"),
                    new RegExp('Email[：:]\\s*([^\\n]+)')
                ],
                intlAddress:               [
                    new RegExp("Recipient's Address[^：:\n]*[：:]\\s*([^\\n]+)"),
                    new RegExp('Address \\/ ' + tolerantPattern('住所') + '[：:]\\s*([^\\n]+)')
                ],
                intlPhone:                 [
                    new RegExp("Recipient's Phone[^：:\n]*[：:]\\s*([^\\n]+)"),
                    new RegExp('Phone \\/ ' + tolerantPattern('電話') + '[：:]\\s*([^\\n]+)')
                ],
                intlDOB:                   [
                    new RegExp('Date of Birth[^：:\n]*[：:]\\s*([^\\n]+)')
                ],
                intlBankName:              [
                    new RegExp('Bank Name \\/ 銀行名[：:]\\s*([^\\n]+)')
                ],
                intlInstitutionCode:       [
                    new RegExp('Institution Code \\/ 金融機関コード[：:]\\s*([^\\n]+)')
                ],
                intlBranchName:            [
                    new RegExp('Branch Name \\/ ' + tolerantPattern('支店名') + '[：:]\\s*([^\\n]+)')
                ],
                intlBankAddress:           [
                    new RegExp('Bank Address \\/ 銀行住所[：:]\\s*([^\\n]+)')
                ],
                intlAccountNumber:         [
                    new RegExp('Account Number・IBAN \\/ 口座番号[：:]\\s*([^\\n]+)')
                ],
                intlSwiftCode:             [
                    new RegExp('SWIFT Code(?:\\s*\\/\\s*SWIFT[^：:\n]*)?[：:]\\s*([^\\n]+)')
                ],
                intlAccountName:           [
                    new RegExp('Account Holder \\/ 口座名義[：:]\\s*([^\\n]+)')
                ],
                intlAccountType:           [
                    new RegExp('Account Type \\/ 口座種別[：:]\\s*([^\\n]+)')
                ],
                intlAdditionalBankingInfo: [
                    new RegExp('Additional Info \\/ その他銀行情報[：:]\\s*([^\\n]+)')
                ]
            };
            // 配列化されたフィールド定義を処理（最初にマッチしたパターンを使用）
            Object.entries(fields).forEach(function(entry) {
                const name = entry[0];
                const patterns = entry[1];
                for (let pi = 0; pi < patterns.length; pi++) {
                    const m = text.match(patterns[pi]);
                    if (m) {
                        const el = document.querySelector('[name="' + name + '"]');
                        if (el) el.value = m[1].trim();
                        break;
                    }
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
    // ※作業報告書付きPDFの場合は unitPrice の代わりに amount（合計金額）しかない
    //   ため、amount ÷ qty で単価を算出してフィールドに入力する。
    const itemContainer = document.getElementById('itemsContainer');
    if (itemContainer && itemRows.length > 0) {
        const existingRows = itemContainer.querySelectorAll('.item-row');
        existingRows.forEach(function(row, idx) {
            if (idx > 0) row.remove();
        });

        const deptKeys = ['A-01', 'A-02', 'B-01', 'C-01', 'C-02', 'X-01'];

        itemRows.forEach(function(data, rowIdx) {
            if (rowIdx > 0) {
                // ボタンIDは 'addItem'（index.tsx の id="addItem" に対応）
                const addBtn = document.getElementById('addItem');
                if (addBtn) addBtn.click();
            }

            const rows = itemContainer.querySelectorAll('.item-row');
            const row = rows[rowIdx];
            if (!row) return;

            // 部署コードを抽出（department列から先頭の"A-01"等を取り出す）
            const deptValue = deptKeys.find(function(k) { return data.department.indexOf(k) !== -1; });
            if (deptValue) {
                const deptSel = row.querySelector('[name="department[]"]');
                if (deptSel) {
                    deptSel.value = deptValue;
                    deptSel.dispatchEvent(new Event('change', { bubbles: true }));
                }
            }

            const qty = parseFloat(data.qty) || 1;
            // 通常フォーム: unitPrice あり
            // 作業報告書付き: unitPrice なし → amount / qty で単価を計算
            let unitPrice = 0;
            if (data.unitPrice && data.unitPrice.replace(/[^\d.]/g, '')) {
                unitPrice = parseFloat(data.unitPrice.replace(/[^\d.]/g, '')) || 0;
            } else if (data.amount) {
                const totalAmount = parseFloat(data.amount.replace(/[^\d.]/g, '')) || 0;
                unitPrice = qty > 0 ? Math.round(totalAmount / qty) : totalAmount;
            }

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
                    if (taskEl && taskDetails) taskEl.value = taskDetails;
                    if (projEl && projectName) projEl.value = projectName;

                    const jobSel = r.querySelector('.item-job-category');
                    if (jobSel) {
                        // 列の折り返り復元時に空白が失われることがあるため、
                        // 空白を除いた文字列同士で前方一致を判定する
                        const lineClean = jobCategoryText.replace(/[★●\s]/g, '');
                        console.log('[pdf-restore] jobCategory照合:', JSON.stringify(jobCategoryText), '→ lineClean:', JSON.stringify(lineClean));
                        console.log('[pdf-restore] 選択肢:', Array.from(jobSel.options).map(function(o){ return JSON.stringify(o.value.replace(/\s/g,'').substring(0,8)); }).join(', '));
                        const matched = Array.from(jobSel.options).find(function(o) {
                            return o.value && lineClean.includes(o.value.replace(/\s/g, '').substring(0, 8));
                        });
                        console.log('[pdf-restore] matched:', matched ? JSON.stringify(matched.value) : 'なし');
                        if (matched) {
                            jobSel.value = matched.value;
                            jobSel.dispatchEvent(new Event('change', { bubbles: true }));
                        }
                    }
                }, 150 * rowIdx);
            })(row, qty, unitPrice, data.jobCategory, data.taskDetails || '', data.projectName || data.project || '');
        });
    }

    // ---- taxType（消費税タイプ）復元 ----
    // "Tax (10% Incl.)" という文字列がテキストに存在すれば inclusive（内税）、
    // なければ tax-exempt（非課税）と判定する。
    // ※PDFの合計欄にこの行が表示される（taxRow が display:flex のとき）
    const hasTaxLine = text.includes('Tax (10% Incl.)');
    const taxTypeEl = document.querySelector('[name="taxType"]');
    if (taxTypeEl) {
        taxTypeEl.value = hasTaxLine ? 'inclusive' : 'tax-exempt';
        taxTypeEl.dispatchEvent(new Event('change', { bubbles: true }));
    }

    // ---- currency（通貨）復元 ----
    // 金額列（Unit Price / Subtotal / Amount 等）の先頭記号で通貨を判定する。
    // 優先度: EUR > $ > ¥（デフォルト JPY）
    // 通常版: unitPrice列 "EUR 1,000" / "$ 1,000" / "¥1,000"
    // 作業報告書版: Amount列 "EUR 1,000" / "$ 1,000" / "¥1,000"
    let detectedCurrency = 'JPY';
    if (/EUR\s+[\d,]+/.test(text)) {
        detectedCurrency = 'EUR';
    } else if (/\$\s*[\d,]+/.test(text)) {
        detectedCurrency = 'USD';
    }
    const currencyEl = document.querySelector('[name="currency"]');
    if (currencyEl) {
        currencyEl.value = detectedCurrency;
        currencyEl.dispatchEvent(new Event('change', { bubbles: true }));
    }

    // ---- workPerformedOutsideJapan（日本国外業務宣言）復元 ----
    // 通常版: "✓ Declaration: All contracted work was performed outside Japan"
    // 作業報告書版: "Declaration: All contracted work was performed outside Japan"
    // どちらの形式にも対応するため "Declaration: All contracted work" で判定する
    const hasOutsideDeclaration = text.includes('Declaration: All contracted work was performed outside Japan');
    if (hasOutsideDeclaration) {
        const cbEl = document.querySelector('[name="workPerformedOutsideJapan"]');
        if (cbEl) cbEl.checked = true;
    }

    // ---- 国際送金 intlRoutingType / intlRoutingCode 復元 ----
    // 出力形式: `${intlRoutingType}: ${intlRoutingCode}` （例: "Routing Number (ABA): 026009593"）
    // セレクトボックスの option.value と完全一致する文字列がラベルとして出力されるため、
    // 既知の選択肢リストと前方一致で照合する
    if (detectedPayment === 'international') {
        // intlRoutingType の選択肢（option.value）の一覧
        const ROUTING_TYPE_OPTIONS = [
            'Routing Number (ABA)',
            'Sort Code',
            'Transit Number',
            'BSB Code'
        ];
        ROUTING_TYPE_OPTIONS.forEach(function(rtType) {
            // "Routing Number (ABA): 026009593" の形式で検索
            const escapedType = rtType.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
            const routingRe = new RegExp(escapedType + '[：:]\\s*([^\\n]+)');
            const rm = text.match(routingRe);
            if (rm) {
                const rtEl = document.querySelector('[name="intlRoutingType"]');
                const rcEl = document.querySelector('[name="intlRoutingCode"]');
                if (rtEl) {
                    rtEl.value = rtType;
                    rtEl.dispatchEvent(new Event('change', { bubbles: true }));
                }
                if (rcEl) rcEl.value = rm[1].trim();
            }
        });
    }

    // ---- 請求項目の★●マーカー・Delivery列の復元 ----
    // itemRows に収録された jobCategory テキスト（★/●プレフィックス付き）から
    // withholding/taxExempt チェックボックスをセットする。
    // またDelivery列テキストから itemDeliveryDate / Start / End を復元する。
    // これは setTimeout の後で行う必要があるため、itemRows 処理内の setTimeout コールバックに
    // 追加ロジックとして差し込む（下の itemRows.forEach の外部で後処理）。
    //
    // 実装方針: itemRows が処理された後（全行の setTimeout が完了した後）に実行するため
    // 全行数 × 150ms + 200ms のタイマーで後処理を走らせる。
    const totalDelay = (itemRows.length > 0 ? (itemRows.length - 1) * 150 : 0) + 300;
    setTimeout(function() {
        const rows = document.querySelectorAll('.item-row');

        // useIndividualDelivery を強制的に有効化（個別納品日がある場合）
        const hasIndividualDelivery = itemRows.some(function(r) {
            return r.delivery && r.delivery.trim() !== '';
        });
        if (hasIndividualDelivery) {
            const indivDeliveryChk = document.getElementById('useIndividualDelivery');
            if (indivDeliveryChk && !indivDeliveryChk.checked) {
                indivDeliveryChk.checked = true;
                indivDeliveryChk.dispatchEvent(new Event('change', { bubbles: true }));
            }
        }

        itemRows.forEach(function(data, rowIdx) {
            const row = rows[rowIdx];
            if (!row) return;

            // ---- jobCategoryWithholding（★）復元 ----
            // jobCategory テキストの先頭に "★" があれば withholding チェックボックスをONに
            if (data.jobCategory && data.jobCategory.indexOf('★') !== -1) {
                const cb = row.querySelector('.job-category-withholding');
                if (cb) {
                    cb.checked = true;
                    cb.dispatchEvent(new Event('change', { bubbles: true }));
                }
            }

            // ---- itemTaxExempt（●）復元 ----
            // jobCategory テキストの先頭に "●" があれば課税なしチェックボックスをONに
            // ただし taxType が 'tax-exempt' の場合は全件非課税なのでスキップ
            const taxTypeVal = document.querySelector('[name="taxType"]') ? document.querySelector('[name="taxType"]').value : '';
            if (taxTypeVal !== 'tax-exempt' && data.jobCategory && data.jobCategory.indexOf('●') !== -1) {
                const cb = row.querySelector('.item-tax-exempt');
                if (cb) {
                    cb.checked = true;
                    cb.dispatchEvent(new Event('change', { bubbles: true }));
                }
            }

            // ---- itemDeliveryDate / Start / End 復元 ----
            // Delivery列テキスト例: "2026-07-01 〜 2026-07-31"（期間） or "2026-07-15"（単日）
            // deliveryArea を表示してから入力する
            if (data.delivery && data.delivery.trim()) {
                const deliveryArea = row.querySelector('.item-delivery-area');
                if (deliveryArea) deliveryArea.style.display = 'block';

                const deliveryText = data.delivery.trim();
                // 期間形式: "2026-07-01 〜 2026-07-31" or "2026-07-01 ~ 2026-07-31"
                const periodMatch = deliveryText.match(/([\d]{4}-[\d]{2}-[\d]{2})\s*[〜~]\s*([\d]{4}-[\d]{2}-[\d]{2})/);
                if (periodMatch) {
                    const typeEl = row.querySelector('.item-delivery-type');
                    if (typeEl) {
                        typeEl.value = 'period';
                        typeEl.dispatchEvent(new Event('change', { bubbles: true }));
                    }
                    const startEl = row.querySelector('.item-delivery-start');
                    const endEl   = row.querySelector('.item-delivery-end');
                    if (startEl) startEl.value = periodMatch[1];
                    if (endEl)   endEl.value   = periodMatch[2];
                } else {
                    // 単日形式
                    const singleMatch = deliveryText.match(/([\d]{4}-[\d]{2}-[\d]{2})/);
                    if (singleMatch) {
                        const typeEl = row.querySelector('.item-delivery-type');
                        if (typeEl) {
                            typeEl.value = 'date';
                            typeEl.dispatchEvent(new Event('change', { bubbles: true }));
                        }
                        const dateEl = row.querySelector('.item-delivery-date');
                        if (dateEl) dateEl.value = singleMatch[1];
                    }
                }
            }
        });

        // 最後に合計を再計算
        if (typeof calculateTotals === 'function') calculateTotals();
    }, totalDelay);

    // ---- 備考 ----
    // "Notes / 備考:" 見出し（英語部分で判定）の後ろに続く行を、宣誓文の注記が
    // 始まる手前まで連結する
    const notesLineIdx = allLines.findIndex(function(l) { return l.indexOf('Notes') === 0; });
    if (notesLineIdx !== -1) {
        const notesLines = [];
        for (let i = notesLineIdx + 1; i < allLines.length; i++) {
            // 宣誓文・作業報告書テキスト・Attachments以降は備考に含めない
            if (/^✓|^Declaration|^Attachments|^代表者名|^当月受託|^詳細につき|^https?:|^申請担当|^対象期間|^詳細明細|^◆/.test(allLines[i])) break;
            // Payment / Invoice Summary / Work Report セクション開始も停止
            if (/^Payment Information|^Invoice Summary|^Work Report|^Subtotal|^Total/.test(allLines[i])) break;
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

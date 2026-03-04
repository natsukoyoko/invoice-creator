import { Hono } from 'hono'
import { cors } from 'hono/cors'
import { html } from 'hono/html'

const app = new Hono()

// Enable CORS
app.use('/api/*', cors())

// API endpoint to generate invoice HTML
app.post('/api/invoice', async (c) => {
  try {
    const data = await c.req.json()
    return c.json({ success: true, data })
  } catch (error) {
    return c.json({ success: false, error: 'Invalid data' }, 400)
  }
})

// Main page
app.get('/', (c) => {
  return c.html(html`
    <!DOCTYPE html>
    <html lang="ja">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Invoice / 請求書作成</title>
        <script src="https://cdn.tailwindcss.com"></script>
        <link href="https://cdn.jsdelivr.net/npm/@fortawesome/fontawesome-free@6.4.0/css/all.min.css" rel="stylesheet">
        <style>
            * {
                font-family: Arial, sans-serif !important;
            }
            
            @media print {
                .no-print {
                    display: none !important;
                }
                .print-only {
                    display: block !important;
                }
                body {
                    background: white !important;
                    color: black !important;
                    margin: 0 !important;
                    padding: 0 !important;
                }
                * {
                    background: white !important;
                    color: black !important;
                }
                @page {
                    size: A4;
                    margin: 12mm 15mm;
                }
                
                /* A4サイズ最適化 */
                .print-container {
                    width: 100%;
                    max-width: 100%;
                    margin: 0;
                    padding: 0;
                    font-size: 11px !important;
                }
                
                .print-container h1 {
                    font-size: 24px !important;
                    margin-bottom: 8px !important;
                }
                
                .print-container h2 {
                    font-size: 14px !important;
                    margin-bottom: 6px !important;
                }
                
                .print-container .invoice-header {
                    display: flex;
                    justify-content: space-between;
                    align-items: flex-start;
                    margin-bottom: 12px !important;
                }
                
                .print-container .invoice-dates {
                    background: #f3f4f6;
                    padding: 8px 12px;
                    border-radius: 4px;
                    border: 1px solid #d1d5db;
                }
                
                .print-container .invoice-dates div {
                    font-weight: bold;
                    font-size: 12px !important;
                    line-height: 1.6;
                }
                
                .print-container .section-spacing {
                    margin-bottom: 10px !important;
                }
                
                .print-container table {
                    font-size: 10px !important;
                    border-collapse: collapse;
                    width: 100%;
                }
                
                .print-container th {
                    padding: 4px 3px !important;
                    font-size: 9px !important;
                    line-height: 1.3;
                }
                
                .print-container td {
                    padding: 3px !important;
                    font-size: 10px !important;
                    line-height: 1.3;
                }
                
                .print-container .totals-section {
                    margin-top: 10px !important;
                    font-size: 11px !important;
                }
                
                .print-container .payment-section {
                    margin-top: 10px !important;
                    padding-top: 10px !important;
                    border-top: 2px solid #000;
                }
                
                .print-container .payment-section h2 {
                    margin-bottom: 6px !important;
                }
                
                .print-container .payment-section div {
                    font-size: 10px !important;
                    line-height: 1.5;
                    margin-bottom: 2px !important;
                }
            }
            .print-only {
                display: none;
            }
            
            /* Validation styles */
            input:invalid, select:invalid, textarea:invalid {
                border-color: #ef4444;
            }
            
            .required:after {
                content: " *";
                color: #ef4444;
            }
        </style>
    </head>
    <body class="bg-gray-50 p-4 md:p-8">
        <div class="max-w-6xl mx-auto">
            <!-- Header -->
            <div class="no-print bg-white rounded-lg shadow-md p-6 mb-6">
                <div class="flex items-center justify-between">
                    <div>
                        <h1 class="text-3xl font-bold text-gray-800 mb-2">
                            <i class="fas fa-file-invoice mr-2 text-blue-600"></i>
                            Create a new invoice / 請求書を作成
                        </h1>
                        <p class="text-gray-600">外部パートナー様向けの請求書作成システム</p>
                    </div>
                    <div class="flex-shrink-0 ml-6">
                        <img src="/images/lifepepper-logo.png" alt="LIFE PEPPER" class="h-12 w-auto opacity-75">
                    </div>
                </div>
            </div>

            <!-- Main Form -->
            <form id="invoiceForm" class="space-y-6">
                <!-- FROM Section -->
                <div class="no-print bg-white rounded-lg shadow-md p-6">
                    <h2 class="text-2xl font-bold text-gray-800 mb-4 border-b pb-2">
                        FROM / 発行者情報
                    </h2>
                    
                    <div class="grid md:grid-cols-2 gap-4 mb-4">
                        <div>
                            <label class="block text-sm font-medium text-gray-700 mb-1 required">
                                Issuer Type / 発行者タイプ
                            </label>
                            <select name="issuerType" id="issuerType" required
                                    class="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent">
                                <option value="">選択してください</option>
                                <option value="corporation">Corporation / 法人</option>
                                <option value="sole">Sole Proprietor / 個人事業主</option>
                                <option value="freelance">Freelancer / フリーランス</option>
                            </select>
                        </div>
                        
                        <div>
                            <label class="block text-sm font-medium text-gray-700 mb-1 required">
                                Name / 氏名
                            </label>
                            <input type="text" name="issuerName" required
                                   class="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent">
                        </div>
                    </div>
                    
                    <div class="mb-4">
                        <label class="block text-sm font-medium text-gray-700 mb-1">
                            JCT Registration Number / 適格事業者番号
                        </label>
                        <input type="text" name="issuerTNumber"
                               class="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                               placeholder="T1234567890123">
                        <p class="text-xs text-gray-500 mt-1">
                            <strong>JCT Registration Number / 適格事業者番号:</strong> If you are a registered tax entity in Japan, please provide your JCT Registration Number (starting with 'T'). If you are a non-resident without a registration number, please leave this field blank. / もし日本で適格請求書発行事業者の登録をされている場合は、適格事業者番号をご記載ください。非居住者で登録番号をお持ちでない場合は、この欄は空欄のままにしてください。
                        </p>
                    </div>
                    
                    <div class="grid md:grid-cols-2 gap-4 mb-4">
                        
                        <div class="md:col-span-2">
                            <label class="block text-sm font-medium text-gray-700 mb-1">
                                Postal Code / 郵便番号
                            </label>
                            <input type="text" name="postalCode"
                                   class="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                   placeholder="123-4567">
                        </div>
                        
                        <div class="md:col-span-2">
                            <label class="block text-sm font-medium text-gray-700 mb-1 required">
                                Address / 住所
                            </label>
                            <textarea name="issuerAddress" required rows="2"
                                      class="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"></textarea>
                        </div>
                        
                        <div>
                            <label class="block text-sm font-medium text-gray-700 mb-1 required">
                                Email / メールアドレス
                            </label>
                            <input type="email" name="issuerEmail" required
                                   class="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent">
                        </div>
                        
                        <div>
                            <label class="block text-sm font-medium text-gray-700 mb-1">
                                Phone / 電話番号
                            </label>
                            <input type="tel" name="issuerPhone"
                                   class="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent">
                        </div>
                    </div>
                    
                    <div class="mt-4">
                        <label class="block text-sm font-medium text-gray-700 mb-2 required">
                            Residence / 居住地
                        </label>
                        <div class="space-y-2">
                            <label class="flex items-center">
                                <input type="radio" name="residesInJapan" id="residesInJapan" value="yes" required
                                       class="w-4 h-4 text-blue-600 border-gray-300 focus:ring-blue-500">
                                <span class="ml-2 text-sm text-gray-700">
                                    Residing in Japan / 日本在住
                                </span>
                            </label>
                            <label class="flex items-center">
                                <input type="radio" name="residesInJapan" id="residesNotInJapan" value="no" required
                                       class="w-4 h-4 text-blue-600 border-gray-300 focus:ring-blue-500">
                                <span class="ml-2 text-sm text-gray-700">
                                    Residing outside Japan / 日本以外在住
                                </span>
                            </label>
                        </div>
                    </div>
                    
                    <div class="mt-4" id="nonJapanWorkNotice" style="display: none;">
                        <label class="flex items-center bg-yellow-50 p-3 rounded border border-yellow-200">
                            <input type="checkbox" name="workPerformedOutsideJapan" id="workPerformedOutsideJapan"
                                   class="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500">
                            <span class="ml-2 text-sm text-gray-700 font-medium">
                                Declaration: All contracted work was performed outside Japan / すべての業務は日本国外で行われました
                            </span>
                        </label>
                    </div>
                </div>

                <!-- BILL TO Section -->
                <div class="no-print bg-white rounded-lg shadow-md p-6">
                    <h2 class="text-2xl font-bold text-gray-800 mb-4 border-b pb-2">
                        BILL TO: / クライアント情報
                    </h2>
                    
                    <div class="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4">
                        <p class="text-sm text-gray-700 font-medium">株式会社 LIFE PEPPER</p>
                        <p class="text-sm text-gray-600">〒104-0045 東京都中央区築地3–1–10 Shinto GINZA EAST 6F</p>
                        <p class="text-sm text-gray-600">Phone: +81 03-6869-7976</p>
                    </div>
                    
                    <div>
                        <label class="block text-sm font-medium text-gray-700 mb-1 required">
                            Contact Person / 担当者
                        </label>
                        <input type="text" name="clientContact" id="clientContact" required
                               placeholder="担当者名を入力してください / Enter contact person name"
                               class="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent">
                    </div>
                </div>

                <!-- Invoice Details -->
                <div class="no-print bg-white rounded-lg shadow-md p-6">
                    <h2 class="text-2xl font-bold text-gray-800 mb-4 border-b pb-2">
                        Invoice Details / 請求書詳細
                    </h2>
                    
                    <div class="grid md:grid-cols-2 gap-4 mb-4">
                        <div>
                            <label class="block text-sm font-medium text-gray-700 mb-1 required">
                                Invoice Date / 請求日
                            </label>
                            <input type="date" name="invoiceDate" required
                                   class="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent">
                        </div>
                        
                        <div>
                            <label class="block text-sm font-medium text-gray-700 mb-1 required">
                                Payment Due Date / 支払期限
                            </label>
                            <input type="date" name="dueDate" required
                                   class="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent">
                        </div>
                    </div>
                    
                    <div class="mb-4">
                        <label class="block text-sm font-medium text-gray-700 mb-1 required">
                            Tax Type / 税区分
                        </label>
                        <select name="taxType" id="taxType" required
                                class="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent">
                            <option value="inclusive">Tax Inclusive / 税込</option>
                            <option value="tax-exempt">Tax Exempt / 非課税</option>
                        </select>
                    </div>
                    
                    <div id="withholdingNotice" class="bg-yellow-50 border border-yellow-200 rounded-lg p-4 text-gray-700" style="display: none;">
                        <p class="font-medium mb-2 text-sm">
                            <i class="fas fa-info-circle text-yellow-600 mr-1"></i>
                            源泉徴収に関する注意事項 / Notice Regarding Withholding Tax
                        </p>
                        <p class="text-xs leading-relaxed mb-3">
                            源泉徴収の対象となる業務につきましては、法令に基づき弊社が税金を一時的にお預かりし、国へ納付する義務がございます。そのため、請求書に記載がない場合でも、弊社側で税額を算出し差し引いた金額でお振り込みさせていただくことがございます。
                            お預かりした税金は、ご自身で確定申告を行うことで年間の正しい税額へと精算され、最終的な税負担に不利益が生じることはございません。
                        </p>
                        <p class="text-xs leading-relaxed text-gray-600">
                            For work subject to withholding tax, we are legally obligated to temporarily withhold taxes and remit them to the government. Therefore, even if not stated on the invoice, we may calculate and deduct the tax amount from the payment.
                            The withheld taxes will be reconciled to the correct annual tax amount when you file your tax return, ensuring no financial disadvantage in your final tax burden.
                        </p>
                    </div>
                </div>

                <!-- Invoice Items -->
                <div class="no-print bg-white rounded-lg shadow-md p-6">
                    <h2 class="text-2xl font-bold text-gray-800 mb-4 border-b pb-2">
                        Invoice Items / 請求項目
                    </h2>
                    
                    <div id="itemsContainer" class="space-y-4">
                        <div class="item-row border border-gray-200 rounded-lg p-4">
                            <div class="grid md:grid-cols-3 gap-4 mb-3">
                                <div>
                                    <label class="block text-sm font-medium text-gray-700 mb-1 required">
                                        Department / 部署
                                    </label>
                                    <select name="department[]" required
                                            class="item-department w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent">
                                        <option value="">選択してください</option>
                                        <option value="A-01">A-01 ソリューション</option>
                                        <option value="A-02">A-02 店舗</option>
                                        <option value="B-01">B-01 商談獲得</option>
                                        <option value="C-01">C-01 PEPPER Likes</option>
                                        <option value="C-02">C-02 dot B</option>
                                        <option value="X-01">X-01 経理</option>
                                        <option value="other">その他</option>
                                    </select>
                                </div>
                                
                                <div class="department-other" style="display: none;">
                                    <label class="block text-sm font-medium text-gray-700 mb-1 required">
                                        Other Department / その他部署名
                                    </label>
                                    <input type="text" name="departmentOther[]"
                                           class="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent">
                                </div>
                                
                                <div class="md:col-span-2">
                                    <label class="block text-sm font-medium text-gray-700 mb-1 required">
                                        Job Category / 業務カテゴリ
                                    </label>
                                    <select name="jobCategory[]" required
                                            class="item-job-category w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent">
                                        <option value="">選択してください</option>
                                    </select>
                                </div>
                            </div>
                            
                            <div class="job-category-other-container mb-3" style="display: none;">
                                <label class="flex items-center bg-orange-50 p-3 rounded border border-orange-200">
                                    <input type="checkbox" name="jobCategoryWithholding[]"
                                           class="job-category-withholding w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500">
                                    <span class="ml-2 text-sm text-gray-700 font-medium">
                                        Subject to withholding tax / 源泉徴収対象
                                    </span>
                                </label>
                            </div>
                            
                            <div class="grid md:grid-cols-2 gap-4 mb-3">
                                <div>
                                    <label class="block text-sm font-medium text-gray-700 mb-1 required">
                                        Task Details / タスク詳細
                                    </label>
                                    <textarea name="taskDetails[]" required rows="2"
                                              class="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"></textarea>
                                </div>
                                
                                <div>
                                    <label class="block text-sm font-medium text-gray-700 mb-1 required">
                                        Project Name / プロジェクト名
                                    </label>
                                    <input type="text" name="projectName[]" required
                                           class="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent">
                                </div>
                            </div>
                            
                            <div class="grid md:grid-cols-3 gap-4">
                                <div>
                                    <label class="block text-sm font-medium text-gray-700 mb-1 required">
                                        Quantity / 数量
                                    </label>
                                    <input type="number" name="quantity[]" min="1" value="1" required
                                           class="item-quantity w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent">
                                </div>
                                
                                <div>
                                    <label class="block text-sm font-medium text-gray-700 mb-1 required">
                                        Unit Price / 単価
                                    </label>
                                    <input type="number" name="unitPrice[]" min="0" step="1" required
                                           class="item-price w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent">
                                </div>
                                
                                <div>
                                    <label class="block text-sm font-medium text-gray-700 mb-1">
                                        Subtotal / 小計
                                    </label>
                                    <input type="number" name="subtotal[]" readonly
                                           class="item-subtotal w-full px-3 py-2 border border-gray-300 rounded-md bg-gray-100">
                                </div>
                            </div>
                            
                            <div class="item-tax-exempt-container mt-2 text-right" style="display: none;">
                                <label class="inline-flex items-center cursor-pointer text-xs text-gray-600 hover:text-gray-800">
                                    <input type="checkbox" name="itemTaxExempt[]"
                                           class="item-tax-exempt w-3 h-3 text-gray-600 border-gray-300 rounded focus:ring-gray-400">
                                    <span class="ml-2">
                                        Tax Exempt / 非課税
                                    </span>
                                </label>
                            </div>
                            
                            <div class="mt-3 text-right">
                                <button type="button" class="remove-item text-red-600 hover:text-red-800 text-sm font-medium" style="display: none;">
                                    <i class="fas fa-trash mr-1"></i>Remove Item
                                </button>
                            </div>
                        </div>
                    </div>
                    
                    <button type="button" id="addItem" class="mt-4 px-4 py-2 text-white rounded-md transition" style="background-color: #1C008D;" onmouseover="this.style.backgroundColor='#150070'" onmouseout="this.style.backgroundColor='#1C008D'">
                        <i class="fas fa-plus mr-2"></i>Add Item / 項目を追加
                    </button>
                    
                    <div class="mt-6 border-t pt-4">
                        <div class="max-w-md ml-auto space-y-2">
                            <div class="flex justify-between text-lg">
                                <span class="font-medium">Subtotal / 小計:</span>
                                <span id="totalSubtotal" class="font-bold">¥0</span>
                            </div>
                            <div class="flex justify-between text-lg" id="taxRow">
                                <span class="font-medium">Tax (10%) / 消費税:</span>
                                <span id="taxAmount" class="font-bold">¥0</span>
                            </div>
                            <div class="flex justify-between text-lg text-gray-600" id="withholdingBaseRow" style="display: none;">
                                <span class="font-medium">Withholding Base (Tax-Excl.) / 源泉対象額（税抜）:</span>
                                <span id="withholdingBaseAmount" class="font-bold">¥0</span>
                            </div>
                            <div class="flex justify-between text-lg text-red-600" id="withholdingRow" style="display: none;">
                                <span class="font-medium"><span id="withholdingLabel">Withholding Tax / 源泉徴収税:</span></span>
                                <span id="withholdingAmount" class="font-bold">-¥0</span>
                            </div>
                            <div class="flex justify-between text-2xl border-t-2 pt-2">
                                <span class="font-bold">Total / 合計:</span>
                                <span id="totalAmount" class="font-bold text-blue-600">¥0</span>
                            </div>
                        </div>
                    </div>
                </div>

                <!-- Payment Information -->
                <div class="no-print bg-white rounded-lg shadow-md p-6">
                    <h2 class="text-2xl font-bold text-gray-800 mb-4 border-b pb-2">
                        Payment Information / 支払い情報
                    </h2>
                    
                    <div class="mb-4">
                        <label class="block text-sm font-medium text-gray-700 mb-1 required">
                            Payment Method / 支払方法
                        </label>
                        <select name="paymentMethod" id="paymentMethod" required
                                class="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent">
                            <option value="">選択してください</option>
                            <option value="domestic">Domestic Bank Transfer / 国内送金</option>
                            <option value="international">International Bank Transfer / 海外送金</option>
                            <option value="paypal">PayPal</option>
                        </select>
                    </div>
                    
                    <!-- Domestic Transfer Fields -->
                    <div id="domesticFields" class="payment-fields space-y-4" style="display: none;">
                        <h3 class="text-lg font-semibold text-gray-700 mb-3">Domestic Transfer / 国内送金</h3>
                        
                        <div class="grid md:grid-cols-2 gap-4">
                            <div>
                                <label class="block text-sm font-medium text-gray-700 mb-1 required">
                                    Bank Name / 銀行名
                                </label>
                                <input type="text" name="domesticBankName"
                                       class="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent">
                            </div>
                            
                            <div>
                                <label class="block text-sm font-medium text-gray-700 mb-1 required">
                                    Branch Name / 支店名
                                </label>
                                <input type="text" name="domesticBranchName"
                                       class="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent">
                            </div>
                            
                            <div>
                                <label class="block text-sm font-medium text-gray-700 mb-1 required">
                                    Branch Number / 支店番号
                                </label>
                                <input type="text" name="domesticBranchNumber" pattern="[0-9]*"
                                       class="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                       placeholder="001">
                            </div>
                            
                            <div>
                                <label class="block text-sm font-medium text-gray-700 mb-1 required">
                                    Account Type / 口座種別
                                </label>
                                <select name="domesticAccountType"
                                        class="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent">
                                    <option value="">選択してください</option>
                                    <option value="普通">普通 (Savings)</option>
                                    <option value="当座">当座 (Checking)</option>
                                </select>
                            </div>
                            
                            <div>
                                <label class="block text-sm font-medium text-gray-700 mb-1 required">
                                    Account Number / 口座番号
                                </label>
                                <input type="text" name="domesticAccountNumber" pattern="[0-9]*"
                                       class="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                       placeholder="0123456">
                            </div>
                            
                            <div>
                                <label class="block text-sm font-medium text-gray-700 mb-1 required">
                                    Account Holder's Name in Katakana / 受取人名［カナ］
                                </label>
                                <input type="text" name="domesticAccountHolder"
                                       class="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                       placeholder="ヤマダ タロウ">
                            </div>
                        </div>
                    </div>
                    
                    <!-- International Transfer Fields -->
                    <div id="internationalFields" class="payment-fields space-y-4" style="display: none;">
                        <h3 class="text-lg font-semibold text-gray-700 mb-3">International Transfer / 海外送金</h3>
                        
                        <h4 class="text-md font-semibold text-gray-600 mt-4 mb-2">Recipient Information / 受取人情報</h4>
                        <div class="grid md:grid-cols-2 gap-4">
                            <div>
                                <label class="block text-sm font-medium text-gray-700 mb-1 required">
                                    Recipient's Country of Residence / 受取人居住国
                                </label>
                                <input type="text" name="intlCountry"
                                       class="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent">
                            </div>
                            
                            <div>
                                <label class="block text-sm font-medium text-gray-700 mb-1 required">
                                    Recipient's E-mail Address / 受取人メールアドレス
                                </label>
                                <input type="email" name="intlEmail"
                                       class="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent">
                            </div>
                            
                            <div class="md:col-span-2">
                                <label class="block text-sm font-medium text-gray-700 mb-1 required">
                                    Recipient's Address / 受取人住所
                                </label>
                                <textarea name="intlAddress" rows="2"
                                          class="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"></textarea>
                            </div>
                            
                            <div>
                                <label class="block text-sm font-medium text-gray-700 mb-1 required">
                                    Recipient's Phone Number / 受取人電話番号
                                </label>
                                <input type="tel" name="intlPhone"
                                       class="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                       placeholder="+1234567890">
                            </div>
                            
                            <div>
                                <label class="block text-sm font-medium text-gray-700 mb-1 required">
                                    Date of Birth / 生年月日
                                </label>
                                <input type="date" name="intlDOB"
                                       class="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent">
                            </div>
                        </div>
                        
                        <h4 class="text-md font-semibold text-gray-600 mt-4 mb-2">Bank Information / 銀行情報</h4>
                        <div class="grid md:grid-cols-2 gap-4">
                            <div>
                                <label class="block text-sm font-medium text-gray-700 mb-1 required">
                                    Overseas Bank Name / 海外銀行名
                                </label>
                                <input type="text" name="intlBankName"
                                       class="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent">
                            </div>
                            
                            <div>
                                <label class="block text-sm font-medium text-gray-700 mb-1">
                                    Financial Institution Code / 金融機関コード (Optional / 任意)
                                </label>
                                <input type="text" name="intlInstitutionCode"
                                       class="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent">
                            </div>
                            
                            <div>
                                <label class="block text-sm font-medium text-gray-700 mb-1 required">
                                    Branch Name / 支店名
                                </label>
                                <input type="text" name="intlBranchName"
                                       class="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent">
                            </div>
                            
                            <div>
                                <label class="block text-sm font-medium text-gray-700 mb-1 required">
                                    Branch Number / 支店番号
                                </label>
                                <input type="text" name="intlBranchNumber" pattern="[0-9]*"
                                       class="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent">
                            </div>
                            
                            <div class="md:col-span-2">
                                <label class="block text-sm font-medium text-gray-700 mb-1 required">
                                    Bank Address / 銀行住所
                                </label>
                                <textarea name="intlBankAddress" rows="2"
                                          class="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"></textarea>
                            </div>
                            
                            <div>
                                <label class="block text-sm font-medium text-gray-700 mb-1 required">
                                    Account Number / 口座番号
                                </label>
                                <input type="text" name="intlAccountNumber"
                                       class="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent">
                            </div>
                            
                            <div>
                                <label class="block text-sm font-medium text-gray-700 mb-1 required">
                                    SWIFT Code / SWIFTコード
                                </label>
                                <input type="text" name="intlSwiftCode"
                                       class="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                       placeholder="ABCDUS33">
                            </div>
                            
                            <div class="md:col-span-2">
                                <label class="block text-sm font-medium text-gray-700 mb-1 required">
                                    Account Name / 口座名義
                                </label>
                                <input type="text" name="intlAccountName"
                                       class="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent">
                            </div>
                        </div>
                    </div>
                    
                    <!-- PayPal Fields -->
                    <div id="paypalFields" class="payment-fields space-y-4" style="display: none;">
                        <h3 class="text-lg font-semibold text-gray-700 mb-3">PayPal</h3>
                        
                        <div>
                            <label class="block text-sm font-medium text-gray-700 mb-1 required">
                                PayPal Identity / PayPal登録アドレス
                            </label>
                            <input type="email" name="paypalEmail"
                                   class="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent">
                        </div>
                    </div>
                </div>

                <!-- Notes Section -->
                <div class="no-print bg-white rounded-lg shadow-md p-6">
                    <h2 class="text-2xl font-bold text-gray-800 mb-4 border-b pb-2">
                        Notes / 備考
                    </h2>
                    
                    <div>
                        <label class="block text-sm font-medium text-gray-700 mb-1">
                            Additional Notes / 備考（任意）
                        </label>
                        <textarea name="notes" rows="4"
                                  class="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                  placeholder="特記事項などがあればご記入ください"></textarea>
                    </div>
                </div>

                <!-- Form Actions -->
                <div class="no-print flex gap-4">
                    <button type="button" id="previewBtn" 
                            class="w-1/2 px-6 py-3 rounded-md transition font-medium text-lg" 
                            style="background-color: #CEC9E1; color: #1C008D;"
                            onmouseover="this.style.backgroundColor='#B8B0D5'" 
                            onmouseout="this.style.backgroundColor='#CEC9E1'">
                        <i class="fas fa-eye mr-2"></i>Preview Invoice / プレビュー
                    </button>
                    <button type="button" id="saveBtn"
                            class="w-1/4 px-6 py-3 text-white rounded-md transition font-medium text-lg"
                            style="background-color: #1C008D;"
                            onmouseover="this.style.backgroundColor='#150070'" 
                            onmouseout="this.style.backgroundColor='#1C008D'">
                        <i class="fas fa-save mr-2"></i>Save / 保存
                    </button>
                    <button type="button" id="resetBtn"
                            class="w-1/4 px-6 py-3 bg-red-600 text-white rounded-md hover:bg-red-700 transition font-medium text-lg">
                        <i class="fas fa-trash mr-2"></i>Reset / リセット
                    </button>
                </div>
            </form>

            <!-- Invoice Preview -->
            <div id="invoicePreview" class="print-only bg-white rounded-lg shadow-md p-8" style="display: none;">
                <!-- Will be populated by JavaScript -->
            </div>
        </div>

        <script src="https://cdn.jsdelivr.net/npm/axios@1.6.0/dist/axios.min.js"></script>
        <script>
            // Master Data
            const DEPARTMENTS = {
                'A-01': 'A-01 ソリューション / Solution',
                'A-02': 'A-02 店舗 / Store',
                'B-01': 'B-01 商談獲得 / Business Development',
                'C-01': 'C-01 PEPPER Likes',
                'C-02': 'C-02 dot B',
                'X-01': 'X-01 経理 / Accounting'
            };
            
            const STAFF_LIST = [
                { name: '都所 遼', departments: ['C-01', 'B-01'] },
                { name: '中村 黎志', departments: ['A-01'] },
                { name: '米坂 隼輝', departments: ['A-01'] },
                { name: '冨永 重人', departments: ['A-01'] },
                { name: '吉田 有希', departments: ['A-01'] },
                { name: '高橋 史朗', departments: ['A-01'] },
                { name: '大和田 博斗', departments: ['A-01'] },
                { name: '尹 智鉉', departments: ['A-01'] },
                { name: '宇佐見 惇', departments: ['A-01'] },
                { name: '長橋 悠', departments: ['X-01'] },
                { name: '荒見 眞', departments: ['A-01'] },
                { name: '斉藤 諒', departments: ['A-01', 'B-01', 'C-01'] },
                { name: '林 益載', departments: ['A-01'] },
                { name: 'Bradberry Zac', departments: ['A-01'] },
                { name: 'Andrea Katsuya', departments: ['A-01'] },
                { name: '潘 彦敬', departments: ['A-01'] },
                { name: 'Valentina Herrera', departments: ['A-01'] },
                { name: 'Javier Escobar', departments: ['A-01'] },
                { name: 'Luis Martín', departments: ['A-01'] },
                { name: '翁 于婷', departments: ['A-01'] },
                { name: '華原 博文', departments: ['A-01'] },
                { name: '中島 稜晴', departments: ['A-01'] },
                { name: '金 美蘭', departments: ['A-01'] },
                { name: 'Devan Veres', departments: ['A-01'] },
                { name: '赤崎 隆', departments: ['A-01'] },
                { name: '林 辰樺', departments: ['A-01'] },
                { name: '石島 岬', departments: ['A-01'] },
                { name: '神村 昂佑', departments: ['A-01'] },
                { name: '佐野 里華', departments: ['A-01'] },
                { name: '横川 菜都子', departments: ['X-01'] },
                { name: '後藤 恵梨賀', departments: ['C-01'] },
                { name: 'Aidan Mcfarlane', departments: ['A-01'] },
                { name: '小林 雪珠', departments: ['A-01'] },
                { name: '鐘築 悠衣', departments: ['A-01'] },
                { name: '井上 航輔', departments: ['A-01'] },
                { name: '鈴木陽汐', departments: ['C-01'] },
                { name: '崔 亜衣', departments: ['X-01'] }
            ];
            
            const JOB_LIST_DOMESTIC = [
                { name: 'SNS運用代行 / SNS Management', withholding: false },
                { name: '広告運用 / Ad Operations', withholding: false },
                { name: 'システム開発・コーディング / System Development & Coding', withholding: false },
                { name: '商談獲得 / Business Development', withholding: false },
                { name: '被リンク獲得 / Backlink Acquisition', withholding: false },
                { name: 'CS業務・その他事務作業 / Customer Support & Administrative Work', withholding: false },
                { name: 'その他 / Other', withholding: true, manual: true }
            ];
            
            const JOB_LIST_FOREIGN = [
                { name: 'クリエイティブ制作 / Creative Production', withholding: true, group: 'A' },
                { name: 'コンテンツ企画・制作支援 / Content Planning & Production Support', withholding: true, group: 'A' },
                { name: 'コピー・ライティング業務 / Copywriting', withholding: true, group: 'A' },
                { name: '動画・画像編集 / Video & Image Editing', withholding: true, group: 'A' },
                { name: 'SNS関連業務 / SNS Related Work', withholding: false, group: 'B' },
                { name: 'インフルエンサー管理・調整業務 / Influencer Management', withholding: false, group: 'B' },
                { name: '翻訳業務 / Translation', withholding: false, group: 'B' },
                { name: '広告運用 / Ad Operations', withholding: false, group: 'B' },
                { name: '商談獲得 / Business Development', withholding: false, group: 'B' },
                { name: 'その他 / Other', withholding: true, group: 'Manual', manual: true }
            ];
            
            const TAX_RATE = 0.1;
            const WITHHOLDING_RATE_DOMESTIC = 0.1021;
            const WITHHOLDING_RATE_FOREIGN = 0.2042;
            
            // Form state management
            let formData = {};
            
            // Load saved data from localStorage
            function loadSavedData() {
                const saved = localStorage.getItem('invoiceFormData');
                if (saved) {
                    try {
                        const data = JSON.parse(saved);
                        // Populate issuer fields
                        if (data.issuerType) document.querySelector('[name="issuerType"]').value = data.issuerType;
                        if (data.issuerName) document.querySelector('[name="issuerName"]').value = data.issuerName;
                        if (data.issuerTNumber) document.querySelector('[name="issuerTNumber"]').value = data.issuerTNumber;
                        if (data.issuerAddress) document.querySelector('[name="issuerAddress"]').value = data.issuerAddress;
                        if (data.issuerEmail) document.querySelector('[name="issuerEmail"]').value = data.issuerEmail;
                        if (data.issuerPhone) document.querySelector('[name="issuerPhone"]').value = data.issuerPhone;
                        
                        // Populate residence
                        if (data.residesInJapan) {
                            const radioButton = document.querySelector(\`input[name="residesInJapan"][value="\${data.residesInJapan}"]\`);
                            if (radioButton) radioButton.checked = true;
                        }
                        
                        // Populate payment fields based on method
                        if (data.paymentMethod) {
                            document.querySelector('[name="paymentMethod"]').value = data.paymentMethod;
                            showPaymentFields(data.paymentMethod);
                            
                            // Populate payment method specific fields
                            Object.keys(data).forEach(key => {
                                const field = document.querySelector(\`[name="\${key}"]\`);
                                if (field && data[key]) {
                                    field.value = data[key];
                                }
                            });
                        }
                    } catch (e) {
                        console.error('Error loading saved data:', e);
                    }
                }
            }
            
            // Save form data to localStorage
            function saveFormData() {
                const form = document.getElementById('invoiceForm');
                const formData = new FormData(form);
                const data = {};
                
                // Save issuer information
                data.issuerType = formData.get('issuerType');
                data.issuerName = formData.get('issuerName');
                data.issuerTNumber = formData.get('issuerTNumber');
                data.postalCode = formData.get('postalCode');
                data.issuerAddress = formData.get('issuerAddress');
                data.issuerEmail = formData.get('issuerEmail');
                data.issuerPhone = formData.get('issuerPhone');
                data.residesInJapan = formData.get('residesInJapan');
                data.paymentMethod = formData.get('paymentMethod');
                
                // Save payment information based on method
                const paymentMethod = formData.get('paymentMethod');
                if (paymentMethod === 'domestic') {
                    data.domesticBankName = formData.get('domesticBankName');
                    data.domesticBranchName = formData.get('domesticBranchName');
                    data.domesticBranchNumber = formData.get('domesticBranchNumber');
                    data.domesticAccountType = formData.get('domesticAccountType');
                    data.domesticAccountNumber = formData.get('domesticAccountNumber');
                    data.domesticAccountHolder = formData.get('domesticAccountHolder');
                } else if (paymentMethod === 'international') {
                    data.intlCountry = formData.get('intlCountry');
                    data.intlEmail = formData.get('intlEmail');
                    data.intlAddress = formData.get('intlAddress');
                    data.intlPhone = formData.get('intlPhone');
                    data.intlDOB = formData.get('intlDOB');
                    data.intlBankName = formData.get('intlBankName');
                    data.intlInstitutionCode = formData.get('intlInstitutionCode');
                    data.intlBranchName = formData.get('intlBranchName');
                    data.intlBranchNumber = formData.get('intlBranchNumber');
                    data.intlBankAddress = formData.get('intlBankAddress');
                    data.intlAccountNumber = formData.get('intlAccountNumber');
                    data.intlSwiftCode = formData.get('intlSwiftCode');
                    data.intlAccountName = formData.get('intlAccountName');
                } else if (paymentMethod === 'paypal') {
                    data.paypalEmail = formData.get('paypalEmail');
                }
                
                // Save notes
                data.notes = formData.get('notes');
                
                localStorage.setItem('invoiceFormData', JSON.stringify(data));
                alert('Form data saved successfully! / フォームデータを保存しました！');
            }
            
            // Reset form data
            function resetFormData() {
                const msg = 'Are you sure you want to clear all saved data? This action cannot be undone.' + String.fromCharCode(10) + String.fromCharCode(10) + '本当に保存されたデータを全て削除しますか？この操作は元に戻せません。';
                if (confirm(msg)) {
                    alert('Saved data has been cleared successfully! / 保存データを削除しました！');
                    location.reload();
                }
            }
            
            // Update job category options based on residence
            function updateJobCategories() {
                const residesInJapanRadio = document.querySelector('input[name="residesInJapan"]:checked');
                const residesInJapan = residesInJapanRadio ? residesInJapanRadio.value === 'yes' : true;
                const jobList = residesInJapan ? JOB_LIST_DOMESTIC : JOB_LIST_FOREIGN;
                
                document.querySelectorAll('.item-job-category').forEach(select => {
                    const currentValue = select.value;
                    select.innerHTML = '<option value="">選択してください</option>';
                    jobList.forEach(job => {
                        const option = document.createElement('option');
                        option.value = job.name;
                        option.textContent = job.name;
                        option.dataset.withholding = job.withholding;
                        option.dataset.manual = job.manual || false;
                        option.dataset.group = job.group || '';
                        select.appendChild(option);
                    });
                    if (currentValue) select.value = currentValue;
                });
            }
            
            // Update contact person dropdown based on department totals
            // NOTE: Contact person is now a text input field, not a dropdown
            function updateContactPerson() {
                // This function is no longer needed as contact person is a text input
                // Keeping it for backward compatibility but it does nothing
            }
            
            // Show/hide payment fields based on selection
            function showPaymentFields(method) {
                document.querySelectorAll('.payment-fields').forEach(el => {
                    el.style.display = 'none';
                    // Remove required attribute from hidden fields
                    el.querySelectorAll('[required]').forEach(field => {
                        field.removeAttribute('required');
                    });
                });
                
                let targetFields = null;
                if (method === 'domestic') {
                    targetFields = document.getElementById('domesticFields');
                } else if (method === 'international') {
                    targetFields = document.getElementById('internationalFields');
                } else if (method === 'paypal') {
                    targetFields = document.getElementById('paypalFields');
                }
                
                if (targetFields) {
                    targetFields.style.display = 'block';
                    // Add required attribute to visible fields with required class
                    targetFields.querySelectorAll('label.required').forEach(label => {
                        const input = label.parentElement.querySelector('input, select, textarea');
                        if (input) {
                            input.setAttribute('required', 'required');
                        }
                    });
                }
            }
            
            // Calculate item subtotal
            function calculateItemSubtotal(itemRow) {
                const quantity = parseFloat(itemRow.querySelector('.item-quantity').value) || 0;
                const price = parseFloat(itemRow.querySelector('.item-price').value) || 0;
                const subtotal = quantity * price;
                itemRow.querySelector('.item-subtotal').value = subtotal;
                calculateTotals();
            }
            
            // Calculate all totals
            function calculateTotals() {
                let subtotal = 0;
                let withholdingSubtotal = 0; // Subtotal of items subject to withholding
                const residesInJapanRadio = document.querySelector('input[name="residesInJapan"]:checked');
                const residesInJapan = residesInJapanRadio ? residesInJapanRadio.value === 'yes' : true;
                const withholdingRate = residesInJapan ? WITHHOLDING_RATE_DOMESTIC : WITHHOLDING_RATE_FOREIGN;
                const withholdingRatePercent = residesInJapan ? '10.21%' : '20.42%';
                
                // Calculate subtotal and withholding subtotal per item
                let hasWithholding = false;
                let taxableSubtotal = 0; // Subtotal of taxable items (for tax calculation)
                let taxExemptSubtotal = 0; // Subtotal of tax-exempt items
                
                document.querySelectorAll('.item-row').forEach(row => {
                    const itemSubtotal = parseFloat(row.querySelector('.item-subtotal').value) || 0;
                    subtotal += itemSubtotal;
                    
                    // Check if this item is individually tax-exempt
                    const taxExemptCheckbox = row.querySelector('.item-tax-exempt');
                    const isItemTaxExempt = taxExemptCheckbox && taxExemptCheckbox.checked;
                    
                    if (isItemTaxExempt) {
                        taxExemptSubtotal += itemSubtotal;
                    } else {
                        taxableSubtotal += itemSubtotal;
                    }
                    
                    // Check if this item requires withholding
                    const jobCategorySelect = row.querySelector('.item-job-category');
                    const selectedOption = jobCategorySelect.options[jobCategorySelect.selectedIndex];
                    let itemHasWithholding = false;
                    
                    if (selectedOption && selectedOption.dataset.withholding === 'true') {
                        if (selectedOption.dataset.manual === 'true') {
                            // Manual check for "その他"
                            const withholdingCheckbox = row.querySelector('.job-category-withholding');
                            if (withholdingCheckbox && withholdingCheckbox.checked) {
                                itemHasWithholding = true;
                            }
                        } else {
                            itemHasWithholding = true;
                        }
                    }
                    
                    if (itemHasWithholding) {
                        hasWithholding = true;
                        // For withholding calculation, use tax-exclusive amount
                        if (isItemTaxExempt) {
                            // Already tax-exempt, use as-is
                            withholdingSubtotal += itemSubtotal;
                        } else {
                            // Tax-inclusive, add as-is (will be converted later)
                            withholdingSubtotal += itemSubtotal;
                        }
                    }
                });
                
                const taxType = document.getElementById('taxType').value;
                
                let taxAmount = 0;
                let withholdingAmount = 0;
                let withholdingBaseAmount = 0; // Tax-exclusive base for withholding calculation
                let total = 0;
                
                if (taxType === 'inclusive') {
                    // Tax inclusive: calculate tax only on taxable items
                    const taxableBaseAmount = taxableSubtotal / 1.1;
                    taxAmount = taxableSubtotal - taxableBaseAmount;
                    
                    if (hasWithholding) {
                        // Calculate withholding: tax-inclusive items need conversion, tax-exempt items don't
                        // We need to recalculate per item to get accurate withholding base
                        withholdingBaseAmount = 0;
                        document.querySelectorAll('.item-row').forEach(row => {
                            const itemSubtotal = parseFloat(row.querySelector('.item-subtotal').value) || 0;
                            const taxExemptCheckbox = row.querySelector('.item-tax-exempt');
                            const isItemTaxExempt = taxExemptCheckbox && taxExemptCheckbox.checked;
                            
                            const jobCategorySelect = row.querySelector('.item-job-category');
                            const selectedOption = jobCategorySelect.options[jobCategorySelect.selectedIndex];
                            let itemHasWithholding = false;
                            
                            if (selectedOption && selectedOption.dataset.withholding === 'true') {
                                if (selectedOption.dataset.manual === 'true') {
                                    const withholdingCheckbox = row.querySelector('.job-category-withholding');
                                    if (withholdingCheckbox && withholdingCheckbox.checked) {
                                        itemHasWithholding = true;
                                    }
                                } else {
                                    itemHasWithholding = true;
                                }
                            }
                            
                            if (itemHasWithholding) {
                                if (isItemTaxExempt) {
                                    // Tax-exempt item: use subtotal as-is
                                    withholdingBaseAmount += itemSubtotal;
                                } else {
                                    // Tax-inclusive item: convert to tax-exclusive
                                    withholdingBaseAmount += itemSubtotal / 1.1;
                                }
                            }
                        });
                        
                        withholdingAmount = withholdingBaseAmount * withholdingRate;
                        total = subtotal - withholdingAmount;
                    } else {
                        total = subtotal;
                    }
                } else if (taxType === 'tax-exempt') {
                    // Tax exempt: no tax
                    taxAmount = 0;
                    
                    if (hasWithholding) {
                        // Calculate withholding on subtotal directly (no tax to exclude)
                        withholdingBaseAmount = withholdingSubtotal;
                        withholdingAmount = withholdingSubtotal * withholdingRate;
                        total = subtotal - withholdingAmount;
                    } else {
                        total = subtotal;
                    }
                }
                
                document.getElementById('totalSubtotal').textContent = '¥' + Math.round(subtotal).toLocaleString();
                document.getElementById('taxAmount').textContent = '¥' + Math.round(taxAmount).toLocaleString();
                document.getElementById('withholdingBaseAmount').textContent = '¥' + Math.round(withholdingBaseAmount).toLocaleString();
                document.getElementById('withholdingAmount').textContent = '-¥' + Math.round(withholdingAmount).toLocaleString();
                document.getElementById('totalAmount').textContent = '¥' + Math.round(total).toLocaleString();
                
                // Update withholding label with rate
                document.getElementById('withholdingLabel').textContent = 'Withholding Tax / 源泉徴収税 (' + withholdingRatePercent + '):';;
                
                // Show/hide tax row (hide for tax-exempt)
                document.getElementById('taxRow').style.display = (taxType === 'tax-exempt') ? 'none' : 'flex';
                
                // Show/hide withholding base row (show when withholding exists)
                document.getElementById('withholdingBaseRow').style.display = hasWithholding ? 'flex' : 'none';
                
                // Show/hide withholding row
                document.getElementById('withholdingRow').style.display = hasWithholding ? 'flex' : 'none';
            }
            
            // Add new item row
            function addItemRow() {
                const container = document.getElementById('itemsContainer');
                const firstRow = container.querySelector('.item-row');
                const newRow = firstRow.cloneNode(true);
                
                // Clear input values
                newRow.querySelectorAll('input, textarea, select').forEach(el => {
                    if (el.type === 'checkbox') {
                        el.checked = false;
                    } else if (el.type === 'number') {
                        el.value = el.name.includes('quantity') ? '1' : '0';
                    } else if (el.tagName === 'SELECT') {
                        el.selectedIndex = 0;
                    } else {
                        el.value = '';
                    }
                });
                
                // Update job categories for new row
                updateJobCategories();
                
                // Show remove button
                newRow.querySelector('.remove-item').style.display = 'inline-block';
                
                container.appendChild(newRow);
                
                // Update remove button visibility
                updateRemoveButtons();
            }
            
            // Update remove button visibility
            function updateRemoveButtons() {
                const items = document.querySelectorAll('.item-row');
                items.forEach((item, index) => {
                    const removeBtn = item.querySelector('.remove-item');
                    removeBtn.style.display = items.length > 1 ? 'inline-block' : 'none';
                });
            }
            
            // Remove item row
            function removeItemRow(btn) {
                const row = btn.closest('.item-row');
                row.remove();
                updateRemoveButtons();
                calculateTotals();
                updateContactPerson();
            }
            
            // Generate invoice preview
            function generatePreview() {
                const form = document.getElementById('invoiceForm');
                if (!form.checkValidity()) {
                    form.reportValidity();
                    return;
                }
                
                const formData = new FormData(form);
                
                // Build items HTML
                let itemsHTML = '';
                const departments = formData.getAll('department[]');
                const jobCategories = formData.getAll('jobCategory[]');
                const taskDetails = formData.getAll('taskDetails[]');
                const projectNames = formData.getAll('projectName[]');
                const quantities = formData.getAll('quantity[]');
                const unitPrices = formData.getAll('unitPrice[]');
                const subtotals = formData.getAll('subtotal[]');
                
                // Get all item rows to check withholding status
                const itemRows = document.querySelectorAll('.item-row');
                const residesInJapanRadio = document.querySelector('input[name="residesInJapan"]:checked');
                const residesInJapan = residesInJapanRadio ? residesInJapanRadio.value === 'yes' : true;
                
                // Track if any item has individual tax-exempt checkbox checked
                let hasIndividualTaxExempt = false;
                
                for (let i = 0; i < departments.length; i++) {
                    // Get department full name
                    let deptDisplay = '';
                    if (departments[i] === 'other') {
                        deptDisplay = formData.getAll('departmentOther[]')[i];
                    } else {
                        const deptMap = {
                            'A-01': 'A-01 ソリューション / Solution',
                            'A-02': 'A-02 店舗 / Store',
                            'B-01': 'B-01 商談獲得 / Business Development',
                            'C-01': 'C-01 PEPPER Likes',
                            'C-02': 'C-02 dot B',
                            'X-01': 'X-01 経理 / Accounting'
                        };
                        deptDisplay = deptMap[departments[i]] || departments[i];
                    }
                    
                    // Check if this item has withholding
                    const row = itemRows[i];
                    let itemHasWithholding = false;
                    if (row) {
                        const jobCategorySelect = row.querySelector('.item-job-category');
                        const selectedOption = jobCategorySelect.options[jobCategorySelect.selectedIndex];
                        
                        if (selectedOption && selectedOption.dataset.withholding === 'true') {
                            if (selectedOption.dataset.manual === 'true') {
                                const withholdingCheckbox = row.querySelector('.job-category-withholding');
                                if (withholdingCheckbox && withholdingCheckbox.checked) {
                                    itemHasWithholding = true;
                                }
                            } else {
                                itemHasWithholding = true;
                            }
                        }
                    }
                    
                    // Check if this item is individually tax-exempt
                    const itemTaxExemptValues = formData.getAll('itemTaxExempt[]');
                    const isItemTaxExempt = itemTaxExemptValues[i] === 'on';
                    
                    // Track if any item has individual tax-exempt
                    if (isItemTaxExempt) {
                        hasIndividualTaxExempt = true;
                    }
                    
                    // Check if tax type is tax-exempt globally or for this item
                    const isTaxExempt = formData.get('taxType') === 'tax-exempt' || isItemTaxExempt;
                    
                    // Add indicators
                    let indicators = '';
                    if (itemHasWithholding) {
                        indicators += '<span style="color: #dc2626; font-weight: bold;">★</span> ';
                    }
                    if (isTaxExempt) {
                        indicators += '<span style="color: #2563eb; font-weight: bold;">●</span> ';
                    }
                    
                    itemsHTML += \`
                        <tr class="border-b">
                            <td class="border border-gray-800 py-1 px-1" style="font-size: 9px;">\${deptDisplay}</td>
                            <td class="border border-gray-800 py-1 px-1 text-xs">\${indicators}\${jobCategories[i]}</td>
                            <td class="border border-gray-800 py-1 px-1 text-xs">\${taskDetails[i]}</td>
                            <td class="border border-gray-800 py-1 px-1 text-xs">\${projectNames[i]}</td>
                            <td class="border border-gray-800 py-1 px-1 text-center text-xs">\${quantities[i]}</td>
                            <td class="border border-gray-800 py-1 px-1 text-right text-xs">¥\${parseFloat(unitPrices[i]).toLocaleString()}</td>
                            <td class="border border-gray-800 py-1 px-1 text-right text-xs font-medium">¥\${parseFloat(subtotals[i]).toLocaleString()}</td>
                        </tr>
                    \`;
                }
                
                // Build payment info HTML
                let paymentHTML = '';
                const paymentMethod = formData.get('paymentMethod');
                
                if (paymentMethod === 'domestic') {
                    paymentHTML = \`
                        <div><strong>Bank Name / 銀行名:</strong> \${formData.get('domesticBankName')}</div>
                        <div><strong>Branch Name / 支店名:</strong> \${formData.get('domesticBranchName')}</div>
                        <div><strong>Branch Number / 支店番号:</strong> \${formData.get('domesticBranchNumber')}</div>
                        <div><strong>Account Type / 口座種別:</strong> \${formData.get('domesticAccountType')}</div>
                        <div><strong>Account Number / 口座番号:</strong> \${formData.get('domesticAccountNumber')}</div>
                        <div><strong>Account Holder / 受取人名:</strong> \${formData.get('domesticAccountHolder')}</div>
                    \`;
                } else if (paymentMethod === 'international') {
                    paymentHTML = \`
                        <h4 class="font-semibold mt-1 mb-1" style="font-size: 11px;">Recipient Information / 受取人情報</h4>
                        <div><strong>Country / 居住国:</strong> \${formData.get('intlCountry')}</div>
                        <div><strong>Email:</strong> \${formData.get('intlEmail')}</div>
                        <div><strong>Address / 住所:</strong> \${formData.get('intlAddress')}</div>
                        <div><strong>Phone / 電話:</strong> \${formData.get('intlPhone')}</div>
                        <div><strong>Date of Birth / 生年月日:</strong> \${formData.get('intlDOB')}</div>
                        <h4 class="font-semibold mt-2 mb-1" style="font-size: 11px;">Bank Information / 銀行情報</h4>
                        <div><strong>Bank Name / 銀行名:</strong> \${formData.get('intlBankName')}</div>
                        \${formData.get('intlInstitutionCode') ? \`<div><strong>Institution Code / 金融機関コード:</strong> \${formData.get('intlInstitutionCode')}</div>\` : ''}
                        <div><strong>Branch Name / 支店名:</strong> \${formData.get('intlBranchName')}</div>
                        <div><strong>Branch Number / 支店番号:</strong> \${formData.get('intlBranchNumber')}</div>
                        <div><strong>Bank Address / 銀行住所:</strong> \${formData.get('intlBankAddress')}</div>
                        <div><strong>Account Number / 口座番号:</strong> \${formData.get('intlAccountNumber')}</div>
                        <div><strong>SWIFT Code:</strong> \${formData.get('intlSwiftCode')}</div>
                        <div><strong>Account Name / 口座名義:</strong> \${formData.get('intlAccountName')}</div>
                    \`;
                } else if (paymentMethod === 'paypal') {
                    paymentHTML = \`
                        <div><strong>PayPal Identity / PayPal登録アドレス:</strong> \${formData.get('paypalEmail')}</div>
                    \`;
                }
                
                // Check if work performed outside Japan should be displayed
                const residesInJapanValue = formData.get('residesInJapan');
                const workOutsideJapan = formData.get('workPerformedOutsideJapan');
                let workOutsideNotice = '';
                if (residesInJapanValue === 'no' && workOutsideJapan) {
                    workOutsideNotice = '<div class="mt-4 text-xs" style="color: #6b7280;"><strong>✓</strong> Declaration: All contracted work was performed outside Japan / すべての業務は日本国外で行われました</div>';
                }
                
                // Get tax type for display
                const taxType = formData.get('taxType');
                const taxTypeLabel = taxType === 'inclusive' ? 'Tax Inclusive / 税込' : 'Tax Exclusive / 税抜';
                
                // Get issuer type label
                const issuerTypeMap = {
                    'corporation': 'Corporation / 法人',
                    'sole': 'Sole Proprietor / 個人事業主',
                    'freelance': 'Freelancer / フリーランス'
                };
                const issuerType = issuerTypeMap[formData.get('issuerType')] || '';
                
                const previewHTML = \`
                    <div class="print-container max-w-4xl mx-auto">
                        <div class="invoice-header">
                            <h1 class="text-4xl font-bold">Invoice</h1>
                            <div class="invoice-dates">
                                <div><strong>Invoice Date / 請求日:</strong><br>\${formData.get('invoiceDate')}</div>
                                <div class="mt-1"><strong>Due Date / 支払期限:</strong><br>\${formData.get('dueDate')}</div>
                            </div>
                        </div>
                        
                        <div class="grid md:grid-cols-2 gap-6 section-spacing">
                            <div>
                                <h2 class="text-lg font-bold mb-2 border-b-2 border-gray-800 pb-1">BILL TO:</h2>
                                <div class="text-xs space-y-1">
                                    <div class="font-bold text-base">株式会社 LIFE PEPPER</div>
                                    <div>〒104-0045 東京都中央区築地3–1–10<br>Shinto GINZA EAST 6F</div>
                                    <div>Phone: +81 03-6869-7976</div>
                                    <div class="mt-2"><strong>Attn:</strong> \${formData.get('clientContact')}</div>
                                </div>
                            </div>
                            
                            <div class="text-right">
                                <h2 class="text-lg font-bold mb-2 border-b-2 border-gray-800 pb-1">FROM</h2>
                                <div class="text-xs space-y-1">
                                    <div class="text-xs text-gray-600">\${issuerType}</div>
                                    <div class="font-bold text-base">\${formData.get('issuerName')}</div>
                                    \${formData.get('issuerTNumber') ? \`<div>JCT Reg. No.: \${formData.get('issuerTNumber')}</div>\` : ''}
                                    \${formData.get('postalCode') ? \`<div>〒\${formData.get('postalCode')}</div>\` : ''}
                                    <div>\${formData.get('issuerAddress').replace(/\\n/g, '<br>')}</div>
                                    <div>Email: \${formData.get('issuerEmail')}</div>
                                    \${formData.get('issuerPhone') ? \`<div>Phone: \${formData.get('issuerPhone')}</div>\` : ''}
                                </div>
                            </div>
                        </div>
                        
                        <div class="section-spacing">
                            <h2 class="text-base font-bold mb-2">Invoice Items / 請求項目</h2>
                            <table class="w-full border-collapse border border-gray-800">
                                <thead class="bg-gray-200">
                                    <tr>
                                        <th class="border border-gray-800 py-1 px-1 text-left text-xs">Department<br>部署</th>
                                        <th class="border border-gray-800 py-1 px-1 text-left text-xs">Job Category<br>業務カテゴリ</th>
                                        <th class="border border-gray-800 py-1 px-1 text-left text-xs">Task Details<br>タスク詳細</th>
                                        <th class="border border-gray-800 py-1 px-1 text-left text-xs">Project<br>プロジェクト</th>
                                        <th class="border border-gray-800 py-1 px-1 text-center text-xs">Qty<br>数量</th>
                                        <th class="border border-gray-800 py-1 px-1 text-right text-xs">Unit Price<br>単価</th>
                                        <th class="border border-gray-800 py-1 px-1 text-right text-xs">Subtotal<br>小計<br><span style="font-size: 9px; color: #6b7280;">(\${taxTypeLabel})</span></th>
                                    </tr>
                                </thead>
                                <tbody>
                                    \${itemsHTML}
                                </tbody>
                            </table>
                            <div class="mt-2 text-xs space-y-1">
                                \${document.getElementById('withholdingRow').style.display === 'flex' ? '<div style="color: #dc2626;"><span style="font-weight: bold;">★</span> = Subject to withholding tax / 源泉徴収対象</div>' : ''}
                                \${formData.get('taxType') === 'tax-exempt' || hasIndividualTaxExempt ? '<div style="color: #2563eb;"><span style="font-weight: bold;">●</span> = Tax exempt / 非課税対象</div>' : ''}
                            </div>
                        </div>
                        
                        <div class="flex justify-end totals-section">
                            <div class="w-80 space-y-1 text-xs">
                                <div class="flex justify-between py-1">
                                    <span>Subtotal / 小計:</span>
                                    <span class="font-medium">\${document.getElementById('totalSubtotal').textContent}</span>
                                </div>
                                \${document.getElementById('taxRow').style.display === 'flex' ? \`
                                <div class="flex justify-between py-1">
                                    <span>Tax (10%) / 消費税:</span>
                                    <span class="font-medium">\${document.getElementById('taxAmount').textContent}</span>
                                </div>
                                \` : ''}
                                \${document.getElementById('withholdingBaseRow').style.display === 'flex' ? \`
                                <div class="flex justify-between py-1" style="color: #6b7280;">
                                    <span>Withholding Base (Tax-Excl.) / 源泉対象額（税抜）:</span>
                                    <span class="font-medium">\${document.getElementById('withholdingBaseAmount').textContent}</span>
                                </div>
                                \` : ''}
                                \${document.getElementById('withholdingRow').style.display === 'flex' ? \`
                                <div class="flex justify-between py-1" style="color: #dc2626;">
                                    <span>\${document.getElementById('withholdingLabel').textContent}</span>
                                    <span class="font-medium">\${document.getElementById('withholdingAmount').textContent}</span>
                                </div>
                                \` : ''}
                                <div class="flex justify-between py-2 border-t-2 border-gray-800 text-base font-bold">
                                    <span>Total / 合計:</span>
                                    <span style="color: #2563eb;">\${document.getElementById('totalAmount').textContent}</span>
                                </div>
                            </div>
                        </div>
                        
                        <div class="payment-section">
                            <h2 class="text-base font-bold mb-2">Payment Information / 支払い情報</h2>
                            <div class="text-xs">
                                \${paymentHTML}
                            </div>
                        </div>
                        
                        \${formData.get('notes') ? \`
                        <div class="mt-6 text-xs" style="color: #374151;">
                            <h3 class="font-semibold mb-2" style="color: #1f2937;">Notes / 備考:</h3>
                            <p style="white-space: pre-wrap;">\${formData.get('notes')}</p>
                        </div>
                        \` : ''}
                        
                        \${workOutsideNotice ? \`
                        <div class="mt-6 text-center text-xs" style="color: #6b7280;">
                            \${workOutsideNotice}
                        </div>
                        \` : ''}
                        
                        <div class="mt-6 text-center no-print">
                            <button onclick="window.print()" class="px-6 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition">
                                <i class="fas fa-print mr-2"></i>Print Invoice / 印刷
                            </button>
                            <button onclick="closePreview()" class="ml-4 px-6 py-2 bg-gray-600 text-white rounded-md hover:bg-gray-700 transition">
                                <i class="fas fa-times mr-2"></i>Close / 閉じる
                            </button>
                        </div>
                    </div>
                \`;
                
                const preview = document.getElementById('invoicePreview');
                preview.innerHTML = previewHTML;
                preview.style.display = 'block';
                
                // Hide form
                document.getElementById('invoiceForm').style.display = 'none';
                document.querySelector('.no-print.bg-white.rounded-lg.shadow-md.p-6.mb-6').style.display = 'none';
                
                // Scroll to top
                window.scrollTo(0, 0);
            }
            
            function closePreview() {
                document.getElementById('invoicePreview').style.display = 'none';
                document.getElementById('invoiceForm').style.display = 'block';
                document.querySelector('.no-print.bg-white.rounded-lg.shadow-md.p-6.mb-6').style.display = 'block';
            }
            
            // Event listeners
            document.addEventListener('DOMContentLoaded', function() {
                // Load saved data
                loadSavedData();
                
                // Set default date to today
                const today = new Date().toISOString().split('T')[0];
                document.querySelector('[name="invoiceDate"]').value = today;
                
                // Initialize job categories
                updateJobCategories();
                
                // Update withholding notice visibility based on issuer type
                function updateWithholdingNoticeVisibility() {
                    const issuerType = document.querySelector('[name="issuerType"]').value;
                    const withholdingNotice = document.getElementById('withholdingNotice');
                    // Hide for corporation, show for sole proprietor and freelance
                    if (issuerType === 'corporation') {
                        withholdingNotice.style.display = 'none';
                    } else {
                        withholdingNotice.style.display = 'block';
                    }
                }
                
                // Issuer type change
                document.querySelector('[name="issuerType"]').addEventListener('change', updateWithholdingNoticeVisibility);
                
                // Initialize withholding notice visibility
                updateWithholdingNoticeVisibility();
                
                // Residence change
                document.querySelectorAll('input[name="residesInJapan"]').forEach(radio => {
                    radio.addEventListener('change', function(e) {
                        const notice = document.getElementById('nonJapanWorkNotice');
                        const residesInJapan = e.target.value === 'yes';
                        notice.style.display = residesInJapan ? 'none' : 'block';
                        const checkbox = document.getElementById('workPerformedOutsideJapan');
                        if (residesInJapan) {
                            checkbox.checked = false;
                            checkbox.removeAttribute('required');
                        } else {
                            checkbox.setAttribute('required', 'required');
                        }
                        updateJobCategories();
                        updateTaxTypeControl(residesInJapan);
                        calculateTotals();
                    });
                });
                
                // Function to update tax type control based on residence
                function updateTaxTypeControl(residesInJapan) {
                    const taxTypeSelect = document.getElementById('taxType');
                    if (residesInJapan) {
                        // Domestic: tax-inclusive only (disabled)
                        taxTypeSelect.value = 'inclusive';
                        taxTypeSelect.disabled = true;
                        taxTypeSelect.style.backgroundColor = '#f3f4f6';
                        taxTypeSelect.style.cursor = 'not-allowed';
                    } else {
                        // Foreign: can choose, default to tax-exempt
                        taxTypeSelect.disabled = false;
                        taxTypeSelect.style.backgroundColor = '';
                        taxTypeSelect.style.cursor = '';
                        taxTypeSelect.value = 'tax-exempt';
                    }
                }
                
                // Initialize tax type control
                const initialResidenceForTax = document.querySelector('input[name="residesInJapan"]:checked');
                if (initialResidenceForTax) {
                    updateTaxTypeControl(initialResidenceForTax.value === 'yes');
                }
                
                // Initialize workPerformedOutsideJapan checkbox state
                const initialResidence = document.querySelector('input[name="residesInJapan"]:checked');
                if (initialResidence && initialResidence.value === 'yes') {
                    const checkbox = document.getElementById('workPerformedOutsideJapan');
                    checkbox.removeAttribute('required');
                }
                
                // Payment method change
                document.getElementById('paymentMethod').addEventListener('change', function(e) {
                    showPaymentFields(e.target.value);
                });
                
                // Tax type change
                document.getElementById('taxType').addEventListener('change', function() {
                    updateTaxExemptCheckboxVisibility();
                    calculateTotals();
                });
                
                // Function to show/hide item tax-exempt checkboxes
                function updateTaxExemptCheckboxVisibility() {
                    const taxType = document.getElementById('taxType').value;
                    const showCheckboxes = taxType === 'inclusive';
                    
                    document.querySelectorAll('.item-tax-exempt-container').forEach(container => {
                        container.style.display = showCheckboxes ? 'block' : 'none';
                        // Uncheck when hiding
                        if (!showCheckboxes) {
                            const checkbox = container.querySelector('.item-tax-exempt');
                            if (checkbox) checkbox.checked = false;
                        }
                    });
                }
                
                // Initialize tax-exempt checkbox visibility
                updateTaxExemptCheckboxVisibility();
                
                // Add item button
                document.getElementById('addItem').addEventListener('click', addItemRow);
                
                // Item calculation
                document.getElementById('itemsContainer').addEventListener('input', function(e) {
                    if (e.target.matches('.item-quantity, .item-price')) {
                        calculateItemSubtotal(e.target.closest('.item-row'));
                    }
                });
                
                // Remove item
                document.getElementById('itemsContainer').addEventListener('click', function(e) {
                    if (e.target.matches('.remove-item, .remove-item *')) {
                        removeItemRow(e.target.closest('.remove-item'));
                    }
                });
                
                // Department change
                document.getElementById('itemsContainer').addEventListener('change', function(e) {
                    if (e.target.name === 'department[]') {
                        const row = e.target.closest('.item-row');
                        const otherField = row.querySelector('.department-other');
                        otherField.style.display = e.target.value === 'other' ? 'block' : 'none';
                        const otherInput = otherField.querySelector('input');
                        if (e.target.value === 'other') {
                            otherInput.setAttribute('required', 'required');
                        } else {
                            otherInput.removeAttribute('required');
                        }
                        updateContactPerson();
                    }
                    
                    // Job category change
                    if (e.target.matches('.item-job-category')) {
                        const row = e.target.closest('.item-row');
                        const selectedOption = e.target.options[e.target.selectedIndex];
                        const manualContainer = row.querySelector('.job-category-other-container');
                        const withholdingCheckbox = row.querySelector('.job-category-withholding');
                        const residesInJapanRadio = document.querySelector('input[name="residesInJapan"]:checked');
                        const residesInJapan = residesInJapanRadio ? residesInJapanRadio.value === 'yes' : true;
                        
                        if (selectedOption.dataset.manual === 'true') {
                            // Show checkbox for "その他" category
                            manualContainer.style.display = 'block';
                            // Default check state based on residence
                            if (residesInJapan) {
                                // 国内居住者: デフォルトでチェック済み（初期値は源泉あり）
                                withholdingCheckbox.checked = true;
                            } else {
                                // 国外居住者: デフォルトでチェックなし（初期値は源泉なし）
                                withholdingCheckbox.checked = false;
                            }
                        } else {
                            manualContainer.style.display = 'none';
                            withholdingCheckbox.checked = false;
                        }
                        calculateTotals();
                    }
                });
                
                // Job category withholding checkbox change
                document.getElementById('itemsContainer').addEventListener('change', function(e) {
                    if (e.target.matches('.job-category-withholding')) {
                        calculateTotals();
                    }
                });
                
                // Item tax-exempt checkbox change
                document.getElementById('itemsContainer').addEventListener('change', function(e) {
                    if (e.target.matches('.item-tax-exempt')) {
                        calculateTotals();
                    }
                });
                
                // Preview button
                document.getElementById('previewBtn').addEventListener('click', generatePreview);
                
                // Save button
                document.getElementById('saveBtn').addEventListener('click', saveFormData);
                
                // Reset button
                document.getElementById('resetBtn').addEventListener('click', resetFormData);
            });
        </script>
    </body>
    </html>
  `)
})

export default app

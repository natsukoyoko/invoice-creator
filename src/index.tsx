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
            @media print {
                .no-print {
                    display: none !important;
                }
                .print-only {
                    display: block !important;
                }
                body {
                    background: white;
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
                <h1 class="text-3xl font-bold text-gray-800 mb-2">
                    <i class="fas fa-file-invoice mr-2 text-blue-600"></i>
                    Create a new invoice / 請求書を作成
                </h1>
                <p class="text-gray-600">外部パートナー向けの請求書作成システム</p>
            </div>

            <!-- Main Form -->
            <form id="invoiceForm" class="space-y-6">
                <!-- FROM Section -->
                <div class="no-print bg-white rounded-lg shadow-md p-6">
                    <h2 class="text-2xl font-bold text-gray-800 mb-4 border-b pb-2">
                        FROM / 発行者情報
                    </h2>
                    
                    <div class="grid md:grid-cols-2 gap-4">
                        <div>
                            <label class="block text-sm font-medium text-gray-700 mb-1 required">
                                Name / 氏名
                            </label>
                            <input type="text" name="issuerName" required
                                   class="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent">
                        </div>
                        
                        <div>
                            <label class="block text-sm font-medium text-gray-700 mb-1">
                                T Number / T番号
                            </label>
                            <input type="text" name="issuerTNumber"
                                   class="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                   placeholder="T1234567890123">
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
                        <label class="flex items-center">
                            <input type="checkbox" name="residesInJapan" id="residesInJapan"
                                   class="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500">
                            <span class="ml-2 text-sm text-gray-700">
                                Check if you reside in Japan / 日本に居住している場合はチェック
                            </span>
                        </label>
                    </div>
                    
                    <div class="mt-4" id="nonJapanWorkNotice" style="display: none;">
                        <label class="flex items-center bg-yellow-50 p-3 rounded border border-yellow-200">
                            <input type="checkbox" name="workPerformedOutsideJapan" id="workPerformedOutsideJapan"
                                   class="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500">
                            <span class="ml-2 text-sm text-gray-700 font-medium">
                                All contracted work was performed outside Japan / 全ての契約業務は日本国外で実施されました
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
                        <input type="text" name="clientContact" required
                               class="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                               placeholder="担当者名を入力してください">
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
                    
                    <div class="grid md:grid-cols-2 gap-4 mb-4">
                        <div>
                            <label class="block text-sm font-medium text-gray-700 mb-1 required">
                                Withholding Tax / 源泉徴収
                            </label>
                            <select name="withholdingTax" id="withholdingTax" required
                                    class="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent">
                                <option value="yes">YES - Subject to withholding / 源泉徴収あり</option>
                                <option value="no">NO - Not subject to withholding / 源泉徴収なし</option>
                            </select>
                        </div>
                        
                        <div>
                            <label class="block text-sm font-medium text-gray-700 mb-1 required">
                                Tax Type / 税区分
                            </label>
                            <select name="taxType" id="taxType" required
                                    class="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent">
                                <option value="inclusive">Tax Inclusive / 税込</option>
                                <option value="exclusive">Tax Exclusive / 税抜</option>
                            </select>
                        </div>
                    </div>
                    
                    <div class="bg-yellow-50 border border-yellow-200 rounded-lg p-4 text-sm text-gray-700">
                        <p class="font-medium mb-2">
                            <i class="fas fa-info-circle text-yellow-600 mr-1"></i>
                            源泉徴収に関する注意事項
                        </p>
                        <p>
                            源泉徴収対象になりえる業務に関しましては、弊社が一旦税金を預かり国に納付する義務があるため、請求書に源泉額の記載がなくても、弊社側では源泉徴収を行わせていただきます。
                            確定申告により必要に応じて還付を受けられるため不利益はありません。
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
                            <div class="grid md:grid-cols-2 gap-4 mb-3">
                                <div>
                                    <label class="block text-sm font-medium text-gray-700 mb-1 required">
                                        Department / 部署
                                    </label>
                                    <select name="department[]" required
                                            class="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent">
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
                            
                            <div class="mt-3 text-right">
                                <button type="button" class="remove-item text-red-600 hover:text-red-800 text-sm font-medium" style="display: none;">
                                    <i class="fas fa-trash mr-1"></i>Remove Item
                                </button>
                            </div>
                        </div>
                    </div>
                    
                    <button type="button" id="addItem" class="mt-4 px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 transition">
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
                            <div class="flex justify-between text-lg" id="withholdingRow" style="display: none;">
                                <span class="font-medium text-red-600">Withholding Tax / 源泉徴収税:</span>
                                <span id="withholdingAmount" class="font-bold text-red-600">-¥0</span>
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
                                    Recipient's Phone Number / 受取人電話番号
                                </label>
                                <input type="tel" name="intlPhone"
                                       class="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                       placeholder="+1234567890">
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
                                    Recipient's E-mail Address / 受取人メールアドレス
                                </label>
                                <input type="email" name="intlEmail"
                                       class="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent">
                            </div>
                            
                            <div>
                                <label class="block text-sm font-medium text-gray-700 mb-1 required">
                                    Date of Birth / 生年月日
                                </label>
                                <input type="date" name="intlDOB"
                                       class="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent">
                            </div>
                            
                            <div>
                                <label class="block text-sm font-medium text-gray-700 mb-1 required">
                                    Overseas Bank Name / 海外銀行名
                                </label>
                                <input type="text" name="intlBankName"
                                       class="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent">
                            </div>
                            
                            <div>
                                <label class="block text-sm font-medium text-gray-700 mb-1">
                                    Financial Institution Code / 金融機関コード
                                </label>
                                <input type="text" name="intlInstitutionCode"
                                       class="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent">
                            </div>
                            
                            <div>
                                <label class="block text-sm font-medium text-gray-700 mb-1">
                                    Branch Name / 支店名
                                </label>
                                <input type="text" name="intlBranchName"
                                       class="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent">
                            </div>
                            
                            <div>
                                <label class="block text-sm font-medium text-gray-700 mb-1">
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
                                PayPal Email Address / PayPalメールアドレス
                            </label>
                            <input type="email" name="paypalEmail"
                                   class="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent">
                        </div>
                    </div>
                </div>

                <!-- Form Actions -->
                <div class="no-print flex gap-4">
                    <button type="button" id="previewBtn" 
                            class="flex-1 px-6 py-3 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition font-medium text-lg">
                        <i class="fas fa-eye mr-2"></i>Preview Invoice / プレビュー
                    </button>
                    <button type="button" id="saveBtn"
                            class="px-6 py-3 bg-green-600 text-white rounded-md hover:bg-green-700 transition font-medium text-lg">
                        <i class="fas fa-save mr-2"></i>Save / 保存
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
            // Form state management
            let formData = {};
            
            // Load saved data from localStorage
            function loadSavedData() {
                const saved = localStorage.getItem('invoiceFormData');
                if (saved) {
                    try {
                        const data = JSON.parse(saved);
                        // Populate issuer fields
                        if (data.issuerName) document.querySelector('[name="issuerName"]').value = data.issuerName;
                        if (data.issuerTNumber) document.querySelector('[name="issuerTNumber"]').value = data.issuerTNumber;
                        if (data.issuerAddress) document.querySelector('[name="issuerAddress"]').value = data.issuerAddress;
                        if (data.issuerEmail) document.querySelector('[name="issuerEmail"]').value = data.issuerEmail;
                        if (data.issuerPhone) document.querySelector('[name="issuerPhone"]').value = data.issuerPhone;
                        
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
                data.issuerName = formData.get('issuerName');
                data.issuerTNumber = formData.get('issuerTNumber');
                data.issuerAddress = formData.get('issuerAddress');
                data.issuerEmail = formData.get('issuerEmail');
                data.issuerPhone = formData.get('issuerPhone');
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
                    data.intlPhone = formData.get('intlPhone');
                    data.intlAddress = formData.get('intlAddress');
                    data.intlEmail = formData.get('intlEmail');
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
                
                localStorage.setItem('invoiceFormData', JSON.stringify(data));
                alert('Form data saved successfully! / フォームデータを保存しました！');
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
                document.querySelectorAll('.item-subtotal').forEach(el => {
                    subtotal += parseFloat(el.value) || 0;
                });
                
                const taxType = document.getElementById('taxType').value;
                const withholdingTax = document.getElementById('withholdingTax').value;
                
                let taxAmount = 0;
                let withholdingAmount = 0;
                let total = 0;
                
                if (taxType === 'inclusive') {
                    // Tax inclusive: subtotal already includes tax
                    const baseAmount = subtotal / 1.1;
                    taxAmount = subtotal - baseAmount;
                    
                    if (withholdingTax === 'yes') {
                        // Calculate withholding on tax-exclusive amount
                        withholdingAmount = baseAmount * 0.1021;
                        total = subtotal - withholdingAmount;
                    } else {
                        total = subtotal;
                    }
                } else {
                    // Tax exclusive
                    taxAmount = subtotal * 0.1;
                    
                    if (withholdingTax === 'yes') {
                        withholdingAmount = subtotal * 0.1021;
                        total = subtotal + taxAmount - withholdingAmount;
                    } else {
                        total = subtotal + taxAmount;
                    }
                }
                
                document.getElementById('totalSubtotal').textContent = '¥' + Math.round(subtotal).toLocaleString();
                document.getElementById('taxAmount').textContent = '¥' + Math.round(taxAmount).toLocaleString();
                document.getElementById('withholdingAmount').textContent = '-¥' + Math.round(withholdingAmount).toLocaleString();
                document.getElementById('totalAmount').textContent = '¥' + Math.round(total).toLocaleString();
                
                // Show/hide withholding row
                document.getElementById('withholdingRow').style.display = withholdingTax === 'yes' ? 'flex' : 'none';
            }
            
            // Add new item row
            function addItemRow() {
                const container = document.getElementById('itemsContainer');
                const firstRow = container.querySelector('.item-row');
                const newRow = firstRow.cloneNode(true);
                
                // Clear input values
                newRow.querySelectorAll('input, textarea, select').forEach(el => {
                    if (el.type === 'number') {
                        el.value = el.name.includes('quantity') ? '1' : '0';
                    } else if (el.tagName === 'SELECT') {
                        el.selectedIndex = 0;
                    } else {
                        el.value = '';
                    }
                });
                
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
                const taskDetails = formData.getAll('taskDetails[]');
                const projectNames = formData.getAll('projectName[]');
                const quantities = formData.getAll('quantity[]');
                const unitPrices = formData.getAll('unitPrice[]');
                const subtotals = formData.getAll('subtotal[]');
                
                for (let i = 0; i < departments.length; i++) {
                    const dept = departments[i] === 'other' ? formData.getAll('departmentOther[]')[i] : departments[i];
                    itemsHTML += \`
                        <tr class="border-b">
                            <td class="py-2 px-2 text-sm">\${dept}</td>
                            <td class="py-2 px-2 text-sm">\${taskDetails[i]}</td>
                            <td class="py-2 px-2 text-sm">\${projectNames[i]}</td>
                            <td class="py-2 px-2 text-center text-sm">\${quantities[i]}</td>
                            <td class="py-2 px-2 text-right text-sm">¥\${parseFloat(unitPrices[i]).toLocaleString()}</td>
                            <td class="py-2 px-2 text-right text-sm font-medium">¥\${parseFloat(subtotals[i]).toLocaleString()}</td>
                        </tr>
                    \`;
                }
                
                // Build payment info HTML
                let paymentHTML = '';
                const paymentMethod = formData.get('paymentMethod');
                
                if (paymentMethod === 'domestic') {
                    paymentHTML = \`
                        <div class="mb-2"><strong>Bank Name / 銀行名:</strong> \${formData.get('domesticBankName')}</div>
                        <div class="mb-2"><strong>Branch Name / 支店名:</strong> \${formData.get('domesticBranchName')}</div>
                        <div class="mb-2"><strong>Branch Number / 支店番号:</strong> \${formData.get('domesticBranchNumber')}</div>
                        <div class="mb-2"><strong>Account Type / 口座種別:</strong> \${formData.get('domesticAccountType')}</div>
                        <div class="mb-2"><strong>Account Number / 口座番号:</strong> \${formData.get('domesticAccountNumber')}</div>
                        <div class="mb-2"><strong>Account Holder / 受取人名:</strong> \${formData.get('domesticAccountHolder')}</div>
                    \`;
                } else if (paymentMethod === 'international') {
                    paymentHTML = \`
                        <div class="mb-2"><strong>Country / 居住国:</strong> \${formData.get('intlCountry')}</div>
                        <div class="mb-2"><strong>Address / 住所:</strong> \${formData.get('intlAddress')}</div>
                        <div class="mb-2"><strong>Phone / 電話:</strong> \${formData.get('intlPhone')}</div>
                        <div class="mb-2"><strong>Email:</strong> \${formData.get('intlEmail')}</div>
                        <div class="mb-2"><strong>Date of Birth / 生年月日:</strong> \${formData.get('intlDOB')}</div>
                        <div class="mb-2"><strong>Bank Name / 銀行名:</strong> \${formData.get('intlBankName')}</div>
                        <div class="mb-2"><strong>Bank Address / 銀行住所:</strong> \${formData.get('intlBankAddress')}</div>
                        <div class="mb-2"><strong>Account Number / 口座番号:</strong> \${formData.get('intlAccountNumber')}</div>
                        <div class="mb-2"><strong>SWIFT Code:</strong> \${formData.get('intlSwiftCode')}</div>
                        <div class="mb-2"><strong>Account Name / 口座名義:</strong> \${formData.get('intlAccountName')}</div>
                    \`;
                } else if (paymentMethod === 'paypal') {
                    paymentHTML = \`
                        <div class="mb-2"><strong>PayPal Email:</strong> \${formData.get('paypalEmail')}</div>
                    \`;
                }
                
                // Check if work performed outside Japan should be displayed
                const residesInJapan = formData.get('residesInJapan');
                const workOutsideJapan = formData.get('workPerformedOutsideJapan');
                let workOutsideNotice = '';
                if (!residesInJapan && workOutsideJapan) {
                    workOutsideNotice = '<div class="mt-4 p-3 bg-yellow-50 border border-yellow-300 rounded text-sm"><strong>✓</strong> All contracted work was performed outside Japan / 全ての契約業務は日本国外で実施されました</div>';
                }
                
                const previewHTML = \`
                    <div class="max-w-4xl mx-auto">
                        <h1 class="text-4xl font-bold text-center mb-8">Invoice</h1>
                        
                        <div class="grid md:grid-cols-2 gap-8 mb-8">
                            <div>
                                <h2 class="text-xl font-bold mb-3 border-b-2 border-gray-300 pb-1">FROM</h2>
                                <div class="text-sm space-y-1">
                                    <div class="font-bold text-lg">\${formData.get('issuerName')}</div>
                                    \${formData.get('issuerTNumber') ? \`<div>T Number: \${formData.get('issuerTNumber')}</div>\` : ''}
                                    <div>\${formData.get('issuerAddress').replace(/\\n/g, '<br>')}</div>
                                    <div>Email: \${formData.get('issuerEmail')}</div>
                                    \${formData.get('issuerPhone') ? \`<div>Phone: \${formData.get('issuerPhone')}</div>\` : ''}
                                </div>
                            </div>
                            
                            <div>
                                <h2 class="text-xl font-bold mb-3 border-b-2 border-gray-300 pb-1">BILL TO:</h2>
                                <div class="text-sm space-y-1">
                                    <div class="font-bold text-lg">株式会社 LIFE PEPPER</div>
                                    <div>〒104-0045 東京都中央区築地3–1–10<br>Shinto GINZA EAST 6F</div>
                                    <div>Phone: +81 03-6869-7976</div>
                                    <div class="mt-2"><strong>Attn:</strong> \${formData.get('clientContact')}</div>
                                </div>
                            </div>
                        </div>
                        
                        <div class="grid md:grid-cols-2 gap-4 mb-8 text-sm">
                            <div><strong>Invoice Date / 請求日:</strong> \${formData.get('invoiceDate')}</div>
                            <div><strong>Payment Due Date / 支払期限:</strong> \${formData.get('dueDate')}</div>
                        </div>
                        
                        \${workOutsideNotice}
                        
                        <div class="mb-8">
                            <h2 class="text-xl font-bold mb-3">Invoice Items / 請求項目</h2>
                            <table class="w-full border-collapse border border-gray-300">
                                <thead class="bg-gray-100">
                                    <tr>
                                        <th class="border border-gray-300 py-2 px-2 text-left text-sm">Department<br>部署</th>
                                        <th class="border border-gray-300 py-2 px-2 text-left text-sm">Task Details<br>タスク詳細</th>
                                        <th class="border border-gray-300 py-2 px-2 text-left text-sm">Project<br>プロジェクト</th>
                                        <th class="border border-gray-300 py-2 px-2 text-center text-sm">Qty<br>数量</th>
                                        <th class="border border-gray-300 py-2 px-2 text-right text-sm">Unit Price<br>単価</th>
                                        <th class="border border-gray-300 py-2 px-2 text-right text-sm">Subtotal<br>小計</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    \${itemsHTML}
                                </tbody>
                            </table>
                        </div>
                        
                        <div class="flex justify-end mb-8">
                            <div class="w-80 space-y-2 text-sm">
                                <div class="flex justify-between py-1">
                                    <span>Subtotal / 小計:</span>
                                    <span class="font-medium">\${document.getElementById('totalSubtotal').textContent}</span>
                                </div>
                                <div class="flex justify-between py-1">
                                    <span>Tax (10%) / 消費税:</span>
                                    <span class="font-medium">\${document.getElementById('taxAmount').textContent}</span>
                                </div>
                                \${formData.get('withholdingTax') === 'yes' ? \`
                                <div class="flex justify-between py-1 text-red-600">
                                    <span>Withholding Tax / 源泉徴収税:</span>
                                    <span class="font-medium">\${document.getElementById('withholdingAmount').textContent}</span>
                                </div>
                                \` : ''}
                                <div class="flex justify-between py-2 border-t-2 border-gray-800 text-lg font-bold">
                                    <span>Total / 合計:</span>
                                    <span class="text-blue-600">\${document.getElementById('totalAmount').textContent}</span>
                                </div>
                            </div>
                        </div>
                        
                        <div class="border-t-2 pt-6">
                            <h2 class="text-xl font-bold mb-3">Payment Information / 支払い情報</h2>
                            <div class="text-sm">
                                \${paymentHTML}
                            </div>
                        </div>
                        
                        <div class="mt-8 text-center text-sm text-gray-600">
                            <p>Thank you for your business! / ご利用ありがとうございます</p>
                        </div>
                        
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
                
                // Set default withholding tax to YES
                document.getElementById('withholdingTax').value = 'yes';
                
                // Payment method change
                document.getElementById('paymentMethod').addEventListener('change', function(e) {
                    showPaymentFields(e.target.value);
                });
                
                // Withholding tax change
                document.getElementById('withholdingTax').addEventListener('change', calculateTotals);
                
                // Tax type change
                document.getElementById('taxType').addEventListener('change', calculateTotals);
                
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
                        const otherField = e.target.closest('.item-row').querySelector('.department-other');
                        otherField.style.display = e.target.value === 'other' ? 'block' : 'none';
                        const otherInput = otherField.querySelector('input');
                        if (e.target.value === 'other') {
                            otherInput.setAttribute('required', 'required');
                        } else {
                            otherInput.removeAttribute('required');
                        }
                    }
                });
                
                // Resides in Japan checkbox
                document.getElementById('residesInJapan').addEventListener('change', function(e) {
                    const notice = document.getElementById('nonJapanWorkNotice');
                    notice.style.display = e.target.checked ? 'none' : 'block';
                    const checkbox = document.getElementById('workPerformedOutsideJapan');
                    if (e.target.checked) {
                        checkbox.checked = false;
                    }
                });
                
                // Preview button
                document.getElementById('previewBtn').addEventListener('click', generatePreview);
                
                // Save button
                document.getElementById('saveBtn').addEventListener('click', saveFormData);
            });
        </script>
    </body>
    </html>
  `)
})

export default app

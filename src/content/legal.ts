/**
 * Legal document TEMPLATES. They describe how the platform actually works, but they
 * have NOT been reviewed by a lawyer. Each must be reviewed by qualified counsel in
 * Egypt and Saudi Arabia before launch (see docs/LEGAL_REVIEW.md).
 */
type Doc = { title: string; sections: Array<{ h: string; p?: string[]; list?: string[] }> };
type Docs = Record<"terms" | "privacy" | "intermediary" | "commission" | "disputes", Doc>;

export const legalEn: Docs = {
  terms: {
    title: "Terms of service",
    sections: [
      { h: "1. About TICOSHOV", p: ["TICOSHOV (\"the Platform\") is an online business-to-business marketplace that connects suppliers and business buyers. The Platform facilitates introductions, requests for quotation (RFQs), quotations, negotiation and deal tracking. It is not a party to the contracts concluded between buyers and suppliers."] },
      { h: "2. Eligibility", p: ["The Platform is intended for businesses. By registering you confirm that you act on behalf of a legally established business and that the information you provide is accurate and kept up to date."] },
      { h: "3. Accounts and security", list: ["You are responsible for activity under your account and for keeping your credentials confidential.", "Self-registered accounts are buyer or supplier accounts. Administrative roles are granted only by TICOSHOV.", "TICOSHOV may suspend accounts that breach these terms, provide false information or create risk to other users."] },
      { h: "4. Supplier obligations", list: ["Suppliers are solely responsible for their listings, product availability, quality, pricing, compliance, packaging, labelling, export formalities and fulfilment.", "Listings must be accurate and must not infringe third-party rights or applicable law.", "The verified badge reflects TICOSHOV's review of submitted documents only; it is not a guarantee of performance or product quality."] },
      { h: "5. Buyer obligations", list: ["Buyers are responsible for their purchasing decisions, due diligence, import formalities and payment to the supplier.", "RFQs must describe genuine business requirements."] },
      { h: "6. Payments", p: ["TICOSHOV does not collect, hold or transfer payment for goods. Buyers and suppliers agree payment terms and settle payment directly. Payment confirmations recorded on the Platform are declarations by the parties and are not verified by TICOSHOV unless explicitly stated. Never share card details through the Platform."] },
      { h: "7. Commission", p: ["TICOSHOV earns a commission on completed transactions according to the commercial terms agreed with the relevant party (see the Commission agreement). Commissions are tracked in the Platform and are not charged automatically."] },
      { h: "8. Communication", p: ["Negotiations should take place through the Platform's messaging. Messages may be reviewed by TICOSHOV staff for moderation, dispute handling and security purposes."] },
      { h: "9. Prohibited conduct", list: ["Listing prohibited, counterfeit or illegal goods.", "Circumventing the Platform to avoid agreed commissions.", "Harassment, fraud, spam or misuse of other users' data.", "Attempting to access data or functions you are not authorised to use."] },
      { h: "10. Liability", p: ["To the extent permitted by law, TICOSHOV is not liable for the acts or omissions of buyers or suppliers, for goods traded, or for losses arising from transactions between users. [Limitation of liability wording requires legal review.]"] },
      { h: "11. Governing law", p: ["[To be determined following legal review — governing law and jurisdiction for Egypt and Saudi Arabia.]"] },
    ],
  },
  privacy: {
    title: "Privacy policy",
    sections: [
      { h: "Data we collect", list: ["Account data: name, email address, preferred language, role.", "Company data: public profile, and private business details (registration and tax numbers, contact details, address).", "Verification and trade documents you upload.", "Trading activity: RFQs, quotations, messages, deals, shipments, commissions.", "Technical data required for security (authentication cookies, logs)."] },
      { h: "How we use it", list: ["To operate the marketplace and the RFQ-to-deal workflow.", "To verify suppliers.", "To track commissions and handle disputes.", "To keep the Platform secure and maintain audit trails.", "To send service notifications."] },
      { h: "Who can see it", list: ["Public company profiles and published products are visible to visitors.", "Private business details and documents are visible only to your company's team and authorised TICOSHOV staff.", "RFQs, quotations, messages and deal documents are visible only to the parties involved and authorised staff."] },
      { h: "Storage and security", p: ["Data is stored with our infrastructure provider (Supabase). Access is enforced in the database with row-level security; private files are served only through short-lived signed links. [Hosting region and cross-border transfer basis require legal review.]"] },
      { h: "Your rights", p: ["You may request access, correction or deletion of your personal data, subject to legal retention obligations. [Rights and procedures under Egypt's Personal Data Protection Law No. 151 of 2020 and Saudi Arabia's Personal Data Protection Law require legal review.]"] },
    ],
  },
  intermediary: {
    title: "Intermediary role disclosure",
    sections: [
      { h: "What TICOSHOV is", p: ["TICOSHOV is a B2B intermediary and digital marketplace. It facilitates introductions, RFQs, quotations, negotiation and deal tracking between independent businesses."] },
      { h: "What TICOSHOV is not", list: ["TICOSHOV does not own inventory.", "TICOSHOV does not purchase products from suppliers or sell products in its own name.", "TICOSHOV does not collect or hold the value of goods.", "TICOSHOV is not the seller, buyer, carrier, customs broker or guarantor in any transaction."] },
      { h: "Responsibilities", p: ["Suppliers are responsible for product availability, quality, pricing and fulfilment. Buyers are responsible for purchasing decisions and payment. Trade-document checklists shown on the Platform are indicative only and do not certify customs or regulatory compliance."] },
      { h: "How TICOSHOV earns", p: ["TICOSHOV earns a commission on completed transactions according to agreed commercial terms."] },
    ],
  },
  commission: {
    title: "Commission agreement template",
    sections: [
      { h: "Parties", p: ["This agreement is between TICOSHOV [legal entity name, registration number, address — to be completed] and the Supplier [company name, registration number, address]."] },
      { h: "1. Scope", p: ["The Supplier uses the TICOSHOV Platform to receive buyer introductions, RFQs and to manage deals. A commission applies to each deal concluded with a buyer introduced through the Platform."] },
      { h: "2. Commission rate", p: ["The commission rate is [__]% of the deal value (exclusive of taxes), unless a different rate is agreed in writing for a specific category, country, buyer or transaction. The platform's standard range is 3%–8%."] },
      { h: "3. Basis and timing", list: ["Commission becomes due when the deal is marked completed on the Platform.", "Payment is due within [30] days of completion.", "Commission is calculated on the final agreed deal value in the deal currency."] },
      { h: "4. Payment", p: ["The Supplier pays the commission by [bank transfer / other] to the account notified by TICOSHOV and reports the payment with evidence on the Platform. TICOSHOV never deducts commission automatically."] },
      { h: "5. Cancelled and disputed deals", p: ["No commission is due on deals cancelled before completion. Disputed deals are handled in accordance with the Dispute handling procedure; commission follows the final outcome."] },
      { h: "6. Non-circumvention", p: ["The Supplier shall not conclude transactions with buyers introduced through the Platform outside the Platform in order to avoid commission, for [12] months after the introduction."] },
      { h: "7. Taxes", p: ["[VAT / withholding tax treatment in Egypt and Saudi Arabia requires professional tax review.]"] },
    ],
  },
  disputes: {
    title: "Dispute handling procedure",
    sections: [
      { h: "1. Raising a dispute", p: ["Either party to a deal may open a dispute from the deal page after a quotation has been accepted. Select a reason and describe the issue. The deal status changes to Disputed and the TICOSHOV team is notified."] },
      { h: "2. Review", list: ["A TICOSHOV operations manager reviews the deal record, messages and uploaded documents.", "The team may request further information from both parties through the deal conversation.", "Target first response: [2] business days."] },
      { h: "3. Resolution", p: ["TICOSHOV facilitates an amicable resolution. Possible outcomes: the deal resumes at its previous stage, the deal is marked completed, or the deal is cancelled. The resolution is recorded on the deal."] },
      { h: "4. Limits of TICOSHOV's role", p: ["TICOSHOV is not an arbitrator or court and does not hold funds. Its resolution reflects facilitation between the parties and does not prevent either party from pursuing legal remedies. [Escalation path and governing law require legal review.]"] },
    ],
  },
};

export const legalAr: Docs = {
  terms: {
    title: "شروط الخدمة",
    sections: [
      { h: "1. عن تيكوشوف", p: ["تيكوشوف (\"المنصة\") سوق إلكترونية للتجارة بين الشركات تربط الموردين بالمشترين من الشركات. تسهّل المنصة التعارف وطلبات عروض الأسعار والعروض والتفاوض ومتابعة الصفقات، وهي ليست طرفًا في العقود المبرمة بين المشترين والموردين."] },
      { h: "2. الأهلية", p: ["المنصة مخصصة للشركات. بالتسجيل تؤكد أنك تتصرف نيابة عن نشاط تجاري قائم قانونيًا وأن المعلومات التي تقدمها صحيحة ومحدّثة."] },
      { h: "3. الحسابات والأمان", list: ["أنت مسؤول عن النشاط الذي يتم عبر حسابك وعن سرية بيانات الدخول.", "الحسابات المسجلة ذاتيًا هي حسابات مشترين أو موردين فقط، والأدوار الإدارية تمنحها تيكوشوف فقط.", "يجوز لتيكوشوف إيقاف الحسابات التي تخالف هذه الشروط أو تقدم معلومات غير صحيحة أو تشكل خطرًا على المستخدمين."] },
      { h: "4. التزامات المورد", list: ["المورد وحده مسؤول عن عروضه وتوفر المنتجات وجودتها وتسعيرها والامتثال والتغليف والملصقات وإجراءات التصدير والتنفيذ.", "يجب أن تكون العروض دقيقة وألا تنتهك حقوق الغير أو القانون المعمول به.", "شارة التوثيق تعكس مراجعة تيكوشوف للمستندات المقدمة فقط، وليست ضمانًا للأداء أو جودة المنتج."] },
      { h: "5. التزامات المشتري", list: ["المشتري مسؤول عن قرارات الشراء والتحقق اللازم وإجراءات الاستيراد والدفع للمورد.", "يجب أن تعبّر طلبات عروض الأسعار عن احتياجات تجارية حقيقية."] },
      { h: "6. المدفوعات", p: ["تيكوشوف لا تحصّل ولا تحتفظ ولا تحوّل قيمة البضائع. يتفق المشتري والمورد على شروط الدفع ويتم السداد بينهما مباشرة. تأكيدات الدفع المسجلة على المنصة إقرارات من الطرفين ولا تتحقق منها تيكوشوف ما لم يُذكر ذلك صراحة. لا تشارك بيانات البطاقات عبر المنصة."] },
      { h: "7. العمولة", p: ["تحصل تيكوشوف على عمولة عن الصفقات المكتملة وفق الشروط التجارية المتفق عليها مع الطرف المعني (انظر اتفاقية العمولة). تُتابع العمولات على المنصة ولا تُخصم تلقائيًا."] },
      { h: "8. التواصل", p: ["يجب أن يتم التفاوض عبر نظام الرسائل في المنصة. قد يراجع موظفو تيكوشوف الرسائل لأغراض الإشراف ومعالجة النزاعات والأمان."] },
      { h: "9. السلوك المحظور", list: ["عرض بضائع محظورة أو مقلدة أو غير قانونية.", "التحايل على المنصة لتجنب العمولات المتفق عليها.", "المضايقة أو الاحتيال أو الرسائل المزعجة أو إساءة استخدام بيانات المستخدمين.", "محاولة الوصول إلى بيانات أو وظائف غير مصرح لك بها."] },
      { h: "10. المسؤولية", p: ["في حدود ما يسمح به القانون، لا تتحمل تيكوشوف مسؤولية تصرفات المشترين أو الموردين أو البضائع المتداولة أو الخسائر الناتجة عن المعاملات بين المستخدمين. [صياغة تحديد المسؤولية تتطلب مراجعة قانونية.]"] },
      { h: "11. القانون الحاكم", p: ["[يُحدد بعد المراجعة القانونية — القانون الحاكم والاختصاص القضائي في مصر والسعودية.]"] },
    ],
  },
  privacy: {
    title: "سياسة الخصوصية",
    sections: [
      { h: "البيانات التي نجمعها", list: ["بيانات الحساب: الاسم، البريد الإلكتروني، اللغة المفضلة، الدور.", "بيانات الشركة: الملف العام، والبيانات التجارية الخاصة (أرقام السجل والضريبة، بيانات التواصل، العنوان).", "مستندات التوثيق والمستندات التجارية التي ترفعها.", "النشاط التجاري: طلبات الأسعار، العروض، الرسائل، الصفقات، الشحنات، العمولات.", "البيانات التقنية اللازمة للأمان (ملفات تعريف الدخول، السجلات)."] },
      { h: "كيف نستخدمها", list: ["لتشغيل السوق وسير العمل من الطلب إلى الصفقة.", "لتوثيق الموردين.", "لمتابعة العمولات ومعالجة النزاعات.", "للحفاظ على أمان المنصة وسجلات التدقيق.", "لإرسال إشعارات الخدمة."] },
      { h: "من يمكنه رؤيتها", list: ["ملفات الشركات العامة والمنتجات المنشورة مرئية للزوار.", "البيانات التجارية الخاصة والمستندات مرئية لفريق شركتك وموظفي تيكوشوف المصرح لهم فقط.", "طلبات الأسعار والعروض والرسائل ومستندات الصفقات مرئية للأطراف المعنية والموظفين المصرح لهم فقط."] },
      { h: "التخزين والأمان", p: ["تُخزن البيانات لدى مزود البنية التحتية (Supabase). يتم فرض صلاحيات الوصول داخل قاعدة البيانات بسياسات أمان على مستوى الصفوف، وتُقدم الملفات الخاصة عبر روابط موقّعة قصيرة الصلاحية فقط. [منطقة الاستضافة وأساس نقل البيانات عبر الحدود يتطلبان مراجعة قانونية.]"] },
      { h: "حقوقك", p: ["يمكنك طلب الوصول إلى بياناتك الشخصية أو تصحيحها أو حذفها مع مراعاة التزامات الاحتفاظ القانونية. [الحقوق والإجراءات وفق قانون حماية البيانات الشخصية المصري رقم 151 لسنة 2020 ونظام حماية البيانات الشخصية السعودي تتطلب مراجعة قانونية.]"] },
    ],
  },
  intermediary: {
    title: "الإفصاح عن دور الوسيط",
    sections: [
      { h: "ما هي تيكوشوف", p: ["تيكوشوف وسيط تجاري وسوق رقمية بين الشركات، تسهّل التعارف وطلبات عروض الأسعار والعروض والتفاوض ومتابعة الصفقات بين شركات مستقلة."] },
      { h: "ما ليست عليه تيكوشوف", list: ["تيكوشوف لا تمتلك مخزونًا.", "تيكوشوف لا تشتري المنتجات من الموردين ولا تبيعها باسمها.", "تيكوشوف لا تحصّل قيمة البضائع ولا تحتفظ بها.", "تيكوشوف ليست البائع أو المشتري أو الناقل أو المخلص الجمركي أو الضامن في أي معاملة."] },
      { h: "المسؤوليات", p: ["الموردون مسؤولون عن توفر المنتجات وجودتها وتسعيرها وتنفيذها. المشترون مسؤولون عن قرارات الشراء والدفع. قوائم المستندات التجارية في المنصة استرشادية فقط ولا تشهد بالامتثال الجمركي أو التنظيمي."] },
      { h: "كيف تربح تيكوشوف", p: ["تحصل تيكوشوف على عمولة عن الصفقات المكتملة وفق الشروط التجارية المتفق عليها."] },
    ],
  },
  commission: {
    title: "نموذج اتفاقية العمولة",
    sections: [
      { h: "الأطراف", p: ["هذه الاتفاقية بين تيكوشوف [اسم الكيان القانوني، رقم السجل، العنوان — يُستكمل] والمورد [اسم الشركة، رقم السجل، العنوان]."] },
      { h: "1. النطاق", p: ["يستخدم المورد منصة تيكوشوف لاستقبال التعارف مع المشترين وطلبات عروض الأسعار وإدارة الصفقات. تُستحق عمولة عن كل صفقة تُبرم مع مشترٍ تم التعارف معه عبر المنصة."] },
      { h: "2. نسبة العمولة", p: ["نسبة العمولة [__]% من قيمة الصفقة (غير شاملة الضرائب)، ما لم يُتفق كتابيًا على نسبة مختلفة لفئة أو دولة أو مشترٍ أو معاملة معينة. النطاق المعتاد للمنصة 3%–8%."] },
      { h: "3. الأساس والتوقيت", list: ["تستحق العمولة عند تحديد الصفقة كمكتملة على المنصة.", "يجب السداد خلال [30] يومًا من الإتمام.", "تُحسب العمولة على قيمة الصفقة النهائية المتفق عليها وبعملة الصفقة."] },
      { h: "4. السداد", p: ["يسدد المورد العمولة عبر [تحويل بنكي / غير ذلك] إلى الحساب الذي تحدده تيكوشوف، ويبلّغ عن السداد مع الإثبات على المنصة. تيكوشوف لا تخصم العمولة تلقائيًا أبدًا."] },
      { h: "5. الصفقات الملغاة والمتنازع عليها", p: ["لا تستحق عمولة عن الصفقات الملغاة قبل الإتمام. تُعالج الصفقات المتنازع عليها وفق إجراءات معالجة النزاعات، وتتبع العمولة النتيجة النهائية."] },
      { h: "6. عدم التحايل", p: ["يلتزم المورد بعدم إبرام معاملات مع مشترين تم التعارف معهم عبر المنصة خارجها بهدف تجنب العمولة، لمدة [12] شهرًا من التعارف."] },
      { h: "7. الضرائب", p: ["[المعالجة الضريبية لضريبة القيمة المضافة وضريبة الاستقطاع في مصر والسعودية تتطلب مراجعة ضريبية متخصصة.]"] },
    ],
  },
  disputes: {
    title: "إجراءات معالجة النزاعات",
    sections: [
      { h: "1. فتح النزاع", p: ["يمكن لأي طرف في الصفقة فتح نزاع من صفحة الصفقة بعد قبول عرض السعر. اختر السبب وصِف المشكلة. تتغير حالة الصفقة إلى \"عليها نزاع\" ويتم إخطار فريق تيكوشوف."] },
      { h: "2. المراجعة", list: ["يراجع مدير العمليات في تيكوشوف سجل الصفقة والرسائل والمستندات المرفوعة.", "قد يطلب الفريق معلومات إضافية من الطرفين عبر محادثة الصفقة.", "الهدف للرد الأول: [2] يوم عمل."] },
      { h: "3. الحل", p: ["تسهّل تيكوشوف الوصول إلى حل ودي. النتائج الممكنة: استئناف الصفقة من مرحلتها السابقة، أو اعتبارها مكتملة، أو إلغاؤها. يُسجل القرار على الصفقة."] },
      { h: "4. حدود دور تيكوشوف", p: ["تيكوشوف ليست محكّمًا أو محكمة ولا تحتفظ بأموال. قرارها يعكس التيسير بين الطرفين ولا يمنع أيًا منهما من اللجوء إلى الوسائل القانونية. [مسار التصعيد والقانون الحاكم يتطلبان مراجعة قانونية.]"] },
    ],
  },
};

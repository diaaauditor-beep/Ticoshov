-- =====================================================================
-- TICOSHOV · Migration 8 · Reference data (real configuration, not demo data)
-- Launch corridor: Egypt → Saudi Arabia. Other countries are present but
-- inactive; an administrator activates them from the admin dashboard.
-- =====================================================================

insert into public.currencies (code, name_en, name_ar, symbol, decimals) values
  ('EGP', 'Egyptian Pound', 'جنيه مصري', 'E£', 2),
  ('SAR', 'Saudi Riyal', 'ريال سعودي', 'SAR', 2),
  ('USD', 'US Dollar', 'دولار أمريكي', '$', 2),
  ('EUR', 'Euro', 'يورو', '€', 2),
  ('AED', 'UAE Dirham', 'درهم إماراتي', 'AED', 2)
on conflict (code) do nothing;

insert into public.countries (code, name_en, name_ar, phone_code, default_currency, is_active, business_fields) values
  ('EG', 'Egypt', 'مصر', '+20', 'EGP', true,
   '{"cr_label_en":"Commercial Registry No.","cr_label_ar":"رقم السجل التجاري","tax_label_en":"Tax Card No.","tax_label_ar":"رقم البطاقة الضريبية"}'),
  ('SA', 'Saudi Arabia', 'المملكة العربية السعودية', '+966', 'SAR', true,
   '{"cr_label_en":"Commercial Registration (CR) No.","cr_label_ar":"رقم السجل التجاري","tax_label_en":"VAT Registration No.","tax_label_ar":"الرقم الضريبي (ضريبة القيمة المضافة)"}'),
  ('AE', 'United Arab Emirates', 'الإمارات العربية المتحدة', '+971', 'AED', false, '{}'),
  ('KW', 'Kuwait', 'الكويت', '+965', 'USD', false, '{}'),
  ('QA', 'Qatar', 'قطر', '+974', 'USD', false, '{}'),
  ('BH', 'Bahrain', 'البحرين', '+973', 'USD', false, '{}'),
  ('OM', 'Oman', 'عُمان', '+968', 'USD', false, '{}'),
  ('JO', 'Jordan', 'الأردن', '+962', 'USD', false, '{}'),
  ('TR', 'Türkiye', 'تركيا', '+90', 'USD', false, '{}'),
  ('CN', 'China', 'الصين', '+86', 'USD', false, '{}')
on conflict (code) do nothing;

insert into public.units (code, name_en, name_ar) values
  ('piece', 'Piece', 'قطعة'), ('dozen', 'Dozen', 'دستة'), ('set', 'Set', 'طقم'),
  ('meter', 'Meter', 'متر'), ('yard', 'Yard', 'ياردة'), ('roll', 'Roll', 'رول'),
  ('kg', 'Kilogram', 'كيلوجرام'), ('ton', 'Metric ton', 'طن'), ('liter', 'Liter', 'لتر'),
  ('carton', 'Carton', 'كرتونة'), ('pallet', 'Pallet', 'بالتة'), ('container_20', '20ft container', 'حاوية 20 قدم'),
  ('container_40', '40ft container', 'حاوية 40 قدم')
on conflict (code) do nothing;

insert into public.incoterms (code, name_en, name_ar, sort_order) values
  ('EXW', 'Ex Works', 'تسليم أرض المصنع', 1),
  ('FCA', 'Free Carrier', 'تسليم الناقل', 2),
  ('CPT', 'Carriage Paid To', 'أجرة النقل مدفوعة إلى', 3),
  ('CIP', 'Carriage and Insurance Paid To', 'أجرة النقل والتأمين مدفوعة إلى', 4),
  ('DAP', 'Delivered at Place', 'التسليم في المكان', 5),
  ('DPU', 'Delivered at Place Unloaded', 'التسليم في المكان بعد التفريغ', 6),
  ('DDP', 'Delivered Duty Paid', 'التسليم مع دفع الرسوم', 7),
  ('FAS', 'Free Alongside Ship', 'التسليم بجانب السفينة', 8),
  ('FOB', 'Free on Board', 'التسليم على ظهر السفينة', 9),
  ('CFR', 'Cost and Freight', 'التكلفة والشحن', 10),
  ('CIF', 'Cost, Insurance and Freight', 'التكلفة والتأمين والشحن', 11)
on conflict (code) do nothing;

-- Category tree. Launch focus is textiles & modest fashion, but the tree is
-- general-purpose from day one.
with roots(slug, name_en, name_ar, icon, sort_order) as (values
  ('textiles-fabrics', 'Textiles & Fabrics', 'الأقمشة والمنسوجات', 'layers', 1),
  ('modest-fashion', 'Modest Fashion', 'الأزياء المحتشمة', 'shirt', 2),
  ('apparel-accessories', 'Apparel & Accessories', 'الملابس والإكسسوارات', 'tag', 3),
  ('home-furnishing', 'Home & Furnishing', 'المنزل والمفروشات', 'home', 4),
  ('food-agriculture', 'Food & Agriculture', 'الأغذية والزراعة', 'wheat', 5),
  ('packaging-printing', 'Packaging & Printing', 'التغليف والطباعة', 'package', 6),
  ('building-materials', 'Building Materials', 'مواد البناء', 'brick', 7),
  ('industrial-machinery', 'Industrial Machinery', 'المعدات الصناعية', 'cog', 8),
  ('chemicals-plastics', 'Chemicals & Plastics', 'الكيماويات والبلاستيك', 'flask', 9),
  ('health-beauty', 'Health & Beauty', 'الصحة والتجميل', 'sparkle', 10))
insert into public.categories (slug, name_en, name_ar, icon, sort_order)
select slug, name_en, name_ar, icon, sort_order from roots
on conflict (slug) do nothing;

with subs(parent_slug, slug, name_en, name_ar, sort_order) as (values
  ('textiles-fabrics', 'cotton-fabrics', 'Cotton Fabrics', 'أقمشة قطنية', 1),
  ('textiles-fabrics', 'crepe-chiffon', 'Crepe & Chiffon', 'كريب وشيفون', 2),
  ('textiles-fabrics', 'linen-fabrics', 'Linen Fabrics', 'أقمشة الكتان', 3),
  ('textiles-fabrics', 'synthetic-fabrics', 'Polyester & Synthetic Fabrics', 'أقمشة البوليستر والصناعية', 4),
  ('textiles-fabrics', 'yarns-threads', 'Yarns & Threads', 'الغزول والخيوط', 5),
  ('modest-fashion', 'abayas', 'Abayas', 'عبايات', 1),
  ('modest-fashion', 'khimar', 'Khimar', 'خمار', 2),
  ('modest-fashion', 'niqab', 'Niqab', 'نقاب', 3),
  ('modest-fashion', 'islamic-dresses', 'Islamic Dresses', 'فساتين إسلامية', 4),
  ('modest-fashion', 'scarves-hijabs', 'Scarves & Hijabs', 'أوشحة وطرح', 5),
  ('apparel-accessories', 'menswear', 'Menswear', 'ملابس رجالية', 1),
  ('apparel-accessories', 'childrenswear', 'Childrenswear', 'ملابس أطفال', 2),
  ('apparel-accessories', 'bags-accessories', 'Bags & Accessories', 'الحقائب والإكسسوارات', 3),
  ('home-furnishing', 'home-textiles', 'Home Textiles', 'المنسوجات المنزلية', 1),
  ('home-furnishing', 'furniture', 'Furniture', 'الأثاث', 2),
  ('food-agriculture', 'fresh-produce', 'Fresh Produce', 'الخضروات والفواكه الطازجة', 1),
  ('food-agriculture', 'packaged-foods', 'Packaged Foods', 'الأغذية المعبأة', 2),
  ('packaging-printing', 'cartons-boxes', 'Cartons & Boxes', 'الكراتين والعلب', 1),
  ('building-materials', 'ceramics-tiles', 'Ceramics & Tiles', 'السيراميك والبلاط', 1),
  ('building-materials', 'marble-granite', 'Marble & Granite', 'الرخام والجرانيت', 2))
insert into public.categories (parent_id, slug, name_en, name_ar, sort_order)
select p.id, s.slug, s.name_en, s.name_ar, s.sort_order
from subs s join public.categories p on p.slug = s.parent_slug
on conflict (slug) do nothing;

insert into public.platform_settings (key, value, description, is_public) values
  ('default_commission_rate', '5', 'Default commission % applied when no specific rule matches (guideline range 3–8%).', false),
  ('commission_rate_min', '3', 'Lower bound shown to administrators as guidance.', false),
  ('commission_rate_max', '8', 'Upper bound shown to administrators as guidance.', false),
  ('commission_due_days', '30', 'Days after deal completion before a commission becomes overdue.', false),
  ('rfq_default_validity_days', '30', 'Default RFQ validity in days.', true),
  ('support_email', '""', 'Public support contact shown in the footer. Set by an administrator.', true),
  ('support_phone', '""', 'Public support phone shown in the footer. Set by an administrator.', true),
  ('legal_review_status', '"pending"', 'Legal documents are templates pending professional legal review in Egypt and Saudi Arabia.', true)
on conflict (key) do nothing;

-- Indicative document checklist for the launch corridor. Informational only:
-- requirements change and must be confirmed with a licensed customs broker.
insert into public.trade_document_requirements (origin_country, destination_country, doc_type, is_required, note_en, note_ar) values
  ('EG', 'SA', 'commercial_invoice', true, 'Confirm current format requirements with your customs broker.', 'تأكد من متطلبات الصيغة الحالية مع المخلص الجمركي.'),
  ('EG', 'SA', 'packing_list', true, null, null),
  ('EG', 'SA', 'certificate_of_origin', true, 'May be required for preferential duty treatment — confirm with the relevant chamber of commerce.', 'قد تكون مطلوبة للمعاملة الجمركية التفضيلية — تأكد من الغرفة التجارية المختصة.'),
  ('EG', 'SA', 'bill_of_lading', true, 'Or air waybill / road consignment note depending on the transport mode.', 'أو بوليصة الشحن الجوي / البري حسب وسيلة النقل.'),
  ('EG', 'SA', 'customs_document', false, 'Product conformity certificates may apply depending on the product — confirm with a licensed customs broker.', 'قد تنطبق شهادات مطابقة حسب المنتج — تأكد من مخلص جمركي مرخص.')
on conflict do nothing;

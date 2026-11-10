
export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[]

export type Database = {
  
  "graphql_public": {
          Tables: {
            [_ in never]: never
          }
          Views: {
            [_ in never]: never
          }
          Functions: {
            "graphql":
{ Args: { "extensions"?: Json,"operationName"?: string,"query"?: string,"variables"?: Json }; Returns: Json
                           }
          }
          Enums: {
            [_ in never]: never
          }
          CompositeTypes: {
            [_ in never]: never
          }
        },"public": {
          Tables: {
            "admin_actions": {
                  Row: {
                    "action": string,"actor_id": string | null,"created_at": string,"details": NonNullable<Json>,"id": string,"target_id": string | null,"target_table": string | null
                  }
                  ComputedFields: never
                  Insert: {
                    "action": string,"actor_id"?: string | null,"created_at"?: string,"details"?: NonNullable<Json>,"id"?: string,"target_id"?: string | null,"target_table"?: string | null
                  }
                  Update: {
                    "action"?: string,"actor_id"?: string | null,"created_at"?: string,"details"?: NonNullable<Json>,"id"?: string,"target_id"?: string | null,"target_table"?: string | null
                  }
                  Relationships: [
                    
                  ]
                },"audit_logs": {
                  Row: {
                    "action": string,"actor_id": string | null,"created_at": string,"id": number,"new_data": Json | null,"old_data": Json | null,"record_id": string | null,"table_name": string
                  }
                  ComputedFields: never
                  Insert: {
                    "action": string,"actor_id"?: string | null,"created_at"?: string,"id"?: never,"new_data"?: Json | null,"old_data"?: Json | null,"record_id"?: string | null,"table_name": string
                  }
                  Update: {
                    "action"?: string,"actor_id"?: string | null,"created_at"?: string,"id"?: never,"new_data"?: Json | null,"old_data"?: Json | null,"record_id"?: string | null,"table_name"?: string
                  }
                  Relationships: [
                    
                  ]
                },"categories": {
                  Row: {
                    "created_at": string,"icon": string | null,"id": string,"is_active": boolean,"name_ar": string,"name_en": string,"parent_id": string | null,"slug": string,"sort_order": number,"updated_at": string
                  }
                  ComputedFields: never
                  Insert: {
                    "created_at"?: string,"icon"?: string | null,"id"?: string,"is_active"?: boolean,"name_ar": string,"name_en": string,"parent_id"?: string | null,"slug": string,"sort_order"?: number,"updated_at"?: string
                  }
                  Update: {
                    "created_at"?: string,"icon"?: string | null,"id"?: string,"is_active"?: boolean,"name_ar"?: string,"name_en"?: string,"parent_id"?: string | null,"slug"?: string,"sort_order"?: number,"updated_at"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "categories_parent_id_fkey"
      columns: ["parent_id"]
isOneToOne: false
      referencedRelation: "categories"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "categories_parent_id_fkey"
      columns: ["parent_id"]
isOneToOne: false
      referencedRelation: "subcategories"
      referencedColumns: ["id"]
    }
                  ]
                },"commission_payments": {
                  Row: {
                    "amount": number,"commission_id": string,"created_at": string,"evidence_path": string | null,"id": string,"method": string | null,"notes": string | null,"paid_on": string,"reference": string | null,"reviewed_at": string | null,"reviewed_by": string | null,"status": Database["public"]['Enums']["commission_payment_status"],"submitted_by": string | null
                  }
                  ComputedFields: never
                  Insert: {
                    "amount": number,"commission_id": string,"created_at"?: string,"evidence_path"?: string | null,"id"?: string,"method"?: string | null,"notes"?: string | null,"paid_on": string,"reference"?: string | null,"reviewed_at"?: string | null,"reviewed_by"?: string | null,"status"?: Database["public"]['Enums']["commission_payment_status"],"submitted_by"?: string | null
                  }
                  Update: {
                    "amount"?: number,"commission_id"?: string,"created_at"?: string,"evidence_path"?: string | null,"id"?: string,"method"?: string | null,"notes"?: string | null,"paid_on"?: string,"reference"?: string | null,"reviewed_at"?: string | null,"reviewed_by"?: string | null,"status"?: Database["public"]['Enums']["commission_payment_status"],"submitted_by"?: string | null
                  }
                  Relationships: [
                    {
      foreignKeyName: "commission_payments_commission_id_fkey"
      columns: ["commission_id"]
isOneToOne: false
      referencedRelation: "commissions"
      referencedColumns: ["id"]
    }
                  ]
                },"commission_rules": {
                  Row: {
                    "buyer_company_id": string | null,"category_id": string | null,"country_code": string | null,"created_at": string,"created_by": string | null,"id": string,"is_active": boolean,"notes": string | null,"rate": number,"scope": string,"supplier_company_id": string | null
                  }
                  ComputedFields: never
                  Insert: {
                    "buyer_company_id"?: string | null,"category_id"?: string | null,"country_code"?: string | null,"created_at"?: string,"created_by"?: string | null,"id"?: string,"is_active"?: boolean,"notes"?: string | null,"rate": number,"scope": string,"supplier_company_id"?: string | null
                  }
                  Update: {
                    "buyer_company_id"?: string | null,"category_id"?: string | null,"country_code"?: string | null,"created_at"?: string,"created_by"?: string | null,"id"?: string,"is_active"?: boolean,"notes"?: string | null,"rate"?: number,"scope"?: string,"supplier_company_id"?: string | null
                  }
                  Relationships: [
                    {
      foreignKeyName: "commission_rules_buyer_company_id_fkey"
      columns: ["buyer_company_id"]
isOneToOne: false
      referencedRelation: "companies"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "commission_rules_category_id_fkey"
      columns: ["category_id"]
isOneToOne: false
      referencedRelation: "categories"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "commission_rules_category_id_fkey"
      columns: ["category_id"]
isOneToOne: false
      referencedRelation: "subcategories"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "commission_rules_country_code_fkey"
      columns: ["country_code"]
isOneToOne: false
      referencedRelation: "countries"
      referencedColumns: ["code"]
    },{
      foreignKeyName: "commission_rules_supplier_company_id_fkey"
      columns: ["supplier_company_id"]
isOneToOne: false
      referencedRelation: "companies"
      referencedColumns: ["id"]
    }
                  ]
                },"commissions": {
                  Row: {
                    "admin_notes": string | null,"amount": number,"amount_paid": number,"buyer_company_id": string,"created_at": string,"currency_code": string,"deal_id": string,"deal_value": number,"due_date": string | null,"id": string,"payer": string,"rate": number,"rate_source": string,"status": Database["public"]['Enums']["commission_status"],"supplier_company_id": string,"updated_at": string
                  }
                  ComputedFields: never
                  Insert: {
                    "admin_notes"?: string | null,"amount": number,"amount_paid"?: number,"buyer_company_id": string,"created_at"?: string,"currency_code": string,"deal_id": string,"deal_value": number,"due_date"?: string | null,"id"?: string,"payer"?: string,"rate": number,"rate_source"?: string,"status"?: Database["public"]['Enums']["commission_status"],"supplier_company_id": string,"updated_at"?: string
                  }
                  Update: {
                    "admin_notes"?: string | null,"amount"?: number,"amount_paid"?: number,"buyer_company_id"?: string,"created_at"?: string,"currency_code"?: string,"deal_id"?: string,"deal_value"?: number,"due_date"?: string | null,"id"?: string,"payer"?: string,"rate"?: number,"rate_source"?: string,"status"?: Database["public"]['Enums']["commission_status"],"supplier_company_id"?: string,"updated_at"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "commissions_buyer_company_id_fkey"
      columns: ["buyer_company_id"]
isOneToOne: false
      referencedRelation: "companies"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "commissions_currency_code_fkey"
      columns: ["currency_code"]
isOneToOne: false
      referencedRelation: "currencies"
      referencedColumns: ["code"]
    },{
      foreignKeyName: "commissions_deal_id_fkey"
      columns: ["deal_id"]
isOneToOne: true
      referencedRelation: "deals"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "commissions_supplier_company_id_fkey"
      columns: ["supplier_company_id"]
isOneToOne: false
      referencedRelation: "companies"
      referencedColumns: ["id"]
    }
                  ]
                },"companies": {
                  Row: {
                    "business_type": string,"city": string,"country_code": string,"created_at": string,"created_by": string | null,"description": string | null,"description_ar": string | null,"employees_range": string | null,"export_markets": (string)[],"id": string,"import_markets": (string)[],"is_active": boolean,"is_demo": boolean,"kind": Database["public"]['Enums']["company_kind"],"logo_path": string | null,"name": string,"name_ar": string | null,"slug": string,"updated_at": string,"verification_status": Database["public"]['Enums']["verification_status"],"verified_at": string | null,"website": string | null,"year_established": number | null
                  }
                  ComputedFields: never
                  Insert: {
                    "business_type": string,"city": string,"country_code": string,"created_at"?: string,"created_by"?: string | null,"description"?: string | null,"description_ar"?: string | null,"employees_range"?: string | null,"export_markets"?: (string)[],"id"?: string,"import_markets"?: (string)[],"is_active"?: boolean,"is_demo"?: boolean,"kind": Database["public"]['Enums']["company_kind"],"logo_path"?: string | null,"name": string,"name_ar"?: string | null,"slug": string,"updated_at"?: string,"verification_status"?: Database["public"]['Enums']["verification_status"],"verified_at"?: string | null,"website"?: string | null,"year_established"?: number | null
                  }
                  Update: {
                    "business_type"?: string,"city"?: string,"country_code"?: string,"created_at"?: string,"created_by"?: string | null,"description"?: string | null,"description_ar"?: string | null,"employees_range"?: string | null,"export_markets"?: (string)[],"id"?: string,"import_markets"?: (string)[],"is_active"?: boolean,"is_demo"?: boolean,"kind"?: Database["public"]['Enums']["company_kind"],"logo_path"?: string | null,"name"?: string,"name_ar"?: string | null,"slug"?: string,"updated_at"?: string,"verification_status"?: Database["public"]['Enums']["verification_status"],"verified_at"?: string | null,"website"?: string | null,"year_established"?: number | null
                  }
                  Relationships: [
                    {
      foreignKeyName: "companies_country_code_fkey"
      columns: ["country_code"]
isOneToOne: false
      referencedRelation: "countries"
      referencedColumns: ["code"]
    }
                  ]
                },"company_categories": {
                  Row: {
                    "category_id": string,"company_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "category_id": string,"company_id": string
                  }
                  Update: {
                    "category_id"?: string,"company_id"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "company_categories_category_id_fkey"
      columns: ["category_id"]
isOneToOne: false
      referencedRelation: "categories"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "company_categories_category_id_fkey"
      columns: ["category_id"]
isOneToOne: false
      referencedRelation: "subcategories"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "company_categories_company_id_fkey"
      columns: ["company_id"]
isOneToOne: false
      referencedRelation: "companies"
      referencedColumns: ["id"]
    }
                  ]
                },"company_legal": {
                  Row: {
                    "address_line": string | null,"commercial_registration_no": string | null,"company_id": string,"contact_email": string | null,"contact_name": string | null,"contact_phone": string | null,"postal_code": string | null,"tax_number": string | null,"updated_at": string
                  }
                  ComputedFields: never
                  Insert: {
                    "address_line"?: string | null,"commercial_registration_no"?: string | null,"company_id": string,"contact_email"?: string | null,"contact_name"?: string | null,"contact_phone"?: string | null,"postal_code"?: string | null,"tax_number"?: string | null,"updated_at"?: string
                  }
                  Update: {
                    "address_line"?: string | null,"commercial_registration_no"?: string | null,"company_id"?: string,"contact_email"?: string | null,"contact_name"?: string | null,"contact_phone"?: string | null,"postal_code"?: string | null,"tax_number"?: string | null,"updated_at"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "company_legal_company_id_fkey"
      columns: ["company_id"]
isOneToOne: true
      referencedRelation: "companies"
      referencedColumns: ["id"]
    }
                  ]
                },"company_members": {
                  Row: {
                    "company_id": string,"created_at": string,"member_role": Database["public"]['Enums']["member_role"],"user_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "company_id": string,"created_at"?: string,"member_role"?: Database["public"]['Enums']["member_role"],"user_id": string
                  }
                  Update: {
                    "company_id"?: string,"created_at"?: string,"member_role"?: Database["public"]['Enums']["member_role"],"user_id"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "company_members_company_id_fkey"
      columns: ["company_id"]
isOneToOne: false
      referencedRelation: "companies"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "company_members_user_id_fkey"
      columns: ["user_id"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    }
                  ]
                },"conversations": {
                  Row: {
                    "buyer_company_id": string,"created_at": string,"deal_id": string | null,"id": string,"is_locked": boolean,"last_message_at": string | null,"quotation_id": string | null,"rfq_id": string | null,"subject": string,"supplier_company_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "buyer_company_id": string,"created_at"?: string,"deal_id"?: string | null,"id"?: string,"is_locked"?: boolean,"last_message_at"?: string | null,"quotation_id"?: string | null,"rfq_id"?: string | null,"subject": string,"supplier_company_id": string
                  }
                  Update: {
                    "buyer_company_id"?: string,"created_at"?: string,"deal_id"?: string | null,"id"?: string,"is_locked"?: boolean,"last_message_at"?: string | null,"quotation_id"?: string | null,"rfq_id"?: string | null,"subject"?: string,"supplier_company_id"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "conversations_buyer_company_id_fkey"
      columns: ["buyer_company_id"]
isOneToOne: false
      referencedRelation: "companies"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "conversations_deal_id_fkey"
      columns: ["deal_id"]
isOneToOne: true
      referencedRelation: "deals"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "conversations_quotation_id_fkey"
      columns: ["quotation_id"]
isOneToOne: false
      referencedRelation: "quotations"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "conversations_rfq_id_fkey"
      columns: ["rfq_id"]
isOneToOne: false
      referencedRelation: "rfqs"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "conversations_supplier_company_id_fkey"
      columns: ["supplier_company_id"]
isOneToOne: false
      referencedRelation: "companies"
      referencedColumns: ["id"]
    }
                  ]
                },"countries": {
                  Row: {
                    "business_fields": NonNullable<Json>,"buyer_enabled": boolean,"code": string,"created_at": string,"default_currency": string | null,"is_active": boolean,"name_ar": string,"name_en": string,"phone_code": string,"supplier_enabled": boolean
                  }
                  ComputedFields: never
                  Insert: {
                    "business_fields"?: NonNullable<Json>,"buyer_enabled"?: boolean,"code": string,"created_at"?: string,"default_currency"?: string | null,"is_active"?: boolean,"name_ar": string,"name_en": string,"phone_code": string,"supplier_enabled"?: boolean
                  }
                  Update: {
                    "business_fields"?: NonNullable<Json>,"buyer_enabled"?: boolean,"code"?: string,"created_at"?: string,"default_currency"?: string | null,"is_active"?: boolean,"name_ar"?: string,"name_en"?: string,"phone_code"?: string,"supplier_enabled"?: boolean
                  }
                  Relationships: [
                    {
      foreignKeyName: "countries_default_currency_fkey"
      columns: ["default_currency"]
isOneToOne: false
      referencedRelation: "currencies"
      referencedColumns: ["code"]
    }
                  ]
                },"currencies": {
                  Row: {
                    "code": string,"created_at": string,"decimals": number,"is_active": boolean,"name_ar": string,"name_en": string,"symbol": string
                  }
                  ComputedFields: never
                  Insert: {
                    "code": string,"created_at"?: string,"decimals"?: number,"is_active"?: boolean,"name_ar": string,"name_en": string,"symbol": string
                  }
                  Update: {
                    "code"?: string,"created_at"?: string,"decimals"?: number,"is_active"?: boolean,"name_ar"?: string,"name_en"?: string,"symbol"?: string
                  }
                  Relationships: [
                    
                  ]
                },"deal_status_history": {
                  Row: {
                    "changed_by": string | null,"created_at": string,"deal_id": string,"from_status": Database["public"]['Enums']["deal_status"] | null,"id": string,"note": string | null,"to_status": Database["public"]['Enums']["deal_status"]
                  }
                  ComputedFields: never
                  Insert: {
                    "changed_by"?: string | null,"created_at"?: string,"deal_id": string,"from_status"?: Database["public"]['Enums']["deal_status"] | null,"id"?: string,"note"?: string | null,"to_status": Database["public"]['Enums']["deal_status"]
                  }
                  Update: {
                    "changed_by"?: string | null,"created_at"?: string,"deal_id"?: string,"from_status"?: Database["public"]['Enums']["deal_status"] | null,"id"?: string,"note"?: string | null,"to_status"?: Database["public"]['Enums']["deal_status"]
                  }
                  Relationships: [
                    {
      foreignKeyName: "deal_status_history_deal_id_fkey"
      columns: ["deal_id"]
isOneToOne: false
      referencedRelation: "deals"
      referencedColumns: ["id"]
    }
                  ]
                },"deals": {
                  Row: {
                    "accepted_at": string | null,"buyer_company_id": string,"buyer_payment_declared_at": string | null,"cancelled_at": string | null,"completed_at": string | null,"created_at": string,"created_by": string | null,"currency_code": string,"deal_value": number,"id": string,"incoterm": string | null,"quotation_id": string | null,"reference": string,"rfq_id": string | null,"status": Database["public"]['Enums']["deal_status"],"status_before_dispute": Database["public"]['Enums']["deal_status"] | null,"supplier_company_id": string,"supplier_payment_declared_at": string | null,"title": string,"updated_at": string
                  }
                  ComputedFields: never
                  Insert: {
                    "accepted_at"?: string | null,"buyer_company_id": string,"buyer_payment_declared_at"?: string | null,"cancelled_at"?: string | null,"completed_at"?: string | null,"created_at"?: string,"created_by"?: string | null,"currency_code": string,"deal_value": number,"id"?: string,"incoterm"?: string | null,"quotation_id"?: string | null,"reference": string,"rfq_id"?: string | null,"status"?: Database["public"]['Enums']["deal_status"],"status_before_dispute"?: Database["public"]['Enums']["deal_status"] | null,"supplier_company_id": string,"supplier_payment_declared_at"?: string | null,"title": string,"updated_at"?: string
                  }
                  Update: {
                    "accepted_at"?: string | null,"buyer_company_id"?: string,"buyer_payment_declared_at"?: string | null,"cancelled_at"?: string | null,"completed_at"?: string | null,"created_at"?: string,"created_by"?: string | null,"currency_code"?: string,"deal_value"?: number,"id"?: string,"incoterm"?: string | null,"quotation_id"?: string | null,"reference"?: string,"rfq_id"?: string | null,"status"?: Database["public"]['Enums']["deal_status"],"status_before_dispute"?: Database["public"]['Enums']["deal_status"] | null,"supplier_company_id"?: string,"supplier_payment_declared_at"?: string | null,"title"?: string,"updated_at"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "deals_buyer_company_id_fkey"
      columns: ["buyer_company_id"]
isOneToOne: false
      referencedRelation: "companies"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "deals_currency_code_fkey"
      columns: ["currency_code"]
isOneToOne: false
      referencedRelation: "currencies"
      referencedColumns: ["code"]
    },{
      foreignKeyName: "deals_incoterm_fkey"
      columns: ["incoterm"]
isOneToOne: false
      referencedRelation: "incoterms"
      referencedColumns: ["code"]
    },{
      foreignKeyName: "deals_quotation_id_fkey"
      columns: ["quotation_id"]
isOneToOne: true
      referencedRelation: "quotations"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "deals_rfq_id_fkey"
      columns: ["rfq_id"]
isOneToOne: false
      referencedRelation: "rfqs"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "deals_supplier_company_id_fkey"
      columns: ["supplier_company_id"]
isOneToOne: false
      referencedRelation: "companies"
      referencedColumns: ["id"]
    }
                  ]
                },"disputes": {
                  Row: {
                    "against_company_id": string,"assigned_to": string | null,"created_at": string,"deal_id": string,"description": string,"id": string,"raised_by": string | null,"raised_by_company_id": string,"reason": string,"resolution": string | null,"resolved_at": string | null,"status": Database["public"]['Enums']["dispute_status"],"updated_at": string
                  }
                  ComputedFields: never
                  Insert: {
                    "against_company_id": string,"assigned_to"?: string | null,"created_at"?: string,"deal_id": string,"description": string,"id"?: string,"raised_by"?: string | null,"raised_by_company_id": string,"reason": string,"resolution"?: string | null,"resolved_at"?: string | null,"status"?: Database["public"]['Enums']["dispute_status"],"updated_at"?: string
                  }
                  Update: {
                    "against_company_id"?: string,"assigned_to"?: string | null,"created_at"?: string,"deal_id"?: string,"description"?: string,"id"?: string,"raised_by"?: string | null,"raised_by_company_id"?: string,"reason"?: string,"resolution"?: string | null,"resolved_at"?: string | null,"status"?: Database["public"]['Enums']["dispute_status"],"updated_at"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "disputes_against_company_id_fkey"
      columns: ["against_company_id"]
isOneToOne: false
      referencedRelation: "companies"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "disputes_deal_id_fkey"
      columns: ["deal_id"]
isOneToOne: false
      referencedRelation: "deals"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "disputes_raised_by_company_id_fkey"
      columns: ["raised_by_company_id"]
isOneToOne: false
      referencedRelation: "companies"
      referencedColumns: ["id"]
    }
                  ]
                },"incoterms": {
                  Row: {
                    "code": string,"name_ar": string,"name_en": string,"sort_order": number
                  }
                  ComputedFields: never
                  Insert: {
                    "code": string,"name_ar": string,"name_en": string,"sort_order"?: number
                  }
                  Update: {
                    "code"?: string,"name_ar"?: string,"name_en"?: string,"sort_order"?: number
                  }
                  Relationships: [
                    
                  ]
                },"message_reports": {
                  Row: {
                    "created_at": string,"id": string,"message_id": string,"reason": string,"reporter_id": string | null,"reviewed_at": string | null,"reviewed_by": string | null,"status": Database["public"]['Enums']["report_status"]
                  }
                  ComputedFields: never
                  Insert: {
                    "created_at"?: string,"id"?: string,"message_id": string,"reason": string,"reporter_id"?: string | null,"reviewed_at"?: string | null,"reviewed_by"?: string | null,"status"?: Database["public"]['Enums']["report_status"]
                  }
                  Update: {
                    "created_at"?: string,"id"?: string,"message_id"?: string,"reason"?: string,"reporter_id"?: string | null,"reviewed_at"?: string | null,"reviewed_by"?: string | null,"status"?: Database["public"]['Enums']["report_status"]
                  }
                  Relationships: [
                    {
      foreignKeyName: "message_reports_message_id_fkey"
      columns: ["message_id"]
isOneToOne: false
      referencedRelation: "messages"
      referencedColumns: ["id"]
    }
                  ]
                },"messages": {
                  Row: {
                    "attachment_name": string | null,"attachment_path": string | null,"body": string,"conversation_id": string,"created_at": string,"id": string,"is_hidden": boolean,"sender_company_id": string | null,"sender_id": string | null
                  }
                  ComputedFields: never
                  Insert: {
                    "attachment_name"?: string | null,"attachment_path"?: string | null,"body": string,"conversation_id": string,"created_at"?: string,"id"?: string,"is_hidden"?: boolean,"sender_company_id"?: string | null,"sender_id"?: string | null
                  }
                  Update: {
                    "attachment_name"?: string | null,"attachment_path"?: string | null,"body"?: string,"conversation_id"?: string,"created_at"?: string,"id"?: string,"is_hidden"?: boolean,"sender_company_id"?: string | null,"sender_id"?: string | null
                  }
                  Relationships: [
                    {
      foreignKeyName: "messages_conversation_id_fkey"
      columns: ["conversation_id"]
isOneToOne: false
      referencedRelation: "conversations"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "messages_sender_company_id_fkey"
      columns: ["sender_company_id"]
isOneToOne: false
      referencedRelation: "companies"
      referencedColumns: ["id"]
    }
                  ]
                },"notifications": {
                  Row: {
                    "created_at": string,"id": string,"link": string | null,"payload": NonNullable<Json>,"read_at": string | null,"type": string,"user_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "created_at"?: string,"id"?: string,"link"?: string | null,"payload"?: NonNullable<Json>,"read_at"?: string | null,"type": string,"user_id": string
                  }
                  Update: {
                    "created_at"?: string,"id"?: string,"link"?: string | null,"payload"?: NonNullable<Json>,"read_at"?: string | null,"type"?: string,"user_id"?: string
                  }
                  Relationships: [
                    
                  ]
                },"platform_settings": {
                  Row: {
                    "description": string | null,"is_public": boolean,"key": string,"updated_at": string,"updated_by": string | null,"value": NonNullable<Json>
                  }
                  ComputedFields: never
                  Insert: {
                    "description"?: string | null,"is_public"?: boolean,"key": string,"updated_at"?: string,"updated_by"?: string | null,"value": NonNullable<Json>
                  }
                  Update: {
                    "description"?: string | null,"is_public"?: boolean,"key"?: string,"updated_at"?: string,"updated_by"?: string | null,"value"?: NonNullable<Json>
                  }
                  Relationships: [
                    
                  ]
                },"product_images": {
                  Row: {
                    "alt_text": string | null,"created_at": string,"id": string,"product_id": string,"sort_order": number,"storage_path": string
                  }
                  ComputedFields: never
                  Insert: {
                    "alt_text"?: string | null,"created_at"?: string,"id"?: string,"product_id": string,"sort_order"?: number,"storage_path": string
                  }
                  Update: {
                    "alt_text"?: string | null,"created_at"?: string,"id"?: string,"product_id"?: string,"sort_order"?: number,"storage_path"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "product_images_product_id_fkey"
      columns: ["product_id"]
isOneToOne: false
      referencedRelation: "products"
      referencedColumns: ["id"]
    }
                  ]
                },"product_specifications": {
                  Row: {
                    "id": string,"key_ar": string | null,"key_en": string,"product_id": string,"sort_order": number,"value": string
                  }
                  ComputedFields: never
                  Insert: {
                    "id"?: string,"key_ar"?: string | null,"key_en": string,"product_id": string,"sort_order"?: number,"value": string
                  }
                  Update: {
                    "id"?: string,"key_ar"?: string | null,"key_en"?: string,"product_id"?: string,"sort_order"?: number,"value"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "product_specifications_product_id_fkey"
      columns: ["product_id"]
isOneToOne: false
      referencedRelation: "products"
      referencedColumns: ["id"]
    }
                  ]
                },"products": {
                  Row: {
                    "available_quantity": number | null,"category_id": string,"company_id": string,"created_at": string,"created_by": string | null,"currency_code": string,"description_ar": string | null,"description_en": string | null,"export_available": boolean,"export_countries": (string)[],"id": string,"lead_time_days": number | null,"moq": number,"name_ar": string,"name_en": string,"origin_country": string,"price_max": number | null,"price_min": number | null,"published_at": string | null,"search_vector": unknown,"sku": string | null,"status": Database["public"]['Enums']["product_status"],"unit_code": string,"updated_at": string
                  }
                  ComputedFields: never
                  Insert: {
                    "available_quantity"?: number | null,"category_id": string,"company_id": string,"created_at"?: string,"created_by"?: string | null,"currency_code": string,"description_ar"?: string | null,"description_en"?: string | null,"export_available"?: boolean,"export_countries"?: (string)[],"id"?: string,"lead_time_days"?: number | null,"moq": number,"name_ar": string,"name_en": string,"origin_country": string,"price_max"?: number | null,"price_min"?: number | null,"published_at"?: string | null,"search_vector"?: never,"sku"?: string | null,"status"?: Database["public"]['Enums']["product_status"],"unit_code": string,"updated_at"?: string
                  }
                  Update: {
                    "available_quantity"?: number | null,"category_id"?: string,"company_id"?: string,"created_at"?: string,"created_by"?: string | null,"currency_code"?: string,"description_ar"?: string | null,"description_en"?: string | null,"export_available"?: boolean,"export_countries"?: (string)[],"id"?: string,"lead_time_days"?: number | null,"moq"?: number,"name_ar"?: string,"name_en"?: string,"origin_country"?: string,"price_max"?: number | null,"price_min"?: number | null,"published_at"?: string | null,"search_vector"?: never,"sku"?: string | null,"status"?: Database["public"]['Enums']["product_status"],"unit_code"?: string,"updated_at"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "products_category_id_fkey"
      columns: ["category_id"]
isOneToOne: false
      referencedRelation: "categories"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "products_category_id_fkey"
      columns: ["category_id"]
isOneToOne: false
      referencedRelation: "subcategories"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "products_company_id_fkey"
      columns: ["company_id"]
isOneToOne: false
      referencedRelation: "companies"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "products_currency_code_fkey"
      columns: ["currency_code"]
isOneToOne: false
      referencedRelation: "currencies"
      referencedColumns: ["code"]
    },{
      foreignKeyName: "products_origin_country_fkey"
      columns: ["origin_country"]
isOneToOne: false
      referencedRelation: "countries"
      referencedColumns: ["code"]
    },{
      foreignKeyName: "products_unit_code_fkey"
      columns: ["unit_code"]
isOneToOne: false
      referencedRelation: "units"
      referencedColumns: ["code"]
    }
                  ]
                },"profiles": {
                  Row: {
                    "created_at": string,"full_name": string,"id": string,"is_active": boolean,"phone": string | null,"preferred_locale": string,"role": Database["public"]['Enums']["user_role"],"updated_at": string
                  }
                  ComputedFields: never
                  Insert: {
                    "created_at"?: string,"full_name"?: string,"id": string,"is_active"?: boolean,"phone"?: string | null,"preferred_locale"?: string,"role"?: Database["public"]['Enums']["user_role"],"updated_at"?: string
                  }
                  Update: {
                    "created_at"?: string,"full_name"?: string,"id"?: string,"is_active"?: boolean,"phone"?: string | null,"preferred_locale"?: string,"role"?: Database["public"]['Enums']["user_role"],"updated_at"?: string
                  }
                  Relationships: [
                    
                  ]
                },"quotation_attachments": {
                  Row: {
                    "created_at": string,"file_name": string,"id": string,"quotation_id": string,"storage_path": string,"uploaded_by": string | null
                  }
                  ComputedFields: never
                  Insert: {
                    "created_at"?: string,"file_name": string,"id"?: string,"quotation_id": string,"storage_path": string,"uploaded_by"?: string | null
                  }
                  Update: {
                    "created_at"?: string,"file_name"?: string,"id"?: string,"quotation_id"?: string,"storage_path"?: string,"uploaded_by"?: string | null
                  }
                  Relationships: [
                    {
      foreignKeyName: "quotation_attachments_quotation_id_fkey"
      columns: ["quotation_id"]
isOneToOne: false
      referencedRelation: "quotations"
      referencedColumns: ["id"]
    }
                  ]
                },"quotation_items": {
                  Row: {
                    "description": string,"id": string,"line_total": number | null,"quantity": number,"quotation_id": string,"sort_order": number,"unit_code": string | null,"unit_price": number
                  }
                  ComputedFields: never
                  Insert: {
                    "description": string,"id"?: string,"line_total"?: never,"quantity": number,"quotation_id": string,"sort_order"?: number,"unit_code"?: string | null,"unit_price": number
                  }
                  Update: {
                    "description"?: string,"id"?: string,"line_total"?: never,"quantity"?: number,"quotation_id"?: string,"sort_order"?: number,"unit_code"?: string | null,"unit_price"?: number
                  }
                  Relationships: [
                    {
      foreignKeyName: "quotation_items_quotation_id_fkey"
      columns: ["quotation_id"]
isOneToOne: false
      referencedRelation: "quotations"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "quotation_items_unit_code_fkey"
      columns: ["unit_code"]
isOneToOne: false
      referencedRelation: "units"
      referencedColumns: ["code"]
    }
                  ]
                },"quotations": {
                  Row: {
                    "created_at": string,"created_by": string | null,"currency_code": string,"delivery_terms": string | null,"id": string,"incoterm": string | null,"lead_time_days": number,"moq": number | null,"notes": string | null,"payment_terms": string | null,"quantity": number,"revision": number,"rfq_id": string,"status": Database["public"]['Enums']["quotation_status"],"supplier_company_id": string,"total_amount": number,"unit_price": number,"updated_at": string,"valid_until": string
                  }
                  ComputedFields: never
                  Insert: {
                    "created_at"?: string,"created_by"?: string | null,"currency_code": string,"delivery_terms"?: string | null,"id"?: string,"incoterm"?: string | null,"lead_time_days": number,"moq"?: number | null,"notes"?: string | null,"payment_terms"?: string | null,"quantity": number,"revision"?: number,"rfq_id": string,"status"?: Database["public"]['Enums']["quotation_status"],"supplier_company_id": string,"total_amount": number,"unit_price": number,"updated_at"?: string,"valid_until": string
                  }
                  Update: {
                    "created_at"?: string,"created_by"?: string | null,"currency_code"?: string,"delivery_terms"?: string | null,"id"?: string,"incoterm"?: string | null,"lead_time_days"?: number,"moq"?: number | null,"notes"?: string | null,"payment_terms"?: string | null,"quantity"?: number,"revision"?: number,"rfq_id"?: string,"status"?: Database["public"]['Enums']["quotation_status"],"supplier_company_id"?: string,"total_amount"?: number,"unit_price"?: number,"updated_at"?: string,"valid_until"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "quotations_currency_code_fkey"
      columns: ["currency_code"]
isOneToOne: false
      referencedRelation: "currencies"
      referencedColumns: ["code"]
    },{
      foreignKeyName: "quotations_incoterm_fkey"
      columns: ["incoterm"]
isOneToOne: false
      referencedRelation: "incoterms"
      referencedColumns: ["code"]
    },{
      foreignKeyName: "quotations_rfq_id_fkey"
      columns: ["rfq_id"]
isOneToOne: false
      referencedRelation: "rfqs"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "quotations_supplier_company_id_fkey"
      columns: ["supplier_company_id"]
isOneToOne: false
      referencedRelation: "companies"
      referencedColumns: ["id"]
    }
                  ]
                },"reviews": {
                  Row: {
                    "comment": string | null,"created_at": string,"created_by": string | null,"deal_id": string,"id": string,"is_hidden": boolean,"rating": number,"reviewee_company_id": string,"reviewer_company_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "comment"?: string | null,"created_at"?: string,"created_by"?: string | null,"deal_id": string,"id"?: string,"is_hidden"?: boolean,"rating": number,"reviewee_company_id": string,"reviewer_company_id": string
                  }
                  Update: {
                    "comment"?: string | null,"created_at"?: string,"created_by"?: string | null,"deal_id"?: string,"id"?: string,"is_hidden"?: boolean,"rating"?: number,"reviewee_company_id"?: string,"reviewer_company_id"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "reviews_deal_id_fkey"
      columns: ["deal_id"]
isOneToOne: false
      referencedRelation: "deals"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "reviews_reviewee_company_id_fkey"
      columns: ["reviewee_company_id"]
isOneToOne: false
      referencedRelation: "companies"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "reviews_reviewer_company_id_fkey"
      columns: ["reviewer_company_id"]
isOneToOne: false
      referencedRelation: "companies"
      referencedColumns: ["id"]
    }
                  ]
                },"rfq_attachments": {
                  Row: {
                    "created_at": string,"file_name": string,"id": string,"mime_type": string | null,"rfq_id": string,"size_bytes": number | null,"storage_path": string,"uploaded_by": string | null
                  }
                  ComputedFields: never
                  Insert: {
                    "created_at"?: string,"file_name": string,"id"?: string,"mime_type"?: string | null,"rfq_id": string,"size_bytes"?: number | null,"storage_path": string,"uploaded_by"?: string | null
                  }
                  Update: {
                    "created_at"?: string,"file_name"?: string,"id"?: string,"mime_type"?: string | null,"rfq_id"?: string,"size_bytes"?: number | null,"storage_path"?: string,"uploaded_by"?: string | null
                  }
                  Relationships: [
                    {
      foreignKeyName: "rfq_attachments_rfq_id_fkey"
      columns: ["rfq_id"]
isOneToOne: false
      referencedRelation: "rfqs"
      referencedColumns: ["id"]
    }
                  ]
                },"rfqs": {
                  Row: {
                    "buyer_company_id": string,"category_id": string | null,"created_at": string,"created_by": string | null,"currency_code": string | null,"delivery_city": string | null,"delivery_country": string,"description": string,"expires_at": string,"id": string,"incoterm": string | null,"product_id": string | null,"quantity": number,"reference": string,"required_by": string | null,"specifications": NonNullable<Json>,"status": Database["public"]['Enums']["rfq_status"],"target_company_id": string | null,"target_price": number | null,"title": string,"unit_code": string,"updated_at": string
                  }
                  ComputedFields: never
                  Insert: {
                    "buyer_company_id": string,"category_id"?: string | null,"created_at"?: string,"created_by"?: string | null,"currency_code"?: string | null,"delivery_city"?: string | null,"delivery_country": string,"description": string,"expires_at"?: string,"id"?: string,"incoterm"?: string | null,"product_id"?: string | null,"quantity": number,"reference"?: string,"required_by"?: string | null,"specifications"?: NonNullable<Json>,"status"?: Database["public"]['Enums']["rfq_status"],"target_company_id"?: string | null,"target_price"?: number | null,"title": string,"unit_code": string,"updated_at"?: string
                  }
                  Update: {
                    "buyer_company_id"?: string,"category_id"?: string | null,"created_at"?: string,"created_by"?: string | null,"currency_code"?: string | null,"delivery_city"?: string | null,"delivery_country"?: string,"description"?: string,"expires_at"?: string,"id"?: string,"incoterm"?: string | null,"product_id"?: string | null,"quantity"?: number,"reference"?: string,"required_by"?: string | null,"specifications"?: NonNullable<Json>,"status"?: Database["public"]['Enums']["rfq_status"],"target_company_id"?: string | null,"target_price"?: number | null,"title"?: string,"unit_code"?: string,"updated_at"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "rfqs_buyer_company_id_fkey"
      columns: ["buyer_company_id"]
isOneToOne: false
      referencedRelation: "companies"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "rfqs_category_id_fkey"
      columns: ["category_id"]
isOneToOne: false
      referencedRelation: "categories"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "rfqs_category_id_fkey"
      columns: ["category_id"]
isOneToOne: false
      referencedRelation: "subcategories"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "rfqs_currency_code_fkey"
      columns: ["currency_code"]
isOneToOne: false
      referencedRelation: "currencies"
      referencedColumns: ["code"]
    },{
      foreignKeyName: "rfqs_delivery_country_fkey"
      columns: ["delivery_country"]
isOneToOne: false
      referencedRelation: "countries"
      referencedColumns: ["code"]
    },{
      foreignKeyName: "rfqs_incoterm_fkey"
      columns: ["incoterm"]
isOneToOne: false
      referencedRelation: "incoterms"
      referencedColumns: ["code"]
    },{
      foreignKeyName: "rfqs_product_id_fkey"
      columns: ["product_id"]
isOneToOne: false
      referencedRelation: "products"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "rfqs_target_company_id_fkey"
      columns: ["target_company_id"]
isOneToOne: false
      referencedRelation: "companies"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "rfqs_unit_code_fkey"
      columns: ["unit_code"]
isOneToOne: false
      referencedRelation: "units"
      referencedColumns: ["code"]
    }
                  ]
                },"shipment_documents": {
                  Row: {
                    "company_id": string | null,"created_at": string,"deal_id": string,"doc_type": Database["public"]['Enums']["trade_doc_type"],"file_name": string,"id": string,"mime_type": string | null,"shipment_id": string | null,"size_bytes": number | null,"storage_path": string,"uploaded_by": string | null
                  }
                  ComputedFields: never
                  Insert: {
                    "company_id"?: string | null,"created_at"?: string,"deal_id": string,"doc_type": Database["public"]['Enums']["trade_doc_type"],"file_name": string,"id"?: string,"mime_type"?: string | null,"shipment_id"?: string | null,"size_bytes"?: number | null,"storage_path": string,"uploaded_by"?: string | null
                  }
                  Update: {
                    "company_id"?: string | null,"created_at"?: string,"deal_id"?: string,"doc_type"?: Database["public"]['Enums']["trade_doc_type"],"file_name"?: string,"id"?: string,"mime_type"?: string | null,"shipment_id"?: string | null,"size_bytes"?: number | null,"storage_path"?: string,"uploaded_by"?: string | null
                  }
                  Relationships: [
                    {
      foreignKeyName: "shipment_documents_company_id_fkey"
      columns: ["company_id"]
isOneToOne: false
      referencedRelation: "companies"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "shipment_documents_deal_id_fkey"
      columns: ["deal_id"]
isOneToOne: false
      referencedRelation: "deals"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "shipment_documents_shipment_id_fkey"
      columns: ["shipment_id"]
isOneToOne: false
      referencedRelation: "shipments"
      referencedColumns: ["id"]
    }
                  ]
                },"shipments": {
                  Row: {
                    "carrier": string | null,"created_at": string,"created_by": string | null,"deal_id": string,"destination_country": string | null,"eta": string | null,"etd": string | null,"id": string,"incoterm": string | null,"notes": string | null,"origin_country": string | null,"port_of_discharge": string | null,"port_of_loading": string | null,"status": Database["public"]['Enums']["shipment_status"],"tracking_number": string | null,"transport_mode": string | null,"updated_at": string
                  }
                  ComputedFields: never
                  Insert: {
                    "carrier"?: string | null,"created_at"?: string,"created_by"?: string | null,"deal_id": string,"destination_country"?: string | null,"eta"?: string | null,"etd"?: string | null,"id"?: string,"incoterm"?: string | null,"notes"?: string | null,"origin_country"?: string | null,"port_of_discharge"?: string | null,"port_of_loading"?: string | null,"status"?: Database["public"]['Enums']["shipment_status"],"tracking_number"?: string | null,"transport_mode"?: string | null,"updated_at"?: string
                  }
                  Update: {
                    "carrier"?: string | null,"created_at"?: string,"created_by"?: string | null,"deal_id"?: string,"destination_country"?: string | null,"eta"?: string | null,"etd"?: string | null,"id"?: string,"incoterm"?: string | null,"notes"?: string | null,"origin_country"?: string | null,"port_of_discharge"?: string | null,"port_of_loading"?: string | null,"status"?: Database["public"]['Enums']["shipment_status"],"tracking_number"?: string | null,"transport_mode"?: string | null,"updated_at"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "shipments_deal_id_fkey"
      columns: ["deal_id"]
isOneToOne: false
      referencedRelation: "deals"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "shipments_destination_country_fkey"
      columns: ["destination_country"]
isOneToOne: false
      referencedRelation: "countries"
      referencedColumns: ["code"]
    },{
      foreignKeyName: "shipments_incoterm_fkey"
      columns: ["incoterm"]
isOneToOne: false
      referencedRelation: "incoterms"
      referencedColumns: ["code"]
    },{
      foreignKeyName: "shipments_origin_country_fkey"
      columns: ["origin_country"]
isOneToOne: false
      referencedRelation: "countries"
      referencedColumns: ["code"]
    }
                  ]
                },"supplier_verifications": {
                  Row: {
                    "company_id": string,"created_at": string,"id": string,"message_to_company": string | null,"reviewed_at": string | null,"reviewed_by": string | null,"status": Database["public"]['Enums']["verification_status"],"submitted_at": string | null,"submitted_by": string | null,"updated_at": string
                  }
                  ComputedFields: never
                  Insert: {
                    "company_id": string,"created_at"?: string,"id"?: string,"message_to_company"?: string | null,"reviewed_at"?: string | null,"reviewed_by"?: string | null,"status"?: Database["public"]['Enums']["verification_status"],"submitted_at"?: string | null,"submitted_by"?: string | null,"updated_at"?: string
                  }
                  Update: {
                    "company_id"?: string,"created_at"?: string,"id"?: string,"message_to_company"?: string | null,"reviewed_at"?: string | null,"reviewed_by"?: string | null,"status"?: Database["public"]['Enums']["verification_status"],"submitted_at"?: string | null,"submitted_by"?: string | null,"updated_at"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "supplier_verifications_company_id_fkey"
      columns: ["company_id"]
isOneToOne: false
      referencedRelation: "companies"
      referencedColumns: ["id"]
    }
                  ]
                },"trade_document_requirements": {
                  Row: {
                    "destination_country": string | null,"doc_type": Database["public"]['Enums']["trade_doc_type"],"id": string,"is_required": boolean,"note_ar": string | null,"note_en": string | null,"origin_country": string | null
                  }
                  ComputedFields: never
                  Insert: {
                    "destination_country"?: string | null,"doc_type": Database["public"]['Enums']["trade_doc_type"],"id"?: string,"is_required"?: boolean,"note_ar"?: string | null,"note_en"?: string | null,"origin_country"?: string | null
                  }
                  Update: {
                    "destination_country"?: string | null,"doc_type"?: Database["public"]['Enums']["trade_doc_type"],"id"?: string,"is_required"?: boolean,"note_ar"?: string | null,"note_en"?: string | null,"origin_country"?: string | null
                  }
                  Relationships: [
                    {
      foreignKeyName: "trade_document_requirements_destination_country_fkey"
      columns: ["destination_country"]
isOneToOne: false
      referencedRelation: "countries"
      referencedColumns: ["code"]
    },{
      foreignKeyName: "trade_document_requirements_origin_country_fkey"
      columns: ["origin_country"]
isOneToOne: false
      referencedRelation: "countries"
      referencedColumns: ["code"]
    }
                  ]
                },"units": {
                  Row: {
                    "code": string,"is_active": boolean,"name_ar": string,"name_en": string
                  }
                  ComputedFields: never
                  Insert: {
                    "code": string,"is_active"?: boolean,"name_ar": string,"name_en": string
                  }
                  Update: {
                    "code"?: string,"is_active"?: boolean,"name_ar"?: string,"name_en"?: string
                  }
                  Relationships: [
                    
                  ]
                },"verification_documents": {
                  Row: {
                    "company_id": string,"created_at": string,"doc_type": Database["public"]['Enums']["verification_doc_type"],"file_name": string,"id": string,"mime_type": string | null,"size_bytes": number | null,"storage_path": string,"uploaded_by": string | null,"verification_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "company_id": string,"created_at"?: string,"doc_type": Database["public"]['Enums']["verification_doc_type"],"file_name": string,"id"?: string,"mime_type"?: string | null,"size_bytes"?: number | null,"storage_path": string,"uploaded_by"?: string | null,"verification_id": string
                  }
                  Update: {
                    "company_id"?: string,"created_at"?: string,"doc_type"?: Database["public"]['Enums']["verification_doc_type"],"file_name"?: string,"id"?: string,"mime_type"?: string | null,"size_bytes"?: number | null,"storage_path"?: string,"uploaded_by"?: string | null,"verification_id"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "verification_documents_company_id_fkey"
      columns: ["company_id"]
isOneToOne: false
      referencedRelation: "companies"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "verification_documents_verification_id_fkey"
      columns: ["verification_id"]
isOneToOne: false
      referencedRelation: "supplier_verifications"
      referencedColumns: ["id"]
    }
                  ]
                },"verification_internal_notes": {
                  Row: {
                    "notes": string,"updated_at": string,"updated_by": string | null,"verification_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "notes": string,"updated_at"?: string,"updated_by"?: string | null,"verification_id": string
                  }
                  Update: {
                    "notes"?: string,"updated_at"?: string,"updated_by"?: string | null,"verification_id"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "verification_internal_notes_verification_id_fkey"
      columns: ["verification_id"]
isOneToOne: true
      referencedRelation: "supplier_verifications"
      referencedColumns: ["id"]
    }
                  ]
                }
          }
          Views: {
            "subcategories": {
                  Row: {
                    "category_id": string | null,"created_at": string,"id": string,"is_active": boolean,"name_ar": string,"name_en": string,"slug": string,"sort_order": number
                  }
                  ComputedFields: never
                  Insert: {
                           "category_id"?: string | null,"created_at"?: string | null,"id"?: string | null,"is_active"?: boolean | null,"name_ar"?: string | null,"name_en"?: string | null,"slug"?: string | null,"sort_order"?: number | null
                         }
                        Update: {
                           "category_id"?: string | null,"created_at"?: string | null,"id"?: string | null,"is_active"?: boolean | null,"name_ar"?: string | null,"name_en"?: string | null,"slug"?: string | null,"sort_order"?: number | null
                         }
                        Relationships: [
                    {
      foreignKeyName: "categories_parent_id_fkey"
      columns: ["category_id"]
isOneToOne: false
      referencedRelation: "categories"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "categories_parent_id_fkey"
      columns: ["category_id"]
isOneToOne: false
      referencedRelation: "subcategories"
      referencedColumns: ["id"]
    }
                  ]
                }
          }
          Functions: {
            "accept_quotation":
{ Args: { "p_note"?: string,"p_quotation": string }; Returns: string
                           },
"admin_dashboard_stats":
{ Args: { "p_category"?: string,"p_country"?: string,"p_from"?: string,"p_status"?: Database["public"]['Enums']["deal_status"],"p_supplier"?: string,"p_to"?: string }; Returns: Json
                           },
"admin_list_users":
{ Args: { "p_role"?: Database["public"]['Enums']["user_role"],"p_search"?: string }; Returns: {
              "company_id": string,"company_name": string,"created_at": string,"email": string,"email_confirmed": boolean,"full_name": string,"id": string,"is_active": boolean,"last_sign_in_at": string,"role": Database["public"]['Enums']["user_role"]
            }[]
                           },
"admin_set_user":
{ Args: { "p_active": boolean,"p_role": Database["public"]['Enums']["user_role"],"p_user": string }; Returns: undefined
                           },
"auth_role":
{ Args: Record<PropertyKey, never>; Returns: Database["public"]['Enums']["user_role"]
                           },
"can_access_file":
{ Args: { "p_bucket": string,"p_name": string,"p_write": boolean }; Returns: boolean
                           },
"can_view_rfq":
{ Args: { "rid": string }; Returns: boolean
                           },
"create_company":
{ Args: { "p_address": string,"p_business_type": string,"p_category_ids": (string)[],"p_city": string,"p_contact_email": string,"p_contact_name": string,"p_contact_phone": string,"p_country": string,"p_cr_number": string,"p_description": string,"p_description_ar": string,"p_export_markets": (string)[],"p_name": string,"p_name_ar": string,"p_tax_number": string,"p_website": string,"p_year_established": number }; Returns: string
                           },
"declare_payment":
{ Args: { "p_deal": string,"p_note"?: string }; Returns: Database["public"]['Enums']["deal_status"]
                           },
"is_admin":
{ Args: Record<PropertyKey, never>; Returns: boolean
                           },
"is_client_request":
{ Args: Record<PropertyKey, never>; Returns: boolean
                           },
"is_company_manager":
{ Args: { "cid": string }; Returns: boolean
                           },
"is_company_member":
{ Args: { "cid": string }; Returns: boolean
                           },
"is_conversation_party":
{ Args: { "cid": string }; Returns: boolean
                           },
"is_deal_party":
{ Args: { "did": string }; Returns: boolean
                           },
"is_staff":
{ Args: Record<PropertyKey, never>; Returns: boolean
                           },
"log_admin_action":
{ Args: { "p_action": string,"p_details": Json,"p_table": string,"p_target": string }; Returns: undefined
                           },
"my_approved_supplier_ids":
{ Args: Record<PropertyKey, never>; Returns: string[]
                           },
"my_company_ids":
{ Args: Record<PropertyKey, never>; Returns: string[]
                           },
"my_company_quoted":
{ Args: { "rid": string }; Returns: boolean
                           },
"next_deal_reference":
{ Args: Record<PropertyKey, never>; Returns: string
                           },
"notify_company":
{ Args: { "p_company": string,"p_except"?: string,"p_link": string,"p_payload": Json,"p_type": string }; Returns: undefined
                           },
"notify_staff":
{ Args: { "p_link": string,"p_payload": Json,"p_type": string }; Returns: undefined
                           },
"notify_user":
{ Args: { "p_link": string,"p_payload": Json,"p_type": string,"p_user": string }; Returns: undefined
                           },
"open_conversation":
{ Args: { "p_quotation": string }; Returns: string
                           },
"open_dispute":
{ Args: { "p_deal": string,"p_description": string,"p_reason": string }; Returns: string
                           },
"record_deal_status":
{ Args: { "p_deal": string,"p_from": Database["public"]['Enums']["deal_status"],"p_note": string,"p_to": Database["public"]['Enums']["deal_status"] }; Returns: undefined
                           },
"refresh_overdue_commissions":
{ Args: Record<PropertyKey, never>; Returns: number
                           },
"reject_quotation":
{ Args: { "p_quotation": string,"p_reason": string }; Returns: undefined
                           },
"require_auth":
{ Args: Record<PropertyKey, never>; Returns: string
                           },
"resolve_commission_rate":
{ Args: { "p_buyer": string,"p_category": string,"p_supplier": string }; Returns: Record<string, unknown>
                           },
"resolve_dispute":
{ Args: { "p_deal_outcome": string,"p_dispute": string,"p_resolution": string }; Returns: undefined
                           },
"review_commission_payment":
{ Args: { "p_approve": boolean,"p_notes": string,"p_payment": string }; Returns: undefined
                           },
"review_verification":
{ Args: { "p_internal_notes": string,"p_message": string,"p_status": Database["public"]['Enums']["verification_status"],"p_verification": string }; Returns: undefined
                           },
"setting_numeric":
{ Args: { "p_default": number,"p_key": string }; Returns: number
                           },
"start_negotiation":
{ Args: { "p_quotation": string }; Returns: string
                           },
"start_verification_review":
{ Args: { "p_verification": string }; Returns: undefined
                           },
"submit_verification":
{ Args: { "p_company": string }; Returns: undefined
                           },
"try_uuid":
{ Args: { "p": string }; Returns: string
                           },
"update_deal_status":
{ Args: { "p_deal": string,"p_note"?: string,"p_to": Database["public"]['Enums']["deal_status"] }; Returns: undefined
                           }
          }
          Enums: {
            "commission_payment_status": "submitted"|"confirmed"|"rejected","commission_status": "pending"|"due"|"partially_paid"|"paid"|"overdue"|"waived","company_kind": "supplier"|"buyer","deal_status": "negotiation"|"quotation_accepted"|"awaiting_payment_confirmation"|"payment_confirmed"|"production"|"ready_for_shipment"|"shipped"|"delivered"|"completed"|"cancelled"|"disputed","dispute_status": "open"|"under_review"|"resolved"|"closed","member_role": "owner"|"manager"|"member","product_status": "draft"|"published"|"archived","quotation_status": "submitted"|"negotiating"|"accepted"|"rejected"|"withdrawn"|"expired","report_status": "open"|"reviewed"|"dismissed","rfq_status": "open"|"closed"|"awarded"|"cancelled","shipment_status": "preparing"|"booked"|"in_transit"|"at_customs"|"delivered"|"exception","trade_doc_type": "commercial_invoice"|"packing_list"|"certificate_of_origin"|"bill_of_lading"|"shipping_document"|"customs_document"|"payment_evidence"|"contract"|"other","user_role": "admin"|"operations"|"supplier"|"buyer","verification_doc_type": "commercial_registration"|"tax_certificate"|"company_identity"|"export_license"|"other","verification_status": "pending"|"under_review"|"approved"|"rejected"|"needs_documents"
          }
          CompositeTypes: {
            [_ in never]: never
          }
        }
}

type DatabaseWithoutInternals = Omit<Database, '__InternalSupabase'>

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never
> = DefaultSchemaTableNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
  ? (DefaultSchema["Tables"] & DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
      Row: infer R
    }
    ? R
    : never
  : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never
> = DefaultSchemaTableNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
  ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
      Insert: infer I
    }
    ? I
    : never
  : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never
> = DefaultSchemaTableNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
  ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
      Update: infer U
    }
    ? U
    : never
  : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never
> = DefaultSchemaEnumNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
  ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
  : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never
> = PublicCompositeTypeNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
  ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
  : never

export const Constants = {
  "graphql_public": {
          Enums: {
            
          }
        },"public": {
          Enums: {
            "commission_payment_status": ["submitted", "confirmed", "rejected"],"commission_status": ["pending", "due", "partially_paid", "paid", "overdue", "waived"],"company_kind": ["supplier", "buyer"],"deal_status": ["negotiation", "quotation_accepted", "awaiting_payment_confirmation", "payment_confirmed", "production", "ready_for_shipment", "shipped", "delivered", "completed", "cancelled", "disputed"],"dispute_status": ["open", "under_review", "resolved", "closed"],"member_role": ["owner", "manager", "member"],"product_status": ["draft", "published", "archived"],"quotation_status": ["submitted", "negotiating", "accepted", "rejected", "withdrawn", "expired"],"report_status": ["open", "reviewed", "dismissed"],"rfq_status": ["open", "closed", "awarded", "cancelled"],"shipment_status": ["preparing", "booked", "in_transit", "at_customs", "delivered", "exception"],"trade_doc_type": ["commercial_invoice", "packing_list", "certificate_of_origin", "bill_of_lading", "shipping_document", "customs_document", "payment_evidence", "contract", "other"],"user_role": ["admin", "operations", "supplier", "buyer"],"verification_doc_type": ["commercial_registration", "tax_certificate", "company_identity", "export_license", "other"],"verification_status": ["pending", "under_review", "approved", "rejected", "needs_documents"]
          }
        }
} as const

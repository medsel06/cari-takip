export interface Company {
  id: string;
  name: string;
  created_at: string;
}

export interface User {
  id: string;
  company_id: string;
  email: string;
  full_name: string;
  role: 'user' | 'admin';
  created_at: string;
}

export interface Product {
  id: string;
  company_id: string;
  code: string;
  name: string;
  unit: string;
  current_stock: number;
  min_stock: number;
  purchase_price: number;
  sale_price: number;
  barcode?: string;
  product_type: 'raw_material' | 'product' | 'semi_product';
  tax_rate: number;
  currency: string;
  color?: string;
  thickness?: number;
  width?: number;
  length?: number;
  weight_per_unit?: number;
  density?: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface StockMovement {
  id: string;
  company_id: string;
  product_id: string;
  movement_type: 'IN' | 'OUT';
  movement_subtype?: string;
  quantity: number;
  unit_price?: number;
  total_price?: number;
  description?: string;
  reference_no?: string;
  created_by?: string;
  created_at: string;
  product?: Product;
}

export interface Customer {
  id: string;
  company_id: string;
  code: string;
  name: string;
  type: 'customer' | 'supplier' | 'both';
  phone?: string;
  mobile?: string;
  email?: string;
  address?: string;
  tax_number?: string;
  balance: number;
  credit_limit: number;
  risk_status: 'normal' | 'risky' | 'blocked';
  payment_term: number;
  currency: string;
  discount_rate: number;
  tax_office?: string;
  city?: string;
  district?: string;
  authorized_person?: string;
  authorized_phone?: string;
  notes?: string;
  is_active: boolean;
  is_e_invoice?: boolean;
  created_at: string;
  updated_at: string;
}

export interface AccountMovement {
  id: string;
  company_id: string;
  customer_id: string;
  movement_type: 'DEBT' | 'CREDIT';
  amount: number;
  description?: string;
  document_type?: string;
  document_no?: string;
  due_date?: string;
  payment_method?: string;
  is_paid: boolean;
  paid_amount: number;
  created_by?: string;
  created_at: string;
  customer?: Customer;
}

export interface Check {
  id: string;
  company_id: string;
  customer_id?: string;
  check_number: string;
  bank_name: string;
  branch_name?: string;
  account_number?: string;
  drawer_name?: string;
  amount: number;
  due_date: string;
  status: 'portfolio' | 'collected' | 'returned' | 'endorsed' | 'in_bank' | 'protested';
  type: 'received' | 'issued';
  description?: string;
  endorsement_date?: string;
  endorsement_to?: string;
  endorsement_history: any[];
  collection_date?: string;
  collection_status?: string;
  return_date?: string;
  return_reason?: string;
  protest_date?: string;
  created_by?: string;
  created_at: string;
  updated_at: string;
  customer?: Customer;
}

// NAKİT YÖNETİMİ TİPLERİ
export interface CashAccount {
  id: string;
  company_id: string;
  account_code: string;
  account_name: string;
  account_type: 'cash' | 'bank' | 'pos' | 'credit_card';
  currency: string;
  balance: number;
  opening_balance: number;
  bank_name?: string;
  branch_name?: string;
  account_no?: string;
  iban?: string;
  is_active: boolean;
  created_by?: string;
  created_at: string;
  updated_at: string;
}

export interface CashMovement {
  id: string;
  company_id: string;
  movement_no: string;
  account_id: string;
  movement_type: 'income' | 'expense' | 'transfer_in' | 'transfer_out';
  amount: number;
  currency: string;
  exchange_rate: number;
  description?: string;
  category?: string;
  reference_type?: string;
  reference_id?: string;
  customer_id?: string;
  target_account_id?: string;
  payment_method?: string;
  document_no?: string;
  movement_date: string;
  created_by?: string;
  created_at: string;
  updated_at: string;
  account?: CashAccount;
  customer?: Customer;
  target_account?: CashAccount;
}

export interface ExpenseCategory {
  id: string;
  company_id: string;
  category_code: string;
  category_name: string;
  parent_id?: string;
  is_active: boolean;
  created_at: string;
}

export interface ExpenseInvoice {
  id: string;
  company_id: string;
  expense_no: string;
  supplier_name?: string;
  invoice_no?: string;
  invoice_date?: string;
  due_date?: string;
  category_id?: string;
  subtotal?: number;
  tax_amount?: number;
  total_amount: number;
  currency: string;
  description?: string;
  status: 'unpaid' | 'partial' | 'paid';
  paid_amount: number;
  created_by?: string;
  created_at: string;
  category?: ExpenseCategory;
}

// FATURA TİPLERİ
export interface Invoice {
  id: string;
  company_id: string;
  invoice_no: string;
  invoice_type: 'purchase' | 'sale' | 'return_purchase' | 'return_sale';
  e_invoice_uuid?: string;
  e_invoice_id?: string;
  customer_id?: string;
  invoice_date: string;
  invoice_time: string;
  delivery_date?: string;
  due_date?: string;
  subtotal: number;
  discount_amount: number;
  tax_amount: number;
  withholding_amount?: number;
  total_amount: number;
  currency: string;
  exchange_rate: number;
  is_e_invoice: boolean;
  e_invoice_scenario?: string;
  e_invoice_type?: string;
  e_invoice_status?: string;
  e_invoice_response?: string;
  payment_status: 'unpaid' | 'partial' | 'paid';
  paid_amount: number;
  description?: string;
  notes?: string;
  created_by?: string;
  created_at: string;
  updated_at: string;
  customer?: Customer;
  items?: InvoiceItem[];
}

export interface InvoiceItem {
  id: string;
  invoice_id: string;
  product_id?: string;
  line_no: number;
  product_code?: string;
  product_name: string;
  quantity: number;
  unit: string;
  unit_price: number;
  discount_rate: number;
  discount_amount: number;
  tax_rate: number;
  tax_amount: number;
  line_total: number;
  total_amount: number;
  description?: string;
  created_at: string;
  product?: Product;
}

// FORM TİPLERİ
export interface ProductFormData {
  code: string;
  name: string;
  unit: string;
  min_stock: number;
  purchase_price: number;
  sale_price: number;
  barcode?: string;
  product_type: 'raw_material' | 'product' | 'semi_product';
  tax_rate: number;
  currency: string;
  color?: string;
  thickness?: number;
  width?: number;
  length?: number;
  weight_per_unit?: number;
  density?: number;
  is_active: boolean;
}

export interface CustomerFormData {
  code: string;
  name: string;
  type: 'customer' | 'supplier' | 'both';
  phone?: string;
  mobile?: string;
  email?: string;
  address?: string;
  tax_number?: string;
  credit_limit: number;
  risk_status: 'normal' | 'risky' | 'blocked';
  payment_term: number;
  currency: string;
  discount_rate: number;
  tax_office?: string;
  city?: string;
  district?: string;
  authorized_person?: string;
  authorized_phone?: string;
  notes?: string;
  is_active: boolean;
  is_e_invoice?: boolean;
}

export interface CheckFormData {
  customer_id?: string;
  check_number: string;
  bank_name: string;
  branch_name?: string;
  account_number?: string;
  drawer_name?: string;
  amount: number;
  due_date: string;
  type: 'received' | 'issued';
  description?: string;
}

export interface CashAccountFormData {
  account_code: string;
  account_name: string;
  account_type: 'cash' | 'bank' | 'pos' | 'credit_card';
  currency: string;
  opening_balance: number;
  bank_name?: string;
  branch_name?: string;
  account_no?: string;
  iban?: string;
  is_active: boolean;
}

export interface CashMovementFormData {
  account_id: string;
  movement_type: 'income' | 'expense' | 'transfer_in' | 'transfer_out';
  amount: number;
  currency: string;
  exchange_rate: number;
  description?: string;
  category?: string;
  customer_id?: string;
  target_account_id?: string;
  payment_method?: string;
  document_no?: string;
  movement_date: string;
}

export interface InvoiceFormData {
  invoice_no: string;
  invoice_type: 'purchase' | 'sale' | 'return_purchase' | 'return_sale';
  customer_id?: string;
  invoice_date: string;
  invoice_time?: string;
  delivery_date?: string;
  due_date?: string;
  currency: string;
  exchange_rate: number;
  withholding_rate?: number;
  is_e_invoice: boolean;
  is_e_archive?: boolean;
  description?: string;
  notes?: string;
  items: InvoiceItemFormData[];
}

export interface InvoiceItemFormData {
  product_id?: string;
  product_code?: string;
  product_name: string;
  quantity: number;
  unit: string;
  unit_price: number;
  discount_rate: number;
  discount_type?: 'percentage' | 'amount';
  tax_rate: number;
  description?: string;
}

// RAPOR TİPLERİ
export interface CashFlowReport {
  company_id: string;
  account_name: string;
  account_type: string;
  month: string;
  income: number;
  expense: number;
  net_flow: number;
}

export interface DailyCashReport {
  id: string;
  company_id: string;
  account_name: string;
  account_type: string;
  opening_balance: number;
  daily_income: number;
  daily_expense: number;
  closing_balance: number;
  report_date: string;
}

export interface CustomerBalanceReport {
  id: string;
  company_id: string;
  code: string;
  name: string;
  type: string;
  balance: number;
  credit_limit: number;
  risk_status: string;
  balance_status: string;
  payment_term: number;
  created_at: string;
}

export interface StockStatusReport {
  id: string;
  company_id: string;
  code: string;
  name: string;
  unit: string;
  current_stock: number;
  min_stock: number;
  purchase_price: number;
  sale_price: number;
  stock_value: number;
  stock_status: string;
}

export interface MaturityReport {
  document_type: string;
  document_no: string;
  customer_name: string;
  remaining_amount: number;
  due_date: string;
  overdue_days: number;
  currency: string;
}